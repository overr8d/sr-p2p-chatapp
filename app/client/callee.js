function init(){
    var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
    var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
    
    var users ={};
    var isFirstUser;
    var wsUri = "ws://localhost:8090/";
    // Random uid generator
    var myID =  Math.round(Math.random() * 5000000000) + 1;
    var signalingChannel = createSignalingChannel(wsUri, myID);
    var servers = { iceServers: [{urls: "stun:stun.1.google.com:19302"}] };

    signalingChannel.onWelcome = function(_isFirstUser, onlineUsers, source){
            console.log('received answer from ', source);
            isFirstUser = _isFirstUser;
            console.log("Am I the first user in the app?", isFirstUser);
            getUsers(onlineUsers);
            createPeerConnection(isFirstUser);
    };

    signalingChannel.onOnlineUsers = function(onlineUsers, source){
        getUsers(onlineUsers);
        displayUsers(users);
    };

    // Populate users available for connection establishment
    function getUsers(onlineUsers){
        if(Object.keys(users).length !== 0){
            users = {}; 
        } 
        for (key in onlineUsers){
            if (onlineUsers[key] != myID){
                users[key] = onlineUsers[key];
            }
        }
    }
    function displayUsers(users){
        var usersEl = document.getElementById("users");
        for (key in users){
            var div = document.createElement("button");
            var node = document.createTextNode(users[key]);
            div.appendChild(node);
            usersEl.appendChild(div);
        }

        // var list='';
        // for(key in onlineUsers){
        //     if(onlineUsers.hasOwnProperty(key)){
        //         list += onlineUsers[key].concat("<br/>");
        //     }
        // }
        // document.getElementById("users").innerHTML = list;
    }

    function createPeerConnection(isFirstUser){
        var pc = new RTCPeerConnection(servers, {
            optional: [{
                DtlsSrtpKeyAgreement: true
            }]
        });

        // It is not first user, initiate the connection...
        if(!isFirstUser){
            var peerId;
            for (key in users){
                peerId = users[key];
            }

            var _commChannel = pc.createDataChannel('communication', {
                reliable: false
            });

            _commChannel.onclose = function(evt) {
                console.log("dataChannel closed");
            };

            _commChannel.onerror = function(evt) {
                console.error("dataChannel error");
            };

            _commChannel.onopen = function(){
                console.log("dataChannel opened");
            };

            _commChannel.onmessage = function(message){
                var chat = document.getElementById("chat");
                var msg = message.data  + "</br>";
                chat.innerHTML += msg;
            };

            window.channel = _commChannel;

            pc.createOffer(function(offer){
                pc.setLocalDescription(offer);
                console.log('send offer');
                signalingChannel.sendOffer(offer, peerId);
            }, function (e){
                console.error(e);
            });

            signalingChannel.onAnswer = function (answer, source) {
            console.log('receive answer from ', source);
            pc.setRemoteDescription(new RTCSessionDescription(answer));
            };

        } 

        signalingChannel.onOffer = function (offer, source) {
        	console.log('receive offer');
        	pc.setRemoteDescription(new RTCSessionDescription(offer));
        	pc.createAnswer(function(answer){
        		pc.setLocalDescription(answer);
        		console.log('send answer');
        		signalingChannel.sendAnswer(answer, source);
        	}, function (e){
        		console.error(e);
        	});
        };

        pc.ondatachannel = function(event) {
        	var receiveChannel = event.channel;
        	console.log("channel received");
        	window.channel = receiveChannel;
        	receiveChannel.onmessage = function(event){
        		var chat = document.getElementById("chat");
        		var msg = event.data  + "</br>";
        		chat.innerHTML += msg;
        	};
        };
        
            
        pc.onicecandidate = function (evt) {
        	// empty candidate (wirth evt.candidate === null) are often generated
            if(evt.candidate){ 
                for (key in users){
                    signalingChannel.sendICECandidate(evt.candidate, users[key]);
                }
                
            }
        };

        signalingChannel.onICECandidate = function (ICECandidate, source) {
            console.log("receiving ICE candidate from ",source);
            pc.addIceCandidate(new RTCIceCandidate(ICECandidate));
        };

    }
}
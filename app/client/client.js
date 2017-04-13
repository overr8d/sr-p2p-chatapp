function init(){

    var self = this;

    this.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
    this.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    this.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
    // Holds online peers
    this.peers = {};
    // Holds created RTCPeerConnections
    this.pcs = {};
    // Holds created DataChannels 
    this.channels = {};
    // Determines if the peer is caller or callee
    this.isFirstPeer = false;
    this.wsUri = "ws://localhost:8090/";
    // Generates random peerID
    this.myID =  Math.round(Math.random() * 5000000000) + 1;
    this.signalingChannel = createSignalingChannel(this.wsUri, this.myID);
    this.servers = { iceServers: [{urls: "stun:stun.1.google.com:19302"}] };
    // Displays peerID on DOM
    document.getElementById("myId").innerHTML = "My ID: "+ this.myID;

    // Receives welcome message from server
    this.signalingChannel.onWelcome = onWelcomeHandler;

    // Receives peer list from server each time new peer connects
    this.signalingChannel.onOnlinePeers = onOnlinePeersHandler;

    
    /**
	 * Populates peers available for P2P connection.
	 * @param {object} onlinePeers - The list of peers.
	 */
    function getPeers(onlinePeers) {
        if(Object.keys(self.peers).length !== 0) {
             self.peers = {};
        }
        for (key in onlinePeers){
            if (onlinePeers[key] != self.myID){
                self.peers[key] = onlinePeers[key];
            }
        }
    }
    this.getPeers = getPeers;

    /**
	 * Prints peers available for P2P connection on DOM.
	 * @param {object} peers - The list of peers.
	 */
    function displayPeers(peers){
        var peerList='';
        for (key in peers){
            peerList += peers[key] + '<br/>';
        }
        document.getElementById('peers').innerHTML = peerList;
    }
    this.displayPeers = displayPeers;

     /**
	 * Initiates connection both for callee and caller depending on isFirstPeer.
	 * @param {boolean} isFirstPeer - The status of a peer.
	 */
    function connect(isFirstPeer){
    	if(!isFirstPeer){
    		for (key in self.peers){
    			self.connect2Peer(self.peers[key]);
    		}
    		self.signalingChannel.onAnswer = onAnswerHandler;
    	}
    	self.signalingChannel.onOffer = onOfferHandler;
        self.signalingChannel.onICECandidate = onICECandidateHandler;
    }
    this.connect = connect;

    /**
	 * Initiates P2P connection to callee.
	 * @param {number} peerId - The unique ID of the peer.
	 */
    function connect2Peer(peerId){
        self.pcs[peerId] = new RTCPeerConnection(self.servers, {
            optional: [{
                DtlsSrtpKeyAgreement: true
            }]
        });

        self.initDataChannel(true, peerId);

        self.pcs[peerId].onicecandidate = function (evt) {
            // empty candidate (wirth evt.candidate === null) are often generated
            if(evt.candidate){ 
                self.signalingChannel.sendICECandidate(evt.candidate, peerId); 
            }
        };

        self.pcs[peerId].createOffer(function(offer){
            self.pcs[peerId].setLocalDescription(offer);
            console.log("sending offer...");
            self.signalingChannel.sendOffer(offer, peerId);
            }, function (e){
                console.error(e);
        });
    }
    this.connect2Peer = connect2Peer;

    /**
	 * Initiates dataChannel both for callee and caller.
	 * @param {boolean} isInitiator - The datachannel initiator status of the peer.
	 * @param {number}  peerId  	- The unique ID of the peer.
	 */
    function initDataChannel(isInitiator, peerId) {
        if (isInitiator) {
            var dataChannel = self.pcs[peerId].createDataChannel("datachannel: " + peerId, { reliable: false });
            console.log("data channel created for",peerId);
            self.channels[peerId] = dataChannel;
            self.setupChat(dataChannel);
        } else {
		    self.pcs[peerId].ondatachannel = function(e) {
                console.log("channel received from",peerId);
			    self.channels[peerId] = e.channel;
			    self.setupChat(e.channel);
		    };
        }
	}
    this.initDataChannel = initDataChannel;

     /**
	 * Sets up event listeners and respective handler methods on a data channel.
	 * @param {object} channel - The datachannel.
	 */
    function setupChat(channel){
        channel.onclose = function(evt) {
            console.log("dataChannel closed.");
        };

        channel.onerror = function(evt) {
            console.error("dataChannel error!");
        };

        channel.onopen = function(){
            console.log("dataChannel opened.");
        };

        channel.onmessage = function(message){
            console.log("private message received.");
            var chat = document.getElementById("chat");
            var msg = message.data  + "</br>";
            chat.innerHTML += msg;
        };
    }
    this.setupChat = setupChat;

    /**
	 * Handles onAnswer.
	 * @param {object} answer - The SDP object.
	 * @param {number} source - The unique ID of the peer.
	 */
    function onAnswerHandler(answer, source) {
        console.log("receive answer from",source);
        self.pcs[source].setRemoteDescription(new RTCSessionDescription(answer));
    }
    this.onAnswerHandler = onAnswerHandler;

    /**
	 * Handles onOffer.
	 * @param {object} offer - The SDP object.
	 * @param {number} source - The unique ID of the peer.
	 */
    function onOfferHandler(offer, source) {
        console.log("offer received.");
        self.pcs[source] = new RTCPeerConnection(self.servers, {
                optional: [{
                    DtlsSrtpKeyAgreement: true
                }]
            });
        self.initDataChannel(false, source);
        self.pcs[source].setRemoteDescription(new RTCSessionDescription(offer));

        self.pcs[source].onicecandidate = function (evt) {
            // empty candidate (wirth evt.candidate === null) are often generated
            if(evt.candidate){ 
                    self.signalingChannel.sendICECandidate(evt.candidate, source);
            }
        };
        self.pcs[source].createAnswer(function(answer){
            self.pcs[source].setLocalDescription(answer);
            console.log("sending answer...");
            self.signalingChannel.sendAnswer(answer, source);
        }, function (e){
            console.error(e);
        });
    }
    this.onOfferHandler = onOfferHandler;

    function onICECandidateHandler(ICECandidate, source) {
        console.log("receiving ICE candidate from",source);
        self.pcs[source].addIceCandidate(new RTCIceCandidate(ICECandidate));
    };
    this.onICECandidateHandler = onICECandidateHandler;

    /**
	 * Handles onOnlinePeers.
	 * @param {object} onlinePeers - The list of peers.
	 * @param {number} source - The unique ID of the peer.
	 */
    function onOnlinePeersHandler(onlinePeers, source){
        console.log("peer list received from", source);
        self.getPeers(onlinePeers);
        self.displayPeers(self.peers);
    }
    this.onOnlinePeersHandler = onOnlinePeersHandler;

    /**
	 * Handles onWelcome.
	 * @param {boolean} _isFirstPeer - The status of a peer.
	 * @param {object} onlinePeers - The list of peers.
	 * @param {number} source - The unique ID of the peer.
	 */
    function onWelcomeHandler(_isFirstPeer, onlinePeers, source){
        console.log("welcome message received from",source);
        self.isFirstPeer = _isFirstPeer;
        console.log("Am I the first peer in the app?",self.isFirstPeer);
        self.getPeers(onlinePeers);
        self.connect(self.isFirstPeer);
    }
    this.onWelcomeHandler = onWelcomeHandler;

    /**
	 * Handles messages sent by unique peer.
	 * @param {string} message - The text message.
	 * @param {function} callback - The callback function that prints a message on DOM.
	 */
    function messageHandler(message, callback){
        var msg = message && message.trim();
        if(msg && msg.substr(0,2) === '> '){
            msg = msg.substr(2);
            var ind = msg.indexOf(' ');
            if(ind !== -1){
                var peerId = msg.substr(0,ind);
                 if(Object.values(self.peers).includes(peerId)){
                    var _msg = msg.substr(ind + 1);
                    console.log("sending private message...");
                    self.channels[peerId].send(_msg);
                 } else {
                    callback("Error! Enter a valid peer ID");
                 }
            } else { 
                callback("Error! A white space missing before message");  
            }
        } else {  
            callback("Error! Follow the given message format");     
        }
    }
    this.messageHandler = messageHandler;

    return this;
}
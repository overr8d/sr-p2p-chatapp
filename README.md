# SR - WebRTC Test: Creating a P2P Chat App using RTCDataChannel

A P2P chat application is located in `/app` directory. Both server and client code directories are as follows: 

- Signalling Server (`/app/server/SignalingServer.js`) which is a WS server implemented in node.js that works as a signaling mechanism for WebRTC and keeps track of connected peers.
- P2P Chat Client Webpage (`app/client/client.html`) that serves both callee and caller of the P2P connection in a similar fashion.

## How it works 

### Server side

In this application, the test taker is asked to create a chat app that serves several peers to chat with each other using RTCDataChannel API. Given that, a regular multi-peer chat applications keep track of each peer's unique ID in order to coordinate the connection establishment and orchestrate signalling mechanism, a server has to be designed in a way that peers can register their unique ID and inquire about the other online peers. To do so, signalling server's "onInit" message handler is modified as shown below: 

('app/server/messageHandler.js')

```javascript
function onInit(ws, id){
    console.log("init from peer:", id);
    ws.id = id;
    if(Object.keys(connectedPeers).length === 0){
        isFirstPeer = true;
    } else {
        isFirstPeer = false;
    }
    connectedPeers[id] = ws;
    ws.send(JSON.stringify({
        type: 'welcome',
        isFirstPeer: isFirstPeer,
        onlinePeers: Object.keys(connectedPeers),
        source: 'server',
    }));

    for (key in connectedPeers){
        connectedPeers[key].send(JSON.stringify({
            type: 'onlinePeers',
            onlinePeers: Object.keys(connectedPeers),
            source: 'server',
        }));
    }
}

```
This function works as follows:

* Receives unique ID and assigns it to websocket.id of a respective peer.
* Checks the connectedPeers list to find out if a given peer is the first peer connected to server or not. (Essential business logic that enables both callee and caller to use the same client webpage. This will be further discussed on client side review.)
* Inserts (key:id, value: WS object) pair into connectedPeers object. 
* Sends the peer a message with new properties, namely, "isFirstPeer" and "onlinePeers" that allows the peer to find out if establishing a RTC connection or waiting for receiving an offer is a next step and discover target peers for potential connections. 
* Also sends each peer in "connectedPeers" a message with a property "onlinePeers" that holds peers already connected to server. This is for displaying online peers list on HTML page, and is triggered every time a new peer connects to server.  

Side note #1: I found that the best approach was to start from an existing template as a base and work my way up. This is why only "onInit" function was modified and "isFirstPeer" variable was added globally. To test, "isFirstPeer" variable was also exported by calling module.exports._isFirstPeer = isFirstPeer. Above mentioned modifications were also tested in server test code. 

### Client side

Most of the business logic in this application is implemented on client side. Creating an app that serves several peers means that having to create multiple RTCPeerConnections and RTCDataChannels for each peer which is quite trivial. Also serving a single webpage both for callee and caller makes things more complicated. To overcome those issues, as mentioned in previous section, server notifies each peer of "isFirstPeer" value which allows them to act first as caller or callee. Also the server feeds each peer with online peers list that helps discover available peers to connect. 

When init() function is fired on page load:

* Each peer creates its own unique ID, "peers" object that holds the online peers list, "pcs" object that holds RTCPeerConnections to be created, and "channels" object that holds RTCDataChannels to be created. 
* Each peer also creates its signalling channel to server, sets "onWelcome" and "onOnlinePeers" listeners respectively. 

(`app/client/client.js`)

```javascript
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
```

* Once "onWelcomeHandler" is invoked, first "getPeers" function is fired, populating "peers" object with currently online peers, then "connect" function is invoked. "onOnlinePeersHandler", however, invokes "displayPeers" function, each time a new peer connects to server, displaying currrently online peers on HTML page.

(`app/client/client.js`)

```javascript

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

    function displayPeers(peers){
        var peerList='';
        for (key in peers){
            peerList += peers[key] + '<br/>';
        }
        document.getElementById('peers').innerHTML = peerList;
    }
    this.displayPeers = displayPeers;
 ```
 
* When "connect" function is fired, depending on the boolean value of "isFirstPeer", the peer either acts as caller - first creates RTCPeerConnections, sends offer by calling "connect2Peer" function and sets "onAnswer" eventListener - or callee - sets "onOffer" listeners and handles the incoming offers - which allows the same client code treating both callee and caller differently. Once an offer is sent, caller sets the same eventListeners as the callee did and wait for an answer. This logic enables each peer (excluding first peer) to start creating RTCPeerConnections to preceding peers first and then setting eventListeners as callee did previously. 
* "connect2Peer" function first creates RTCPeerConnection to given peer Id, initiates corresponding RTCDataChannel, creates offer and sends it to respective peer.

(`app/client/client.js`)

```javascript

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
```

* Once offer received, the peer acting as callee creates RTCPeerConnection, assigns it to given peer Id, sets corresponding "ondatachannel" listener and sends an aswer to respective peer. In the meantime, ICECandidates are generated and exchanged.
* RTCDataChannels are created by firing "initDataChannel" function. Similar to "isFirstPeer" logic, a boolean value is utilized to distinguish between a peer that creates RTCDataChannels, and a peer that listens to "ondatachannel" event. In this case,the peer acting as caller sets invokes "initDataChannel" function with a boolean value "true", and the other peer invokes with "false". Next, "setupChat" function is invoked by both parties to set up RTCDataChannels' eventListeners on given channel. 

(`app/client/client.js`)

```javascript

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
```

* MessageHandler function is fired when either peer clicks "send" button on the HTML, simply extracting properties from message text and sending it to corresponding peer.  

(`app/client/client.js`)

```javascript

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
```
## How to launch the app

* Run `npm install` to install dependencies. 
* Run 'npm test' for testing the server code. Tools utilized are as follows: [mocha](http://mochajs.org/) [sinonjs](http://sinonjs.org/docs/) [shouldjs](http://shouldjs.github.io)
* Client test locates under (`/test/client/spec/test.html`). Open in the browser to display test results. Test script locates under (`/test/client/spec/test.js`). The tool utilized is as follows: [jasmine](https://jasmine.github.io/)
* Run `npm start` (starts the signalling server on port:8090 and the web server on port:8089).
* Open [client page](http://localhost:8089/app/client/client.html) on multiple tabs in the browser. 
* Client code runs on page load, and starts the negotiation with other peers immediately if any.
* A message box, "My ID" indicator and "Online Peers" list that excludes a given peer's ID welcome the user. 
* Inspect console logs regarding the offer/answer negotiation and connection establishment by using dev tools of corresponding browser.
* To send a P2P message, simply copy any peer Id under "Online Peers" title and text a message in a given format: "> PEER_ID MESSAGE", then click "send" button.
* Failing to send a text message in given format displays various error messages under "Online Peers" list. Mostly white space failures and attempts to send invalid peers were considered while designing error messages. 

## Questions

### 1. Create a peer to peer application that allows several peers to send message to each other (implementation needed)

- [x] There should be a single page (no separation between caller & callee).
- [x] Once on the page, every page must see the list of all the other peers connected.
- [x] A peer connection must be established with the other peers immediately after the connection to the page.
- [x] A peer must be able to send a message to any other connected peer directly. (broadcast not needed)



### 2. to go further (no implementation needed)

In this assignment, mesh network topology has been implemented to provide P2P mechanism. Per this scenario, the system does not require a messaging server that relays each message to clients. Instead, each client creates RTCDataChannels to other clients, thus sending direct messages without any hassle. Compared to MCU topology, Mesh ends up creating more connections and requiring higher bandwidth but eliminates excess server costs. 

- [x] **What are the problems of this architecture?**
* This application uses many RTCPeerConnections to create P2P connections between each peer. This paradigm ends up consuming more network traffic and local resources like CPU and memory. Also when the number of RTCPeerConnections get larger, some browser specific problems may arise, resulting in application crash. 
- [x] **Describe an architecture that could solve those problems.**
* One approach to solve above-mentioned problems might be utilizing shared RTCPeerConnection that a peer use to create multi RTCDataChannels on. This may result in consuming less network traffic and local resources. This might also eliminate the restriction incurred by having many RTCPeerConnections. 

Side note #2: I just realized that "onlineUsers" message sent from the server is making the app less server-independent. Instead, each time "onOfferHandler" is triggered on client side, "peers" object can be updated and "displayUsers" function can be invoked. Those would be reflected on next iterations.
## Prerequisites:

* Node.js v4.2 or later
* Mozilla Firefox 42 or Google Chrome 46 or later


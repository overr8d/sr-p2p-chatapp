var  connectedPeers = {};
var isFirstPeer = false;
function onMessage(ws, message){
    var type = message.type;
    switch (type) {
        case "ICECandidate":
            onICECandidate(message.ICECandidate, message.destination, ws.id);
            break;
        case "offer":
            onOffer(message.offer, message.destination, ws.id);
            break;
        case "answer":
            onAnswer(message.answer, message.destination, ws.id);
            break;
        case "init":
            onInit(ws, message.init);
            break;
        default:
            throw new Error("invalid message type");
    }
}

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

function onOffer(offer, destination, source){
    console.log("offer from peer:", source, "to peer", destination);
    connectedPeers[destination].send(JSON.stringify({
        type:'offer',
        offer:offer,
        source:source,
    }));
}

function onAnswer(answer, destination, source){
    console.log("answer from peer:", source, "to peer", destination);
    connectedPeers[destination].send(JSON.stringify({
        type: 'answer',
        answer: answer,
        source: source,
    }));
}

function onICECandidate(ICECandidate, destination, source){
    console.log("ICECandidate from peer:", source, "to peer", destination);
    connectedPeers[destination].send(JSON.stringify({
        type: 'ICECandidate',
        ICECandidate: ICECandidate,
        source: source,
    }));
}

module.exports = onMessage;

//exporting for unit tests only
module.exports._connectedPeers = connectedPeers;
module.exports._isFirstPeer = isFirstPeer;
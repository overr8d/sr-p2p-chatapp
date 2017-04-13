require('should');
var sinon = require('sinon');
var messageHandler = require('../app/server/messageHandler');

var WsMock = function(){
    this.send = function(){};
};

describe('signalingServer', function() {
    describe('Initialization', function() {
        it('onInit', function() {
           
            var ws1 = new WsMock();
            var ws2 = new WsMock();
            var message1 = {
                type:"init",
                init:1
            };
            var message2 = {
                type:"init",
                init:2
            };
            messageHandler(ws1, message1);
            ws1.id.should.be.equal(1);
            messageHandler._isFirstPeer.should.be.true;
            messageHandler._connectedPeers[1].should.be.equal(ws1);
            var spy = sinon.spy(messageHandler._connectedPeers[1], "send");
            spy.calledTwice.should.be.true;

            messageHandler(ws2, message2);
            ws2.id.should.be.equal(2);
            messageHandler._isFirstPeer.should.be.false;
            messageHandler._connectedPeers[2].should.be.equal(ws2);
            spy = sinon.spy(messageHandler._connectedPeers[2], "send");
            spy.calledTwice.should.be.true;
        });
    });
    describe('Messages', function() {
        var spy, ws1, ws2;
        beforeEach(function() {
            ws1 = new WsMock();
            ws1.id = 1;
            ws2 = new WsMock();
            ws2.id = 2;
            
            messageHandler._connectedPeers[1] = ws1;
            messageHandler._connectedPeers[2] = ws2;
            spy = sinon.spy(messageHandler._connectedPeers[2], "send");
        });
        afterEach(function() {
            spy.restore();
        });
        
        it('onOffer', function() {
            var offerSDP = "offer SDP";
            var message = {
                type:"offer",
                offer:offerSDP,
                destination:2,
            };
            messageHandler(ws1, message);
            spy.calledOnce.should.be.true;

            var expectedResponse = '{"type":"offer","offer":"offer SDP","source":1}';
            spy.firstCall.args[0].should.eql(expectedResponse);
        });
        it('onAnswer', function() {
            var answerSDP = "answer SDP";
            var message = {
                type:"answer",
                answer:answerSDP,
                destination:2,
            };
            messageHandler(ws1, message);
            spy.calledOnce.should.be.true;

            var expectedResponse = '{"type":"answer","answer":"answer SDP","source":1}';
            spy.firstCall.args[0].should.eql(expectedResponse);
        });
        it('onICECandidate', function() {
            var ICECandidateSDP = "ICECandidate SDP";
            var message = {
                type:"ICECandidate",
                ICECandidate:ICECandidateSDP,
                destination:2,
            };
            messageHandler(ws1, message);
            spy.calledOnce.should.be.true;

            var expectedResponse = '{"type":"ICECandidate","ICECandidate":"ICECandidate SDP","source":1}';
            spy.firstCall.args[0].should.eql(expectedResponse);
        });
    });
});
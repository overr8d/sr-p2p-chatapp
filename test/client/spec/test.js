// Due to time-constraints, test coverage remained limited. 
// More comprehensive and detailed test scenarios to be implemented. 

describe('Unit: client', function(){

	var messenger;

	beforeEach(function() {
		spyOn(document, 'getElementById').and.returnValue({});
		messenger = init();
	});

	it('must assign "peers" to the init instance', function() {
		expect(messenger.peers).toEqual({});
	});

	it('must assign "pcs" to the init instance', function() {
		expect(messenger.pcs).toEqual({});
	});

	it('must assign "channels" to the init instance', function() {
		expect(messenger.channels).toEqual({});
	});

	it('must assign "isFirstPeer" to the init instance', function() {
		expect(messenger.isFirstPeer).toBe(false);
	});

	it('must assign "wsUri" to the init instance', function() {
		expect(messenger.wsUri).toEqual("ws://localhost:8090/");
	});

	it('must define "signalingChannel"', function() {
		expect(messenger.signalingChannel).toBeDefined();
	});

	it('must define "servers"', function() {
		expect(messenger.servers).toBeDefined();
	});

	describe('Signaling channel', function() {

		it('"onWelcome" listener must be defined', function() {
			expect(messenger.signalingChannel.onWelcome).toBeDefined();
		});

		it('"onOnlinePeers" listener must be defined', function() {
			expect(messenger.signalingChannel.onOnlinePeers).toBeDefined();
		});
	});

	describe('Method: getPeers', function() {

		it('function must be defined', function() {
			expect(messenger.getPeers).toBeDefined();
		});

		it('must overwrite "peers" object with currently online peers ', function() {
			messenger.peers = {0:1};
			messenger.getPeers({0:1,1:2});
			expect(messenger.peers).toEqual({0:1,1:2});
		});
	});

	describe('Method: displayPeers', function() {

		it('function must be defined', function() {
			expect(messenger.displayPeers).toBeDefined();
		});

		it('must display given peer list on DOM ',function(){
			var dummyElement = document.createElement('div');
			document.getElementById = jasmine.createSpy('HTML Element').and.returnValue(dummyElement);
			var peerList = '1<br>2<br>';
			messenger.displayPeers({0:1,1:2});

			expect(document.getElementById('peers').innerHTML).toEqual(peerList);

		});
	});

	describe('Method: connect', function(){
		beforeEach(function() {
			spyOn(messenger, 'connect2Peer');
			messenger.peers = {0:1};
			messenger.connect(false);

		});
		it('function must be defined', function(){
			expect(messenger.connect).toBeDefined();
		});

		it('must invoke "connect2Peer"', function(){
			expect(messenger.connect2Peer).toHaveBeenCalledWith(1);
		});

		it('must assign "onAnswerHandler" to "onAnswer" eventListener', function(){
			expect(messenger.signalingChannel.onAnswer).toEqual(messenger.onAnswerHandler);
		});

		it('must assign "onOfferHandler" to "onOffer" eventListener', function(){
			expect(messenger.signalingChannel.onOffer).toEqual(messenger.onOfferHandler);
		});

		it('must assign "onICECandidateHandler" to "onICECandidate" eventListener', function(){
			expect(messenger.signalingChannel.onICECandidate).toEqual(messenger.onICECandidateHandler);
		});
	});

	describe('Method: connect2Peer', function(){
		it('function must be defined',function(){
			expect(messenger.connect2Peer).toBeDefined();
		});

		it('must invoke "initDataChannel"',function(){
			spyOn(messenger,'initDataChannel');
			var peerId = 1;
			messenger.connect2Peer(peerId);
			expect(messenger.initDataChannel).toHaveBeenCalledWith(true, peerId);
		});
		
	});

	describe('Method: initDataChannel', function() {

		it('function must be defined',function(){
			expect(messenger.initDataChannel).toBeDefined();
		});

	});

	describe('Method: setupChat', function() {

		it('function must be defined',function(){
			expect(messenger.setupChat).toBeDefined();
		});

	});

	describe('Method: onAnswerHandler', function() {

		it('function must be defined',function(){
			expect(messenger.onAnswerHandler).toBeDefined();
		});

	});

	describe('Method: onOfferHandler', function() {

		it('function must be defined',function(){
			expect(messenger.onOfferHandler).toBeDefined();
		});

		it('must invoke "initDataChannel"',function(){
			spyOn(messenger,'initDataChannel');
			messenger.onOfferHandler(undefined, "server");
			expect(messenger.initDataChannel).toHaveBeenCalledWith(false, "server");
		});

	});

	describe('Method: onICECandidateHandler', function() {

		it('function must be defined',function(){
			expect(messenger.onICECandidateHandler).toBeDefined();
		});

	});


	describe('Method: onOnlinePeersHandler', function() {

		it('function must be defined',function(){
			expect(messenger.onOnlinePeersHandler).toBeDefined();
		});

		it('must invoke "getPeers"',function(){
			spyOn(messenger,'getPeers');
			var onlinePeers = {};
			messenger.onOnlinePeersHandler(onlinePeers, "server");
			expect(messenger.getPeers).toHaveBeenCalledWith(onlinePeers);
		});

		it('must invoke "displayPeers"',function(){
			spyOn(messenger,'displayPeers');
			messenger.peers = {};
			messenger.onOnlinePeersHandler("server");
			expect(messenger.displayPeers).toHaveBeenCalledWith(messenger.peers);
		});

	});

	describe('Method: onWelcomeHandler', function() {

		it('function must be defined',function(){
			expect(messenger.onWelcomeHandler).toBeDefined();
		});

		it('must invoke "getPeers"',function(){
			spyOn(messenger,'getPeers');
			var onlinePeers = {};
			messenger.onWelcomeHandler(true, onlinePeers, "server");
			expect(messenger.getPeers).toHaveBeenCalledWith(onlinePeers);
		});

		it('must invoke "connect"',function(){
			spyOn(messenger,'connect');
			messenger.isFirstPeer = true;
			messenger.onWelcomeHandler(messenger.isFirstPeer);
			expect(messenger.connect).toHaveBeenCalledWith(messenger.isFirstPeer);
		});

	});

	describe('Method: messageHandler', function(){

		it('function must be defined',function(){
			expect(messenger.messageHandler).toBeDefined();
		});

		it('must invoke the passed callback if the beginning of the message is not as expected', function() {
			var spy = {
				callback : function() {}
			};
			spyOn(spy,'callback');
			messenger.messageHandler(undefined, spy.callback);
			messenger.messageHandler('test', spy.callback);
			messenger.messageHandler('>12123123', spy.callback);
			expect(spy.callback.calls.count()).toBe(3);
			expect(spy.callback).toHaveBeenCalledWith('Error! Follow the given message format');

		});

		it('must invoke the passed callback if a white space missing before message', function() {
			var spy = {
				callback : function() {}
			};
			spyOn(spy,'callback');
			messenger.peers = {0:11};
			messenger.messageHandler('> 11123123messahdd', spy.callback);
			expect(spy.callback.calls.count()).toBe(1);
			expect(spy.callback).toHaveBeenCalledWith('Error! A white space missing before message');

		});

		it('must invoke the passed callback if a peer ID is invalid', function() {
			var spy = {
				callback : function() {}
			};
			spyOn(spy,'callback');
			messenger.peers = {0:11};
			messenger.messageHandler('> 11123123 messahdd', spy.callback);
			expect(spy.callback.calls.count()).toBe(1);
			expect(spy.callback).toHaveBeenCalledWith('Error! Enter a valid peer ID');

		});

	});

});
let sam;
let api;

(function () {

	var model = {
		curDspAlgo: -1,
		curSub: -1,
		maps: []
	};

	function setDSPAlgo(a) {
	}

	function setSubmap(m) {
	}


	function setSubmapAlgo(m) {
	}

	function setMapVal(par, val) {
	}

	function setXY(x, y) {
	}

	function accept1(model) {
		function p(proposal) {
			console.log({ t: 'ACCEPT1', model, proposal })
		}
	}

	sam = tp.createInstance({});
	api = tp.api(sam);

	console.log({ sam, api });

	api.addInitialState({
		counter: 0
	});

	function myAcc(model) {
		console.log({myAccModel:model});
		return function(proposal) {
			console.log({myAccProposal:proposal});
			model.counter +=10;
		}
	}
	var ret = api.addComponent({
		actions: [
			(prebuild)=>prebuild,
			() => ({ incBy: 1 }),
			['LABELED_ACTION', () => ({ incBy: 2 })],
			function(a,b,c) {
				return {a,b,c,incBy:1000};
			}
				
		],
		acceptors: [
			model => proposal => model.counter += proposal.incBy || 1,
			myAcc
		],
		naps: [
			(state) => () => { 
				console.log('nap 1 '+state.counter);
				return false;
			},
			(state) => () => {
				console.log('nap 2');
				if (state.counter<100) {
					window.intents[1]();
					return true;
				}
				return false;
			},
			(state) => () => {
				console.log('nap 3');
				return false
			}
		]

	});
	window.intents = ret.intents;
	api.setRender(function(state) {
		console.log({renderState:state});
	});
	console.log({ret});


})();


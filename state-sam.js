let sam;
let api;
var tags = 'zoom,dist,dx,dy,rot,par1,par2,par3,par4,par5,par6,par7,par8,par9,par10,par11,par12,par3,par14,par15,par16'.split(',');

(function () {

	var model = {
		dspAlgo: -1,
		curMap: -1,
		maps: [],
		zz:33
	};

	for(var i=0; i<16; i++) {
		let desc = model.maps[i] =  {
			algo:0,
			pars:[],
			uivalues:{} 
		};
		for(var tag of tags) 
			desc.uivalues[tag] = 500;
	}

	var oldj='{}',oldmodel,reactchanged;
	function myreact1(model) {
		var j=JSON.stringify(model);
		if (j==oldj) {
			reactchanged = false;
			console.log('myreact1 no change');
			return;
		}
		reactchanged = true;
		var oldmodel = JSON.parse(oldj);
		oldj = j;
		console.log('myreact1 '+reactchanged);

	}

	function myreact2(model) {

		if (!reactchanged)
			return;
		console.log('myreact2');
		if (oldmodel.dspAlgo!=model.dspAlgo) {
			console.log('set algo');
			var algo = synth.algos[model.dspAlgo];
			todsp({dspAlgo: model.dspAlgo});
			for(var i=0; i<16;i++)
				$('#sublab'+i).text('');
			for(var i=0; i<16; i++) {
				let par = algo.params[i];
				let lab = $('#sublab'+i);
				if (!par) {
					lab.text('');
					canvas.disablesub(i);
				}
				else {
					lab.text(par.name);
					canvas.drawsub(i);
				}
			}
		}
	}
	
	function mynap1(state) {
		console.log({mynap1: state});
		var disablerender = window.dr;
		return disablerender;
	}

	sam = tp.createInstance({});
	api = tp.api(sam);
	api.addInitialState(model);

	function accept(proposal, model) {
		console.log({accept:proposal});
		for(var k in model)
			if (_.has(proposal,k))
				model[k] = proposal[k];

		if (proposal.map && proposal.mapn) 
			model.maps[mapn] = proposal.map;
		if (_.has(proposal, 'value')) {
			model.maps[proposal.mapn || model.curMap][proposal.field] = value;
		}
	}
	
	var ret = api.addComponent({
		actions: [
			(prebuild)=>prebuild
		],
		acceptors: [
			model => proposal=>accept(proposal, model)
		],
		reactors: [
			model => () => myreact1(model),
			model => () => myreact2(model),
			model => () => console.log('r3'),
			model => () => console.log('r4')
		],
		naps: [
			(state) => () => mynap1(state)
		]
	});

	window.intents = ret.intents;
	window.present = ret.intents[0];
	api.setRender(function(state) {
		console.log({renderState:state});
	});
	console.log({ret});


})();


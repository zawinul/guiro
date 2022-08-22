let sam;
let api;
var tags = 'zoom,dist,dx,dy,rot,par1,par2,par3,par4,par5,par6,par7,par8,par9,par10,par11,par12,par3,par14,par15,par16'.split(',');

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


function myreact1(representation) {

	console.log('myreact2');
	var algo = synth.algos[representation.dspAlgo];
	todsp({dspAlgo: representation.dspAlgo});
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

function mynap1(representation) {
	console.log({mynap1: representation});
	var disablerender = window.dr;
	return disablerender;
}

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

var state = statemanager({
	model,
	representer: model=>JSON.parse(JSON.stringify(model)),
	acceptors: [accept],
	reactors:[myreact1],
	naps: [mynap1]
});



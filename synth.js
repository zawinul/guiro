var sph=0;

var sineExperiment = {
	label: 'sine experiment',
	desc: 'sine experiment',
	process: function(inbuf, outbuf, controls) {
		let f = .1*(.1+controls[0]);
		let y = Math.sin(sph+=f);
		y*=controls[1];
		outbuf[0] = y*controls[2];
		outbuf[1] = y*(1-controls[2]);
	},
	
	params:[
		{name:'f'},
		{name:'amp'},
		{name:'pan'}
	]
}

function fm() {
	var ph = [0,0,0,0,0];
	var f = [4,2,3,5,6,7].map(x=>x*.02);
	console.log({f});
	function process(inbuf, outbuf, controls) {
		var fp = f[0];
		for(var i=1;i<5;i++) {
			ph[i] += f[i];
			fp += Math.sin(ph[i])*controls[i]*.1;
		}

		ph[0] += fp;
		
		var y = Math.sin(ph[0])*controls[0];
		outbuf[0] = y;
		outbuf[1] = y;
	}

	return {
		label: 'fm',
		desc: 'fm',
		process,
		
		params:[
			{name:'port'},
			{name:'m1'},
			{name:'m2'},
			{name:'m3'},
			{name:'m4'}
		]
	}
}

var algos = [
	sineExperiment,
	fm()
]
//------------------------------------
var cur;

function process(inbuf, outbuf, controls) {
	cur.process(inbuf, outbuf, controls);
}


function setAlgo(n) {
	cur = algos[n];
}

setAlgo(0);

export default { 
	process,
	setAlgo,
	algos
}

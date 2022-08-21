console.log('D S P    6');

let ph=0,f=.1;

import value from './value.js';
import synth from './synth.js';
var x=0, y=0, vx=0, vy=0, ax=0, ay=0, targetx=0, targety=0, v=0, av=0;

const BUFFERDIM = 128*1024;
const UNDERSAMPLE = 1;

let cfg = {
	dump: .1,
	filt2: .001,
	vfilt: .15
};

let x_array = new Float32Array(BUFFERDIM);
let y_array = new Float32Array(BUFFERDIM);
let vx_array = new Float32Array(BUFFERDIM);
let vy_array = new Float32Array(BUFFERDIM);
let v_array = new Float32Array(BUFFERDIM);
let insertPointCursor = 0;
let lastRead = 0;
let us_count=0;
let yout=0;
let algo;

let lpx = value.lp2(), lpy=value.lp2();

function clip(x,xmin,xmax) {
	if (x<xmin) return xmin;
	if (x>xmax) return xmax;
	return x;
}

var firstTime=true;

function getval(x,y,parnum) {
	let [px,py] = value.transform(x,y,parnum);
	var v = value.value(px, py, parnum);
	return v;
}

function getOutputArray(outputs) {
	var map =  getOutputArray.map;
	var firstTime = false;
	if (!map) {
		map = getOutputArray.map  = [];
		firstTime = true;
	}
	var nChan = outputs[0].length;
	var sampleLength = outputs[0][0].length;
	var mc = map[nChan];
	if (!mc)
		mc = map[nChan] = [];
	var mcl = mc[sampleLength];
	if (!mcl) {
		mcl = mc[sampleLength] = [];
		for(var i=0; i<sampleLength;i++)
			mcl.push(new Float32Array(nChan));
	}
	return mcl;
}


function getInputArray(inputs) {
	var map =  getInputArray.map;
	if (!map) 
		map = getInputArray.map  = [];
	var nChan = inputs[0].length;
	//console.log({nChan});
	var sampleLength = (nChan>0) ? inputs[0][0].length : 0;
	//console.log({sampleLength});
	var mc = map[nChan];
	if (!mc)
		mc = map[nChan] = [];
	var mcl = mc[sampleLength];
	if (!mcl) {
		mcl = mc[sampleLength] = [];
		for(var i=0; i<sampleLength;i++)
			mcl.push(new Float32Array(nChan));
	}
	return mcl;
}

class MyCustomProcessor extends AudioWorkletProcessor {
	
	constructor(...args) {
        super(...args)

		value.init();
        
		console.log('sr '+sampleRate);
		let outfun = x=>this.port.postMessage(x);
        this.port.onmessage = (e) => {
            //console.log('received '+e.data);
			try {
	            onDataInput(e.data, outfun);
			}
			catch(err) {
				console.log(err);
			}
        }
    }

	process(inputs, outputs, parameters) {
		let outp = getOutputArray(outputs);
		let inp = getInputArray(inputs);

		try {
			if (firstTime) {
				console.log(JSON.stringify({ parameters},null,2));
				firstTime = false;
			}
			function undersampleControl() {
				insertPoint(x,y,vx,vy,v);
			}

			function xy_step() {
				x = lpx.process(targetx);
				y = lpy.process(targety);
			}

			let len = outp.length;
			//showInfo({inputs, outputs, parameters, l:output[0]});
			for (let sample=0; sample<len; sample++) {
				
				if (us_count%UNDERSAMPLE==0) 
					undersampleControl();
				us_count++;

				xy_step();
				let controls = [];
				let p = synth.algos[algo || 0].params;
				for(var i=0; i<16;i++)
					controls[i] = p[i] ? getval(x,y,i) : 0;

				var inbuf = inp[sample];
				var outbuf = outp[sample];
				
				var port = inputs[0]; // ignore input ports > 1
				for(var chan=0; chan<port.length; chan++) 
					inbuf[chan] = port[chan][sample];
		
				synth.process(inbuf, outbuf, controls);
				
				for(var outport=0; outport<outputs.length; outport++) {
					var port = outputs[outport];
					for(var chan=0; chan<port.length; chan++) 
						outputs[outport][chan][sample] = outbuf[chan];
				}
			}
		}catch(err) {
			console.log(err);
		}
        return true
    }

}

function onDataInput(msg, outfun) {
	//console.log({msg});
	if (msg.charAt(0)=='{') {
		let obj = JSON.parse(msg);
		if (obj.maps) {
			value.setmaps(obj.maps);
		}
		if (obj.cfg) {
			cfg = obj.cfg;
		}
		if (obj.x && obj.y) {
			targetx=obj.x;
			targety=obj.y;
		}
		if (obj.dspAlgo)  {
			let algo = obj.dspAlgo;
			synth.setAlgo(algo);
		}
		if (obj.status) {
			outfun('status '+JSON.stringify({		
				x, y, vx, vy, ax, ay, targetx, targety
			},null,2));
		}
	}

	if (msg.indexOf('telemetry_n ')==0) {
		let n = msg.split(' ')[1]-0;
		telemetry_n(n, outfun);
	}
	else if (msg.indexOf('v_telemetry')==0) {
		telemetry_v(outfun);
	}
	else if (msg.indexOf('telemetry ')==0) {
		telemetry(outfun);
	}
}

function telemetry(outfun) {
	try{
		let lastWrite = (insertPointCursor-1) % BUFFERDIM;
		let acc=['tele'];
		while(lastRead!=lastWrite) {
			let p = lastRead;
			lastRead = (lastRead+1) % BUFFERDIM;
			let a = [
				x_array[p],
				y_array[p],
				vx_array[p],
				vy_array[p],
				v_array[p] 
			];
			acc.push(a.map(x=>x.toString()).join(','));
		}
		let msg = acc.join('\n');
		outfun(msg);
	}
	catch(e) {
		console.log(e);
	}
}


function telemetry_v(outfun) {
	try{
		let lastWrite = (insertPointCursor-1) % BUFFERDIM;
		let acc=['vtele'];
		while(lastRead!=lastWrite) {
			let p = lastRead;
			lastRead = (lastRead+1) % BUFFERDIM;
			acc.push(v_array[p]);
		}
		let msg = acc.join('\n');
		outfun(msg);
	}
	catch(e) {
		console.log(e);
	}
}

function telemetry_n(n, outfun) {
	try{
		let last = (insertPointCursor-1) % BUFFERDIM;
		let first = (last-n) % BUFFERDIM;
		let acc=['tele'];
		for(let i=0, p=first; i<n; i++) {
			let a = [
				x_array[p],
				y_array[p],
				vx_array[p],
				vy_array[p],
				v_array[p] 
			];
			acc.push(a.map(x=>x.toString()).join(','));
			p++;
			if (p>=BUFFERDIM) p=0;
		}
		let msg = acc.join('\n');
		outfun(msg);

	}
	catch(e) {
		console.log(e);
	}
}

function insertPoint(x,y,vx,vy,v) {
	x_array[insertPointCursor] = x;
	y_array[insertPointCursor] = y;
	vx_array[insertPointCursor] = vx;
	vy_array[insertPointCursor] = vy;
	v_array[insertPointCursor] = v;
	
	insertPointCursor = (insertPointCursor+1) % BUFFERDIM;
}




//let last_ts = new Date().getTime();

// function insertpoint(x,y) {
// 	let v = value.value(x,y);
// }

// function setxy(newx,newy, timestamp) {
// 	let dt=timestamp-last_ts;
// 	// assumo che target = src + v0*dt + a*dt*(dt-1)/2
// 	// => a*dt*(dt-1)/2 = target-src-v0*dt
// 	// => a*dt*(dt-1) = 2*(target-src-v0*dt)
// 	// => a = 2*(target-src-v0*dt)/(dt*(dt-1))

// 	let ax = 2*(newx-x-vx*dt)/(dt*(dt-1));
// 	let ay = 2*(newy-y-vy*dt)/(dt*(dt-1));

// 	let ma=Math.sqrt(ax*ax+ay*ay);
// 	if (ma>maxa) {
// 		let fact = maxa/ma;
// 		ax /=fact;
// 		ay /= fact;
// 	}
// 	// for(let i=0;i<dt;i++) {
// 	// 	x += vx;
// 	// 	y += vy;
// 	// 	vx += ax;
// 	// 	vy += ay;
// 	// 	insertpoint(x,y);
// 	// }
// } 

function showInfo(val) {
	if (showInfo.done)
		return;
	showInfo.done=true;
	console.log(val);
};


registerProcessor('my-custom-dsp', MyCustomProcessor);

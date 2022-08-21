let ctx,myNode,gain;

//console.log({z});
const PAD_CANVASW=400;
const PAD_CANVASH=400;

const TELE_CANVASW=400;
const TELE_CANVASH=100;
let subs=[], sublabs=[];
let dspAlgo;

let mousemove_cfg = {
	dump: .1,
	filt2: .001,
	vfilt: .15
};

let curmap=0;

var selectMapAlgo = onParChange(_selectMapAlgo);
var selectSub = onParChange(_selectSub);


function readVelAccSliders() {
	let sa = ($('.slide-element.acc input').val()-500)/500;
	let sv = ($('.slide-element.vel input').val()-500)/500;
	mousemove_cfg.filt2 = .001*Math.pow(100,sa);
	mousemove_cfg.dump = .1*Math.pow(100,sv);
	let j = JSON.stringify(	{cfg:mousemove_cfg});
	todsp(j);
	//console.log(j);
}

async function audioInit() {
	try {
		console.log('audioinit');
		ctx = new (window.AudioContext || window.webkitAudioContext)();
		console.log(ctx.sampleRate);
		console.log(ctx.destination.channelCount); // 2 channels

		await ctx.audioWorklet.addModule('./dsp.js?ver='+new Date().getTime());

		myNode = new AudioWorkletNode(ctx, 'my-custom-dsp', {
			outputChannelCount: [2],
			numberOfOutputs: 1
		});
		updateDspMaps();

		gain = ctx.createGain();
		myNode.connect(gain);
		gain.connect(ctx.destination);

		gain.gain.value=.1;

		//	setInterval(()=>todsp('telemetry_n 20'), 200);
		//setInterval(()=>todsp('v_telemetry'), 100);
		setInterval(readVelAccSliders, 1000);
		readVelAccSliders();
		myNode.port.onmessage = (e) => onPortData(e.data);

	}
	catch(e) {
		console.log({e});
		if (e.stack)
			console.log(e.stack);
	}
}

function onPortData(data) {
	//console.log("onPortData " +data);
	if (data.substring(0,4)=='tele')
		showTelemetry(data);
	if (data.substring(0,5)=='vtele')
		showVTelemetry(data);
	if (data.substring(0,7)=='status ') {
		let status = JSON.parse(data.substring(7));
		window.lastStatus=status;
		onStatus(status);
		//console.log(status.x,status.y);
	}
	
}

function onStatus(status) {
	canvas.showMouse(status.x, status.y, status.targetx, status.targety);
}

function showTelemetry(data) {
	let rows = data.split('\n');
	let arr = [];
	const brow = i => rows[i].split(',').map(x=>x-0);

	for(i=1; i<rows.length; i+=100)
		arr.push(brow(i));

	arr.push(brow(rows.length-1));

	let [x,y,vx,vy,v] = brow(rows.length-1);
	canvas.telemetry(arr);
	let txt = JSON.stringify({x,y,vx,vy,v,len:rows.length}, null,2);
	$('.info').text(txt);

}


function showVTelemetry(data) {
	let rows = data.split('\n');
	let arr = [];
	for(let i=1;i<rows.length;i++)
		arr.push(rows[i]-0);
	canvas.vtelemetry(arr);
	//canvas.invalidate(curmap, $('#sub'+curmap)[0]);
	canvas.redraw(curmap);
}

function todsp(x) {
	if (typeof(x)!='string')
		x = JSON.stringify(x);
	try {
		if (myNode) {
			myNode.port.postMessage(x);
		}
	} catch(e) { console.log(e);}
}


function terminate() {
	myNode.disconnect();
	gain.disconnect();
	ctx.close();
}

function onStart() {
	$('.start').remove();
	try {
		audioInit();
	} catch(err) {
		console.log({err});
	}	
}

function buildSlider(container, label, clss, callback) {
	let h = `
<div class="slide-element ${clss}">
<div class="label">${label}</div>
<input type="range" min="0" max="1000" value="500" class="slider">
</div>`;

	let slider = $(h).appendTo(container);
	$('input', slider).change(callback)
	$('input', slider).on('input',callback)
}

const norm01 = name=>($(`.slidecontainer .${name} input`).val())/1000;
const norm11 = name=>(($(`.slidecontainer .${name} input`).val())/1000)*2-1;

function adjustMap() {
	let container = $('.slidecontainer');
	var desc = value.maps()[curmap];
	desc.index=curmap;

	
	desc.zoom = Math.pow(10, norm11('zoom'));
	desc.dist = norm11('dist')*3;
	desc.zoomx = desc.zoom*Math.pow(2, desc.dist);	
	desc.zoomy = desc.zoom*Math.pow(2, -desc.dist);	
	desc.dx  = norm11('dx');
	desc.dy  = norm11('dy');
	desc.rot = norm11('rot')*Math.PI;
	desc.sinAlpha = Math.sin(desc.rot);
	desc.cosAlpha = Math.cos(desc.rot);

	for(var i=0; i<16; i++)
		desc.pars[i] = norm11(`par${i+1}`);

	for(var tag of tags) 
		desc.uivalues[tag] = $(`.slide-element.${tag} input`).val();

	canvas.redraw(curmap);
	updateDspMaps();
}


function _selectSub(mapnum) {
	console.log('select sub '+mapnum);
	curmap = mapnum;
	var desc = value.maps()[curmap];
	desc.algo = desc.algo || 0;
	selectMapAlgo(mapnum, desc.algo);
	if (desc.uivalues) {
		if (mapnum==0 && (value.maps()[mapnum].uivalues.rot-0)!=500) 
			console.log('s2 '+value.maps()[mapnum].uivalues.rot);

		for(var tag in desc.uivalues) {
			var slider = $(`.slide-element.${tag} input`);
			var v = desc.uivalues[tag]-0;
			slider.val(v);
			setTimeout(()=>slider.trigger('change'), 1);
			if (mapnum==0)
				setTimeout(()=> {
					console.log('s3 '+value.maps()[mapnum].uivalues.rot);
				}, 10);
		}
	}
	$('.sub').removeClass('selected');
	$('#sub'+mapnum).addClass('selected');
	adjustMap();
}

let tags = 'zoom,dist,dx,dy,rot,par1,par2,par3,par4,par5,par6,par7,par8,par9,par10,par11,par12,par3,par14,par15,par16'.split(',');
function initMapDescriptors() {
	let desc;
	for(var i=0; i<16; i++) {
		value.maps()[i] = desc = {
			algo:0,
			pars:[],
			uivalues:{} 
		};
		for(var tag of tags) 
			desc.uivalues[tag] = $(`.slide-element.${tag} input`).val();
	}
	updateDspMaps();
}

let canvasElement;

function init() {
	initColors();
	initMapDescriptors();
	value.init();

	n = value.modules.map(x=>x.label);
	for(let i=0; i<n.length; i++) 
		$(`<option value="${i}">${n[i]}</option>`).appendTo('.map-algo-sel');

	$('.map-algo-sel').change(()=>selectMapAlgo(curmap, $('.map-algo-sel').val()-0));

	$('.start').click(onStart);


	let sc = $('.slidecontainer');
	buildSlider(sc, 'mov acc', 'acc row1',readVelAccSliders);
	buildSlider(sc, 'mov vel', 'vel row1',readVelAccSliders);
	buildSlider(sc, 'zoom', 'zoom row1', adjustMap);
	buildSlider(sc, 'dist', 'dist row1', adjustMap);
	buildSlider(sc, 'dx', 'dx row1', adjustMap);
	buildSlider(sc, 'dy', 'dy row1', adjustMap);
	buildSlider(sc, 'rot', 'rot row1', adjustMap);
	for(var i=0;i<16;i++) {
		let cl = i==0 ? 'cleft par'+(i+1) : 'par'+(i+1);
		buildSlider(sc, 'par '+(i+1), cl, adjustMap);
	}
	for(let m=0;m<16;m++) {
		curmap = m;
		adjustMap();
	}
	curmap=0;
	var main = $('.main-space');
	var mwidth = main.width(), mheight=main.height();
	const MARGIN=5;

	let padCanvas = $(`<canvas class="pad" width=${PAD_CANVASW} height=${PAD_CANVASH}></canvas>`);
	let mapCanvas = $(`<canvas class="map" width=${PAD_CANVASW} height=${PAD_CANVASH}></canvas>`);
	$('.pad-canvas-area').css({
		width:PAD_CANVASW,
		height:PAD_CANVASH
	});
	$('.pad-canvas-area').css({
		width: PAD_CANVASW+2*MARGIN,
		height: PAD_CANVASH+2*MARGIN,
		padding: MARGIN+'px'
	});

	padCanvas.appendTo('.pad-canvas-area').css({zIndex:10, left:MARGIN, top:MARGIN});
	mapCanvas.appendTo('.pad-canvas-area').css({left:MARGIN, top:MARGIN});
	padCanvas[0].onmousemove = (e) => {
		let x = (e.offsetX/PAD_CANVASW)*2-1;
		let y = (e.offsetY/PAD_CANVASH)*2-1;
		//console.log({x,y,ax:e.offsetX, c:CANVASW});
		todsp({x,y});
	}

	const lwidth = PAD_CANVASW+2*MARGIN;
	const rwidth = mwidth-lwidth;
	const subw = Math.floor(rwidth/8)-MARGIN;
	for(let i=0; i<16;i++) {
		let l = lwidth+(i%8)*(subw+MARGIN);
		let t = MARGIN+Math.floor(i/8)*(subw+MARGIN+12);
		subs[i]=$(`<canvas width=${subw} height=${subw} class="sub" id="sub${i}">`)
			.appendTo(main)
			.click(()=>selectSub(i))
			.css({left:l, top:t});

		sublabs[i] = $(`<div class="sublab" id="sublab${i}">`)
			.text('')
			.appendTo(main)
			.css({left:l, top:t+subw+1, width:subw});
	}

	let teleCanvas = $(`<canvas class="tele" width=${rwidth} height=${TELE_CANVASH}></canvas>`);
	teleCanvas.appendTo('.tele-canvas-area');
	$('.tele-canvas-area').css({
		left:lwidth,
		top:3*MARGIN+2*subw
	});
	
	canvas.init(
		value,
		padCanvas[0], mapCanvas[0], PAD_CANVASW, PAD_CANVASH,
		teleCanvas[0], TELE_CANVASW, TELE_CANVASH,
		subs.map(x=>x[0]),
		subw, subw
	);

	for(var i=0; i<synth.algos.length;i++) 
		$(`<option value="${i}">${synth.algos[i].label}</option>`).appendTo('.dsp-sel');

	$('.dsp-sel').change(function(){
		dspAlgo = $('.dsp-sel').val();
		onDspChange();
	});

	$('.dsp-sel').val(0).trigger('change');
	selectSub(0);

}

function _selectMapAlgo(mapnum, algo) {
	console.log('selectMapAlgo '+mapnum+' '+algo);
	var map = value.maps()[mapnum];
	map.algo = algo;
	var mod = value.modules[algo];
	for(var i=0; i<16;i++) {
		let par = mod.params[i];
		let el = $(`.slide-element.par${i+1}`);
		if (par){
			$('.label', el).text(par);
			el.removeClass('disabled');
			$('input', el).removeAttr('disabled');
		}
		else{
			$('.label', el).text('');
			el.addClass('disabled');
			$('input', el).attr('disabled', 'disabled');
		}
	}
	selectSub.force()(curmap);
}

var osub=-1;
function _updateAll() {
	function updateSliders(desc) {
		if (desc.uivalues && desc.changed) {
			for(var tag in desc.uivalues) {
				var slider = $(`.slide-element.${tag} input`);
				var v = desc.uivalues[tag]-0;
				slider.val(v);
				setTimeout(()=>slider.trigger('change'), 1);
			}
		}

	}
	var sub = curmap;
	if (sub!=osub) {
		osub = sub;
		console.log('select sub '+mapnum);
		var desc = value.maps()[curmap];
		desc.algo = desc.algo || 0;
		selectMapAlgo(mapnum, desc.algo);
		if (desc.uivalues) {
			for(var tag in desc.uivalues) {
				var slider = $(`.slide-element.${tag} input`);
				var v = desc.uivalues[tag]-0;
				slider.val(v);
				setTimeout(()=>slider.trigger('change'), 1);
				if (mapnum==0)
					setTimeout(()=> {
						console.log('s3 '+value.maps()[mapnum].uivalues.rot);
					}, 10);
			}
		}
		$('.sub').removeClass('selected');
		$('#sub'+mapnum).addClass('selected');
		adjustMap();
	
	} 

}

const updateAll = _.debounce(_updateAll, 30);

function onDspChange() {
	var algo = synth.algos[dspAlgo];
	todsp({dspAlgo});
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


var lpx, lpy;
function debugfilt() {
	lpx = value.lp2();
	lpy = value.lp2();
	var x=0,y=0,fx=0,fy=0;
	var w = window.innerWidth, h=window.innerHeight;
	var c=$('<div>x</>').appendTo('body').css({
		width:10,height:10,
		position:'absolute',
		zIndex:9999,
		color:'black',
		backgroundColor:'yellow',
		padding:1
	});
	function update() {
		fx=lpx.process(x);
		fy=lpy.process(y);
		c.css({top:fy+'px', left:fx+'px'});
		c.text(""+Math.floor(10*Math.random()));
		setTimeout(update,1);
	}
	update();
	function change() {
		x=Math.random()*w;
		y=Math.random()*h;
		setTimeout(change, 2000*(.5+Math.random()));
		//console.log({x,y});
	}
	change();
}

//setTimeout(debugfilt,3000);
function monitor() {
	function single() {
		todsp({status:1});
	}
	setInterval(single, 100);	
}
monitor();

function initColors() {
	var subcolors = [];
	//let fun = hslToRgb;
	let fun = hslToRgb;
	for(var j=0;j<16;j++) {
		//let i = ((j&8)>>3)+((j&4)>>1)+((j&2)<<1)+((j&1)<<3);
		let i = j;
		var h = i/16;
		
		var d = fun(h,1,.45).map(x=>Math.floor(x+.5));
		var l = fun(h,1,1).map(x=>Math.floor(x+.5));
		subcolors.push({
			h,
			i,
			dark  : {rgb:d, css:'#'+rgbToHex(d)},
			light : {rgb:l, css:'#'+rgbToHex(l)}
		});
	};
	window.subcolors=subcolors;
	var c = $('.tele-canvas-area');
	for(var i=0;i<16;i++) {
		$('<div>.</div>').appendTo(c).css({
			top:2, height:10,
			left:2+12*i, width:10,
			zIndex:99999,
			position:'absolute',
			backgroundColor: subcolors[i].light.css
		});
		$('<div>.</div>').appendTo(c).css({
			top:14, height:10,
			left:2+12*i, width:10,
			zIndex:99999,
			position:'absolute',
			backgroundColor: subcolors[i].dark.css
		});
	}
	
}

function serialize() {
	// simplify maps
	let smaps = JSON.parse(JSON.stringify(value.maps()));
	for(var i=0; i<16; i++) 
		smaps[i].pars = [];
	let obj = {
		dspAlgo,
		maps:smaps,
		curmap
	};
	return JSON.stringify(obj,null,'\t');
}

const updateDspMaps = _.debounce(function(){
	console.log('update dsp maps');
	todsp({maps:value.maps(),dspAlgo});
}, 100)

function deserialize(str) {
	let obj = JSON.parse(str);
	value.setmaps(obj.maps);
	updateDspMaps();
	onDspChange();
	for(var i=0; i<16; i++) {
		if (i==0) console.log('s1 '+value.maps()[i].uivalues.rot);
		selectSub(i);
		//	var desc = maps(curmap);
	// 	desc.pars = [];
	// 	if (desc.uivalues) {
	// 		for(var tag in desc.uivalues) {
	// 			$(`.slide-element.${tag} input`).val(desc.uivalues[tag]-0).trigger('change');
	// 		}
	// 	}	
		
	}
	curmap = obj.curmap;
	updateDspMaps();
	selectSub(curmap);
	canvas.redraw(curmap);
}

function store() {
	localStorage.curGuiro = serialize();	
}

function restore() {
	deserialize(localStorage.curGuiro);
}

$(init);


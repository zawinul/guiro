
let maps = [];
function r2p(x,y) {
	return [Math.sqrt(x*x+y*y), Math.atan2(y,x)];
}


function wsaw(x) { x-= Math.floor(x); return x; }
function wsin(x) { return Math.sin(x*Math.PI*2)*.5+.5; }
function wsquare(x) { x -= Math.floor(x); return x>.5?1:0; }
function pow(x,y) { return x>0?Math.pow(x,y):-Math.pow(-x,y);}
function clip(x,a,b) { return x>b ? b : (x<a?a:x);}
function min(a,b) { return a<b?a:b;}
function max(a,b) { return a>b?a:b;}

function transform(x,y,mapnum) {
	//console.log(`transform ${x} ${y} ${mapnum}`);
	let map = maps[mapnum];
	let zx = map.zoomx || 1;
	let zy = map.zoomy || 1;
	let dx = map.dx || 0;
	let dy = map.dy || 0;
	let [rx,ry] = [x,y];
	
	x = rx*map.cosAlpha - ry*map.sinAlpha;
	y = rx*map.sinAlpha + ry*map.cosAlpha;
	
	x=x/zx-dx;
	y=y/zy-dy;
	//console.log({x,y,s:map.sinAlpha})	
	return [x,y];
}


function inverse_transform(x,y,mapnum) {
	//console.log(`transform ${x} ${y} ${mapnum}`);
	let map = maps[mapnum];
	let zx = map.zoomx || 1;
	let zy = map.zoomy || 1;
	let dx = map.dx || 0;
	let dy = map.dy || 0;

	x = (x+dx)*zx;
	y = (y+dy)*zy;
	let [rx,ry] = [x,y];
	
	x = rx*map.cosAlpha + ry*map.sinAlpha;
	y = -rx*map.sinAlpha + ry*map.cosAlpha;
	
	return [x,y];
}

function value(x,y, mapnum) {
	let map = maps[mapnum];
	let mod = modules[map.algo];
	let a = mod.compute(x,y,map.pars);
	a = clip(a,0,1);
	return a;
}

function lp2() {
	var amp = 1;
	var freq = .0005;
	var q = 1;
	var fb=0,bp=0;
	var lp=0,hp=0,bp=0;

	function process(x) {
		x *= amp;
		hp = (x=x-fb);
		x=hp*freq;
		x=bp=x+bp;
		x*=freq;
		x=lp=x+lp;
		fb=x+bp*q;
		return lp;
	}

	function setq(x) {
		q=x;
	}
	function setamp(x) {
		amp=x;
	}
	function setf(f) {
		freq=f;
	}
	return { process, setq, setf, setamp }
}


function init() {
}

function x() {
	function compute(x,y,pars) {
		return pow(x*.5+.5,pow(5,pars[0]));	
	}

	return {
		compute,
		label:'x',
		desc:'',
		params:['pow']
	}

}


function y() {
	function compute(x,y,pars) {
		return pow(y*.5+.5,pow(5,pars[0]));	
	}

	return {
		compute,
		label:'y',
		desc:'',
		params:['pow']
	}

}
function quad() {
	function compute(x,y,pars) {
		let a = Math.floor(x*4)+Math.floor(y*4);
		return a&1;	
	}

	return {
		compute,
		label:'quad',
		desc:'',
		params:['smooth']
	}
};


function sbell() {
	function compute(x,y,par) {
		let p = 1/(1+x*x+y*y)
		let a = (Math.sin(x*10*par[0])*.5+.5)*p;
		return a;	
	}

	return {
		compute,
		label:'sin under bell',
		desc:'',
		params:['f']
	}
};

function triangle(x, shape) {
	x -= Math.floor(x);
	if (shape==1)
		return x;
	if (shape==0)
		return 1-x;
	if (x<shape)
		return x/shape;
	else 
		return 1-(x-shape)/(1-shape)
}

function triangleX() {
	function compute(x,y,par) {
		return triangle(x*8,par[0]*.5+.5);
	}

	return {
		compute,
		label:'triangle x',
		desc:'',
		params:['shape']
	}
};

let modules = [
	x(),
	y(),
	triangleX(),
	quad(),
	sbell(),
];
export default { 
	transform,
	inverse_transform,
	value,
	init,
	maps:()=>maps,
	modules,
	setmaps:m=>maps=m,
	lp2
 }

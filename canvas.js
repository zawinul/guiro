let w=200;
let h=200;
let padContext, mapContext, mapCanvas, mainDataImage,mainData, subDataImage, subData;
let teleContext, tw,th,subs,subw,subh;
let timeph= -10;

let telemetryData = null;
const nvt = 25000;
let vtelemetryData = [];
for(var i=0; i<nvt; i++) vtelemetryData[i]=0;

let value;

function clip(x,xmin,xmax) {
	if (x<xmin) return xmin;
	if (x>xmax) return xmax;
	return x;
}

function init(_value, padCanvas, _mapCanvas, _w, _h, teleCanvas, _tw, _th, _subs, _subw, _subh) {
	value = _value;
	mapCanvas = _mapCanvas;
	w = _w;
	h = _h;
	tw = _tw;
	th = _th;
	subs = _subs;
	subw = _subw;
	subh = _subh;
	console.log('initcanvas',{w,h,tw,th})
	padContext = padCanvas.getContext('2d');
	mapContext = mapCanvas.getContext('2d');

	mainDataImage = mapContext.createImageData(w, h);
	mainData=mainDataImage.data;
 

	subDataImage = mapContext.createImageData(subw, subh);
	subData = subDataImage.data;

	teleContext = teleCanvas.getContext('2d');
	
	//mainLoop();	
}		

function immediateRedraw(map) {
	draw(map);
	drawsub(map);
}
const redraw = _.debounce(immediateRedraw, 20);

// function mainLoop() {
// 	try {
// 		timeph++;
// 		if (timeph == 0) {
// 			draw(curmap);
// 			drawsub(curmap);
// 		}
// 	} 
// 	catch(e) {
// 		console.log(e);
// 	}
// 	setTimeout(mainLoop,1);
// }

function invalidate() {
	timeph = -3;
}

function mainSet(x,y,v,n) {
    let px = Math.floor((x*.5+.5)*w);
    let py = Math.floor((y*.5+.5)*h);
    let pv = Math.floor(clip(v*255,0,255));
    
    let adr = (py*w+px)*4;
    mainData[adr++] = pv;
    mainData[adr++] = pv;
    mainData[adr++] = pv;
    mainData[adr++] = 255;
}


function subSet(x,y,v,h) {
    let px = Math.floor((x*.5+.5)*subw);
    let py = Math.floor((y*.5+.5)*subh);
    let pv = Math.floor(clip(v*255,0,255));
	//let [r,g,b] = hslToRgb(h,.5,v);
	let [r,g,b] = [pv, pv, pv];
    
    let adr = (py*subw+px)*4;
    subData[adr++] = r;
    subData[adr++] = g;
    subData[adr++] = b;
    subData[adr++] = 255;
	//console.log('subset '+JSON.stringify([x,y,v]));
}

function makeMainMap(mapnum) {
	let n = w;
	let stepx = 2 / n;
	let stepy = 2 / n;
	for (var x = -1; x < 1; x += stepx) {
		for (var y = -1; y < 1; y += stepy) {
			let [px,py] = value.transform(x,y,mapnum);
			var v = value.value(px, py, mapnum);
			mainSet(x, y, v);
		}
	}
}

function makeSubMap(mapnum) {
	var h = subcolors[mapnum].h;
	let stepx = 2 / subw;
	let stepy = 2 / subw;
	for (var x = -1; x < 1; x += stepx) {
		for (var y = -1; y < 1; y += stepy) {
			let [px,py] = value.transform(x,y,mapnum);
			var v = value.value(px, py, mapnum);
			subSet(x, y, v, h);
		}
	}
//	console.log({sublimit:[x,y]})
}

function draw(mapnum) {
	//if (!draw.initialized)
	makeMainMap(mapnum);
	mapContext.putImageData(mainDataImage, 0, 0);
	
	mapContext.filter = 'blur(0.5px)'; 
	mapContext.drawImage(mapCanvas, 0, 0);
	mapContext.filter = 'none'; 
	showSquare(mapnum);
	showVTelemetry(mapnum);
	showTelemetry(mapnum);
	draw.initialized=true;
}

function showSquare(mapnum) {
	function mapPoint(p) {
		let [x,y] = value.inverse_transform(p[0], p[1], mapnum);
		x = xtopix(x);
		y = ytopix(y);
		var ret = [x,y];

		return ret;
	}
	let points = [[-1,-1],[-1,1],[1,1],[1,-1]].map(mapPoint);
	
	mapContext.setLineDash([4, 4]);
	mapContext.beginPath();
	mapContext.moveTo(points[3][0], points[3][1]);
	for(var p of points) 
		mapContext.lineTo(p[0], p[1]);
	
	mapContext.lineWidth=3;
    mapContext.strokeStyle='#ff0000';
    mapContext.stroke();
}

const xtopix = x=>(x*.5+.5)*w;
const ytopix = y=>(y*.5+.5)*h;

function showTelemetry() {
	if (!telemetryData)
		return;

	//console.log('showtelemetry');
	padContext.beginPath();
    padContext.moveTo(xtopix(telemetryData[0][0]), ytopix(telemetryData[0][1])); 
    for(var i=0;i<telemetryData.length; i++) {
		let t = telemetryData[i];
		padContext.lineTo(xtopix(t[0]), ytopix(t[1]));
    }
	padContext.lineWidth=3.5;
    padContext.strokeStyle='#FF0000';
    padContext.stroke();

	padContext.beginPath();
    padContext.moveTo(xtopix(telemetryData[0][2]*5), ytopix(telemetryData[0][3]*5)); 
    for(var i=0;i<telemetryData.length; i++) {
		let t = telemetryData[i];
		padContext.lineTo(xtopix(t[2]*5), ytopix(t[3]*5));
    }
	padContext.lineWidth=3.5;
    padContext.strokeStyle='#0000FF';
    padContext.stroke();


	padContext.beginPath();
    padContext.moveTo(0, ytopix(telemetryData[0][5])); 
    for(var i=0;i<telemetryData.length; i++) {
		let t = telemetryData[i];
		padContext.lineTo(i*w/telemetryData.length, ytopix(t[5]));
    }
	padContext.lineWidth=3.5;
    padContext.strokeStyle='#00FF00';
    padContext.stroke();
}



function showVTelemetry() {
	if (!vtelemetryData)
		return;

	
	const mapy = y=>(1-y)*th;
	teleContext.clearRect(0,0,tw,th);
	teleContext.beginPath();
	teleContext.moveTo(0, mapy(vtelemetryData[0])); 

    for(var i=0;i<vtelemetryData.length; i++) {
		teleContext.lineTo(i*tw/vtelemetryData.length, mapy(vtelemetryData[i])); 
	}
	teleContext.lineWidth=1.5;
    teleContext.strokeStyle='#400000';
    teleContext.stroke();
}


function telemetry(data) {
	//console.log(' canvas telemetry '+data.length);
	telemetryData=data;
	timeph = -2;
}

function vtelemetry(data) {
	let l = vtelemetryData.length;
	let d = data.length;
	let seglen = Math.min(l, d);
	for(var i=0; i<l-seglen; i++)
		vtelemetryData[i] = vtelemetryData[i+seglen];
	for(var i=0; i<seglen; i++)
		vtelemetryData[l-seglen+i] = data[i];
}

function showMouse(targetX, targetY, curX, curY) {
	padContext.clearRect(0,0,w,h);

	padContext.beginPath();

	padContext.lineWidth=1.5;
    padContext.strokeStyle='#FF0000';
 
	padContext.moveTo(xtopix(targetX-.1), ytopix(targetY));
	padContext.lineTo(xtopix(targetX+.1),  ytopix(targetY));
	padContext.stroke();
 
	padContext.moveTo(xtopix(targetX), ytopix(targetY-.1));
	padContext.lineTo(xtopix(targetX), ytopix(targetY+.1));
	padContext.stroke();

	padContext.beginPath();
	padContext.lineWidth=1.5;
   	padContext.strokeStyle='#0000FF';

	padContext.moveTo(xtopix(-1), ytopix(curY));
	padContext.lineTo(xtopix(1), ytopix(curY));
	padContext.stroke();

	padContext.moveTo(xtopix(curX), ytopix(-1));
	padContext.lineTo(xtopix(curX), ytopix(1));
	padContext.stroke();

}

function drawsub(mapnum) {
	let canvas = subs[mapnum];
	makeSubMap(mapnum);
	let ctx = canvas.getContext('2d');
	ctx.putImageData(subDataImage, 0, 0);
}


function disablesub(mapnum) {
	let canvas = subs[mapnum];
	let ctx = canvas.getContext('2d');
	ctx.fillStyle = "#c0c0c0";
	ctx.fillRect(0,0,subw, subw);
}

export default {
	init,
	//invalidate,
	telemetry,
	vtelemetry,
	showMouse,
	drawsub,
	disablesub,
	redraw,
	immediateRedraw
}
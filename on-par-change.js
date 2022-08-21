function onParChange(f) {
	var firstTime = true;
	var args, oldargs = [33,33,33,33,33,33,33,33];
	var ret = null;

	const f2 = function() {
		var t = this;
		let changed = 0;
		args = [];
		for(var i=0;i<arguments.length; i++) 
			args[i] = arguments[i];

		if (firstTime)
			changed = 1;
		else if (oldargs.length!=arguments.length)
			changed=2;
		else {
			for(var i=0;i<arguments.length; i++) {
				if (typeof(args[i])!=typeof(oldargs[i]))
					changed = 3;
				else if (args[i]!=oldargs[i])
					changed = 4;
			}
		}
		if (changed) {
			firstTime = false;
			oldargs = [];
			for(var i=0;i<arguments.length; i++) 
				oldargs[i] = arguments[i];
			ret = f.apply(t, args);
		}
		return ret;
	};
	f2.force = function() {
		firstTime=true;
		return f2;
	}
	return f2;
}

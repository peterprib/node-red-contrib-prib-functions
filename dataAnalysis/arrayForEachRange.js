[Array,Float32Array,Float64Array].forEach(object=>{
	if(object.prototype.forEachRange==null)
		Object.defineProperty(object.prototype, "forEachRange", {
			value(start=0,end=this.length-1,func,o=this) {
				if(start<=end) {
					if(end>=this.length) throw Error("end offset "+end+" >= array length "+this.length);
					if(start<0) throw Error("start offset "+start+"< 0");
					for(let i=start;i<=end;i++) func(this[i],i,this)
				} else {
					if(start>=this.length) throw Error("end<start and start offset "+start+" >= array length "+this.length);
					if(end<0) throw Error("end<start and end offset "+end+"< 0")
					for(let i=start;i>=end;i--) func(this[i],i,this)
				}
				return this;
			},
			writable: true,
			configurable: true
		});
	if(object.prototype.forEachRangeNotTested==null)
		Object.defineProperty(object.prototype, "forEachRangeNotTested", {
			value(start=0,end=this.length-1,func,o=this) {
				if(start<=end) {
					if(end>=this.length) end=this.length-1;
					if(start<0) start=0;
					for(let i=start;i<=end;i++) func(this[i],i,this)
				} else {
					if(start>=this.length) start=this.length-1
					if(end<0) end=0
					for(let i=start;i>=end;i--) func(this[i],i,this)
				}
				return this;
			},
			writable: true,
			configurable: true
		});

});


[Array,Float32Array,Float64Array].forEach(object=>{
	if(object.prototype.scale==null)
		Object.defineProperty(object.prototype, "scale", {
			value(factor,start=0,end=this.length-1) {
				for(let i=start;i<=end;i++) this[i]*=factor;
				return this;
			},
			writable: true,
			configurable: true
		});
})
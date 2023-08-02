[Array,Float32Array,Float64Array].forEach(object=>{
	if(object.prototype.sumSquared==null)
		Object.defineProperty(object.prototype, "sumSquared", {
			value(i=0,end=this.length-1,sum=0) {
				for(;i<=end;i++) sum+=this[i]**2;
				return sum;
			},
			writable: true,
			configurable: true
		});
})
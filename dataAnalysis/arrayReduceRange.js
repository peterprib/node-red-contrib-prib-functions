[Array,Float32Array,Float64Array].forEach(object=>{
	if(object.prototype.reduceRange==null)
		Object.defineProperty(object.prototype, "reduceRange", {
			value(start=0,end=this.length-1,func=(aggregate,cell,index)=>aggregate+cell,aggregate=0,o=this) {
				for(let i=start;i<=end;i++) aggregate=func(aggregate,this[i],i,this)
				return aggregate;
			},
			writable: true,
			configurable: true
		});
})

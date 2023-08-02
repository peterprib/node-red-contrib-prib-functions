[Array,Float32Array,Float64Array].forEach(object=>{
	if(object.prototype.product==null)
		Object.defineProperty(object.prototype, "product", {
			value(i=0,end=this.length-1,product=this[i]) {
				for(i++;i<=end;i++) product*=this[i];
				return product;
			},
			writable: true,
			configurable: true
		});
})
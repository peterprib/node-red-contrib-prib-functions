/*
[Array,Float32Array,Float64Array].forEach(object=>{
	if(object.prototype.sum==null)
		Object.defineProperty(object.prototype, "sum", {
			value(i=0,end=this.length-1,sum=0) {
				for(;i<=end;i++) sum+=this[i];
				return sum;
			},
			writable: true,
			configurable: true
		});
})
*/
const arrayTypesForEach=require("./arrayTypesForEach.js")
arrayTypesForEach(object=>{
	if(object.prototype.sum==null)
		Object.defineProperty(object.prototype, "sum", {
			value(i=0,end=this.length-1,sum=0) {
				for(;i<=end;i++) sum+=this[i];
				return sum;
			},
			writable: true,
			configurable: true
		});
})
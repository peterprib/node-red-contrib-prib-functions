const arrayTypesForEach=require("./arrayTypesForEach.js")
require("./arraySum.js")

arrayTypesForEach(object=>{
	if(object.prototype.average==null)
		Object.defineProperty(object.prototype, "average", {
			value(i=0,end=this.length-1) {
				return this.sum(i,end)/this.length;
			},
			writable: true,
			configurable: true
		});
})
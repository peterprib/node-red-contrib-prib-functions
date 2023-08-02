[Array,Float32Array,Float64Array].forEach(object=>{
    if(object.prototype.overlay==null)
    	Object.defineProperty(object.prototype, "overlay", {
	    	value(array) {
             if(array[0] instanceof Array)
                 array.forEach((element,index)=>this[index].overlay(element));
             else
                 array.forEach((element,index)=>this[index]=element);
	    	},
	    	writable: true,
	    	configurable: true
	    });
});
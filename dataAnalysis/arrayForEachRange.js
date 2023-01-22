/*
if(Array.prototype.forEachRange==null)
	Array.prototype.forEachFrom=function(start=0,end=this.length-1,func,o=this) {
        for(let i=start;i<=end;i++) func(this[i],i,this)
	}
*/
if(Array.prototype.forEachRange==null)
	Object.defineProperty(Array.prototype, "forEachRanges", {
		value(start=0,end=this.length-1,func,o=this) {
			for(let i=start;i<=end;i++) func(this[i],i,this)
		},
		writable: true,
		configurable: true
	});
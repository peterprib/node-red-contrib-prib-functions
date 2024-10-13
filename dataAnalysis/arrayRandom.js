
[Array,Float32Array,Float64Array].forEach(object=>{
    if(object.prototype.random==null)
        Object.defineProperty(object.prototype, "random", {
            value(size=this.length) {
                let i=size
                const result=new object(i)
                while(i--) result[i]=Math.random();
                return result;
            },
            writable: true,
            configurable: true
        })
})
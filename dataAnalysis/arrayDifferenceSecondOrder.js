[Array,Float32Array,Float64Array].forEach(object=>{
    if(object.prototype.differenceSecondOrder==null)
        Object.defineProperty(object.prototype, "differenceSecondOrder", {
            value() {
                    let i=this.length-1
                    if(i<2) return new object()
                    const result=new object(i-1)
                    while(--i) result[i-1]=this[i-1]-2*this[i]+this[i+1]
                    return result;
                },
                writable: true,
                 configurable: true
            });
})
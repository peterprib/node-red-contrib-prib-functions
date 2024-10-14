[Array,Float32Array,Float64Array].forEach(object=>{
    if(object.prototype.differenceSeasonalSecondOrder==null)
        Object.defineProperty(object.prototype, "differenceSeasonalSecondOrder", {
            value(lag=1) {
                let i=this.length-lag-1
                if(i<1) return new object()
                const result=new object(i)
                let lastDiff=this[i+lag-1]-this[i-1]
                while(--i>=0){
                    const newDiff=this[i+lag-1]-this[i-1]
                    result[i]=lastDiff-newDiff
                    lastDiff=newDiff
                }
                return result
            },
            writable: true,
             configurable: true
        });
})


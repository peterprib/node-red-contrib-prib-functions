
[Array,Float32Array,Float64Array].forEach(object=>{
    if(object.prototype.differenceSeasonal==null)
        Object.defineProperty(object.prototype, "differenceSeasonal", {
            value(lag=1,order=0) {
                let i=this.length-lag
                if(i<1) return new object()
                const result=new object(i)
                while(--i>=0) result[i]=this[i+lag]-this[i];
                return order?result.difference(--order):result;
            },
            writable: true,
             configurable: true
        });
})
[Array,Float32Array,Float64Array].forEach(object=>{
    if(object.prototype.difference==null)
        Object.defineProperty(object.prototype, "difference", {
            value(order=0) {
                let i=this.length
                if(i<2) return new object()
                const result=new object(i-1)
                while(--i) result[i-1]=this[i]-this[i-1];
                return order?result.difference(--order):result;
            },
            writable: true,
             configurable: true
        });
})
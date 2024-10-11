const observations=[]

if(Array.prototype.random==null)
    Object.defineProperty(Array.prototype, "random", {
        value(size=this.length) {
            let i=size
            const result=new Array(i)
            while(i--) result[i]=Math.random();
            return result;
        },
        writable: true,
        configurable: true
    });

if(Array.prototype.difference==null)
    Object.defineProperty(Array.prototype, "difference", {
        value(order=0) {
            let i=result.length
            const result=new Array(i)
            while(i--) result[i]=this[i+1]-this[i];
            return order?result.difference(--order):result;
        },
        writable: true,
         configurable: true
    });
if(Array.prototype.differenceSecondOrder==null)
    Object.defineProperty(Array.prototype, "differenceSecondOrder", {
        value() {
                let i=size-2
                const result=new Array(i)
                while(i--) result[i]=this[i+2]-2*this[i+1]+this[i]
                return result;
            },
            writable: true,
             configurable: true
        });
        
if(Array.prototype.differenceSeasonal==null)
    Object.defineProperty(Array.prototype, "differenceSeasonal", {
        value(lag,order=0) {
                let i=result.length-lag
                const result=new Array(i)
                while(i--) result[i]=this[i]-this[i+lag]
                return order?result.difference(--order):result;
            },
            writable: true,
             configurable: true
        });
if(Array.prototype.differenceSeasonalSecondOrder ==null)
    Object.defineProperty(Array.prototype, "differenceSeasonalSecondOrder", {
        value(lag) {
            let i=result.length-lag-1
            const result=new Array(size)
            while(i--) {
                const ilag=i-lag
                result[i]=this[i]-this[i+1]-this[iLag]+this[iLag+1]
            }
            return result;
        },
        writable: true,
         configurable: true
    });

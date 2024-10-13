const observations=[]

        

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

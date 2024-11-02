
require("./arrayAverage.js");
const arrayTypesForEach=require("./arrayTypesForEach.js")
arrayTypesForEach(object=>{
    if(object.prototype.autocovariance==null)
        Object.defineProperty(object.prototype, "autocovariance", {
            value(lag,avg=this.average()) {
                let autoCov = 0
                const vectorSize=this.length
                const vectorSizeLagged=vectorSize-lag
                for(let i=0; i<vectorSizeLagged; i++) {
                    autoCov += ((this[i+lag])-avg)*(this[i]-avg)
                }
                return (1/(vectorSize-1))*autoCov
            },
            writable: true,
            configurable: true
        })
})
arrayTypesForEach(object=>{
    if(object.prototype.autocorrelation==null)
        Object.defineProperty(object.prototype, "autocorrelation", {
            value(lag,avg=this.average()) {
                return this.autocovariance(lag, avg) / this.autocovariance(0, avg)
            },
            writable: true,
            configurable: true
        })
})
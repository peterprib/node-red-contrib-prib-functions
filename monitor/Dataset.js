function Dataset(settings) {
    Object.assign(this,{values:[]},settings)
}
Dataset.prototype.addValue=function(v){
    if(this.min==null) {
      this.max=v
      this.min=v
      this.range=0
      this.average=v
    } else {
      if(this.min>v){
        this.min=v
        this.range=this.max-this.min
      } else if(this.max<v){
        this.max=v
        this.range=this.max-this.min
      }
      this.average+=(v-this.average)/(this.values.length+1) 
    }
    this.values.push(v)
}
Dataset.prototype.getMax=function(){return this.max}
Dataset.prototype.getMin=function(){return this.min}
Dataset.prototype.getAverage=function(){return this.average}
Dataset.prototype.getFirst=function(){return this.values[0]}
Dataset.prototype.getRange=function(){return this.range}
Dataset.prototype.getLast=function(){return this.value.slice(-1)}

module.exports=Dataset

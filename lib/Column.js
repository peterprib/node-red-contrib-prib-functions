require("../lib/objectExtensions")
const dataConversionFunction ={
    real: parseFloat,
    int: parseFloat,
    number: parseFloat,
    timestamp: (value)=>Date.parse(value.substr(0,4)+'/'+value.substr(5,2)+'/'+value.substr(8,11))
           + parseInt(value.substr(21,3)),
   time:Date.parse,
   datetime:Date.parse,
   date: Date.parse
}
function Column(properties) {
    Object.assign(this,{type:null,index:[]},properties)
    if(this.table==null) this.error("no table object") 
    if(this.columnIndex==null) this.error("no columnIndex") 
    if(this.name==null) this.error("no column name") 
    if(this.title==null) this.title=this.name 
    if(!this.types.includes(this.type)) this.error("invalid type: "+this.type+ " types: "+this.MeasureTypes.join(","))
}
Column.prototype.getNormalised=function(value){
    try{
        return this.normaliseRatio*(value-this.min)
    } catch(ex){}
    if(!this.max) throw Error("maximum value not set")
    if(!this.min) throw Error("minimum value not set")
    if(!this.range) throw Error("range value not set")
    if(!this.normaliseRatio) throw Error("normalised ratio not set")
}
Column.prototype.buildColumnnar=function(){
    const index=this.index
    let max=this.table.data[0][index],min=max
    this.columnar=this.table.data.reduce((a,row)=>{
        const v=row[index]
        if(v==null) return
        try{
            a[v].push(row)
        } catch(ex) {
            a[v]=[row]
        }
        if(max<v) max=v
        else if(min>v) min=v
    },{})
    this.setMin(min).setMax(max)
}
Column.prototype.getMax=function(){
    if(this.max) return this.max
    if(!this.columnar) ths.buildColumnar()
    return this.max
}
Column.prototype.setMax=function(value){
    this.max=value
    return this.setRange()
}
Column.prototype.setMin=function(value){
    this.min=value
    return this.setRange()
}
Column.prototype.setRange=function(min=this.min,max=this.max){
    if(this.isMetric) {
        this.range=max-min
        this.normaliseRatio=this.range?1:1/this.range  
    }
    return this
}
Column.prototype.onError=function(call){
    if(this.errorStack) this.errorStack.push(call)
    else this.errorStack=[this.call]
    return this
}
Column.prototype.error=function(ex="no error message"){
    if(this.errorStack){
      this.errorStack.forEach((callFunction)=>{
          try{
          callFunction(ex)
          }catch(ex) {}
      })
      return
    }
  if(typeof ex == "string") throw Error(ex)
  throw ex
}
Column.prototype.timeTypes=['timestamp','time','date','datetime']
Column.prototype.isTime=(type=this.type)=>{
    if(Column.prototype.timeTypes.includes(type)) return true
    throw Error(column.name +" not time type")
}  
Column.prototype.types=['real','double','int','number','bigint',"string"]
Column.prototype.numericTypes=['real','double','int','number','bigint']
Column.prototype.isNumeric=(type=this.type)=>{
    if(Column.prototype.numericTypes.includes(type)) return true
    throw Error(column.name +" not numeric")
}

Column.prototype.MeasureTypes=['real','double','int','number','bigint','timestamp','date']
Column.prototype.isMeasure=(type=this.type)=>{
    if(Column.prototype.measureTypes.includes(type)) return true
    throw Error(column.name +" not a measure")
}  
module.exports=Column 

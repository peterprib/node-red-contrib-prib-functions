function DialNeedle(settings) {
    Object.assign(this,{
      radius:100,
      startAngle:0,
      id:"needle",
      baseDialSize:20,
      value:{min:0,max:100}
    },settings)
    Object.assign(this,{
      endAngle:this.endAngle??360-this.startAngle,
      center:this.center??{x:this.radius,y:this.radius}
    })
    this.value.range=this.value.max-this.value.min
    this.ratio=(this.endAngle-this.startAngle)/this.range,
    this.svg=this.getSvg();
}
DialNeedle.prototype.get=function(value){
    return this.svg
}
DialNeedle.prototype.getSvg=function(id=""){
    return {action:"g",id:id+this.id,children:[
      {action:"path",transform:{rotate:{angle:this.startAngle,x:this.radius,y:this.radius}},d:[
          {action:"moveTo",x:this.radius,y:0},
          {action:"deltaLineTo",x:-this.baseDialSize,y:this.radius},
          {action:"deltaArc",radius:{x:this.baseDialSize,y:this.baseDialSize},x:this.baseDialSize*2,y:0},
          {action:"Z"}
          ],
        fill:this.color,stroke:this.color
      }
    ]}
}
DialNeedle.prototype.getUpdate=function(angle){
  if(angle>360 || angle < -360) throw Error("angle > 360 or < -360, angle: "+angle)
  return {action:"update",id:this.id,transform:{rotate:{angle,x:this.radius,y:this.radius}}}
}
module.exports=DialNeedle

const defs=require("./defs.js")
const DialNeedle=require("./DialNeedle.js")
const boundValue=(v,max=100,min=0)=>Math.min(Math.max(v, min), max)
const pi2=2 * Math.PI
const pi2DegreeFactor=180 / Math.PI
const toRadians=(degrees)=> degrees / pi2DegreeFactor
const toDegrees=(radians)=> radians * pi2DegreeFactor
function DialGauge(settings) {
  Object.assign(this,{radius:100,value:0,gapAngle:80,color:"gray",min:0,max:100,title:"%"},settings)
  this.range=this.max-this.min
  if(this.range<=0) throw Error("invalid range, min>=max")
  this.strokeWidth = this.radius * 0.3;
  this.circumference = this.radius * pi2
  this.dashOffset = this.circumference * this.gapAngle/380;
  this.gaugeAngleArea=360-this.gapAngle
  this.angleFactor=this.gaugeAngleArea/this.range
  this.halfStrokeGap=(this.circumference-this.dashOffset)/2
  this.strokeInnerRadius=this.radius - this.strokeWidth / 2
  this.strokeInnerCircumference= this.strokeInnerRadius * pi2
  this.strokeDashOffset = this.strokeInnerCircumference * this.gaugeAngleArea/360;
  this.gauge={action:"circle",fill:"transparent",
    cx:this.radius,cy:this.radius,r:this.strokeInnerRadius,stroke:"lightgray","stroke-width":this.strokeWidth,
    "stroke-dasharray":this.getDashArray(this.max),
    transform:{rotate:{angle:90+parseInt(this.gapAngle/2),x:this.radius,y:this.radius}}}
  this.needle=new DialNeedle({radius:this.radius,startAngle:-this.gaugeAngleArea/2})
  this.svg=this.getSvg()
}
DialGauge.prototype.get=function(value){
  return this.svg
}
DialGauge.prototype.getSvg=function(){
  const group=[]
  group.push(Object.assign({},this.gauge,{stroke:"red"}))
  group.push(Object.assign({},this.gauge,{stroke:"orange","stroke-dasharray":this.getDashArray(80)}))
  group.push(Object.assign({},this.gauge,{stroke:"yellow","stroke-dasharray":this.getDashArray(60)}))
  group.push(Object.assign({},this.gauge,{stroke:"lightgreen","stroke-dasharray":this.getDashArray(40)}))
  group.push(Object.assign({},this.gauge,{stroke:"green","stroke-dasharray":this.getDashArray(20)}))
  group.push(Object.assign({},this.gauge,{id:"dialColor",stroke:"lightgray","stroke-dasharray":this.getDashArrayReverse(0)}))
/*
  group.push({action:"clipPath",id:"clipGauge",children:[
      Object.assign({},this.gauge,{id:"dialColor1","stroke-dasharray":this.getDashArray(0),"stroke-miterlimit":"10",stroke:"none",class:"heatGrad"})
    ]})
  group.push({action:"style",children:["circle.heatGrad {background: conic-gradient(red, orange, yellow, green); }"]})
  group.push({action:"use",href:{id:"clipGauge"}})
*/
  group.push(this.getScale())
  group.push({action:"text",x:this.radius,y:this.radius*1.5,"dominant-baseline":"middle","text-anchor":"middle",children:[this.title]})
  group.push(this.needle.get(0))
  return {action:"g",height:2*this.radius,children:[group]}
/*        
    {action:"clipPath",children:[
      Object.assign({},this.gauge,{id:"dialColor","stroke-dasharray":this.getDashArray(0),stroke:"none",class:"grad"})
    ]},
    {action:"style",children:["circle.grad {background: conic-gradient(red, orange, yellow, green); }"]},
    {action:"setConicGradient",id:"clip"}, 
*/
}

DialGauge.prototype.getUpdate=function(value){
  return [this.needle.getUpdate((value-this.min)*this.angleFactor),{action:"update",id:"dialColor","stroke-dasharray":this.getDashArrayReverse(value)}]
}
DialGauge.prototype.setMax=function(value){
  this.max = value
  this.range=this.max-this.min
  if(this.range<=0) throw Error("invalid range, min>=max")
  this.angleFactor=this.gaugeAngleArea/this.range
  return this
}
DialGauge.prototype.getDashArray=function(value){
  const ratio=(value-this.min)/this.range
  const dash=this.strokeDashOffset*ratio
  const gap=this.strokeInnerCircumference-dash
  return dash+","+gap
}
DialGauge.prototype.getDashArrayReverse=function(value){
  const ratio=(value-this.min)/this.range
  const gap=this.strokeDashOffset*ratio
  const dash=this.strokeDashOffset*(1-ratio) 
  return "0,"+gap+","+dash+","+this.strokeDashOffset
}

DialGauge.prototype.getScale=function() {
  const sr1 = this.radius;
  const sr2 = this.radius - this.strokeWidth-5;
  const srT = sr2 - 10;
  const objDef=[]
  let n = 0;
  const increment=toRadians(this.gaugeAngleArea/10)
  for (let sr = toRadians(-this.gaugeAngleArea); sr <= 0; sr += increment) {
    const sra=sr + toRadians(90 - this.gapAngle/2)
    const saCos=Math.cos(sra)
    const saSin=Math.sin(sra)
    objDef.push({action:"line",
        x1:this.radius + sr1 * saCos,
        y1:this.radius + sr1 * saSin,
        x2:this.radius + sr2 * saCos,
        y2:this.radius + sr2 * saSin}
    )
    objDef.push({action:"text",
        x:this.radius + srT * saCos,
        y:this.radius + srT * saSin,
        children:[String(n*10)]
    })
    n++
  }
  return objDef;
} 

module.exports=DialGauge

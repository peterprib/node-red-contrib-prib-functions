const { off } = require("process")
const { isAsyncFunction } = require("util/types")
const Dataset=require("./Dataset.js")
const defs=require("./defs.js")
const color={green:"#5ee432",yellow:"#fffa50",orange:"#f7aa38",red:"#ef4655"}

const svcTextLine=(metricLabel,value)=>{
  return [{action:"style",children:[".svcTextLine {font: italic 13px sans-serif}"]},
      {action:"text",height:10,class:"svcTextLine",children:[metricLabel+": "+value]}
  ]
}
const calculatePositionVertically=(a,offset=0)=>{
  const l=a.length
  if(!l) return
  let aPrevious=a[0]
  if(aPrevious.transform) aPrevious={action:'g',height:aPrevious.height,children:[aPrevious]}
  aPrevious.transform={translate:{y:offset}}
  for(let i=1;i<l;i++){
    let aCurrent=a[i]
    if(aCurrent.transform) aCurrent={action:'g',height:aCurrent.height,children:[aCurrent]}
    if(!aCurrent) throw Error("action is null for "+i +" in "+JSON.stringify(a))
    if(!aPrevious.height) console.error("calculatePositionVertically no height")
    aCurrent.transform={translate:{y:aPrevious.transform.translate.y+aPrevious.height}}
    aPrevious=aCurrent
  }
  return a
}

const moveTransform = (x,y)=>[[1,0,x],[0,1,y]]
const boundValue=(v,max=100,min=0)=>Math.min(Math.max(v, min), max)
const twoPi=2 * Math.PI
const getCircumference=(radius)=>radius*twoPi
const getAcLength = (radius,angle)=> getCircumference(radius) * (angle / 360)
const getArcDasharray=(radius,angle)=>{
  const circumference = getCircumference(innerRadius)
  const arc = circumference * (angle / 360)
  return {strokeDasharray: ""+arc+" "+circumference}
}
const getElementWidth=(e)=>parseInt(window.getComputedStyle(e, null).getPropertyValue("width"))


const geBarChart=(dataPoint=[],size,x,y)=>{
    const min=Math.min(...dataPoint)
    const max=Math.min(...dataPoint)
    const range=max-min
    const norm=range/size
    return dataPoint.reduce((p,c,i)=>{
        const delta=(c-min)/norm
        x+=c
        p.push({action:"rect",x:x,y:y,width:w,height:h,fill:fill[0]})
        return p
    },[])
  }

const DialGauge = require("./DialGauge.js")
//const dialGauge=new DialGauge()
const Chart = require("../lib/Chart.js")
  
module.exports={
  barGauge:null,
  Chart:Chart,
  DialGauge:DialGauge,
  calculatePositionVertically:calculatePositionVertically
}
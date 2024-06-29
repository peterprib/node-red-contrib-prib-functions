const { action, children } = require("../monitor/defs");

const getColourPallet=()=>{
  const colourPallet=[];
  const delta=255/5;
  for(let i=0;i<5;i++)
      for(let j=0;j<5;j++)
          for(let k=0;k<5;k++)
              colourPallet.push('rgb(' + Math.floor(i*delta) + ',' + Math.floor(j*delta) + ','+ Math.floor(k*delta) +')')
  return colourPallet
}

const baseColours =["Chartreuse","red","yellow","blue","pink","Cyan","Magenta","orange"]
const colourPallet=getColourPallet()

const getColors=(number)=>{
  if(number<baseColours.length) return baseColours
  const colours=[],r=colourPallet.length/number
  for(let i=0; i<number; i++) 
    colours[i]=colourPallet[Math.floor(i*r)];
  return colours	
}

function Chart(properties){
  Object.assign(this,{
    height:1000,
    width:1000,
    labels:[],
    fontSize:12,
    scale:.4,
    xGap:100,yGap:100,
    type:"line",
    normaliseDimension:"all"
  },properties)
  this.density??=Math.min(this.height,this.width)
  return this;
}
Chart.prototype.getLabels=function(x=this.width/2, y=this.yGap, fontSize=this.fontSize/this.scale){
  if(!this.colours) this.colours=getColors(this.labels.length)
  return this.labels.reduce((previous,label,i)=>{
    const yPos=y+i*(2+fontSize)
    previous.children.push({action:"rect",fill:this.colours[i],x:x,y:yPos,width:fontSize,height:fontSize})
    previous.children.push({action:"text",x:x+2+fontSize,y:yPos,"font-size":fontSize,"dominant-baseline":"hanging","text-anchor":"left",children:[label]})
    return previous
  },{action:"g",id:"ledgend",children:[]})
}
Chart.prototype.getAxis=function(){
  let ticks=[]
  this.strokeWidth??=5
  const w=this.width??1
  const h=this.height??1
  for(let tick=this.xGap; tick<this.width; tick+=this.xGap) {
    ticks.push([["M",tick,-2*this.strokeWidth],["L",tick,2*this.strokeWidth]])
  }  
  for(let tick=this.yGap; tick<this.height; tick+=this.yGap) {
    ticks.push([["M",-2*this.strokeWidth,tick],["L",2*this.strokeWidth,tick]])
  }
  return {id:"axis",action:"path",stroke:"black","stroke-width":this.strokeWidth,
    d:[["M",0,0],["L",0,this.height],["M",0,0],["L",this.width,0]].concat(ticks)}
}
Chart.prototype.getLinePath=function(points=[]){
  if(!points.length) return []
  const path=points.map((r)=>["L"].concat(r))
  path[0][0]="M"
  return path
}
Chart.prototype.getLine=function(points=[],colour=black){
  return {action:"path",d:getLinePath(points),stroke:colour}
}
Chart.prototype.getLineUpdate=function(points=[],colour=black){
  return {action:"update",d:getLinePath(points)}
}
Chart.prototype.getYPoints=function(points=this.normalisedData){
  if(!points) {
    this.normalise()
    points=this.normalisedData
  }
  if(!points.length) return [] // no columns
  const xScale=this.width/(points[0].length-1)
  const lines=points.map(y=>([["M",0,y[0]*this.height]]))
  for(let c=1;c<points.length;c++) {
    const column=lines[c]
    points[c].forEach((y,x)=>column.push(["L",x*xScale,y*this.height]))
  }
  return lines
}
Chart.prototype.getYLines=function(){
  if(this.data.length==0 || this.data[0].length==0) return []
  if(!this.colours) this.colours=getColors(this.data[0].length)
  return this.getYPoints().reduce((a,c,i)=>{
    a.push({action:"path",id:"l"+i,d:c,stroke:this.colours[i],fill:"none","stroke-width":2*this.strokeWidth})
    return a
  },[])
}
Chart.prototype.getYLinesUpdate=function(){
  return this.getYPoints().reduce((a,c,i)=>{a.push({action:"update",id:"l"+i,d:c});return a},[])
}
Chart.prototype.scalePoints=function(points,...ratios){
   return points.map(p=> ratios.map((r,i)=>r*p[i]))
}
Chart.prototype.normalise=function(points=this.data){
  const _this=this
  if(points.length<1){
    this.normalisedData=[]
    return this.normalisedData
  }
  this.mins=[...points[0]]
  this.maxs=[...points[0]]
  for(let i=1; i<points.length;i++){
    const row=points[i]
    row.forEach((c,ci)=>{
      if(c<_this.mins[ci]) _this.mins[ci]=c
      else if(c>_this.maxs[ci]) _this.maxs[ci]=c
    })
  }
  this.ranges=this.mins.map((min,i)=> _this.maxs[i]-min)
  this.min=Math.min(...this.mins)
  this.max=Math.max(...this.maxs)
  this.range=this.max-this.min
  this.normalisedData=this.ranges.map(c=>new Float32Array(points.length))
  if(this.normaliseDimension="all") {
    points.forEach((row,rowIndex)=>
      row.forEach((inCell,columnIndex)=>
        _this.normalisedData[columnIndex][rowIndex]=_this.range?((inCell-_this.min)/_this.range):0
  )
    )
  } else {
    this.ranges.forEach((range,columnIndex)=>{
      const min=_this.mins[columnIndex]
      points.forEach((row,rowIndex)=>
        _this.normalisedData[columnIndex][rowIndex]=range?(row[columnIndex]- min)/range:0
      )
    })
  }
  return this.normalisedData
}

Chart.prototype.normalise2ChartBoundaries=function (points=this.normalisedData) {
  return this.normalisedData.map(row=>row.map(v=>v*this.density))
}
Chart.prototype.getBubbles=function (points,colour) {
  return points.map((a,row,i)=>({action:"circle",fill:colour,cx:row[0],cy:row[1],r:row[2],stroke:this.outline,"stroke-width":1, opacity:0.5}))
}
Chart.prototype.get=function () {
  if(this.getData) {
    this.data=this.getData()
    this.normalisedData=null
  }
  if(!this.base) {
    this.base=[]
    if(!["pie"].includes(this.type)) this.base.push(this.getAxis())
  }
  const scaledHeight=this.scale*this.height
  return {action:"g",height:scaledHeight+2*this.fontSize,id:"chart",
    transform:{scale:{x:this.scale,y:this.scale},translate:{y:scaledHeight}},
    children:[
      {action:"g",children:this.base.concat(this.getYLines()),transform:{scale:{x:1,y:-1}}},
      this.getLabels()
    ]
  }
}
Chart.prototype.getUpdate=function () {
  if(this.getDataUpdate) {
    this.data=this.getDataUpdate()
    this.normalisedData=null
  } else if(this.getData) {
     this.data=this.getData()
     this.normalisedData=null
  }
  return this.getYLinesUpdate()
}
Chart.prototype.setData=function (points) {
  this.data=points
  this.normalise()
  return this
}
module.exports=Chart

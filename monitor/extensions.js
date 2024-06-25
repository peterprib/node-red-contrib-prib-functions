const path = require('path')
require("../lib/objectExtensions")
const Format=require('./Format')
const Table=require('../lib/Table')
const { action, children } = require('./defs')
const { table } = require('console')


const timePrecision=(time,minutes,hours,days)=>{
	if(Math.floor(time/60000)>0) return minutes()
	if(Math.floor(time/60)>0) return hours()
	if(Math.floor(time/24)>0) return days()
}
const timePeriodsMS={
  second:1000,
  minute:60*1000,
  hour:60*60*1000,
  day:24*60*60*1000,
  week:7*24*60*60*1000,
  fortnight:2*7*24*60*60*1000,
  month:30*24*60*60*1000,
  year:365*24*60*60*1000,
}
const timeUnitRange=(t,second=p=>r,minute=p=>r,hour=p=>r,day=p=>r,week=p=>r,fortnight=p=>r,month=p=>r,year=p=>r)=>{
	let duration=Math.floor(t/1000)
	if(duration==0) return seconds(duration)
	duration=Math.floor(duration/60)
	if(duration==0) return minutes(duration)
	duration=Math.floor(duration/60)
	if(duration==0) return hours(duration)
	duration=Math.floor(duration/60) 
	if(duration==0) return days(duration)
	if(Math.floor(duration/7)==0) return weeks(duration)
	if(Math.floor(duration/14)==0) return fortnights(duration)
	if(Math.floor(duration/30)==0) return months(duration)
	return years(Math.floor(duration/365))
}
const timeTickPoints=(timeUnit="second",min=0,max=100)=>{
	const period=timePeriodsMS[second]
	const results=[]
	const rangeRatio=Math.floor((max-min)/period); 
	for(let j=min; j<max; j++)
       Math.floor(rangeRatio*j)
}


const circle={
    arcPath:(v)=>" A "+v.rx+" "+v.ry+","+(v.xAxisRotation??0)+","+(v.largeArcFlag??0)+","+(v.sweep-flag??0)+","+v.x+" "+v.y,
    basePoints:(degrees=6,circumference=2*Math.PI)=>{
        const points=[],increment=circle.toRadians(degrees)
        for(let i=0; i<circumference; i+increment) 
            points.push([Math.cos(i),Math.sin(i)])
    },
    getPieSlicePath:(to,from=0,radius=100)=>{
        const fromRadians=circle.toRadians(from),toRadians=circle.toRadians(to)
        const flip180=(to-from)>180?",0,0,0":",0,1,1,"
        return  " M "+radius*Math.cos(fromRadians+" "+radians*Math.cos(fromRadians) +
                " A "+radius+" "+radius + flip180 + radius*Math.cos(toRadians)+" "+radius*Math.cos(toRadians) +
                " Z"
    },
    getPieSliceRatioPath:(to,from=0,radius=100)=>{
        const fromRadians=from*circle.pi2,toRadians=to*circle.pi2
        const flip180=(to-from)>.5?",0,0,0":",0,1,1,"
        return  " M "+radius*Math.cos(fromRadians+" "+radians*Math.cos(fromRadians) +
                " A "+radius+" "+radius + flip180 + radius*Math.cos(toRadians)+" "+radius*Math.cos(toRadians) +
                " Z"
    },
    pi2:2 * Math.PI,
    pi2DegreeFactor:180 / Math.PI,
    point:(degrees=6,radius=1)=>{
        const radians=circle.toRadians(degrees)
        return [radius*Math.cos(radians),radius*Math.sin(radians)]
    },
    points:(degrees=6,radius=1)=>circle.circumferenceBasePoints(degrees).map(c=>[radius*c[0],radius*c[1]]),
    pieSlicesDegrees:(degrees,radius=100)=>{
        const pieces=degrees.reduce((a,c,i)=>{
            a.push({action:"path",id:"pieslice"+i,d:circle.getPieSlicePath(f,t,radius)})
        },[])
        return {action:g,id:"pie",children=pieces}
    },
    toDegrees:(radians)=> radians * circle.pi2DegreeFactor,
    toRadians:(degrees)=> degrees / circle.pi2DegreeFactor
}
const stackBlocks=(data, colors=getColors(data[0].length), barWidth, yStart=0, yEnd=this.data[0].length-1 )=>{
	let xPos=0, yPos=0
	const results=[]
	for(let i= 0; i < data.length; i++) {
		const row=data[i]
		xPos=Math.floor((i+0.5)*barWidth);
		yPos=Math.sum(...row)
		row.map((y,i)=>({action:"rect",fill:colors[j],x:xPos,y:yPos,width:barWidth,height:y})
		for(let j=0; j<row.length; j++) {
			if (row[j]==null) continue
			const y=row[j]
			results.push({action:"rect",fill:colors[j],x:xPos,y:yPos,width:barWidth,height:y})
			yPos+=y;
		}
	}
	return results
}
const getPushline=(data,j,tickIncrement,barWidth)=>{
    const points = [];
    for(let i= 0; i <data.length; i++) {
		const row=data[i]
        if(row[j]==null) continue;
        xPos=Math.floor(i*tickIncrement)+(j-1)*barWidth;
        points=[xPos,row[j]]
    }
    return {action:"polyline",points:points}
}
const getCircleTicks=(radius,degrees=6,strokeWidth=1,size=2)=>{
    const ri=radius-size/2, ro=radius+size/2
    return {action:"path",d:circle.basePoints(degrees).reduce((a,c)=>" M "+ri*c[0]+","+ri*c[1]+" L "+ro*c[0]+","+ro*c[1],"")}
 } 

function chart() {
    Object.assign(this,{
		bubbleRatio:0.2,
        type:"line",
        width:100,
        height:100,
		colour:"black",
		disableLeftMenu:false,
		grouping:null,
        highlight:'',
        legendDisplay:'show',
        legendPositionX:60,
		legendPositionY:0,
        lineWidth:1,
        outline:'black',
        showOptions:true,
        showPoints:false,
        slices:'row',
        tickIncrement:5
    })
    this.sliceByRow=this.slices=='row'
    this.setAxis("x").setAxis("y").setAxis("z")
    if(this.table == null) throw Error("Cannot render chart as table not specified")
    this.processProperties();
}
chart.prototype.setAxis= function(dimension){
    const axis=this.axis[dimension] 
    axis={columns:null,position:0,bound:{upper:null,lower:null}}
	axis.columnArray=axis.columns.toLowerCase().split(',')
	if(axis.columnArray.length==0) throw axis+" axis has no valid values for the database version, "+axis+"Axis: "+axis.columnArray;
	if(axis.bound.upper!=null) axis.bound.upper=parseInt(axis.bound.upper,10); 
	if(axis.bound.lower!=null) axis.bound.lower=parseInt(axis.bound.lower,10); 
	axis.normaliser=1
    return this
}
chart.prototype.errorFunction=function(msg){
    throw typeof msg == "string"? Error(msg) : msg
}
chart.prototype.getPies=function (sliceByRow=this.sliceByRow,height=this.height) {
    let xPos=0, yPos=0,pies=[]
    const piesCount=(sliceByRow?this.columnIndexDetails.y.size+1:this.data.length)
	const piesPerRow=Math.ceil(Math.sqrt(piesCount))
    for(let i=(sliceByRow?0:0); i < piesCount; i++) {
        pies.push(this.drawPie(xPos,yPos,this.height,i))
		if(i%piesPerRow) continue
        xPos=0;
        yPos+=this.height;
    }
    return pies
}

chart.prototype.getPie=function(radius,i,dataset,sliceByRow=this.sliceByRow,label=isSliceRow)?this.label[i]:dataset[i][this.columnIndex[0]]) {
    const circumference=radius * Math.PI+2
    const total=sliceByRow?dataset.reduce((a,row)=>a+row[i],0):dataset[i].reduce((a,c)=>a+c,0)
    if (total==0) return []
    let angleStart=0, angleEnd=0, slices=[]
    const unitDegreesRatio = 2 * Math.PI/total;
    for(let row= (sliceByRow?0:1); row < arrayLength; row++) {
        const value=(sliceByRow?this.data[row][i]:this.data[i][row])
        if(value==null) continue;
        angleStart=angleEnd;
        angleEnd+=unitDegreesRatio*value;
        const dash=(circumference*ratio)
        const gap=circumference-dash
        slices.push({action:"circle",fill:"transparent",cx:radius,cy:radius,r:radius,stroke:this.colour[row],"stroke-width":radius,
            "stroke-dasharray": dash+","+gap,
            transform:{rotate:{angle:angleStart,x:this.radius,y:this.radius}}}
        )
		slices.push({action:"text",x:x,y:y+10,children:[label]})
    }
    return {action:"g",children:[slices]}
}
chart.prototype.checkExists=function(value,errorMessage="value is null",error=this.errorFunction) {
    if(value==null) error(errorMessage)
}
chart.prototype.processProperties=function(error=(msg)=>{throw Error(msg)}) {
	if(this.grouping!=null) this.grouping = this.grouping.toUpperCase();
	else if(this.baseTableData.primaryKeys.length>0)
		this.grouping = this.baseTableData.primaryKeys.toString();
	if(!['row',"column"].includes(this.slices)) error("parameter slices can only equal row or column")
    this.sliceByRow=this.slices=="row"
	if(['bubble','bubbleandline'].includes(this.type))
    	this.checkExists(this.axis.z.columns,'Missing z axis columns for '+this.type,error);
	if(['bubble','bubbleandline','line','pushline','setline'].includes(this.type))
		this.checkExists(this.axis.x.columns,'Missing x axis columns for '+this.type,error);
	if(['bubble','bubbleandline','line','pushline','setline','stack','bar','pie','events'].includes(this.type))
		this.checkExists(this.axis.y.columns,'Missing y axis columns for '+this.type,error);
    if(['pie'].includes(this.type)) {
        this.grouping=null;
      } 
}
chart.prototype.setParameter=function(name,value) {
	this[name]=value
	return this
}
chart.prototype.getMenuOption=function(label,value,property){
    return '<tr><td>'+label+'</td><td>' 
    +'<input type="button" value="'+value+'" onclick="this.value='+this.callBackText+'.setParameter(\\\''+property+'\\\',this.value)"/>'
    +'</td></tr>';
}
chart.prototype.setMenuOptions=function(menuArray) {
    if(!this.showOptions) return null;
    if(menuArray==null) menuArray=[];
    if(this.optionsDialog==null) {
        this.optionsDialog = new floatingPanel(this.elementUniqueID + '_optionsDialog', 'RAW', "", this.elementUniqueID + '_optionsDialog_button', false, false);
        this.parentPanel.registerNestedObject(this.elementUniqueID + '_optionsDialog', this.optionsDialog);
    }
    const thisObject = this;
    if(!this.disableLeftMenu)
        if(this.baseTableData.localLeftMenu!=null)
            menuArray=menuArray.concat(this.baseTableData.localLeftMenu);
    options='';
    switch (this.type) {
        case 'pie':
            options+=this.getMenuOption('Slice',(this.slices=='row'?'column':'row'),'slices')
            break;
        case 'bubble':
        case 'bubbleandline':
        case 'line':
            break;
        case 'pushline':
        case 'setline':
            options+=this.getMenuOption('Chart Type',this.type=='setline'?'pushline':'setline'),'type')
            break;
        case 'bar':
        case 'stack':
            options+=this.getMenuOption('Chart Type',(this.type=='bar'?'stack':'bar'),'type')
            break;
    }
    options+=this.getMenuOption('Legend',(this.legendDisplay=="hide"?"show":"hide"),'legendDisplay')
            +'<tr><td>Max. rows</td><td>'
            +'	<input type="text" value="'+this.baseTableData.maxResultsToFetch+'" onchange="'+this.callBackText+'.setParameter('+"'baseTableData.maxResultsToFetch'"+',this.value)"/>'
            +'</td></tr>';
    this.optionsDialog.draw();
    this.optionsDialog.setContent('<table>'+options+this.getMetricColumnsOptions()+'</table>','Options', null, null, null)
}

chart.prototype.getBar=function (tickIncrement=this.tickIncrement,barWidth=Math.floor(this.tickIncrement/this.columnIndexDetails.y.size)) {
    const group=[]
    let xPos=0,  yPos=0
    for(let i= 0; i < this.data.length; i++) {
		const row=this.data[i]
        for(let j=0; j<this.table.data.length; j++) {
            if (row[j]==null) continue;
            xPos=Math.floor((i+0.5)*tickIncrement)+(j-1)*barWidth;
            yPos=row[j]
            group.push({action:"rect", x:xPos,y:yPos,width:this.barWidth,height:this.height-yPos,fill:this.colour[j],stroke:this.outline})
        }
    }
    return result
}
chart.prototype.getBubble=function () {
    const zDetails=this.axis.z;
    const results=[]
    for( let i= 0; i < this.data.length; i++) {
        for( let j=0; j<this.data.length; j++) {
            const row = this.data[i]
            const zData =  zDetails.dataStore
            const y=row[j];
            if(y==null || isNaN(y)) continue
            xPos=row[0]
            radius=Math.abs(zData[i][j]/2);
            if(radius==0) continue
            results.push({action:"circle",fill:this.colour[j],cx:xPos,cy:y,r:radius,stroke:this.outline,"stroke-width":1, opacity:0.5})
        }
    }
    return results
}
chart.prototype.getBubbleAndLine=function () {
	return [this.getLine(),this.getBubble()]
}
chart.prototype.getEvents=function(data) {
		let dataX, plotX, lines=[]
		for(let j=0 ; j<data.length; j++) {
			dataX=data[j][0];
			if (dataX==null || isNaN(dataX) ) continue;
			lines.push({action:"line",x1:dataX,y1:0,x1:dataX,y1:this.height,stroke:"red","stroke-width":this.lineWidth,"stroke-opacity":0.8})
		}
        return lines
	}
    chart.prototype.getLine=function () {
		let errors,points;
		for(let j=0; j<this.data.length; j++)
			try {
				this.plot(j, 1, this.data)
			} catch(e) {
				errors += 'error plotting '+ this.label[i] + '  ' +e +'\n';
			}
		if(errors) this.errorFunction(errors)
        return {action:'polyline',points:"100,100 150,25 150,75 200,0",fill:"none",stroke="red","stroke-width":this.lineWidth,"stroke-opacity":0.8}
	},
	drawChart_pushline: function() {
		const errors=[],result="",yDetails=this.columnIndexDetails.y
		this.barWidth=Math.floor(this.tickIncrement/yDetailssize);
		for(let j=yDetails.start; j<yDetails.end; j++)
			try {
				result+=this.plotSet(j,this.data,this.colour[j], this.barWidth);
			} catch(e) {
				errors += 'error plotting '+ this.label[i] + '  ' +e +'\n';
			}
		if (errors.length) throw errors;
	},
	drawChart_setline: function () {return this.drawChart_pushline();},
	drawChart_stack: function(data,tickIncrement) {
		const y=this.columnIndexDetails.y
		return stackBlock(data, this.colour, tickIncrement)
	},
chart.prototype.getChart=function () {
		let errors;
        const colourCnt = this.type=='pie'&& this.sliceByRow? ? this.data.length : this.columnIndexDetails.y.size+1
		if(colourCnt>this.colour.length)
			this.color=getColors(colourPallet.length/colourCnt)
		this.ctx.clearRect(0,0,this.width,this.height);
		this.ctx.strokeStyle = "black";
		if(['bar','bubble','bubbleandline','line','pushline','setline','stack'].includes[this.type])
			this.drawLineAxis();
		try { this["drawChart_"+this.type]();} catch(e) {throw "drawing " + this.type + "\n" + e.toString(); };

		while (this.legend.rows.length> 0) 	this.legend.deleteRow(0);
		switch (this.type) {
			case 'pie':
				if(this.sliceByRow) {
					for(let i = 1; i < this.data.length; i++)
						this.legend+= "<tr><a style='color:" + this.colour[i] + "' >" + this.data[i][0] + "</a></tr>";
				} else 
					for(let i=0; i<this.label.length; i++)
						this.legend+="<tr><a style='color:" + this.colour[i] + "' >" + this.label[i] + "</a></tr>";
				break;
			default:
				this.legend+="x axis: " + this.label[0];
				for(var i=0; i<this.table.data.length; i++) {
					this.legend.+= "<tr><a style='color:" + this.colour[i] + "' >" + this.label[i] 
																	+ (this.zAxis?" z is " +this.axis.z.label[i]:"")
																	+ "</a></tr>";
				}
		}
	},
const coords={
    events:(chart,data,xPos,yPos)=>{
        const xPlot=xScaleRange(xPos,chart.xRatio)
        for(let i=0; i<data.length;i++) {
            const v=data[i][0]
            if (v< xPlot.min || v> xPlot.max) continue;
            let details="event:";
            for(let i= 0; i < this.table.data.length; i++)
                details+=" "+this.dataToString(i,v>xPlot.max);
            XYRow.insertCell(-1).innerHTML=details;
            var XYRow=chart.detailXY.insertRow(-1);
        }
    },
    bubble:(chart,data,xPos,yPos)=>{
        const xPlot=xScaleRange(xPos,chart.xRatio)
        const yPlot=yScaleRange(yPos,chart.yRatio)
        const text=[{action:'text',children:["x: "+this.dataToString(0,xPlot.value) + " "+"y: "+this.dataToString(1,yPlot.value)]}]
        const zText=chart.zAxis?
            (chart,row,colum)=>{
                const zDetails=chart.columnIndexDetails.z
                const zData = zDetails.dataStore
                return "z: "+chart.dataToString(i,zData[row][column]);
            }:
            ()=>""
        for(let row= 0; row < this.data.length; row++) {
            const dataRow=data[row]
            const x=dataRow[0]
            const xText=" x: "+this.dataToString(0,x)
            if (v< xPlot.min || v> xPlot.max) continue;
            for(let i= 0; i < this.table.data.length; i++) {
                const y=this.dataToString(i,dataRow[i])
                if(isNaN(y) || y< yPlot.min || y> yPlot.max) continue;
                text.push({action:'text',children:[chart.label[i]+xText+" y: "+y+zText(chart,row,i)]})
            }
        }
    }
}
coords.bubbleandline=coords.bubble
coords.line=coords.bubble
function getDisplay(chart,xPos,yPos)
	canvasCoordsDetails: function (chart,xPos,yPos) {
		var XYRow=chart.detailXY.insertRow(-1);
		switch (this.type) {
			case 'bubble':
			case 'bubbleandline':
			case 'line':
			case 'pushline':
			case 'setline':
				break;
			case 'bar':
			case 'stack':
				var x=Math.floor((xPos)/this.tickIncrement-0.5);
				XYRow.insertCell(-1).innerHTML="x:";
				switch (this.dataType[0]) {
					case 'timestamp' :
					case 'date' :
					case 'datetime' :
						XYRow.insertCell(-1).innerHTML=this.dataToString(0,(xPos -this.xOffset)/this.xRatio);
						break;
					default:
						XYRow.insertCell(-1).innerHTML=this.data[x][0];
				}
				XYRow=chart.detailXY.insertRow(-1);
				XYRow.insertCell(-1).innerHTML= "y:";
				XYRow.insertCell(-1).innerHTML=this.dataToString(1,(this.yOffset - yPos)/this.yRatio);
				break;
			default:
				break;
		}
	},
	chart.prototype.plotSet=function (y,data,colour,tickIncrement,barWidth) {
        const points=[]
        const group=[]
		for(let i= 0; i < data.length; i++) {
			const dataiy=data[i][y]
			if(dataiy==null) continue;
			const xPos=Math.floor(i*this.tickIncrement)+(y-1)*barWidth
            points.push([xPos,dataiy])
		}
        group.push({action:"polyline",points:points})
        return {action:"g",stroke:color,children:[group,this.getPoints(points)]}
	},
    chart.prototype.getPoints=function(points,call=(x,y)=>({action:"circle",cx:x,cy:y,r:3})) {
        if(!this.showPoints) return ""	
        return points.reduce((a,p)=>{
            a.push(call(p.x,py))
            return a
        },[])
    }
    chart.prototype.getPointsRect=function(points,call=(x,y)=>({action:"rect",x:x-3,y:y-3,height:6,width:6})) {
        this.getPoints(points,call)
    }
	plot: function (y, offset, data) {
		if(data.length==0) return;
        const points=[]
		const row0=this.data[0]
		if(data.length==1 || this.highlight=='first') {
			const dataX=row0[0];
			const dataY=row0[y];
			if (dataX==null || dataY==null) return;
            points=[dataX,dataY]
			if(data.length==1) return;
		}
        result=this.showPoints?this.getPoints(points):this.getPointsRect(points)
        const colour=this.colour[y * offset]
        return {action:"g",stroke:colour,children:result}
		var errors;
		let linePointCnt=0;
        const rowPoints=[]
		for(let row=0; row < data.length; row++) {
			try {
                const rowData=this.data[row]
				const dataX=rowData[0];
				const dataY=rowData[y];
				if (dataX==null || dataY==null || isNaN(dataX) || isNaN(dataY)) {
					if(linePointCnt>0) {
						if(linePointCnt==1 && !this.showPoints)
                            rowPoints.push([this.data[row-1][0],data[row-1][y]])     
						linePointCnt=0;
					}
					continue;
				}
				plotX=dataX
				plotY=dataY
				if(++linePointCnt>1) {
					this.ctx.lineTo(plotX,plotY);
					continue;
				}
                this.getPoints(points)
			} catch (e) {
				errors += " x: " + dataX + " ( " + plotX + " ) " + " y: " + dataY + " ( " + plotY + " ) " + "\n" + e + "\n";
				linePointCnt=0;
			} 
		}
		if(linePointCnt>0) {
			if(( linePointCnt==1 || this.highlight=='last' ) && !this.showPoints)
                rowPoints.push([dataX,dataY])
		}  
        this.getPointsRect(rowPoints)
		if(this.showPoints) {
            const points=[]
            for(let row= 0; row < data.length; row++) {
                const dataRow=data[row]
				const dataY=dataRow[y]
				if(dataY==null) continue;
                points.push([dataRow[0],dataY])
			}
            this.getPoints(points)
        }
		if (errors!=null) throw errors;
	},
	dataToString: function(i,value) {
		return Format.toString(this.dataType[i],value)
	}
	drawLineAxis: function() {
        x+-0.5
        const ticks=[[0,this.height]]

        return {action:"g",id:"axis",stroke:"black","stroke-width":this.axis.X.LineWidth,children:result}

        {action:"line",x1:0,y1:this.height,x2:0,y2:0}
		switch (this.type) {
			case 'bubble':
			case 'bubbleandline':
			case 'line':
				if (this.xTicks.length>1) {
					this.ctx.textAlign='left';
					this.ctx.fillText(Format.toString(this.dataType[0],parseInt(this.xTicks[0])),0,this.height-this.axisOffset/2);
				}
				for(let i = 0; i< this.xTicks.length; i++) {
					const pos=this.xTicks[i]
					this.drawXAxisTick(pos);
					this.ctx.textAlign='center';
					this.ctx.fillText(this.dataToString(0,this.xTicks[i],true), pos,this.height-this.axisOffset/2);
				} 
				break;
			case 'bar':
			case 'pushline':
			case 'setline':
			case 'stack':
				if (this.xTicks.length==0) this.tickIncrement=this.xMax; 
				else this.tickIncrement=Math.floor(this.xMax/(this.xTicks.length+1));
				var k = Math.ceil((50/this.tickIncrement));
				for(let i = 0; i< this.xTicks.length; i+= k) {
					
					var pos=this.axisOffset + this.tickIncrement*(i+1);
					if(this.type == 'setline')
						pos -= this.tickIncrement;

					this.drawXAxisTick(pos);
					this.ctx.textAlign='center';
					this.ctx.fillText(Format.toString(this.dataType[0],this.data[i][0]), pos,this.height-this.axisOffset/2);
				}
				break;
			default:
		}
												// y axis  												 
		this.ctx.beginPath();					  
		this.ctx.moveTo(0,0.5);
		this.ctx.lineTo(this.width-( this.type == 'setline' ? this.tickIncrement : 0 ),0.5);  
		this.ctx.stroke(); 
												// y ticks
		for(let i = 0; i< this.yTicks.length; i++) {
			var pos=this.yTicks[i]
			this.drawYAxisTick(pos);
			this.ctx.textAlign='left';
			this.ctx.fillText(this.dataToString(1,this.yTicks[i]),0 , pos+3);
		} 
	},

	calculateTicks: function(yMax,max,min,type,metric) {
		let tickPosition = [];
		if (max==null || yMax==null ) return tickPosition;
		const tickCount = Math.floor(yMax/20);
		if(tickCount < 1) tickCount = 1; 
		let i=0,k=0;
		let duration=max-min;
        if(column.isTime()) {
            this.precision[metric]=1;
            const minTS= new Date();
            minTS.setTime(parseInt(min));
            const maxTS= new Date();
            maxTS.setTime(parseInt(max));
            timePrecision(duration,{
                minutes:()=>{
                    this.precision[metric]=60;
                    minTS.setMilliseconds(0);					
                    minTS.setSeconds(0);
                },
                hours:()=>{
                    this.precision[metric]=360;
                    minTS.setMinutes(0);
                },
                days:()=>{
                    this.precision[metric]=1440;
                    minTS.setHours(0);
	        	}
            })
const getTicks=(max,min,step)
    for(let i = minTS.getTime() ; i < max ; i=i+duration )
        if (i>min && i<=max) tickPosition[k++]=i;
)
           const hour=60*60*1000
            duration=Math.floor(duration/60000);   // minutes?
            if (duration > 0) {
                duration=Math.floor(duration/60);   // hours?
                if (duration > 0) { 	
                    duration=Math.floor(duration/24);   // days?
                    if (duration > 0) { 	
                        for(let j=1; j<this.height ; j++)
                            if (duration<j*5+1) break; 
                        duration=j*24*hour;
                    } else {
                        duration=Math.floor((max-min)/hour); 
                        duration=(Math.floor(duration/5)+1)*hour;
                    }
                } else {	
                    duration=Math.floor((max-min)/(60*1000));             // minutes
                    if (duration<5) 
                        duration=60*1000; minute==60000
                    else if (duration<25)
                        duration=5*60*1000; 
                    else
                        duration=10*60*1000;
                } 					
                for(let i = minTS.getTime() ; i < max ; i=i+duration )
                    if (i>min && i<=max) tickPosition[k++]=i;
                break;
            }
            duration=max-min;
        } else {

        }
        if(column.isMetric()) {
			const min = parseFloat(min)
			const max = parseFloat(max)
			const tickSpan = Math.floor((max-min)/tickCount);
			var tickTotal = Math.min(tickCount+10, Math.floor(Number.MAX_VALUE / tickSpan));
			for(let j=0;j<=tickTotal;j++) {
				tickPosition[j]= min + j*tickSpan;
				if( tickPosition[j] > max) break;
			}
        } else throw 'Unknown type: "'+type+'" for axis tick creation, check types are numeric, label: '+this.label[metric];
		return tickPosition;
	},
	resize: function() {
		switch (this.dataType[0]) {
			case "int":
			case "real":
			case "number":
			case "date":
			case "time":
			case "datetime":
			case "timestamp":
				if(this.columnIndex[0]==null) {
					this.dataMin[0]=0.5;
					this.dataMax[0]=1.5;
					this.xMax = this.width
					break;    // xTicks built whilst building data
				}
				const dataMin0=this.dataMin[0]
				const dataMax0=this.dataMax[0]
				this.xMax = this.width-6;
				if(dataMin0==dataMax0) {
					this.dataMin[0]=dataMax0-1;
					this.dataMax[0]=dataMax0+1;
				} 
				this.xRatio = this.xMax/(this.dataMax[0]-this.dataMin[0]);
				this.xOffset= this.dataMin[0]
				this.xTicks = this.calculateTicks(this.dataMax[0],this.dataMin[0],this.dataType[0],0);
				break;
			default:
		}		
		this.yDataMin = this.yAxisLowerBound;
		this.yDataMax = this.yAxisUpperBound;
		
		switch (this.type) {
			case 'stack':
				this.yDataMin= this.yDataMin ?? 0
				this.yDataMax= this.yDataMax ?? 0
				for( var i=0; i < this.table.data.length; i++) {
					if (this.dataMax[i]==null) continue;
					this.yDataMax+=this.dataMax[i];
				}
				if(this.yAxisUpperBound==null)
					this.yDataMax=this.yDataMax*1.01;
				break;
			case 'bar':
			case 'pushline':
			case 'setline':
				this.yDataMin= this.yDataMin??0
				this.yDataMax= this.yDataMax??0;
				for(var i =0; i < this.table.data.length; i++)
					if (this.yDataMax<this.dataMax[i]) this.yDataMax=this.dataMax[i];
				if(this.yAxisUpperBound==null)
					this.yDataMax=this.yDataMax*1.1;
				break;
			default:
				this.yDataMax= this.yDataMax??this.dataMax[1];
				this.yDataMin= this.yDataMin??this.dataMin[1];
				for(var i = 0; i < this.table.data.length; i++) {
					if (this.yDataMax<this.dataMax[i]) this.yDataMax=this.dataMax[i];
					if (this.yDataMin>this.dataMin[i]) this.yDataMin=this.dataMin[i];
				}
				this.yDataMax= this.yDataMax?? 1
				this.yDataMin= this.yDataMin?? 0;
				if(this.yDataMin==this.yDataMax)  
					if(this.yDataMax==0)
						this.yDataMax=1;
				if(this.yAxisLowerBound==null)
					this.yDataMin=this.yDataMin*0.99;
				if(this.yAxisUpperBound==null)
					this.yDataMax=this.yDataMax*1.01;
				break;
		} 
		if(this.zAxis) {
			var zDetails=this.axis.z;
			this.zDataMax=null;
			this.zDataMin=null;
			this.zRatioColumns=[];
			for (let i=0;i<zDetails.dataMin.length;i++) {
				if(this.zDataMax<zDetails.dataMax[i]) this.zDataMax=zDetails.dataMax[i]; 
				if(this.zDataMin>zDetails.dataMin[i]) this.zDataMin=zDetails.dataMin[i];
				this.zRatioColumns[i]={};
				var ratio=this.zRatioColumns[i];
				rangeZ=zDetails.dataMax[i]-zDetails.dataMin[i];
				if(rangeZ==0) {
					rangeZ=zDetails.dataMin[i];
					ratio.zRatioOffset=0;
				} else 
					ratio.zRatioOffset=zDetails.dataMin[i];
				ratio.zRatio=this.bubbleRatio*(Math.min(this.yMax,this.xMax)/rangeZ );
				if(ratio.zRatio==Infinity) this.zRatio=this.bubbleRatio;
				if (isNaN(ratio.zRatio)) throw "z ratio calculation error, charting width:"+ this.yMax + " max:"+ zDetails.dataMax[i] + " min:"+ zDetails.dataMin[i];
			}
			rangeZ=this.zDataMax-this.zDataMin;
			if(rangeZ==0) {
				rangeZ=this.zDataMin;
				this.zRatioOffset==0;
			} else 
				this.zRatioOffset=this.zDataMin;
			this.zRatio=this.bubbleRatio*(Math.min(this.yMax,this.xMax)/rangeZ);
			if(this.zRatio==Infinity) this.zRatio=this.bubbleRatio;
			if (isNaN(this.zRatio)) throw "z ratio calculation error, charting width:"+ this.yMax + " max:"+ Math.max.apply(Math,this.axis.z.dataMax) + " min:"+ Math.min.apply(Math,this.axis.z.dataMin);
		}
	},
	dataConversion: function(i,value) {
		if (value==null) return null;
		if(dataConversionFunc[this.dataType[i]]==null) return value;
		try{
			return dataConversionFunc[this.dataType[i]](value);
		} catch(e) {
			throw "data conversion error data type: " +dataType[i] + ' value: "'+ value +'"';
		}
	},
	buildDataSet: function(dataset) {
		if (dataset.length <1) this.errorFunction('No data to chart')
		delete this.columnIndexDetails;
		this.columnIndex=[];
		this.data=[];
		this.dataType=[];
		this.dataMax=[];
		this.dataMin=[];
		this.group=[];
		this.groupIndex;
		this.groupingValue="";
		this.groupValue=[];
		this.precision=[];
		this.label=[];
		this.xTicks=[];
		this.yTicks=[];
//        this.table.setDelta([])
		this.setColumnDetails(0,this.axis.x.columns);
		let x = -1
			switch (this.baseTableData.columnsInfo.type[this.columnIndex[0]]) {
				case 'timestamp':
					this.xNormliseFactor=this.deltaNormaliser*1000;
					break;
				default:
					this.xNormliseFactor=this.deltaNormaliser;
			}
		this.axis.x.normaliser=1;
		var xCol=this.columnIndex[0];
        const group=table.list.group.names?
            (row)=>this.setData(++x):
            (row)=>{
				if (x==-1) {
					this.setData(++x);
				} else if (dataset[row][xCol] !=  dataset[row-1][xCol]) {
					this.setData(++x);
				}
				var newGroupingValue='';
				for(let i = 0; i < this.groupIndex.length; i++)
					newGroupingValue+=' '+ dataset[row][this.groupIndex[i]];
				if (this.groupingValue!=newGroupingValue) {
					this.groupingValue=newGroupingValue;
					this.group[0]=this.groupingValue;
					const i=this.groupValue.find(v=>this.groupingValue==v)
					if (i<0) {
						this.groupValue.push(this.groupingValue)
						this.setColumnIndexDetails("y");
					}
				}
                
            }
        table.forEachRow(row=>{
            group(row)
        })

		for(let row = 0; row < dataset.length; row++) {
			if (this.grouping==null) {
				this.setData(++x);
			} else {
				if (x==-1) {
					this.setData(++x);
				} else if (dataset[row][xCol] !=  dataset[row-1][xCol]) {
					this.setData(++x);
				}
				let newGroupingValue='';
				for( i = 0; i < this.groupIndex.length; i++)
					newGroupingValue+=' '+ dataset[row][this.groupIndex[i]];
				if (this.groupingValue!=newGroupingValue) {
					this.groupingValue=newGroupingValue;
					this.group[0]=this.groupingValue;
					const i=this.groupValue.find(v=>this.groupingValue==v)
					if (i <0) {
						this.groupValue.push(this.groupingValue)
						this.setColumnIndexDetails("y");
					}
				}
			}
			this.xTicks[x]=row;
			for(var i = 0; i < this.columnIndex.length; i++) {
				if (this.group[i]!=this.groupingValue) continue;
				var value = (this.columnIndex[i]==null?x+1:this.dataConversion(i,dataset[row][this.columnIndex[i]]));
				this.data[x][i] = value;
				this.setMaxMin(this, i, value);
		 		if(this.zAxis) this.setDataAxis('z',dataset[row],x,i); 
			}
		}
	},
	setMaxMin: (base,i,value)=>{
 		if (base.dataMin[i]==null) {
 			base.dataMin[i]=value;
 			base.dataMax[i]=value;
 		} else if (base.dataMin[i]>value)
 			base.dataMin[i]=value;
 		else if (base.dataMax[i]<value) 
 			base.dataMax[i]=value;
	},
	setData: function(x) {
		this.data[x]=[];
		this.deltaData[x]=[];
	},
	setDataAxis: function(axis,row,x,i) {
		var colDetails=this.columnIndexDetails[axis];
		var value = (row==null?null:this.dataConversion(i,row[colDetails.columnIndex[i]]));
		if(colDetails.dataStore[x]==null) {
			colDetails.dataStore[x]=[];
			colDetails.deltaData[x]=[];
		}
		colDetails.dataStore[x][i]=value;
		this.setMaxMin(colDetails, i, value);
	},
	setColumnDetails: function(index,columnName) {
   		if(columnName==null) {
			this.columnIndex[index]=null;
			this.dataType[index]='int';
			this.label[index]=this.groupingValue;
			this.group[index]=this.groupingValue;
   			return;
   		}
		const i = this.findColumnIndex(columnName);
		this.columnIndex[index]=i;
		this.dataType[index]=this.baseTableData.columnsInfo.type[i];
		this.label[index]=this.groupingValue + " " + this.table.getColumn(columnName).title
		this.group[index]=this.groupingValue;
	},
	setColumnDetailsAxis: function(columnDetails,columnName) {
   		if(columnName==null) throw "Column name not specified"
		const i = this.findColumnIndex(columnName);
		const index=columnDetails.columnIndex.length;
		columnDetails.columnIndex[index]=i;
		columnDetails.dataType[index]=this.baseTableData.columnsInfo.type[i];

		

		columnDetails.label[index]=this.groupingValue + " " + this.table.getColumn(columnName).title
		columnDetails.group[index]=this.groupingValue;
	},
    setListProperty: function(select,property,list) {
        this[property]=[];
        const p=this[property]
        for (let i = 0; i < select.options.length; i++)
             if (select.options[i].selected)
             	p.push(select.options[i].value)
      this[list]=p.join();
    },
    setMetrics: function(select) {
        this.setListProperty(select,"ySeries","yAxis")
 	},
    setGrouping: function(select) {
        this.setListProperty(select,"groupingArray","grouping")
	}
    getMetricColumnsOptions=function() {
   		const option='<tr><td>Y Metrics</td><td>'
                +this.table.getSelectHML(this.ySeries,this.callBackText+".setMetrics(this)",(column)=>column.isNumeric())
		    +'</td></tr>'
   			+'<tr><td>Grouping</td><td>'
                +this.table.getSelectHML(this.grouping,this.callBackText+".setGrouping(this)",(column)=>column.type=="string")
		    +'</td></tr>'
		return option
	}
}

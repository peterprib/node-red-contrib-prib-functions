const logger = new (require("node-red-contrib-logger"))("Monitor System")
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");
const os = require('node:os');
const v8 = require('node:v8');
const { memoryUsage, resourceUsage } = require('node:process')
const fs = require('fs')
const path = require("path");
const svgObject = require("./svgObjects.js");
const resourceLabels={
    userCPUTime: "User Time (ms)",
    systemCPUTime: "System Time (ms)",
    maxRSS: "Max RSS (kb)",
  // sharedMemorySize": "Shared Memeory", //<integer> maps to ru_ixrss but is not supported by any platform."
  // unsharedDataSize <integer> maps to ru_idrss but is not supported by any platform.
  // unsharedStackSize <integer> maps to ru_isrss but is not supported by any platform.
    minorPageFault: "Minor Page Faults",
    majorPageFault: "Major Page Faults",
  //  swappedOut: // <integer> maps to ru_nswap but is not supported by any platform.
    fsRead: "Reads",
    fsWrite: "Writes", 
  //ipcSent <integer> maps to ru_msgsnd but is not supported by any platform.
  //ipcReceived <integer> maps to ru_msgrcv but is not supported by any platform.
  //signalsCount <integer> maps to ru_nsignals but is not supported by any platform.
  //  voluntaryContextSwitches: "Voluntary Context Switches" // This field is not supported on Windows.
  //  involuntaryContextSwitches: "Involuntary Context Switches" // This field is not supported on Window
  }

const chartLine=new svgObject.Chart({type:"line",
    labels:["RSS: Resident Set Size","Heap Total","Heap Used","External","Array Buffer","Free Memory","Total Memory"]})
const getPoints=(samples,metrics,metric,...properties)=>{
    const points=[],size=Math.min(samples,metrics.length)
    for(let i=0; i<size ; i++){
        const m=metrics[i][metric]
        points.push(properties.map(p=>m[p]))
    }
    return points
}
const getDiffPoints=(samples,metrics,metric,...properties)=>{
    const points=getPoints(samples+1,metrics,metric,...properties)
    return Array.from({ length: points.length-1}, (_, i) =>{
        const next=points[i+1]
        return points[i].map((c,j)=>c-next[j])
    })
}
 
const properties=Object.keys(resourceLabels)
const labels=properties.map(c=>resourceLabels[c])
const chartLineResource=new svgObject.Chart({type:"line",labels:labels,normaliseDimension:"column",
  getData:()=>getDiffPoints(11,metrics,"resourceUsage",...properties)
})

let svgHTMLCache
const {
    performance,
    PerformanceObserver,
  } = require("node:perf_hooks");
const { action, children } = require("./defs.js");
const obs = new PerformanceObserver(list => {
  const entry = list.getEntries()[0]
})
/*
https://nodejs.org/api/perf_hooks.html

PerformanceEntry {
  name: 'gc',
  entryType: 'gc',
  startTime: 2820.567669,
  duration: 1.315709,
  kind: 1
}
*/

process.resourceUsage()
const systemMetrics=()=>{
  return {
    freeMemory: os.freemem(),
    heapCodeStatistics:v8.getHeapCodeStatistics(),
    heapSpaceStatistics:v8.getHeapSpaceStatistics(),
    heapStatistics:v8.getHeapStatistics(),
    memoryUsage:memoryUsage(),
    loadAvg: os.loadavg(),
    timestamp: Date.now(),
    resourceUsage: resourceUsage(),
    totalMemory: os.totalmem(),
    uptime: os.uptime()
  };
}
const metricLabel={
    freeMemory: "Free Memory",
    heapCodeStatistics:"Heap Code",
    heapSpaceStatistics:"Heap Space",
    heapStatistics:"Heap",
    memoryUsage:"Memory Usage",
    loadAvg: "Load avg",
    resourceUsage: "Resource Usage",
    totalMemory: "Total Memory"
}
const svcTextLine=(metric,value)=>{
    return {action:"text",id:metric,height:10 ,children:[metricLabel[metric]+": "+(typeof value== "object"?JSON.stringify(value):value)]}
}
const svcTextLineUpdate=(metric,value)=>{
    return {action:"update",id:metric,children:[metricLabel[metric]+": "+(typeof value== "object"?JSON.stringify(value):value)]}
}

const mappingMemory=["freeMemory","memoryUsage.","totalMemory",]

const getPointsMemory=()=>{
    const points=[],size=Math.min(11,metrics.length)
    for(let i=0; i<size ; i++){
        const mi=metrics[i]
        const m=mi.memoryUsage
        points.push([m.rss,m.heapTotal,m.heapUsed,m.external,m.arrayBuffers,mi.freeMemory,mi.totalMemory])
    }
    return points
}
//const gapAngle=100
//const dialAngleArea=360-gapAngle
const memoryDial=new svgObject.DialGauge({title:"% used memory"})
const metricFunction={
    chartMemoryUsage: ()=>({action:"g",id:"chartMemoryUsage",height:100,children:[chartLine.setData(getPointsMemory()).get()]}),
    freeMemory: svcTextLine,
    gaugeMemory: ()=>{
        const currentState=metrics[0]
        memoryDial.setMax(currentState.totalMemory)
        return memoryDial.get(currentState.totalMemory-currentState.memoryUsage)
    },
    heapCodeStatistics:svcTextLine,
    heapSpaceStatistics:svcTextLine,
    heapStatistics:svcTextLine,
    memoryUsage:svcTextLine,
    loadAvg:svcTextLine,
    resourceUsage:svcTextLine,
    totalMemory:svcTextLine,
    chartLineResource:()=>({action:"g",id:"chartLineResource",height:100,children:[chartLineResource.get()]})
}

const metricFunctionUpdate={
    chartMemoryUsage: ()=>chartLine.setData(getPointsMemory()).getUpdate(),
    freeMemory: svcTextLineUpdate,
    gaugeMemory: ()=>{
        const currentState=metrics[0]
        return memoryDial.setMax(currentState.totalMemory).getUpdate(currentState.totalMemory-currentState.freeMemory)
    },
    heapCodeStatistics:svcTextLineUpdate,
    heapSpaceStatistics:svcTextLineUpdate,
    heapStatistics:svcTextLineUpdate,
    memoryUsage:svcTextLineUpdate,
    loadAvg:svcTextLineUpdate,
    resourceUsage:svcTextLineUpdate,
    totalMemory:svcTextLineUpdate,
    chartLineResource:()=>chartLineResource.getUpdate()
}

let metrics=[]
const nodes=[]
function getJson(){
    return nodes.reduce((p,node)=>{
        p[node.id]=metrics.length?node.getSendData(metrics[0]):null
        return p;
    },{})
}
function updateJson(){
    return nodes.reduce((p,node)=>{
        try{
            if(metrics[0]) p[node.id]=node.getSendDataUpdate(metrics[0])
        } catch (ex) {
          logger.active&&logger.sendErrorAndStackDump("failed for "+node.id,ex)
        }
        return p;
    },{})
}

let runtimeTimer
function runtimeStop() {
	if(runtimeTimer) {
		clearTimeout(runtimeTimer)
		runtimeTimer=null
	}
    nodes.forEach(node=>{
        node.status({fill:"red",shape:"ring",text:"Stopped"})
    })
}
const reset=()=>{
    metrics=[];
    nodes.forEach(node=>node.status({fill:"yellow",shape:"ring",text:"Metrics Reset"}))
}
const runtimeStart=(node)=>{
    logger.active&&logger.send({ label: 'start system monitoring'})
    if(runtimeTimer) clearTimeout(runtimeTimer)
    runtimeTimer=setInterval(function(){checkLoop();},1000);
    nodes.forEach(node=>{
        node.status({fill:"green",shape:"ring",text:"Collecting"})
    })
}
function checkLoop() {
    logger.active&&logger.send({ label: 'checkloop collect state'})
    const currentState=systemMetrics();
	metrics.unshift(currentState);
}

module.exports = function (RED) {
    function nodeFunction(n) {
        RED.nodes.createNode(this, n);
        let node=Object.assign(this,n);
        if(runtimeTimer) node.status({fill:"green",shape:"ring",text:"Collecting"})
        else node.status({fill:"yellow",shape:"ring",text:"Initial state"});
        const selectedMetrics=node.metrics.split(',')
        const sendData=selectedMetrics.reduce((p,c,i)=>{
            p.push("metricFunction."+c+"('"+c+"',metricSample."+c+")")
            return p
        },[]).join(",")
        const sendDataUpdate=selectedMetrics.reduce((p,c,i)=>{
            p.push("metricFunctionUpdate."+c+"('"+c+"',metricSample."+c+")")
            return p
        },[]).join(",")
        try{
            logger.active&&logger.info({label:"sendData",function:sendData})
            node.getSendData=eval("(metricSample)=>svgObject.calculatePositionVertically(["+sendData+"],60)")
            const evalText="(metricSample)=>["+sendDataUpdate+"]"
            logger.active&&logger.debug({ label: 'eval', node:{id: node.id, name: node.name},eval:evalText})
            node.getSendDataUpdate=eval(evalText)
        } catch(ex) {
            node.getSendData=()=>{return [{action:"text",x:0 ,y:60 ,children:["failed: "+ex.message]}]}
            logger.active&&logger.error({ label: 'eval', node:{id: node.id, name: node.name},error:ex.message,display:display,sendData:sendData,stack:ex.stack })
            node.status({fill:"red",shape:"ring",text:"error: "+ex.message});
            return
        }
        node.on('close', function (removed, done) {
            nodes=[]
            done()
        })
        nodes.push(node)
        if(!runtimeTimer) {
            runtimeStart(node)
        }
    }
    const url='/' + logger.label.replace(" ","") + '/'
    RED.httpAdmin.get(url + ':id/:action/', RED.auth.needsPermission(logger.label + '.write'), function (req, res) {
    	const node = RED.nodes.getNode(req.params.id);
    	if (node && node.type===logger.label) {
    	    try {
                switch (req.params.action) {
                    case "getBase":
                        res.status(200).json(node.getBaseSVG())
                        break
                    case "Start":
                        runtimeStart()
                        node.warn("Request to start monitor system");
                        break
                    case "Stop":
                        runtimeStop()
                        node.warn("Request to stop monitor system");
                        break
                    case "observeGC":
                        obs.observe({ entryTypes: ['gc'] });
                        node.warn("Request to observe gc");
                        break
                    case "observeDisconnect":
                        obs.disconnect();
                        node.warn("Request to observe disconnect")
                        break
                    case "trace gc on":
                        v8.setFlagsFromString('--trace-gc')
                        node.warn("Request to --trace-gc");
                        break
                   case "trace gc off":
                        v8.setFlagsFromString('--notrace-gc')
                        node.warn("Request to --notrace-gc");
                        break
                   default:
                        throw Error("invalid action "+req.params.action)
                }
    	        res.sendStatus(200);
    	    } catch(ex) {
    	    	var reason1='Internal Server Error, monitor system failed '+ex.toString();
    	        logger.error(reason1);
    	        res.status(500).send(reason1);
                logger.active&&logger.error(ex.stack);
    	    }
    	} else {
    		var reason2="request to reset monitor flow failed for id:" +req.params.id;
	        node.error(reason1);
    		res.status(404).send(reason2);
    	}
    });   
    RED.httpAdmin.get(url + ':action/', RED.auth.needsPermission( logger.label + '.read'), function (req, res) {
   	    try {
            logger.active&&logger.info({ label: ' httpAdmin '+req.params.action})
            switch (req.params.action) {
                case "svgHTML":
                    if(svgHTMLCache) {
                        res.type('json').status(200).send(svgHTMLCache)
                    } else {
                        fs.readFile(path.join(__dirname,"svgHTML.js"), "utf8", (err, data) => {
                            if(err) {
                                logger.error("svgHTML get error: "+err)
                                res.status(500).send("NOT FOUND")
                            } else {
                                svgHTMLCache=data
                                res.type('json').status(200).send(data);
                            }   
                        })
                    }
                    break
                case "getDataSVG":
                    res.status(200).json(getJson())
                    break;
                case "getDataUpdateSVG":
                    res.status(200).json(updateJson())
                    break;
                default:
                    throw Error("invalid action "+req.params.action)
            }
        } catch(ex) {
	    	var reason1='Internal Server Error, monitor system failed '+ex.toString();
    		logger.error(reason1);
	        res.status(500).send(reason1);
            logger.active&&logger.error(ex.stack);
	    }
    });   
    RED.nodes.registerType(logger.label,nodeFunction);
};
const logger = new (require("node-red-contrib-logger"))("Data Analysis");
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");

require("./autocorrelation.js");
require("./arrayLast");
require("./arrayDifference")
require("./arrayDifferenceSeasonal")
require("./arrayDifferenceSeasonalSecondOrder")
require("./arrayDifferenceSecondOrder")
require("./arrayRandom")
const ed=require("./euclideanDistance.js");
require("./forNestedEach");

function crossNormalisedDeltas() {
	const dataPoints=this.dataPoint;
	const keys=Object.keys(dataPoints);
	const normalisedAvgDelta=keys.reduce((a,c,i)=>a+=dataPoints[c].normalised,0)/keys.length;
	return keys.map(c=>{
		return {key:c,value:dataPoints[c].normalised-normalisedAvgDelta};
	}).sort((a,b)=>a.value-b.value);
}
function predictForKey(node,key) {
	const dp=node.dataPoint[key];
	if(dp) return new Predictions(dp);
	throw Error("no data points");
}
function Predictions(dp) {
	const predictions=[];
	if(!dp) throw Error("no data points");
	const lastValue=dp.value.last(),lastValue2=lastValue*2;
	if(dp.delta) {
		const delta=dp.delta,
			lastDeltaValue=delta.value.last(),
			deltaMovingAvg=delta.movingAvg,
			deltaWeightedMovingAvg=delta.weightedMovingAvg;
		predictions.push(lastValue+lastDeltaValue);
		predictions.push(lastValue+deltaMovingAvg);
		predictions.push(lastValue+deltaWeightedMovingAvg);
		predictions.push(lastValue2-dp.exponentialWeightedMoving[0].movingAverage);
		predictions.push(lastValue+delta.exponentialWeightedMoving[0].movingAverage);
		predictions.push(lastValue2-dp.exponentialWeightedMoving[1].movingAverage);
		predictions.push(lastValue+delta.exponentialWeightedMoving[1].movingAverage);
		predictions.push(lastValue2-dp.exponentialWeightedMoving[2].movingAverage);
		predictions.push(lastValue+delta.exponentialWeightedMoving[2].movingAverage);
	}
	this.prediction=predictions;
	return this;
}
Predictions.prototype.validate=function(value) {
	this.accuracy=this.predictions.map(c=>Math.abs(c-value)/c);
	return this;
};
function realtimePredict(d,term,node) {
	const m=functions.realtime(d,term,node);
	m.predict=predict(m);
	return m;
}
function EMA(coefficient=0.5) {
	if(coefficient<0 || coefficient>1 ) throw Error("coefficient must be between 0 and 1");
	this.factor=(1-coefficient);
	this.weightedSum=0;
	this.weightedCount=0;
	this.movingAverage=0;
	return this;
}
EMA.prototype.sample=function(value) {
	this.weightedSum=value+this.factor*this.weightedSum;
	this.weightedCount=1+this.factor*this.weightedSum;
	this.movingAverage=this.weightedSum/this.weightedCount;
	return this;
}

function setDataPoint(value,term,node,dataPoint) { 
	if(logger.active) logger.send({label:"setDataPoint",value:value,term,dataPoint});
	if(!dataPoint.values) {
		Object.assign(dataPoint,{
			values:[],
			avg:0,
			count:0,
			movingSum:0,
			movingSumSquared:0,
			movingSumCubed:0,
			outlier:false,
			sum:0,
			sumSquared:0,
			sumCubed:0,
			term:term??node.term,
			weightedMovingSum:0,
			exponentialWeightedMoving:[new EMA(0.25),new EMA(0.5),new EMA(0.75)]
		});
	};
	const count=++dataPoint.count,values=dataPoint.values;
	values.push(value);
	const movingTerm=Math.min(values.length,dataPoint.term)
	dataPoint.isMaxSize=(values.length>dataPoint.maxSize);
	dataPoint.removedMovingValue=(dataPoint.isMaxSize?values[values.length-dataPoint.term]:0);
	dataPoint.removedValue=(dataPoint.isMaxSize?values.shift():0);
	const removedMovingValue=dataPoint.removedMovingValue;
	dataPoint.max=Math.max(dataPoint.max||value,value);
	dataPoint.min=Math.min(dataPoint.min||value,value);
	dataPoint.range=dataPoint.max-dataPoint.min;
	dataPoint.sum+=value;
	dataPoint.sumSquared+=Math.pow(value,2);
	dataPoint.sumCubed+=Math.pow(value,3);
	dataPoint.movingSum+=value-removedMovingValue;
	dataPoint.movingSumSquared+=Math.pow(value,2)-Math.pow(removedMovingValue,2);
	dataPoint.movingSumCubed+=Math.pow(value,3)-Math.pow(removedMovingValue,3);
	dataPoint.avg=dataPoint.sum/count;
	const avg=dataPoint.avg;
	dataPoint.normalised=dataPoint.range ? (value-avg)/dataPoint.range : 0;
	dataPoint.movingAvg=dataPoint.movingSum/movingTerm;
	dataPoint.variance=dataPoint.sumSquared/count - Math.pow(avg,2);
	dataPoint.stdDev=Math.sqrt(dataPoint.variance);
	dataPoint.movingVariance=dataPoint.movingSumSquared/movingTerm - Math.pow(dataPoint.movingAvg,2);
	dataPoint.movingStdDev=Math.sqrt(dataPoint.movingVariance);
	dataPoint.median=functions.median(values);
	dataPoint.standardized=( (value-avg)/dataPoint.stdDev )||0;
	dataPoint.movingStandardized=( (value-dataPoint.movingAvg)/dataPoint.movingStdDev )||0;
	dataPoint.skewness=(dataPoint.sumCubed-3*avg*dataPoint.variance-Math.pow(avg,3))/dataPoint.variance*dataPoint.stdDev;
	dataPoint.movingSkewness=(dataPoint.movingSumCubed-3*dataPoint.movingAvg*dataPoint.movingVariance-Math.pow(dataPoint.movingAvg,3))/dataPoint.movingVariance*dataPoint.stdDev;
	dataPoint.outlier=node.outliersFunction(node,dataPoint,value);
	dataPoint.weightedMovingSum+=count*value;
	dataPoint.weightedMovingAvg=(dataPoint.weightedMovingAvg*2/count)/(count+1);
	dataPoint.exponentialWeightedMoving.forEach(c=>c.sample(value));
}
function getColumns(node) {
	if(node.columns) {
		if(node.columns instanceof Array) return node.columns
		return eval("["+node.columns+"]");
	}
}
functions={
	autocovariance:(d,term,node)=>d.autocovariance(node.lag),
	autocorrelation:(d,term,node)=>d.autocorrelation(node.lag),
	avg:(d)=>functions.sum(d)/d.length,
	arrayMax:(d)=>{  // not tested
		let max=[],indices
		a.forNestedEach((e,f,l)=>{const i=l[l.length-1];if(max[l]<e) {max=e,indices=l}})
	},
	covariance: (d)=>{
		const means=[],covars=[],dl=d.length,dlminus1=dl-1,N=d[0].length;
		d.forEach((e,i)=>{
			means.push(e.reduce((a,c)=>a+c)/N);
		});
		for(let i=0;i<dlminus1;i++){
			covars[i]=[];
			const di=d[i],v=covars[i],meani=means[i];
			for(let j=i+1;j<dl;j++){
				const dj=d[j],meanj=means[j];
				v[j-1]=di.reduce( (a,c,k)=>a+(c-meani)*(dj[k]-meanj),0)/N;
			}
		};
		if(dl==2) return covars[0]; 
		return covars;
	},
	corelationship:(d)=>{
		const covars=functions.covariance(d);
		const stdDev=d.map(c=>functions.stdDev(c));
		return covars.map((a)=>a.map((c,i)=>c==null?null:c/(stdDev[i+1]*stdDev[i])));
	},
	deltas :(d)=>d.map( (c,i)=>c-(d[i-1]||0) ),
	deltaNormalised :(d)=>d.map( (c,i)=>(c-(d[i-1]||0)) / (d[i-1]||0) ),
	distances: (d,term,node)=>{
		if(node.columns) return ed.distances(d,getColumns(node))
		return ed.distances(d);
	},
	distancesMin: (d,term,node)=>ed.minDistances(d,getColumns(node)),
	distancesMax: (d,term,node)=>ed.maxDistances(d,getColumns(node)),
	difference: (d)=>d.difference(),
	differenceSeasonal: (d,term,node)=>d.differenceSeasonal(node.lag),
	differenceSeasonalSecondOrder: (d,term,node)=>d.differenceSeasonalSecondOrder(node.lag),
	differenceSecondOrder: (d)=>d.differenceSecondOrder(),
	max: (d)=> Math.max(...d),
	median:(d)=>{
		const i=Math.floor(d.length/2);
		return d.length%2 ? d[i] : (d[i]+d[i-1])/2; 
	},
	min:(d)=>Math.min(...d),
	movingAvgSimple:(d,n)=>{
		let avg=0; 
		return d.map( (c,i,a)=>{ avg= i<=n? avg+(c-avg)/(i+1) : avg+(c-a[i-n])/n; return avg; });
	},
	movingAvgCumulative :(d)=>{
		let avg=0; 
		return d.map( (c,i)=>{ avg+=(c-avg)/(i+1); return avg; }); 
	},
	movingAvgExponential:(d,f)=>{
		if(f<0 || f>1) throw Error("factor must be >=0 and <=1");
		if(d.length==0) return [];
		let s=d[0],fi=1-f;
		return d.map( (c)=>{
			s=c*f+fi*s;
			return s; 
		});
	},
	movingAvgWeighted :(d,n)=>{
		let SN=0, total=0,numerator=0;
		for(let  i=1;i<=n;i++) {SN+=i;}
		return d.map( (c,i,a)=>{ 
			numerator+=n*c-total;
			total+=c-(a[i-n]||0);
			return numerator/SN;
		});
	},
	normalize:(d)=>{
		const range=functions.range(d);
		if(range==0) return d.map(()=>0); 
		const avg=functions.avg(d),
			offset=avg/range;
		return d.map(c=>c/range-offset);
	},
	range:(d)=>Math.max(...d)-Math.min(...d),
	pearsonR:(d,term,node)=>{
		functions.pearsonRLoad(d,term,node);
		functions.pearsonRCalc(d,term,node);
		return functions.pearsonRResults(node);
	},
	pearsonRLoad:(d,term,node)=>{
		if(!node.dataPoints) {
			node.dataPoints=[];
			node.samples=0;
			for(let j,i=0; i<node.dataProperties.length; i++) {
				node.dataPoints[i]={sum:0,sumSquared:0,sumj:[]};
				for(j=i+1; j<node.dataProperties.length; j++) {
					node.dataPoints[i].sumj[j]=0;
				}
			}
		}
		node.samples++;
		for(let i=0; i<node.dataProperties.length; i++) {
			const v=d[i];
			const dp=node.dataPoints[i];
			dp.sum+=v;
			dp.sumSquared+=v*v;
			for(let j=i+1; j<node.dataProperties.length; j++) {
				dp.sumj[j]+=v*d[j];
			}
		}
	},
	pearsonRCalc:(d,term,node)=>{
		node.pearsonR=[];
		for(let dpi,j, i=0; i<node.dataProperties.length; i++) {
			dpi=node.dataPoints[i];
			for(j=i+1; j<node.dataProperties.length; j++) {
				dpj=node.dataPoints[j];
				let v = ( node.samples*dpi.sumj[j] - dpi.sum*dpj.sum
						)/( 	(Math.sqrt(node.samples*dpi.sumSquared - Math.pow(dpi.sum,2)))
							*	(Math.sqrt(node.samples*dpj.sumSquared - Math.pow(dpj.sum,2)))
						);
				node.pearsonR.push({value:v,i:i,j:j});
			}
		}
		node.pearsonR.sort((a,b)=>a.value>b.value);
	},
	pearsonRResults:(node)=>{
		if(node.hasOwnProperty("pearsonR")) {
			return {pearsonR:node.pearsonR,dataPoints:node.dataPoints,samples:node.samples};
		}
	},
	standardize:(d)=>{
		const avg=functions.avg(d),
			stdDev=functions.stdDev(d);
		return d.map( (c)=>(c-avg)/stdDev);
	},
	stdDev:(d)=>Math.sqrt(functions.variance(d)),
	skew:(d)=>{
		const avg=functions.avg(d),
			variance=functions.sumWithFunction(d,(v)=>Math.pow(v,2)) - Math.pow(avg,2);
		return (functions.sumWithFunction(d,(v)=>Math.pow(v,3))
			- 3*avg*variance
			- Math.pow(avg,3))
			/ variance*Math.sqrt(variance);
	},
	realtimePredict: realtimePredict,
	realtime:(d,term,node)=>{
		if(!d.key) throw Error("key is null,  "+JSON.stringify(d));
		if(!d.value) throw Error("value is null "+JSON.stringify(d));
		let dp;
		if(d.key in node.dataPoint) {
			dp=node.dataPoint[d.key];
		} else {
			dp={key:d.key};
			node.dataPoint[d.key]=dp;
		}
		setDataPoint(d.value,term,node,dp);
		if(dp.delta) {
			if(dp.values.length>1)
				setDataPoint(d.value-dp.values[dp.values.length-2],term,node,dp.delta);
		} else {
			dp.delta={};
		}
		if(node.lag>1) {
			const vectorSize=dp.values.length
			if(dp.lag) {
				if(node.lag<=vectorSize){
				  setDataPoint(d.value-dp.values[vectorSize-node.lag],term,node,dp.lag)
				  const values=dp.lag.values
				  if(values.length>1) setDataPoint(values[values.length-1]-values[values.length-2],term,node,dp.lag.delta)
				}
			} else {
				dp.lag={delta:{}}
			}
		}
		return dp;
	},
	sampleVariance:(d)=>{
		const mean=functions.avg(d);
		const sum=functions.sumWithFunction(d,(v)=>v-mean)
		return sum/(d.length-1)
	},
	sum:(d)=>d.reduce((p,c)=>p+c),
	sumWithFunction:(d,f)=>d.reduce((p,c)=>p+f.apply(this,[c]),0),
	variance:(d)=>{  //Var(X) = E (X − E(X))2 = E(X2) − (E(X))2
		const n=d.length;
		return functions.sumWithFunction(d,(v)=>Math.pow(v,2))/n - Math.pow(functions.avg(d),2);
	},
	sampleStdDev:(d)=>Math.sqrt(functions.sampleVariance(d)),
	sampleVariance:(d)=>{
		if(d.length<2)return 0
		const mean=functions.avg(d);
		const sum=d.reduce((a,e)=>a+Math.pow(e-mean,2),0);
		return sum/(d.length-1)
	}
}
functions.mean=functions.avg;
module.exports = function (RED) {
	function dataAnalysisNode(n) {
		RED.nodes.createNode(this, n);
		const node=Object.assign(this,
			{outliersStdDevs:3,crossNormalisedDeltas:crossNormalisedDeltas.bind(this),lag:1,term:3},
			n,
			{maxErrorDisplay:10,dataPoint:{}}
		);
		try{
			node.lag=Number(node.lag)
			if(Number(node.term)==NaN)throw Error("term not a number, value:"+JSON.stringify(node.term))
			node.term=Number(node.term)
			node.maxSize=Math.max(node.term,node.lag)
			if(functions.hasOwnProperty(node.action)) {
				node.actionfunction=functions[node.action];
			} else {
				throw Error("action not found");
			}
			switch (node.action) {
			case "realtime":
				node.outliersStdDevs=Number.parseInt(node.outliersStdDevs,10)||3;
				if(![1,2,3].includes(node.outliersStdDevs)) throw Error("outlier std deviation "+node.outliersStdDevs+" not 1,2 or 3");
				const outliersFunction=(node.outliersBase||"avg")=="median";
				node.log("realtime outliersBase set avg "+outliersFunction);
				node.outliersFunction=(outliersFunction
						?(node,dp,value)=>{
							const standardized=Math.abs(((value-dp.median)/dp.stdDev )||0);
//							if(logger.active) logger.send({label:"outlier median",standardized:standardized,outliersStdDevs:node.outliersStdDevs,});
							return Math.abs(standardized)>node.outliersStdDevs;
						}
						:(node,dp,value)=>{ 
//							if(logger.active) logger.send({label:"outlier avg",standardized:dp.standardized,outliersStdDevs:node.outliersStdDevs});
							return Math.abs(dp.standardized)>node.outliersStdDevs;
							});
				
				node.getDatafunction= "((msg,node)=>{return {key:"+node.keyProperty+",value:"+(node.dataProperty||"msg.payload")+"};})";
				break;
			case "pearsonR":
				node.getDatafunction= "((msg,node)=>{return ["+node.dataProperties.join(',')+"];})";
				break;
			default:
				node.getDatafunction= "((msg,node)=>"+(node.dataProperty||"msg.payload")+")";
			}
			node.log("get data function: "+node.getDatafunction);
			node.getData=eval(node.getDatafunction);
			node.status({fill:"green",shape:"ring",text:"Ready"});
		} catch(ex) {
			if(logger.active) logger.send({label:"initialise error",action:node.action,message:ex.message,stack:ex.stack});
			logger.send({label:"initialise error",node:n});
			node.error(ex);
			node.status({fill:"red",shape:"ring",text:"Invalid setup "+ex.message});
		} 
		node.on("input", function(msg) {
			if(msg.topic && msg.topic.startsWith("@")) {
				try{
					const topic=msg.topic.trim(' ');
					if(topic=="@stats") {
						switch(node.action) {
						case "realtime":
							msg.result=node.dataPoint;
							break;
						case "pearsonR":
							msg.result=functions.pearsonRResults(node);
							break;
						}
		 				node.send([null,msg]);
					} else if(topic=="@stats set") {
						node.dataPoint=msg.payload;
						node.warn(topic);
					} else if(topic=="@stats reset") {
						node.dataPoint={};
						node.warn(topic);
					} else if(topic.startsWith("@stats set ")) {
						const dataPoint=topic.substring("@stats set ".length);
						node.dataPoint[dataPoint]=msg.payload;
						node.warn(topic);
					} else if(topic.startsWith("@stats reset ")) {
						const dataPoint=topic.substring("@stats reset ".length);
						delete node.dataPoint[dataPoint];
						node.warn(topic);
					} else if(topic=="@deltasCrossNormalised") {
						msg.payload=node.crossNormalisedDeltas();
						node.send([null,msg]);
					} else {
						throw Error("unknown");
					}
				} catch(ex) {
					if(logger.active) logger.send({label:"error input",action:node.action,message:ex.message,stack:ex.stack});
					node.error(msg.topic+" failed "+ex.message);
				}
	 			return;
			} 
			try{
				const data=node.getData(msg,node);
				if(data) msg.result=node.actionfunction.apply(node,[data,node.term,node]);
				switch(node.action) {
				case "realtime":
					if(msg.result.outlier) {
						node.send([msg,null,msg]);
						return;
					}
					break;
				}
			} catch(ex) {
				msg.error=ex.message;
				if(node.maxErrorDisplay) {
					--node.maxErrorDisplay;
					logger.send({label:"error input",action:node.action,message:ex.message,stack:ex.stack});
					if(node.action=="realtime") {
						node.error(node.action+" error: "+ex.message);
					} else {
						node.error(Array.isArray(node.getData(msg,node))? node.action+" error: "+ex.message : "payload not array");
					}
					node.status({fill:"red",shape:"ring",text:"error(s)"});
				}
			}
 			node.send(msg);
		});				
	}
	RED.nodes.registerType(logger.label,dataAnalysisNode);
};

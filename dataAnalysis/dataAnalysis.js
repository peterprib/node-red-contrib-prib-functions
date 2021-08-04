const logger = new (require("node-red-contrib-logger"))("Data Analysis");
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");

require("./arrayLast");
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

function setDataPoint(value,term,node,dp) {
	if(logger.active) logger.send({label:"setDataPoint",value:value,term,dp});
	if(!dp.values) {
		Object.assign(dp,{
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
			term:term,
			weightedMovingSum:0,
			exponentialWeightedMoving:[new EMA(0.25),new EMA(0.5),new EMA(0.75)]
		});
	}
	;
	const count=++dp.count,values=dp.values;
	values.push(value);
	dp.isMaxSize=(values.length>dp.term);
	dp.removedValue=(dp.isMaxSize?values.shift():0);
	const removedValue=dp.removedValue;
	dp.max=Math.max(dp.max||value,value);
	dp.min=Math.min(dp.min||value,value);
	dp.range=dp.max-dp.min;
	dp.sum+=value;
	dp.sumSquared+=Math.pow(value,2);
	dp.sumCubed+=Math.pow(value,3);
	dp.movingSum+=value-removedValue;
	dp.movingSumSquared+=Math.pow(value,2)-Math.pow(removedValue,2);
	dp.movingSumCubed+=Math.pow(value,3)-Math.pow(removedValue,3);
	dp.avg=dp.sum/count;
	const avg=dp.avg;
	dp.normalised=dp.range ? (value-avg)/dp.range : 0;
	dp.movingAvg=dp.movingSum/values.length;
	dp.variance=dp.sumSquared/count - Math.pow(avg,2);
	dp.stdDev=Math.sqrt(dp.variance);
	dp.movingVariance=dp.movingSumSquared/values.length - Math.pow(dp.movingAvg,2);
	dp.movingStdDev=Math.sqrt(dp.movingVariance);
	dp.median=functions.median(values);
	dp.standardized=( (value-avg)/dp.stdDev )||0;
	dp.movingStandardized=( (value-dp.movingAvg)/dp.movingStdDev )||0;
	dp.skewness=(dp.sumCubed-3*avg*dp.variance-Math.pow(avg,3))/dp.variance*dp.stdDev;
	dp.movingSkewness=(dp.movingSumCubed-3*dp.movingAvg*dp.movingVariance-Math.pow(dp.movingAvg,3))/dp.movingVariance*dp.stdDev;
	dp.outlier=node.outliersFunction(node,dp,value);
	dp.weightedMovingSum+=count*value;
	dp.weightedMovingAvg=(dp.weightedMovingAvg*2/count)/(count+1);
	dp.exponentialWeightedMoving.forEach(c=>c.sample(value));
}
function getColumns(node) {
	if(node.columns) {
		if(node.columns instanceof Array) return node.columns
		return eval("["+node.columns+"]");
	}
}
functions={
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
		for(let v,dp,i=0; i<node.dataProperties.length; i++) {
			v=d[i];
			dp=node.dataPoints[i];
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
			setDataPoint(d.value-dp.values[dp.values.length-2],term,node,dp.delta);
		} else {
			dp.delta={};
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
			{outliersStdDevs:3,crossNormalisedDeltas:crossNormalisedDeltas.bind(this)},
			n,
			{maxErrorDisplay:10,dataPoint:{}}
		);
		try{
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
				if(logger.active) logger.send({label:"error input",action:node.action,message:ex.message,stack:ex.stack});
				msg.error=ex.message;
				if(node.maxErrorDisplay) {
					--node.maxErrorDisplay;
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

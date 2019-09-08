const nodeLabel="Data Analysis";
const ts=(new Date().toString()).split(' ');
console.log([parseInt(ts[2],10),ts[1],ts[4]].join(' ')+" - [info] "+nodeLabel+" Copyright 2019 Jaroslav Peter Prib");

functions={
	avg:(d)=>functions.sum(d)/d.length,
	deltas :(d)=>d.map( (c,i,a)=>c-(d[i-1]||0) ),
	deltaNormalised :(d)=>d.map( (c,i,a)=>(c-(d[i-1]||0)) / (d[i-1]||0) ),
	max: (d)=> Math.max(...d),
	median:(d)=>{
		let i=Math.floor(d.length/2);
		return d.length%2 ? d[i] : (d[i]+d[i-1])/2; 
	},
	min:(d)=>Math.min(...d),
	movingAvgSimple:(d,n)=>{
		let avg=0; 
		return d.map( (c,i,a)=>{ avg= i<=n? avg+(c-avg)/(i+1) : avg+(c-a[i-n])/n; return avg; });
	},
	movingAvgCumulative :(d)=>{
		let avg=0; 
		return d.map( (c,i,a)=>{ avg+=(c-avg)/(i+1); return avg; }); 
	},
	movingAvgExponential:(d,f)=>{
		if(f<0 || f>1) throw Error("factor must be >=0 and <=1");
		if(d.length==0) return [];
		let s=d[0],fi=1-f;
		return d.map( (c,i,a)=>{
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
		let range=functions.range(d)
			avg=functions.avg(d);
		return d.map( (c,i,a)=>( range ? (c-avg)/range : 0) );
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
		let avg=functions.avg(d),
			stdDev=functions.stdDev(d);
		return d.map( (c,i,a)=>(c-avg)/stdDev);
	},
	stdDev:(d)=>Math.sqrt(functions.variance(d)),
	skew:(d)=>{
		let avg=functions.avg(d),
			variance=functions.sumWithFunction(d,(v)=>Math.pow(v,2)) - Math.pow(avg,2);
		return (functions.sumWithFunction(d,(v)=>Math.pow(v,3))
			- 3*avg*variance
			- Math.pow(avg,3))
			/ variance*Math.sqrt(variance);
	},
	realtime:(d,term,node)=>{
		let dp;
		if(d.key in node.dataPoint) {
			dp=node.dataPoint[d.key];
		} else {
			dp={key:d.key,
				values:[],
				count:0,
				sum:0,
				sumSquared:0,
				sumCubed:0,
				avg:0,
				movingSum:0,
				movingSumSquared:0,
				movingSumCubed:0,
				term:term
			};
			node.dataPoint[d.key]=dp;
		}
		++dp.count;
		dp.values.push(d.value);
		dp.isMaxSize=(dp.values.length>dp.term);
		dp.removedValue=(dp.isMaxSize?dp.values.shift():0);
		dp.max=Math.max(dp.max||d.value,d.value);
		dp.min=Math.min(dp.min||d.value,d.value);
		dp.range=dp.max-dp.min;
		dp.sum+=d.value;
		dp.sumSquared+=Math.pow(d.value,2);
		dp.sumCubed+=Math.pow(d.value,3);
		dp.movingSum+=d.value-dp.removedValue;
		dp.movingSumSquared+=Math.pow(d.value,2)-Math.pow(dp.removedValue,2);
		dp.movingSumCubed+=Math.pow(d.value,3)-Math.pow(dp.removedValue,3);
		dp.normalised=dp.range ? (d.value-dp.avg)/dp.range : 0;
		dp.avg=dp.sum/dp.count;
		dp.movingAvg=dp.movingSum/dp.values.length;
		dp.variance=dp.sumSquared/dp.count - Math.pow(dp.avg,2);
		dp.stdDev=Math.sqrt(dp.variance);
		dp.movingVariance=dp.movingSumSquared/dp.values.length - Math.pow(dp.movingAvg,2);
		dp.movingStdDev=Math.sqrt(dp.movingVariance);
		dp.median=functions.median(dp.values);
		dp.standardized=( (d.value-dp.avg)/dp.stdDev )||0;
		dp.movingStandardized=( (d.value-dp.movingAvg)/dp.movingStdDev )||0;
		dp.skewness=(dp.sumCubed-3*dp.avg*dp.variance-Math.pow(dp.avg,3))/dp.variance*dp.stdDev;
		dp.movingSkewness=(dp.movingSumCubed-3*dp.movingAvg*dp.movingVariance-Math.pow(dp.movingAvg,3))/dp.movingVariance*dp.stdDev;
		return dp;
	},
	sum:(d)=>d.reduce((p,c)=>p+c),
	sumWithFunction:(d,f)=>d.reduce((p,c)=>p+f.apply(this,[c])),
	variance:(d)=>{  //Var(X) = E (X − E(X))2 = E(X2) − (E(X))2
		return functions.sumWithFunction(d,(v)=>Math.pow(v,2))
			- Math.pow(functions.avg(d),2);
	}
}

module.exports = function (RED) {
    function dataAnalysisNode(n) {
        RED.nodes.createNode(this, n);
        var node=Object.assign(this,n,{maxErrorDisplay:10,dataPoint:{}});
        try{
        	if(functions.hasOwnProperty(node.action)) {
                node.actionfunction=functions[node.action];
        	} else {
        		throw Error("action not found");
        	}
        	switch (node.action) {
        	case "realtime":
                node.getDatafunction= "((msg,node)=>{return {key:"+node.keyProperty+",value:"+(node.dataProperty||"msg.payload")+"};})";
        		break;
        	case "pearsonR":
        		node.getDatafunction= "((msg,node)=>{return ["+node.dataProperties.join(',')+"];})";
        		break;
        	default:
                node.getDatafunction= "((msg,node)=>"+(node.dataProperty||"msg.payload")+")";
        	}
        	node.log("get data function: "+node.getDatafunction);
        	node.getData= eval(node.getDatafunction);
            node.status({fill:"green",shape:"ring",text:"Ready"});
        } catch(e) {
    		node.error(e);
        	node.status({fill:"red",shape:"ring",text:"Invalid setup "+e.toString()});
        } 
        node.on("input", function(msg) {
        	if(msg.topic && msg.topic.startsWith("@stats")) {
        		switch(node.action) {
        		case "realtime":
        			msg.result=node.dataPoint;
        			break
        		case "pearsonR":
        			msg.result=functions.pearsonRResults(node);
        			break
        		}
     			node.send([null,msg]);
     			return;
        	} 
        	try{
               	msg.result=node.actionfunction.apply(node,[node.getData(msg,node),node.term,node]);   		
        	} catch(e) {
        		msg.error=e.message;
        		if(node.maxErrorDisplay) {
        			--node.maxErrorDisplay;
        			if(node.action=="realtime") {
            			node.error(node.action+" error: "+e.toString());
        			} else {
            			node.error(Array.isArray(node.getData(msg,node))? node.action+" error: "+e.toString() : "payload not array");
        			}
        			node.status({fill:"red",shape:"ring",text:"error(s)"});
        		}
        	}
 			node.send(msg);
        });                
    }
    RED.nodes.registerType(nodeLabel,dataAnalysisNode);
};

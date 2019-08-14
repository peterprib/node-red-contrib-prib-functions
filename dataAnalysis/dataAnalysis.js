const ts=(new Date().toString()).split(' ');
console.log([parseInt(ts[2],10),ts[1],ts[4]].join(' ')+" - [info] dataAnalysis Copyright 2019 Jaroslav Peter Prib");

functions={
	avg:(d)=>functions.sum(d)/d.length,
	deltas :(d)=>d.map( (c,i,a)=>c-(d[i-1]||0) ),
	deltaNormalised :(d)=>d.map( (c,i,a)=>(c-(d[i-1]||0)) / (d[i-1]||0) ),
	max: (d)=> Math.max(...d),
	median:(d)=>{
		if(d.length%2) {
			let i=Math.floor(d.length/2);
			return (d[i]+d[i-1])/2; 
		} else {
			return d[d.length/2]; 
		}
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
		return d.map( (c,i,a)=>(c-avg)/range);
	},
	range:(d)=>Math.max(...d)-Math.min(...d),
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
        var node=Object.assign(this,n,{maxErrorDisplay:10});
        try{
        	if(functions.hasOwnProperty(node.action)) {
                node.actionfunction=functions[node.action];
        	} else {
        		throw Error("action not found");
        	}
        } catch(e) {
    		node.error(e);
        	node.status({fill:"red",shape:"ring",text:"invalid setup "+e.toString()});
        }
        node.on("input", function(msg) {
        	try{
               	msg.result=node.actionfunction.apply(node,[msg.payload,node.term]);   		
        	} catch(e) {
        		if(node.maxErrorDisplay) {
        			--node.maxErrorDisplay;
        			node.error(Array.isArray(msg.payload)? node.action+" error: "+e.toString() : "payload not array");
        			node.status({fill:"red",shape:"ring",text:"error(s)"});
        		}
        	}
 			node.send(msg);
        });                
    }
    RED.nodes.registerType("Data Analysis",dataAnalysisNode);
};

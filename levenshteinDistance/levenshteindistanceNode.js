const logger = new (require("node-red-contrib-logger"))("Levenshtein Distance");
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");
const levenshteinDistance = require("./levenshteinDistance");
function error(node,message,shortMessage){
	if(logger.active) logger.send({label:"error",node:node.id,error:error,shortMessage});
	node.error(message);
	node.status({fill:"red",shape:"ring",text:shortMessage});
}
function evalFunction(id,mapping){
	try{
		return eval(mapping);
	} catch(ex) {
		throw Error(id+" "+ex.message);
	}
}
module.exports = function (RED) {
	function loggerNode (n) {
	    RED.nodes.createNode(this, n);
	    const node = Object.assign(this, n);
	    
		const source1Map="(RED,node,msg)=>"+(node.source1Property||"msg.payload"),
			source2Map="(RED,node,msg)=>"+(node.source2Property||"msg.payload"),
			targetMap="(RED,node,msg,data)=>{"+(node.targetProperty||"msg.payload")+"=data;}";
		logger.sendInfo({label:"mappings",source1:source1Map,source2:source2Map,target:targetMap});
		try{
			node.getData1=evalFunction("source1",source1Map);
			node.getData2=evalFunction("source2",source2Map);
			node.setData=evalFunction("target",targetMap);
		} catch(ex) {
			error(node,ex,"Invalid setup "+ex.message);
			return;
		}
	    node.on('input', function (msg) {
	    	try{
	    		node.setData(RED,node,msg,levenshteinDistance(node.getData1(RED,node,msg),node.getData2(RED,node,msg)));
	    		node.send(msg);
			} catch(ex) {
				msg.error=ex.message;
				error(node,ex,"Error(s), check log");
				node.send([null,msg]);
			}
	    });
	}
	RED.nodes.registerType(logger.label, loggerNode);
};

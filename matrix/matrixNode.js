const logger = new (require("node-red-contrib-logger"))("matrix");
logger.sendInfo("Copyright 2022 Jaroslav Peter Prib");
const Matrix = require("./matrix");
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
	function matrixNode(n) {
	    RED.nodes.createNode(this,n);
	    const node=Object.assign(this,n);
	    const nodeContext = this.context();
		const flowContext = this.context().flow;
		const globalContext = this.context().global;
		const source1Map="(RED,node,msg,flow,global)=>"+(node.source1PropertyType||"msg")+"."+(node.source1Property||"payload"),
			source2Map="(RED,node,msg,flow,global)=>"+(node.source2PropertyType||"msg")+"."+(node.source2Property||"payload"),
			targetMap="(data,RED,node,msg,flow,global)=>{"+(node.targetPropertyType||"msg")+"."+(node.targetProperty||"payload")+"=data;}";
		logger.sendInfo({label:"mappings",source1:source1Map,source2:source2Map,target:targetMap});
		try{
			node.getData1=evalFunction("source1",source1Map);
			node.getData2=evalFunction("source2",source2Map);
			node.setData=evalFunction("target",targetMap);
		} catch(ex) {
			error(node,ex,"Invalid setup "+ex.message);
			return;
		}
		if(["create"].includes(node.action)){
			logger.sendInfo({label:"inputFunction source new",action:node.action});
			node.inputFunction=(matrix,RED,node,msg,flow,global)=>{
				node.setData.apply(this,[matrix,RED,node,msg,flow,global]);
			};
		} else if(["add","multiple","equalsNearly"].includes(node.action)){
			logger.sendInfo({label:"inputFunction source+source",action:node.action});
			node.inputFunction=(matrix,RED,node,msg,flow,global)=>{
				matrix[node.action](node.getData2(RED,node,msg,flow,global))
			};
		} else if(["forwardElimination","backwardSubstitution","gaussianElimination",
				"reducedRowEchelonForm","rowEchelonForm","testIsSquare"].includes(node.action)){
			logger.sendInfo({label:"inputFunction source",action:node.action});
			node.inputFunction=(matrix,RED,node,msg,flow,global)=>{
				matrix[node.action]();
			};
		} else { //clone,createLike,getAdjoint
			logger.sendInfo({label:"inputFunction target+source",action:node.action});
			node.inputFunction=(matrix,RED,node,msg,flow,global)=>{
				node.setData(matrix[node.action](),RED,node,msg,flow,global);
			};
		}
		node.on("input",function (msg) {
			try{
				const sourceIn=node.getData1(RED,node,msg,flowContext,globalContext);
				const sourceMatrix=(sourceIn instanceof Matrix?sourceIn:new Matrix(sourceIn));
				node.inputFunction.apply(this,[sourceMatrix,RED,node,msg,flowContext,globalContext]);
				node.send(msg);
			} catch(ex) {
				msg.error=ex.message;
				node.send([null,msg]);
				if(logger.active) logger.send({label:"error",node:node.id,exception:ex});
			}
		});
	}
	RED.nodes.registerType(logger.label, matrixNode);
};
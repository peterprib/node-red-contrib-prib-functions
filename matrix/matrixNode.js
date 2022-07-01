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
function evalInFunction(node,property){
	try{
		const mapping="(RED,node,msg,flow,global)=>"+(node[property+"Type"]||"msg")+"."+(node[property]||"payload");
		logger.sendInfo({label:"mapping",property:property,mapping:mapping});
		return eval(mapping);
	} catch(ex) {
		throw Error(property+" "+ex.message);
	}
}
module.exports = function (RED) {
	function matrixNode(n) {
	    RED.nodes.createNode(this,n);
		logger.sendInfo({label:"create",node:n});
	    const node=Object.assign(this,n);
	    const nodeContext = this.context();
		const flowContext = this.context().flow;
		const globalContext = this.context().global;
		const targetMap="(data,RED,node,msg,flow,global)=>{"+(node.targetPropertyType||"msg")+"."+(node.targetProperty||"payload")+"=data;}";
		logger.sendInfo({label:"mappings",target:targetMap});
		try{
			node.getSource1Property=evalInFunction(node,"source1Property");
			node.setData=evalFunction("target",targetMap);
			node.argFunction=[];
			node.args.forEach(property=>{
				const callFunction=evalInFunction(node,property).bind(this);
				node.argFunction.push(callFunction);
			})
		} catch(ex) {
			error(node,ex,"Invalid setup "+ex.message);
			return;
		}
		function baseProcess(msg){
			const sourceIn=node.getSource1Property(RED,node,msg,flowContext,globalContext);
			const sourceMatrix=(sourceIn instanceof Matrix?sourceIn:new Matrix(sourceIn));
			const args=[];
			node.argFunction.forEach(callFunction=> {
				const result=callFunction(RED,node,msg,flowContext,globalContext);
				args.push(result);
			});
			return sourceMatrix[node.action].apply(sourceMatrix,args);
		}
		function baseProcessAndSet(msg){
			const result=baseProcess(msg);
			node.setData.apply(this,[result,RED,node,msg,flowContext,globalContext]);
		}
		function createProcess(msg){
			const sourceIn=node.getSource1Property(RED,node,msg,flowContext,globalContext);
			const sourceMatrix=(sourceIn instanceof Matrix?sourceIn.clone():new Matrix(sourceIn));
			node.setData.apply(this,[sourceMatrix,RED,node,msg,flowContext,globalContext]);
		}
		function defineProcess(msg){
			const sourceMatrix=new Matrix({row:node.row,column:node.column});
			node.setData.apply(this,[sourceMatrix,RED,node,msg,flowContext,globalContext]);
		}
		node.msgProcess=baseProcess;
		if(["define"].includes(node.action)){
			node.msgProcess=defineProcess;
		}else if(["create"].includes(node.action)){
				node.msgProcess=createProcess;
		}else{
			if(node.action.startsWith("get") 
			|| ["create","createLike","clone","transpose","sumRow","createForEachCellPairSet",
				,"findRowColumn","findColumnRow","maxAbsColumn","maxColumn","toArray"
			].includes(node.action)) {
				node.msgProcess=baseProcessAndSet;
			}
		}
		node.status({fill:"green",shape:"ring"});
		node.on("input",function (msg) {
			try{
				node.msgProcess(msg);
				node.send(msg);
			} catch(ex) {
				msg.error=ex.message;
				node.send([null,msg]);
				if(logger.active) logger.send({label:"error",node:node.id,action:node.action,exception:ex.message,stack:ex.stack});
			}
		});
	}
	RED.nodes.registerType(logger.label, matrixNode);
};
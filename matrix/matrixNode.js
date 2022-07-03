const logger = new (require("node-red-contrib-logger"))("matrix");
logger.sendInfo("Copyright 2022 Jaroslav Peter Prib");
const Matrix = require("./matrix");
function error(node,message,shortMessage){
	if(logger.active) logger.send({label:"error",node:node.id,error:error,shortMessage});
	node.error(message);
	node.status({fill:"red",shape:"ring",text:shortMessage});
}
function evalFunction(id,mapping){
	logger.sendInfo({label:"evalFunction",id:id,mapping:mapping})
	try{
		return eval(mapping);
	} catch(ex) {
		logger.sendError({label:"evalFunction error",id:id,mapping:mapping,error:ex.message})
		throw Error(id+" "+ex.message);
	}
}
function evalInFunction(node,propertyName){
	try{
	    const nodeContext = node.context();
		const flow = nodeContext.flow;
		const global = nodeContext.global;
		const property=node[propertyName];
		if(property==null) throw Error("no value for "+propertyName);
		const propertyType=propertyName+"-type";
		switch (node[propertyType]){
		case "num":
			return evalFunction(propertyName,"()=>"+property);
		case "node":
			return evalFunction(propertyName,"()=>nodeContext.get("+property+")");
		case "flow":
			if(flow) throw Error("context store may be memoryonly so flow doesn't work")
			return evalFunction(propertyName,"()=>flow.get("+property+")");
		case "global":
			return evalFunction(propertyName,"()=>global.get("+property+")");
		case "env":
			return evalFunction(propertyName,"()=>env.get("+property+")");
		case "msg":
			return evalFunction(propertyName,"(msg)=>msg."+property);
		default:
			logger.sendInfo({label:"setData unknown type",action:node.action,propertyType:propertyType,type:node[propertyType]});
			throw Error("unknown type "+node[propertyType])
		}
	} catch(ex) {
		logger.sendError({label:"setup",error:ex.message,stack:ex.stack});
		throw Error(property+" "+ex.message);
	}
}
module.exports = function (RED) {
	function matrixNode(n) {
	    RED.nodes.createNode(this,n);
//		logger.sendInfo({label:"create",node:n});
	    const node=Object.assign(this,n);
		try{
			if(node.source)node.getSource=evalInFunction(node,"source");
			if(node.target) {
				const nodeContext = node.context();
				const flow = nodeContext.flow;
				const global = nodeContext.global;
				switch(node["target-type"]){
				case "node":
					node.setData=evalFunction("target","data=>nodeContext.set("+node.target+",data)");
					break;
				case "flow":
					if(flow) throw Error("context store may be memoryonly so flow doesn't work")
					node.setData=evalFunction("target","data=>flow.set("+node.target+",data)");
					break;
				case "global":
					node.setData=evalFunction("target","data=>global.set("+node.target+",data)");
					break;
				case "msg":
					node.setData=evalFunction("target","(data,msg)=>{msg."+node.target+"=data;}");
					break;
				default:
					logger.sendInfo({label:"setData unknown type",action:node.action,targetType:node["target-type"]});
				}
			}	
			node.argFunction=[];
			node.args.forEach(property=>{
				node.argFunction.push(evalInFunction(node,property).bind(this));
			})
			function baseProcess(msg){
				const sourceIn=node.getSource(msg);
				if(sourceIn==null) throw Error("source data not found");
				const sourceMatrix=(sourceIn instanceof Matrix?sourceIn:new Matrix(sourceIn));
				const args=[];
				node.argFunction.forEach(callFunction=> {
					const result=callFunction(msg);
					args.push(result);
				});
				return sourceMatrix[node.action].apply(sourceMatrix,args);
			}
			function baseProcessAndSet(msg){
				const result=baseProcess(msg);
				node.setData.apply(node,[result,msg]);
			}
			function createProcess(msg){
				const sourceIn=node.getSource(msg);
				if(sourceIn==null) throw Error("source data not found");
				const sourceMatrix=(sourceIn instanceof Matrix?sourceIn.clone():new Matrix(sourceIn));
				node.setData.apply(node,[sourceMatrix,msg]);
			}
			function defineProcess(msg){
				if(logger.active) logger.sendInfo({label:"define",arg:{rows:node.row,columns:node.column}});
				const sourceMatrix=new Matrix({rows:node.row,columns:node.column});
				node.setData.apply(node,[sourceMatrix,msg]);
			}
			function defineEmptyProcess(msg){
				if(logger.active) logger.sendInfo({label:"define",arg:{rowsMax:node.row,columns:node.column}});
				const sourceMatrix=new Matrix({rowsMax:node.row,columns:node.column});
				node.setData.apply(node,[sourceMatrix,msg]);
			}
			node.msgProcess=baseProcess;
			if(["define"].includes(node.action)){
				node.msgProcess=defineProcess;
			}else if(["defineEmpty"].includes(node.action)){
				node.msgProcess=defineEmptyProcess;
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
		} catch(ex) {
			error(node,ex,"Invalid setup "+ex.message);
			return;
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
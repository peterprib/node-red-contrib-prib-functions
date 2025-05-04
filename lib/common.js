const error=(node,message,shortMessage,logger)=>{
	if(logger && logger.active) logger.send({label:"error",node:node.id,error:error,shortMessage});
	node.error(message);
	node.status({fill:"red",shape:"ring",text:shortMessage});
}
const evalFunction(id,mapping,logger)=>{
	logger&&logger.sendInfo({label:"evalFunction",id:id,mapping:mapping})
	try{
		return eval(mapping);
	} catch(ex) {
		logger.sendError({label:"evalFunction error",id:id,mapping:mapping,error:ex.message})
		throw Error(id+" "+ex.message);
	}
}
const evalInFunction=(node,propertyName)=>{
	try{
	    const nodeContext = node.context();
		const flow = nodeContext.flow;
		const global = nodeContext.global;
		const property=node[propertyName];
		if(property==null) throw Error("no value for "+propertyName);
		const propertyType=propertyName+"-type";
		if(! (propertyType in node)) return evalFunction(propertyName,"()=>node."+property) 
		switch (node[propertyType]){
		case "num":
		case "json":
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

const argsArray=(node,msg)=>{
	const args=[];
	node.argFunction.forEach(callFunction=> {
		const result=callFunction(msg);
		args.push(result);
	});
	return args;
}
const setArgsFunction=(node)=>{
    node.argFunction=[];
    node.args.forEach(property=>{
        try{
            node.argFunction.push(evalInFunction(node,property).bind(this));
        } catch(ex) {
            throw Error("args "+property+" "+ex.message)
        }
    })
}


const setTargetFunction=(node)=>{
    if(node.target) throw Error("target is null")
    if(node.hasOwnProperty("target-type")) {
        node.setData=evalFunction("target","data=>data)")
        return
    }
    const nodeContext = node.context()
    const type=node["target-type"]
    switch(type){
        case "node":
        node.setData=evalFunction("target","data=>nodeContext.set("+node.target+",data)")
            break
        case "flow":
            if(nodeContext.flow) throw Error("context store may be memory only so flow doesn't work")
            node.setData=evalFunction("target","data=>nodeContext.flow.set("+node.target+",data)")
            break
        case "global":
            node.setData=evalFunction("target","data=>nodeContext.global.set("+node.target+",data)")
            break
        case "msg":
            node.setData=evalFunction("target","(data,msg)=>{msg."+node.target+"=data;}")
            break
        default:
            throw Error("setData unknown type "+type)
    }
}

const baseProcess=(msg,call=sourceMatrix[node.action])=>{
    const value=node.getSource(msg);
    if(value==null) throw Error("source data not found");
    const valueObject=(value instanceof Matrix?value:new Matrix(value));
    return call.apply(valueObject,argsArray(node,msg));
}
const baseProcessAndSet=(msg)=>{
    const result=baseProcess(msg);
    node.setData.apply(node,[result,msg]);
}
function createProcess(msg){
    const sourceMatrix=new Matrix({rowsMax:node.rows,columns:node.columns,dataType:node.dataType});
    if(!(node.initialState in sourceMatrix)) throw Error("Invalid initial state "+node.initialState);
    sourceMatrix[node.initialState]()
    node.setData.apply(node,[sourceMatrix,msg]);
}
function defineProcess(msg){
    const sourceMatrix=new Matrix({rows:node.rows,columns:node.columns,dataType:node.dataType});
    node.setData.apply(node,[sourceMatrix,msg]);
}
function defineEmptyProcess(msg){
    if(logger.active) logger.sendInfo({label:"define",arg:{rowsMax:node.row,columns:node.column}});
    const sourceMatrix=new Matrix({rowsMax:node.rows,columns:node.columns});
    node.setData.apply(node,[sourceMatrix,msg]);
}
function createSize(msg){
    const sourceMatrix=new Matrix({rows:node.size,columns:node.size});
    node.setData.apply(node,[sourceMatrix[node.action](),msg]);
}
function createDummy(msg){
    const sourceMatrix=new Matrix(1,1);
    node.setData.apply(node,[sourceMatrix[node.action].apply(sourceMatrix,argsArray(node,msg)),msg]);
}

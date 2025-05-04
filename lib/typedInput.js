
const setGetFunction=(RED,node,propertyName)=>node["get"+propertyName[0].toUpperCase() + propertyName.slice(1)]=getFunction(RED,node,propertyName)

const getFunction=(RED,node,propertyName)=>{
	try{
		const property=node[propertyName];
		if(property==null) throw Error("no value for "+propertyName);
		const propertyType=propertyName+"Type";
		if(! (propertyType in node)) return eval("()=>node."+property)
        const type=node[propertyType]
		switch (type){
        case "bin": //	a Node.js Buffer
        case "re": //	a Regular Expression
        case "jsonata": //	a Jsonata Expression
        case "cred": //	a secure credential
        case "bool":
        case "json":
        case "num":
        case "str":
        case "date": //	the current timestamp
        case "env":
        case "global":
            const value=RED.util.evaluateNodeProperty(property, type, node)
            return eval("()=>value")
        case "flow":
            const flow = node.context().flow;
			if(flow) throw Error("context store may be memoryonly so flow doesn't work")
			return eval("()=>flow.get("+property+")");
        case "msg":
			return eval("(msg)=>msg."+property);
        case "node":
            const nodeContext = node.context();
            return eval("()=>nodeContext.get("+property+")");
        default:
			throw Error("unknown type "+node[propertyType])
		}
	} catch(ex) {
		throw Error(propertyName+" "+ex.message);
	}
    
}
const setFunction=(RED,node,name)=>{
    if(!name) 
    if(!node.hasOwnProperty(name)) throw Error("name is null")
    if(!node.hasOwnProperty(name+"-type")) {
        node.set[name]=eval("data=>msg.payload['"+name+"']=data)")
        return
    }
    const type=node[name+"t-type"]
    switch(type){
        case "node":
        node.set[name]=eval("data=>node.context().set("+node[name]+",data)")
            break
        case "flow":
            const flow=node.context().flow
            if(flow) throw Error("context store may be memory only so flow doesn't work")
            node.set[name]=eval("data=>flow.set("+node[name]+",data)")
            break
        case "global":
            node.set[name]=eval("data=>nodeContext.global.set("+node[name]+",data)")
            break
        case "msg":
            node.set[name]=eval("(data,msg)=>{msg."+node[name]+"=data;}")
            break
        default:
            throw Error("setData unknown type "+type)
    }
}

const getValue=(RED,node,propertyName,defaultValue)=>propertyName in node?getFunction(RED,node,propertyName)():defaultValue

module.exports={
    getFunction:getFunction,
    setFunction:setFunction,
    setGetFunction:setGetFunction,
    getValue:getValue
}

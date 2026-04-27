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
            if(type in addedTypes){
                const addedType=addedTypes[type]
                return addedType.getFunction(RED,node,property)
            }
			throw Error("unknown type '"+type+"'")
		}
	} catch(ex) {
		throw Error(propertyName+" "+ex.message);
	}
    
}
const setFunction=(RED,node,name)=>{
    if(!name) throw Error("name is null")
    if(!node.hasOwnProperty(name)) throw Error("name is null")
    if(!node.hasOwnProperty(name+"Type")) {
        return eval("data=>{msg.payload['"+name+"']=data}")
    }
    const type=node[name+"Type"]
    switch(type){
        case "node":
            return eval("data=>node.context().set("+node[name]+",data)")
        case "flow":
            const flow=node.context().flow
            if(flow) throw Error("context store may be memory only so flow doesn't work")
            return eval("data=>flow.set("+node[name]+",data)")
        case "global":
            return eval("data=>nodeContext.global.set("+node[name]+",data)")
        case "env":
            return eval("data=>nodeContext.env.set("+node[name]+",data)")
        case "msg":
            return eval("(data,msg)=>setObjectProperty(msg,'"+node[name]+"',data)")
//            return eval("(data,msg)=>{msg."+node[name]+"=data;}")
        default:
            throw Error("setData unknown type "+type)
    }
}
const setObjectProperty=(obj,propertyPath,value)=>{
    const properties=propertyPath.split(".")
    const lastProperty=properties.pop()
    let currentObj=obj
    for(const property of properties){
        if(!currentObj[property] || typeof currentObj[property] !== "object"){
            currentObj[property]={}
        }
        currentObj=currentObj[property]
    }
    currentObj[lastProperty]=value
}
const getValue=(RED,node,propertyName,defaultValue)=>propertyName in node?getFunction(RED,node,propertyName)():defaultValue

const getArgFunctions=(RED,node,msg,propertyNames)=>{
    const args=[]
    propertyNames.forEach(property => {
        args.push(node["get"+property])
    });
    return args
}

const getArgs=(RED,node,msg,propertyNames,argFunctions=getArgFunctions(RED,node,propertyNames))=>
    argFunctions.reduce((args,propertyFunction)=>propertyFunction(RED,node,msg),[])
const getArgsFromFunctions=(RED,node,msg,argFunctions)=>argFunctions.reduce((args,propertyFunction)=>propertyFunction(RED,node,msg),[])

const buildArgProperties=(RED,node,argList)=>{
    const argFunctions=[]
    argList.forEach(arg=>{
        if(arg=="callback"){
            argFunctions.push((RED,node,msg)=>(...a)=>node.callback(msg,...a))
        } else if(arg instanceof Array){
            const subArgFunctions={}
            arg.forEach(subArg=>{
                subArgFunctions[subArg]=getFunction(RED,node,subArg)
            })
            argFunctions.push(subArgFunctions)
        } else {
            argFunctions.push(getFunction(RED,node,arg))
        }
    })
    return argFunctions
}
const buildArg=(RED,node,msg,argProperties)=>{
    const builtArgs=[]
    for(const args of argProperties){
        if(args instanceof Array){
            const subArgs={}
            for(const subArg in args){
                subArgs[subArg]=args[subArg](RED,node,msg)
            }
            builtArgs.push(subArgs)
        } else if(typeof args === "function"){
            builtArgs.push(args(RED,node,msg))
        } else if(typeof args === "object"){
            const builtArg={}
            for(const key in args){
                builtArg[key]=args[key](RED,node,msg)
            }
            builtArgs.push(builtArg)   
        } else {
            builtArgs.push(args)
        }
    }
    return builtArgs
}
const addType=(properties)=>{
    Object.assign(addedTypes,properties)  
}
const addedTypes={
    func:{
        value: "func",
        label: "function",
        icon: "fa fa-code",
        hasValue: true,
        validate: function(v) {
                    // Basic syntax check: ensure it's valid JS
            try { new Function('msg', v); return true; } 
            catch(e) { return false; }
        },
        getFunction: (RED,node,property)=>{
           try {
                return new Function('msg', node[property]);
            } catch(e) {
                throw new Error("Invalid function syntax for property '"+property+"'");
            }
        }   
    }
}


module.exports={
    addType:addType,
    addedTypes:addedTypes,
    buildArg:buildArg,
    buildArgProperties:buildArgProperties,
    getArgs:getArgs,
    getArgsFromFunctions:getArgsFromFunctions,
    getArgFunctions:getArgFunctions,
    getFunction:getFunction,
    getValue:getValue,
    setFunction:setFunction,
    setGetFunction:setGetFunction
}

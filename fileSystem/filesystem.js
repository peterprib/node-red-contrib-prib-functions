const logger = new (require("node-red-contrib-logger"))("filesystem");
logger.sendInfo("Copyright 2025 Jaroslav Peter Prib");

const fs=require('fs')
const {addType,buildArg,buildArgProperties,setFunction, getFunction}=require('../lib/typedInput')

const getFunctionFSConstant=(RED,node,property)=>()=>fs.constants[node[property]]
addType({
    flags:{
        getFunction: (RED, node, property)=>()=>node[property]
    },
    modeAccess:{getFunction:getFunctionFSConstant},
    modeCopyFile:{getFunction:getFunctionFSConstant},
    modeFile:{getFunction:getFunctionFSConstant},
    modeOpen:{getFunction:getFunctionFSConstant},
});

const actionReturnsValue=["createReadStream","exists","fstat","lstat","mkdir","mkdtemp","open","opendir"]

const OpenErrors={
  "EEXIST":"File already exists",
  "ENOENT":"File does not exist"
}
const setAndSendError=(msg,err,value)=>{
    const node=msg._temp.node
    if(err) msg._error=err
    else node.setTarget(value,msg)
    delete msg._temp
    err?node.send([null,msg]):node.send([msg,null])   
}
const setAndSendErrorOpen=(msg,err,value)=>{
    if(err==null){
        msg._temp.node.openFiles[msg.id]={
            fd:fd,
            msgid:msg.id,
            node:msg._temp.node
        }
    }
    setAndSendError(msg,err,value)
}
const setAndSendErrorClose=(msg,err,value)=>{
    delete msg._temp.node.openFiles[msg.id]
    setAndSendError(msg,err,value) 
}

const callbacks={
    default:setAndSendError,
    open:setAndSendErrorOpen,
    openAsBlob:setAndSendErrorOpen,
    openSync:setAndSendErrorOpen,                                                                                                                                                                      
    opendir:setAndSendErrorOpen,
    opendirSync:setAndSendErrorOpen,
    close:setAndSendErrorClose,
    closeSync:setAndSendErrorClose
}
const fsArgs={
  "access":["path","modeAccess","callback"],
  "appendFile":["path","data",["encoding"],"callback"],
  "chmod":["path","modeFile","callback"],
  "chown":["path","uid","gid","callback"],
  "close":["fd","callback"],
  "copyFile":["src","dest","modeCopyFile","callback"],
  "cp":["src","dest",[ "filter","dereference","errorOnExist","force","preserveTimestamps","recursive","retryDelay" ],"callback"],
  "createReadStream":["path",["flags","encoding","fd","modeFile","autoClose","emitClose","start","end","highWaterMark"],["callback"]],
  "createWriteStream":["path",["flags","encoding","fd","modeFile","autoClose","emitClose","start","highWaterMark"],["callback"]],
  "exists":["path","callback"],
  "fchmod":["fd","modeFile","callback"],
  "fchown":["fd","uid","gid","callback"],
  "fdatasync":["fd","callback"],
  "fstat":["fd",["bigint"],"callback"],
  "fsync":["fd","callback"],
  "ftruncate":["fd","len","callback"],
  "futimes":["fd","atime","mtime","callback"],
  "glob":["pattern",["ignore","nodir","ignoreCase","absolute","mark","stat","silent","strict","cache"],"callback"],
  "lchmod":["path","modeFile","callback"],
  "lchown":["path","uid","gid","callback"],
  "lutimes":["path","atime","mtime","callback"],
  "link":["existingPath","newPath","callback"],
  "lstat":["path",["bigint"],"callback"],
  "mkdir":["path",["modeFile","recursive"],"callback"],
  "mkdtemp":["prefix",["modeFile","tempdir"],"callback"],
  "open":["path","flags","modeOpen","callback"],
  "openAsBlob":["path",["flags","modeOpen"],"callback"],
  "opendir":["path",["encoding","bufferSize","recursive"],"callback"],
//  "read":["fd","buffer","offset","length","position","callback"],
//  "read":["fd",[],"callback"],
  "read":["fd","buffer",["offset","length","position"],"callback"],
  "readdir":["path",["encoding","withFileTypes","recursive"],"callback"],
  readdirSync:["path",["encoding","withFileTypes","recursive"]],
  "readFile":["path",["encoding","flag","signal"],"callback"],
  "readlink":["path",["encoding"],"callback"],
  "readv":["fd","buffers","position","callback"],
  "realpath":["path",["encoding"],"callback"],
  "realpath.native":["path",["encoding"],"callback"],
  "rename":["oldPath","newPath","callback"],
  "rmdir":["path",[],"callback"],
  "rm":["path",["force","maxRetries","recursive","retryDelay"],"callback"],
  "stat":["path",["bigint","throwIfNoEntry"],"callback"],
  "statfs":["path",["bigint"],"callback"],
  statfsSync:["path",["bigint"]],
  "symlink":["target","path","type","callback"],
  "truncate":["path","length","callback"],
  "unlink":["path","callback"],
  "unwatchFile":["filename","listener"],
  "utimes":["path","atime","mtime","callback"],
  "watch":["filename",[],"listener"],
  "watchFile":["filename",["persistent","recursive","encoding","signal","ignore"],"listener"],
  "writeDirect":["fd","buffer","offset","length","position","callback"],
  "write":["fd","buffer",["offset","length","position"],"callback"],
  "writeString":["fd","string","position","encoding","callback"],
  "writeFile":["file","data",["encoding","modeFile","flag","signal"],"callback"],
  "writev":["fd","buffers","position","callback"]
}

module.exports = function (RED) {
    function filesystemNode(config) {
   	    RED.nodes.createNode(this, config);
        const node=Object.assign(this,config)
        try{
            if(node.target) node.setTarget=setFunction(RED,node,"target")
            node.actionFunction=fs[node.action]
            node.args=fsArgs[node.action]
            if(node.args==null)
                throw Error("Unknown action "+node.action)
            if(node.args.includes("callback")){
                const callback=callbacks[node.action]??callbacks.default
                node.callback=callback
                if(node.callback==null)
                    throw Error("Unknown callback for action "+node.action)
                node.processFunction=node.actionFunction
            } else { 
                node.processFunction=function(...args){
                    const msg=this
                    try{
                        const data=node.actionFunction(...args)
                        node.setTarget(data,msg)
                        delete msg._temp
                        node.send([msg,null])   
                    } catch(ex) {
                        logger.sendErrorAndStackDump(ex.message, ex)
                        node.status({fill:"red",shape:"ring",text:ex.message});
                        delete msg._temp
                        node._error=ex.message
                        node.send([null,msg])
                    }
                }
            }
            node.argProperties=buildArgProperties(RED,node,node.args)    
            node.status({fill:"green",shape:"ring"})
            if(node.action.startsWith("open")){
                node.openedFiles={}
                node.close = function (removed, done) {
                    logger.send({ label: 'close',node:{id:node.id,name:node.name}})
                    try{
                        for (const [msgId, openFile] of Object.entries(node.openedFiles)) {
                            try {
                                close(opened.fd,err=>{
                                    logger({label:"closed",msg:opened.msgid})
                                })
                         } catch (ex) {
                             logger.sendErrorAndStackDump(ex.message, ex)
                            }
                            delete node.openFiles[msgId]
                        }
                        node.openedFiles={}
                    } catch (ex) {
                        logger.sendErrorAndStackDump(ex.message, ex)
                    }
                    done && done()
                }
            } else if(node.action.startsWith("close")){
                
            }
            node.on("input", function(msg) {
                try{
                    msg._temp={node:node,RED:RED}
                    const args=buildArg(RED,node,msg,node.argProperties)
                    node.processFunction.apply(msg,args)
                } catch(ex) {
                    node.status({fill:"red",shape:"ring",text:ex.message});
                    logger.sendErrorAndStackDump(ex.message, ex)
                }
            })
        } catch (ex){
           logger.sendErrorAndStackDump(ex.message, ex)
            node.status({fill:"red",shape:"ring",text:ex.message});
        }
    }
    RED.nodes.registerType(logger.label,filesystemNode);
}
const logger = new (require("node-red-contrib-logger"))("filesystem");
logger.sendInfo("Copyright 2025 Jaroslav Peter Prib");

const fs=require('fs')
const typedInput=require('../lib/typedInput')

const actionReturnsValue=["createReadStream","exists","fstat","lstat","mkdir","mkdtemp","open","opendir"]

const mode={
  access:{
    "exists":fs.constants.F_OK,
    "readable":fs.constants.R_OK,
    "writable":fs.constants.W_OK,
    "executable":fs.constants.X_OK
    }
}

const OpenErrors={
  "EEXIST":"File already exists",
  "ENOENT":"File does not exist"
}
const setAndSend=(msg,value)=>{
    const node=msg._temp.node
    node.setTarget(msg,value)
    delete node._temp
    node.send(msg)   
}
const setAndSendError=(msg,value)=>{
    const node=msg._temp.node
    node.setTarget(msg,value)
    delete node._temp
    node.send([null,msg])   
}

const callbacks={
    default:err=>setAndSendError(this, err==null),
    open:(err,fd)=>{
        if(err){
            try{
                setAndSendError(this,openErrors[err])
            } catch(ex){
                setAndSendError(this,err)
            }
        } else
            setAndSend(this,fd)
    },
    read:(err,data)=>{
    }
}
callbacks.stat=callbacks.read
callbacks.access=callbacks.default
callbacks.appendFile=callbacks.default
callbacks.chmod=callbacks.default
callbacks.chown=callbacks.default
callbacks.close=callbacks.default
callbacks.copyFile=callbacks.default
callbacks.cp=callbacks.default

const fsArgs={
  "access":["path","mode","callback"],
  "appendFile":["path","data","options","callback"],
  "chmod":["path","mode","callback"],
  "chown":["path","uid","gid","callback"],
  "close":["fd","callback"],
  "copyFile":["src","dest","mode","callback"],
  "cp":["src","dest","options","callback"],
  "createReadStream":["path","options"],
  "createWriteStream":["path","options"],
  "exists":["path","callback"],
  "fchmod":["fd","mode","callback"],
  "fchown":["fd","uid","gid","callback"],
  "fdatasync":["fd","callback"],
  "fstat":["fd","options","callback"],
  "fsync":["fd","callback"],
  "ftruncate":["fd","len","callback"],
  "futimes":["fd","atime","mtime","callback"],
  "glob":["pattern","options","callback"],
  "lchmod":["path","mode","callback"],
  "lchown":["path","uid","gid","callback"],
  "lutimes":["path","atime","mtime","callback"],
  "link":["existingPath","newPath","callback"],
  "lstat":["path","options","callback"],
  "mkdir":["path","options","callback"],
  "mkdtemp":["prefix","options","callback"],
  "open":["path","flags","mode]","callback"],
  "openAsBlob":["path","options"],
  "opendir":["path","options","callback"],
  "read":["fd","buffer","offset","length","position","callback"],
  "read":["fd","options","callback"],
  "read":["fd","buffer","options","callback"],
  "readdir":["path","options","callback"],
  "readFile":["path","options","callback"],
  "readlink":["path","options","callback"],
  "readv":["fd","buffers","position","callback"],
  "realpath":["path","options","callback"],
  "realpath.native":["path","options","callback"],
  "rename":["oldPath","newPath","callback"],
  "rmdir":["path","options","callback"],
  "rm":["path","options","callback"],
  "stat":["path","options","callback"],
  "statfs":["path","options","callback"],
  "symlink":["target","path","type","callback"],
  "truncate":["path","length","callback"],
  "unlink":["path","callback"],
  "unwatchFile":["filename","listener"],
  "utimes":["path","atime","mtime","callback"],
  "watch":["filename","options","listener"],
  "watchFile":["filename","options","listener"],
  "writeDirect":["fd","buffer","offset","length","position]","callback"],
  "write":["fd","buffer","options","callback"],
  "writeString":["fd","string","position","encoding","callback"],
  "writeFile":["file","data","options","callback"],
  "writev":["fd","buffers","position","callback"]
}
/*
const options={
    append [encoding <string> | <null> Default: 'utf8'
    mode <integer> Default: 0o666
    flag <string> See support of file system flags. Default: 'a'.
    flush <boolean> If true, the underlying file descriptor is flushed prior to closing it. Default: false.
}
*/
module.exports = function (RED) {
    function filesystemNode(config) {
   	    RED.nodes.createNode(this, config);
        const node=Object.assign(this,config)
        try{
            node.actionFunction=fs[node.action]
            node.argList=fsArgs[node.action]
            const argFunctions=getArgFunctions(RED,node,node.argList)
            if(node.argList.includes("callback")){
                node.callback=callbacks[node.action]
            } else { 
                node.processFunction=(RED,msg,node)=>{
                    node.actionFunction()
                    node.send(msg)
                }
            }
            setCallback(node)
            node.status({fill:"green",shape:"ring"})
            if(node.action=="open"){
                this.openedFiles=[]
                node.close = function (removed, done) {
                    logger.send({ label: 'close',node:{id:node.id,name:node.name}})
                    this.openedFiles.forEach(opened=>{
                        try {
                            close(open.fdfd,err=>{
                                logger({label:"closed",msg:opened_msgid})
                            })
                        } catch (ex) {
                            logger.sendErrorAndStackDump(ex.message, ex)
                        }
                    })
                    done()
                }
            }
            node.on("input", function(msg) {
                try{
                    msg._temp={node:node,RED:RED}
                    node.processFunction.call(typedInput.getArgsFromFunctions(RED,node,msg,argFunctions))
                } catch(ex) {
                    logger.sendErrorAndStackDump(ex.message, ex)
                }
            })
        } catch (ex){
            node.status({fill:"red",shape:"ring"});
        }
    }
    RED.nodes.registerType(logger.label,filesystemNode);
}
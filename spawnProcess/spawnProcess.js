const nodeLabel="Spawn Process";
const Logger = require("node-red-contrib-logger");
const logger = new Logger(nodeLabel);
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");

let spawn;
const os=require("os");
function sendError(node,msg,err) {
	node.error(err);
}
function start(node,msg) {
	if(node.started) throw Error("Already started");
	if(logger.active) logger.send({label:"start test os",wantedOS:node.os,runningOS:os.type()});
	if(node.os && node.os !== os.type()) throw Error("Process only valid for os "+node.os+" running under "+os.type());
	node.started=true;
	node.startArgs= node.arguments
	if(msg && msg.payload && msg.payload.arguments) {
		node.startArgs+=msg.payload.arguments;
	}
	node.startOptions={};
	if(node.workingDirectory) node.startOptions.cwd=node.workingDirectory;  //Current working directory of the child process
	if(node.env) node.startOptions.env=node.env;  // Object Environment key-value pairs 
	if(node.uid) node.startOptions.uid=node.uid;  // uid Number Sets the user identity of the process. (See setuid(2).)
	if(node.gid) node.startOptions.gid=node.gid;  // gid Number Sets the group identity of the process. (See setgid
	if(msg && msg.payload && msg.payload.arguments) {
		if(msg.payload.cwd) node.startOptions.cwd=msg.payload.cwd
		if(msg.payload.env) node.startOptions.concat(msg.payload.env);
		if(msg.payload.uid) node.startOptions.uid=msg.payload.uid;
		if(msg.payload.gid) node.startOptions.uid=msg.payload.gid;
	}
//   			stdio Array|String Child's stdio configuration. (See below)
//   			detached Boolean Prepare child to run independently of its parent process. Specific behavior depends on the platform, see below)
	if(logger.active) logger.send({label:"spawn",args:node.startArgs,options:node.startOptions})
	node.child = spawn(node.process,node.startArgs.replace(/\n|\r/g, " ").split(' '),node.startOptions)
	.on('error', function( err ){ 
		node.send([null,{payload:node.process+" cannot be found "+err.toString(),count:node.outCnt++,timestamp:(Date.now())}]);
		if(logger.active) logger.send({label:"child.spawn.error",data:err.toString()});
		node.started=false;
	});

	node.outCnt=0;
	node.child.stdout.setEncoding('utf8'); //if you want text chunks
	node.child.stdout.on('data', (chunk) => {
		node.send({payload:chunk.toString(),count:node.outCnt++,timestamp:(Date.now())});
		if(logger.active) logger.send({label:"child.stdout.on data",data:chunk.toString()});
	});
	node.child.stderr.on('data', (chunk) => {
		node.send([null,{payload:chunk.toString(),count:node.outCnt++,timestamp:(Date.now())}]);
		if(logger.active) logger.send({label:"child.stderr.on data",data:chunk.toString()});
	});
	node.child.on('close', (code) => {
		if(logger.active) logger.send({label:"child.on close",code:code});
		node.send([
			{payload:"closed, exited with code: "+code,count:node.outCnt++,timestamp:(Date.now())},
			{payload:"closed, exited with code: "+code,count:node.outCnt,timestamp:(Date.now())},
			{payload:code}
		]);
		node.status({ fill: 'red', shape: 'ring', text: "Down"});
		node.started=false;
	});
	node.status({ fill: 'green', shape: 'ring', text: "Ready" });
}
function stop(node) {
	if(node.started) {
		node.status({ fill: 'red', shape: 'ring', text: "Down" });
		try{
			node.status({ fill: 'red', shape: 'ring', text: "Killed"});
			node.child.kill('SIGTERM');
		} catch(e) {
			node.status({ fill: 'red', shape: 'ring', text: "Killed failed "+e.toString()});
			node.started=false;
			throw Error("kill failed "+e.toString());
		}
	} else {
		throw Error("not active");
	}
}

module.exports = function(RED) {
    function SpawnProcessNode(n) {
        RED.nodes.createNode(this,n);
        var node=Object.assign(this,n,{connected:false});
        node.brokerNode=RED.nodes.getNode(node.broker);
   		node.status({ fill: 'yellow', shape: 'ring', text: "Initialising" });
   		try{
   			if(!spawn) {
   				if(logger.active) logger.send({label:"require child_process"});
   	   			spawn=require('child_process').spawn;
   			}
   			if(node.autoStart=="true") {
   	   			start(node);
   			} else {
				node.status({ fill: 'red', shape: 'ring', text: "Not Started" });
   			}
            node.on('input', function (msg) {
            	try{
                	switch(msg.topic) {
                		case "start":
                			start(node,msg);
                			break;
                		case "stop":
                			stop(node);
                			break;
                		case "stdin":
                			node.spawn.stdin.write(msg.payload);
                			break;
                		case "signal":
                			node.spawn.kill(msg.payload);
                			break;
            			default:
            				throw Error("invalid topic"); 
                	}
            	} catch(e) {
            		if(logger.active) logger.send({label:"input catch",error:e,msg:msg});
     				msg.error=e.toString();
      				node.send([null,msg]);
            	}
         	});
    	} catch (e) {
			node.error(e.toString());
       		node.status({ fill: 'red', shape: 'ring', text: e.toString() });
       		return;
    	}
		node.on("close", function(removed,done) {
			stop(node);
			node.status({ fill: 'red', shape: 'ring', text: "closed" });
       		done();
   		});
    }
    RED.nodes.registerType(nodeLabel,SpawnProcessNode);
    RED.httpAdmin.get("/SpawnProcess/:id/:action/", RED.auth.needsPermission("SpawnProcess.write"),  function(req,res) {
    	var node = RED.nodes.getNode(req.params.id);
    	if (node && node.type==="Spawn Process") {
    	    try {
    	    	switch (req.params.action) {
    	    		case 'kill':
    	    		case 'stop':
   	    				stop(node);
    	    			break;
    	    		case 'start':
       	       			start(node);
    	    			break;
    	       	    default:
    	       	    	throw Error("unknown action: "+req.params.action);
    	    	}
    	        res.status(200).send("succcess");
    	    } catch(err) {
  				node.send([null,{error:err.toString(),timestamp:(Date.now())}]);
    	    	var reason1='Internal Server Error, '+req.params.action+' failed '+err.toString();
    	        node.error(reason1);
    	        res.status(500).send(reason1);
    	    }
    	} else {
    		var reason2="request to "+req.params.action+" failed for id:" +req.params.id;
    		res.status(404).send(reason2);
    	}
    });
};
const ts=(new Date().toString()).split(' ');
console.log([parseInt(ts[2],10),ts[1],ts[4]].join(' ')+" - [info] Host Available Copyright 2019 Jaroslav Peter Prib");

function hostAvailable(host, port, node, availableCB, downCB, timeoutCB) {
	const socket=new require('net').Socket();
	socket.setTimeout(2000);
	socket.on('connect', function() {
		socket.destroy();
        availableCB.apply(node,[node]);
    }).on('error', function(e) {
    	socket.destroy();
        downCB.apply(this,[node,e]);
    }).on('timeout', function() {
    	(downCB||timeoutCB).apply(node,[node,"time out"]);
    }).connect(port, host);
};

function testHost(node) {
    hostAvailable(node.host,node.port,node,
    	(node)=>{
       		node.status({fill:"green",shape:"ring",text:"Up"});
       		if(node.available) return;
       		node.available=true;
       		node.log("state change up");
       		node.send({topic:"hostAvailable",payload:{host:node.host,port:node.port,state:"Up"}})
       	},
       	(node,err)=>{
       		node.status({fill:"Red",shape:"ring",text:"Down"});
       		if(!node.available) return;
       		node.available=false;
       		node.error("state change down "+err.toString());
       		node.send([null,{topic:"hostAvailable",payload:{host:node.host,port:node.port,state:"Down"}}])
       	}
    );
}
function runtimeStop() {
	if(this.runtimeTimer) {
		clearTimeout(this.runtimeTimer);
		this.runtimeTimer=null;
	}
    this.status({fill:"red",shape:"ring",text:"Stopped"});
	this.log("Monitor Stopped");
}

module.exports = function(RED) {
    "use strict";
    function hostAvailableNode(n) {
        RED.nodes.createNode(this,n,{available:false});
        let node=Object.assign(this,n);
        node.status({fill:"yellow",shape:"ring",text:"Not checked"});
        try{
        } catch(e) {
    		node.error(e);
        	node.status({fill:"red",shape:"ring",text:"Invalid setup "+e.toString()});
        } 
        testHost(node);
        if(node.checkInterval && node.checkInterval>0) {
        	this.runtimeTimer=setInterval(function(){testHost.apply(node,[node]);},node.checkInterval*1000);
            this.close = function() {
            	runtimeStop.apply(node);
            };
        }
        this.on("input",function(msg) {
        	if(msg.topic=="refreshHostAvailable") {
        		testHost(node);
        		return;
        	}
        	if(node.available) {
           		node.send({topic:"hostAvailable",payload:{host:node.host,port:node.port,state:"Up"}})
        	} else {
           		node.send([null,msg]);       		
           		node.send([null,{topic:"hostAvailable",payload:{host:node.host,port:node.port,state:"Down"}}])
        	}
        });
    }
    hostAvailableNode.prototype.close = function() {
    	runtimeStop.apply(this);
    };
    RED.nodes.registerType("Host Available",hostAvailableNode);
    
    RED.httpAdmin.get("/hostAvailable/:id", RED.auth.needsPermission("hostAvailable.write"), function(req,res) {
        let node = RED.nodes.getNode(req.params.id);
        if (node) {
            try {
            	testHost(node);
                res.sendStatus(200);
            } catch(err) {
                res.sendStatus(500);
                node.error(RED._("inject.failed",{error:err.toString()}));
            }
        } else {
            res.sendStatus(404);
        }
    });
}

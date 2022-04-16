const nodeLabel="Load Injector";
const Logger = require("node-red-contrib-logger");
const logger = new Logger(nodeLabel);
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");

function thinkTimeTime() {
	return this.thinktimemin+Math.floor(Math.random()*this.thinkRange);
}
function nextMessageInjection() {
	if (this.runtimeTimer) {
		this.count++;
		this.receive();
		const node=this;
		this.nextMessageInjectTimer=setTimeout(function(node){nextMessageInjection.apply(node);},thinkTimeTime.apply(node),node);
	}
}
function runtimeStop() {
	if(this.runtimeTimer) {
		clearTimeout(this.runtimeTimer);
		this.runtimeTimer=null;
	}
	if(this.nextMessageInjectTimer){
		clearTimeout(this.nextMessageInjectTimer);
		this.nextMessageInjectTimer=null;
	}
	this.stopped=Date.now();
	this.send([null,{payload:{count:this.count,started:this.started,stopped:this.stopped}}])
    this.status({fill:"red",shape:"ring",text:"Stopped"});
	this.error("Stopped injector");
}
function runtimeStart() {
	const node=this;
	this.started=Date.now();
	this.count=0;
	this.runtimeTimer=true;
	this.runtimeTimer=setTimeout(function(){runtimeStop.apply(node);},this.runtime*1000);
	this.status({fill:"green",shape:"ring",text:"Started"});
	nextMessageInjection.apply(this);
	this.error("started injector to run for "+this.runtime+" seconds");
}

module.exports = function (RED) {
    function LoadInjectorNode(n) {
        RED.nodes.createNode(this, n);
        const node=Object.assign(this,n);
        this.thinktimemin=Number(this.thinktimemin);
        this.thinktimemax=Number(this.thinktimemax);
        if(this.thinktimemax<this.thinktimemin) { 
        	this.thinktimemin=this.thinktimemax;
        	node.error("Minimum think time "+his.thinktimemin+" set down to max "+this.thinktimemax);
        }
        this.thinkRange=node.thinktimemax-node.thinktimemin+1;
        if(this.thinkRange<0) {
        	this.thinkRange=0;
        }
        node.status({fill:"red",shape:"ring",text:"Not started"});
        node.on("input", function(msg) {
        	switch(msg.topic) {
    			case "loadinjector.stop":
    	    		runtimeStop.apply(node);
    	    		node.send();
    				return;
        		case "loadinjector.start":
        			runtimeStart.apply(node);
    	    		node.send();
        			return;
        	}
            msg.topic = node.topic;
            if (node.payloadType !== 'flow' && node.payloadType !== 'global') {
                try {
                    if ( (node.payloadType === null && this.payload === "") || node.payloadType === "date") {
                        msg.payload = Date.now();
                    } else if (node.payloadType === null) {
                        msg.payload = node.payload;
                    } else if (node.payloadType === 'none') {
                        msg.payload = "";
                    } else {
                        msg.payload = RED.util.evaluateNodeProperty(node.payload,node.payloadType,node,msg);
                    }
                    node.send(msg);
                    msg = null;
                } catch(err) {
                	node.error(err,msg);
                }
            } else {
                RED.util.evaluateNodeProperty(node.payload,node.payloadType,node,msg, function(err,res) {
                    if (err) {
                        node.error(err,msg);
                    } else {
                        msg.payload = res;
                        node.send(msg);
                    }
                });
            }
        });
    }

    LoadInjectorNode.prototype.close = function() {
    	runtimeStop.apply(this);
    };

//  RED.httpAdmin.post("/loadinjector/:id", RED.auth.needsPermission("inject.write"), function(req,res) {
    RED.httpAdmin.get("/loadinjector/:id",  function(req,res) {
    	const node = RED.nodes.getNode(req.params.id);
    	if (node && node.type==="Load Injector") {
    	    try {
    	    	node.warn("Request to "+(node.runtimeTimer?"stop":"start")+" injector");
    	    	if(node.runtimeTimer) {
    	    		runtimeStop.apply(node);
    	    	} else {
    	    		runtimeStart.apply(node);
    	    	}
    	        res.sendStatus(200);
    	    } catch(err) {
    	    	var reason1='Internal Server Error, injector failed '+err.toString();
    	        node.error(reason1);
    	        res.status(500).send(reason1);
    	    }
    	} else {
    		var reason2="request to start/stop load injector failed for id:" +req.params.id;
    		node.error(reason2);
    		res.status(404).send(reason2);
 //   	    res.sendStatus(404);
    	}
    });
    
    RED.nodes.registerType(nodeLabel,LoadInjectorNode);

};





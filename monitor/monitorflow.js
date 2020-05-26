const nodeLabel="Monitor Flow";
const Logger = require("node-red-contrib-logger");
const logger = new Logger(nodeLabel);
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");

function runtimeStop() {
	if(this.runtimeTimer) {
		clearTimeout(this.runtimeTimer);
		this.runtimeTimer=null;
	}
    this.status({fill:"red",shape:"ring",text:"Stopped"});
	this.log("Monitor Stopped");
}
function reset() {
    this.counts=[];
    this.count=0;
    this.status({fill:"yellow",shape:"ring",text:"Counts reset"});
    this.count10sec=0;
    this.countMinute=0;
    this.count5Minute=0;
}
const timemin=60;
const time5min=5*60;
function checkLoop() {
	this.counts.unshift(this.count);
    this.count=0;
    while(this.counts.length>time5min){
    	this.count5Minute-=this.counts.pop();
    }
    this.count10sec+=this.counts[0];
    this.count10sec-=this.counts.length>10?this.counts[10]:0;
    this.count5Minute+=this.counts[0];
    this.countMinute-=this.counts.length>timemin?this.counts[timemin]:0;
    this.countMinute+=this.counts[0];
    this.status({fill:"green",shape:"ring",text:"Rate s/10s/1m/5m "+this.counts[0]+"/"+this.count10sec+"/"+this.countMinute+"/"+this.count5Minute});
}
module.exports = function (RED) {
    function monitorFlowNode(n) {
        RED.nodes.createNode(this, n);
        var node=Object.assign(this,n);
        reset.apply(node);
        node.status({fill:"yellow",shape:"ring",text:"No flow"});
        node.on("input", function(msg) {
            node.count++;
    		node.send(msg);
        });
    	this.runtimeTimer=setInterval(function(){checkLoop.apply(node);},1000);
    }

    monitorFlowNode.prototype.close = function() {
    	runtimeStop.apply(this);
    };

    RED.httpAdmin.get("/monitorflow/:id",  function(req,res) {
    	var node = RED.nodes.getNode(req.params.id);
    	if (node && node.type==="Monitor Flow") {
    	    try {
    	    	reset.apply(node);
    	    	node.warn("Request to reset monitor flow");
    	        res.sendStatus(200);
    	    } catch(err) {
    	    	var reason1='Internal Server Error, monitor flow failed '+err.toString();
    	        node.error(reason1);
    	        res.status(500).send(reason1);
    	    }
    	} else {
    		var reason2="request to reset monitor flow failed for id:" +req.params.id;
    		node.error(reason2);
    		res.status(404).send(reason2);
    	}
    });   
    
    RED.nodes.registerType(nodeLabel,monitorFlowNode);

};
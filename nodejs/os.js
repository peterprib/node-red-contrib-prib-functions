const nodeLabel="os";
const Logger = require("node-red-contrib-logger");
const logger = new Logger(nodeLabel);
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");

const os=require("os");

module.exports = function(RED) {
    function osNode(n) {
        RED.nodes.createNode(this,n);
        var node=Object.assign(this,n,{connected:false});
   		try{
   	        if(node.property in os) {
   	        	if(typeof os[node.property] == 'function') {
   	        		node.callfunction = os[node.property]
   	        	} else {
   	        		node.callfunction = (()=>os[node.property]);
   	        	}
   	        } else {
   	        	throw Error("Property not found");
   	        }
            node.on('input', function (msg) {
            	try{
            		if(msg.property) {
               	        if(msg.property in os) {
               	        	if(typeof os[node.property] == 'function') {
               	        		os.callfunction = os[msg.property]
                    			msg.payload=os[msg.property].apply(node,[msg.payload]);
               	        	} else {
               	        		msg.payload=os[msg.property];
               	        	}
               	        } else {
               	        	throw Error("Property not found");
               	        }
            		} else {
            			msg.payload=node.callfunction.apply(node,[msg.payload]);
            		}
            		node.send(msg);
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
    }
    RED.nodes.registerType(nodeLabel,osNode);
};
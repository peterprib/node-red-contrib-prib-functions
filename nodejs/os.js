const ts=(new Date().toString()).split(' ');
console.log([parseInt(ts[2],10),ts[1],ts[4]].join(' ')+" - [info] osCopyright 2019 Jaroslav Peter Prib");

const debugOff=(()=>false);
function debugOn(m) {
	const ts=(new Date().toString()).split(' ');
	if(!debugCnt--) {
		console.log([parseInt(ts[2],10),ts[1],ts[4]].join(' ')+" - [debug] os debugging turn off");
		debug=debugOff;
	}
	if(debugCnt<0) {
		debugCnt=100;
		console.log([parseInt(ts[2],10),ts[1],ts[4]].join(' ')+" - [debug] os debugging next "+debugCnt+" debug points");
	}
	console.log([parseInt(ts[2],10),ts[1],ts[4]].join(' ')+" - [debug] os "+(m instanceof Object?JSON.stringify(m):m));
}
let debug=debugOff,debugCnt=100;
let os=require("os");

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
            		debug({label:"input catch",error:e,msg:msg});
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
    RED.nodes.registerType("os",osNode);
};
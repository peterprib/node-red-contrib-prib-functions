const ts=(new Date().toString()).split(' ');
console.log([parseInt(ts[2],10),ts[1],ts[4]].join(' ')+" - [info] test Copyright 2019 Jaroslav Peter Prib");
function setError(msg,node,err) {
	msg._test.error=err;
	node.error(err);
	node.status({fill:"red",shape:"ring",text:"error"});
	node.send([null,msg]);
}

function equalObjects(obj1,obj2) {
	if( obj1 === obj2 ) return true;
	if( typeof obj1 != typeof obj2 ) return false;
	if( !(obj1 instanceof Object) ) return false; 
	if( Object.keys(obj1).length !== Object.keys(obj2).length ) return false;
	try{
		for(let key in obj1) {
			if( !equalObjects(obj1[key],obj2[key]) ) return false;
		}
	} catch(e) {
		return false;
	}
    return true;
}

module.exports = function(RED) {
    "use strict";
    function testNode(n) {
        RED.nodes.createNode(this,n);
        let node=Object.assign(this,n);
    	node.status({fill:"green",shape:"ring",text:"ready"});
        this.on("input",function(msg) {
        	if(msg._test) {
        		if(msg._test.id!==node.id) {
        			setError(msg,node,"Sent by another test "+msg._test.id);
//        		} else if(msg.payload!==msg._test.result) {
        		} else if(!equalObjects(msg.payload,msg._test.result)) {
        			setError(msg,node,"Test failed");
        		} else {
        	    	node.status({fill:"green",shape:"ring",text:"Success"});
        		}
        		return;
        	}
        	node.status({fill:"yellow",shape:"ring",text:"waiting on response"});
        	msg._test={
        		id:node.id,
        		result:RED.util.evaluateNodeProperty(this.result,this.resultType,this,msg)
        	};
            msg.topic = this.topic;
            if(["flow","global"].includes(this.payloadType)) {
                RED.util.evaluateNodeProperty(this.payload,this.payloadType,this,msg, function(err,res) {
                    if (err) {
                        node.error(err,msg);
                    } else {
                        msg.payload = res;
                        node.send(msg);
                    }
                });
            } else {
                try {
                    if ( (this.payloadType == null && this.payload === "") || this.payloadType === "date") {
                        msg.payload = Date.now();
                    } else if (this.payloadType == null) {
                        msg.payload = this.payload;
                    } else if (this.payloadType === 'none') {
                        msg.payload = "";
                    } else {
                        msg.payload = RED.util.evaluateNodeProperty(this.payload,this.payloadType,this,msg);
                    }
                    this.send(msg);
                    msg = null;
                } catch(err) {
                    this.error(err,msg);
                }
            }
        });
    }

    RED.nodes.registerType("test",testNode);
    
    RED.httpAdmin.post("/test/:id", RED.auth.needsPermission("test.write"), function(req,res) {
        let node = RED.nodes.getNode(req.params.id);
        if (node) {
            try {
                node.receive();
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

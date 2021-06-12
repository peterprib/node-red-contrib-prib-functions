const logger = new (require("node-red-contrib-logger"))("test").sendInfo("Copyright 2020 Jaroslav Peter Prib");

if(String.prototype.escapeSpecialChars)
	logger.warn("String.prototype.escapeSpecialChars already defined");
else
	String.prototype.escapeSpecialChars=function() {
		return this.replace(/\\n/g,"\n")
			.replace(/\\'/g,"\'")
			.replace(/\\"/g,'\"')
			.replace(/\\&/g,"\&")
			.replace(/\\r/g,"\r")
			.replace(/\\t/g,"\t")
			.replace(/\\b/g,"\b")
			.replace(/\\f/g,"\f");
	};
function escapeSpecialChars(s){
	try{
		return s?s.escapeSpecialChars():s;
	} catch(e) {
		const error="escapeSpecialChars expecting string found "+(typeof s);
		logger.error(error);
		throw Error(error);
	}
}
function setError(msg,node,err) {
	msg._test.error=err;
	node.error(err);
	node.status({fill:"red",shape:"ring",text:"error"});
	node.send([null,msg]);
}

function equalObjects(obj1,obj2,errorFactor) {
	if( obj1 === obj2 ) return true;
	if( obj1 === Number.POSITIVE_INFINITY && obj2==="Infinity") return true;
	if( obj1 === Number.NEGATIVE_INFINITY && obj2==="-Infinity") return true;
	if( Number.isNaN(obj1) && obj2==="NaN") return true;
	const obj1type=typeof obj1;
	if(  obj1type != typeof obj2 ) return false;
	if(errorFactor &&  obj1type=="number") return (Math.abs(obj2-obj1)/obj2)<errorFactor; 
	if( !(obj1 instanceof Object) ) return false; 
	if( Object.keys(obj1).length !== Object.keys(obj2).length ) return false;
	try{
		for(let key in obj1) {
			if( !equalObjects(obj1[key],obj2[key],errorFactor) ) return false;
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
		try{
			node.getData=eval("((msg,node)=>"+(node.resultProperty||"msg.payload")+")");
			if(node.escapeString && node.resultType=="str") {
				node.getData=eval("((msg,node)=>escapeSpecialChars("+(node.resultProperty||"msg.payload")+"))");
			}
			node.status({fill:"green",shape:"ring",text:"Ready"});
		} catch(e) {
			node.error(e);
			node.status({fill:"red",shape:"ring",text:"Invalid setup "+e.toString()});
		}
		node.payloadEscape=(node.payloadType=="str"&&node.escapeString);
		node.equalObjects=node.resultType=="re"?(value,regex)=>RegExp(regex).test(value):equalObjects;
		node.on("input",function(msg) {
			if(msg._test) {
				try{
					if(msg._test.id!==node.id) {
						setError(msg,node,"Sent by another test "+msg._test.id);
					} else if(!equalObjects(node.getData(msg,node),msg._test.result,node.errorFactor)) {
						msg._test.testedValue=node.getData(msg,node);
						setError(msg,node,"Test failed");
					} else {
						node.status({fill:"green",shape:"ring",text:"Success"});
						delete msg._test;
						node.send([null,null,msg]);
					}
				} catch(ex){
					setError(msg,node,"Test failed on get data "+ex.message);
				}
				return;
			}
			node.status({fill:"yellow",shape:"ring",text:"waiting on response"});
			const result=RED.util.evaluateNodeProperty(node.result,node.resultType,node,msg);
			msg._test={
				id:node.id,
				result:node.escapeString&&node.resultType=="str"?escapeSpecialChars(result):result
			};
			msg.topic=node.topic;
			if(["flow","global"].includes(node.payloadType)) {
				RED.util.evaluateNodeProperty(node.payload,node.payloadType,node,msg, function(err,res) {
					if (err) {
						node.error(err,msg);
					} else {
						msg.payload=res;
						node.send(msg);
					}
				});
			} else {
				try {
					if ( (node.payloadType == null && node.payload === "") || node.payloadType === "date") {
						msg.payload = Date.now();
					} else if (node.payloadType == null) {
						msg.payload = node.payload;
					} else if (node.payloadType === 'none') {
						msg.payload = "";
					} else {
						msg.payload=RED.util.evaluateNodeProperty(this.payload,node.payloadType,node,msg);
						if(node.payloadEscape) msg.payload=msg.payload.escapeSpecialChars();
					}
					node.send(msg);
					msg = null;
				} catch(err) {
					node.error(err,msg);
				}
			}
		});
	}

	RED.nodes.registerType(logger.label,testNode);
	
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

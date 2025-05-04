const logger = new (require("node-red-contrib-logger"))("test").sendInfo("Copyright 2020 Jaroslav Peter Prib");
const assert = require('node:assert')

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
	msg._test.error=err
	node.error(err)
	node.status({fill:"red",shape:"ring",text:"error"})
	node.send([null,msg])
}
function assertObjects(obj1,obj2,errorFactor,callEquals=()=>true,callNotEquals=()=>false) {
	try{
		node.assert(obj1,obj2).then(callEquals)
	} catch(ex) {
		logger.error(ex.message);
		callNotEquals(ex.message)
	}
/*
	assert.deepStrictEqual(actual, expected[, message])
	assert.deepEqual(actual, expected[, message])
	assert.notDeepEqual(actual, expected[, message])
	assert.partialDeepStrictEqual(actual, expected[, message])
	assert.equal(actual, expected[, message])
	assert.notEqual(actual, expected[, message])
	assert.strictEqual(actual, expected[, message])
	assert.notStrictEqual(actual, expected[, message])

	assert.doesNotMatch(string, regexp[, message])
	assert.match(string, regexp[, message])

	assert.doesNotReject(asyncFn[, error][, message])
	assert.doesNotThrow(fn[, error][, message])
	assert.throws(fn[, error][, message])
	assert.ifError(value)
	assert.ok(value[, message])
	assert.rejects(asyncFn[, error][, message])
*/
}

function equalObjects(obj1,obj2,errorFactor,callEquals=()=>true,callNotEquals=()=>false) {
	if(obj1 == obj2) return callEquals()
	if(obj1 instanceof Buffer) return Buffer.compare(obj1, obj2) === 0?callEquals():callNotEquals("buffers not equal")
	if(obj1 === Number.POSITIVE_INFINITY && obj2==="Infinity") return callEquals()
	if(obj1 === Number.NEGATIVE_INFINITY && obj2==="-Infinity") return callEquals()
	if(Number.isNaN(obj1) && obj2==="NaN") return callEquals()
	const obj1type=typeof obj1
	if(obj1type != typeof obj2) return callNotEquals("different data types, "+obj1type+" vs "+typeof obj2)
	if(obj1type=="boolean") callNotEquals("boolean not equal")
	if(errorFactor &&  obj1type=="number") return (Math.abs(obj2-obj1)/obj2)<errorFactor?callEquals():callNotEquals("number outside bounds")
	if( !(obj1 instanceof Object) ) return callNotEquals("different object types")
	const keys1=Object.keys(obj1).sort()
	const keys2=Object.keys(obj2).sort()
	if( keys1.length !== keys2.length ) return callNotEquals("different number of properties")
	for(const key1 of keys1){
		try{ 
			if( !equalObjects(obj1[key1],obj2[key1],errorFactor) ) return callNotEquals()
		} catch(ex){
			return callNotEquals(ex.message)
		}
	}
    return callEquals();
}

const testedOK=(node,msg)=>{
	node.status({fill:"green",shape:"ring",text:"Success"});
	delete msg._test;
	node.send([null,null,msg]);
}
const testedFailed=(node,msg,err)=>{
	msg._test.testedValue=node.getData(msg,node)
	msg._test.errorDetails=err
	setError(msg,node,"Test failed")
}

module.exports = function(RED) {
	"use strict";
	function testNode(n) {
		RED.nodes.createNode(this,n);
		let node=Object.assign(this,n);
		try{
			node.isJSONata=node.resultType=="jsonata"
			if(node.escapeString && node.resultType=="str") {
				node.getData=eval("((msg,node)=>escapeSpecialChars("+(node.resultProperty||"msg.payload")+"))");
			} else{
				if(node.isJSONata) {
					if(!node.result.startsWith("$boolean"))
						throw Error("JSONata must have $boolean outcome, found: "+node.resultProperty.substr(0,8))
					node.resultExpression=RED.util.prepareJSONataExpression(node.result, node)
					node.resultExpression.assign('node', node); 
				}
				node.getData=eval("((msg,node)=>"+(node.resultProperty||"msg.payload")+")");
			}
			node.status({fill:"green",shape:"ring",text:"Ready"});
		} catch(e) {
			node.error(e);
			node.status({fill:"red",shape:"ring",text:"Invalid setup "+e.toString()});
		}
		node.payloadEscape=(node.payloadType=="str"&&node.escapeString);
		node.equalObjects=node.resultType=="re"?
			(value,regex,callEquals,callNotEquals)=>(RegExp(regex).test(value)?callEquals():callNotEquals()):
			(obj1,obj2,errorFactor,callEquals,callNotEquals)=>equalObjects(obj1,obj2,errorFactor,callEquals,callNotEquals);
		node.on("input",function(msg) {
			if(msg._test) {
				try{
					if(msg._test.id!==node.id) return setError(msg,node,"Sent by another test "+msg._test.id);

					if(node.isJSONata) 
						return 	RED.util.evaluateJSONataExpression(node.resultExpression,msg,(err,data)=>{
							if(err) testedFailed(node,msg,err)
							else return data?testedOK(node,msg):testedFailed(node,msg,"no data")
						})
					
					node.equalObjects(node.getData(msg,node),msg._test.result,node.errorFactor,
						()=>testedOK(node,msg),
						(err)=>testedFailed(node,msg,err)
					);

				} catch(ex){
					setError(msg,node,"Test failed on get data "+ex.message);
				}
				return;
			}
			node.status({fill:"yellow",shape:"ring",text:"waiting on response"});
			let result=RED.util.evaluateNodeProperty(node.result,node.resultType,node,msg,(err,data)=>{
				if(err) node.error(err,msg)
				msg._test={
					id:node.id,
					result:node.escapeString&&node.resultType=="str"?escapeSpecialChars(data):data
				};
				msg.topic=node.topic;
				if(["flow","global"].includes(node.payloadType)) {
					RED.util.evaluateNodeProperty(node.payload,node.payloadType,node,msg, (err,res)=>{
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

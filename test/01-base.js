const assert=require('assert');
const should=require("should");
const helper=require("node-red-node-test-helper");
const storageDefinition=require("../nodes/storageDefinition.js");
const storageRead = require('../nodes/storageRead.js');

helper.init(require.resolve('node-red'));

function getAndTestNodeProperties(o) {
	const n = helper.getNode(o.id);
	for(let p in o) n.should.have.property(p, o[p]);
	return n;
}

const blockStorage={
	id : "blockStorage",
	type : "Storage Definition",
	name : "Block Storage",
	action: "blockStorage",
	sourceProperty:"blockStorageFile",
	blockSize:4096
};

const StorageReadBlock={
	id : "StorageReadBlockid",
	type : "Storage Read",
	name : "Block Storage",
	target:"payload",
	"target-type":"msg",
	key:"topic"
};

function testFlow(done,node,data,result) {
	const flow = [
		Object.assign(node,{wires : [ [ "outHelper" ],["errorHelper"] ]}),
		{id :"outHelper",	type : "helper"},
		{id :"errorHelper",	type : "helper"}
	];
	helper.load(storageDefinition, flow, function() {
		const n=getAndTestNodeProperties(node);
		const outHelper = helper.getNode("outHelper");
		const errorHelper = helper.getNode("errorHelper");
		outHelper.on("input", function(msg) {
			console.log("outHelper "+JSON.stringify(msg.payload));
			if(JSON.stringify(msg.payload)==JSON.stringify(result)) {
				done();
			} else {
				console.log("mismatch  expected: "+JSON.stringify(result) +" returned: "+JSON.stringify(msg.payload));
				done("mismatch");
			}
		});
		errorHelper.on("input", function(msg) {
			console.log("errorHelper "+JSON.stringify(msg));
			done("error  check log output");
		});
		n.receive({
			topic:"test",
			payload : data
		});
	});
}

describe('Storage Defintion', function() {
	beforeEach(function(done) {
		helper.startServer(done);
	});
	afterEach(function(done) {
		helper.unload();
		helper.stopServer(done);
	});
	it("load config", function(done) {
		helper.load(storageDefinition,[], function() {
			const n=getAndTestNodeProperties(storageDefinition);
		});
		done();
	});
	it("load read", function(done) {
		helper.load(storageDefinition,storageRead,[], function() {
			const n=getAndTestNodeProperties(storageDefinition);
		});
		done();
	});
	
	it('read 1', function(done) {
		const msg={topic:1}
		testFlow(done,storageDefinition,msg,msg);
	});
});
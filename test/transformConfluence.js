const should = require("should");
const helper = require("node-red-node-test-helper");
const transformNode = require("../transform/transform.js");
const Buffer=require('buffer').Buffer;

helper.init(require.resolve('node-red'));

function getAndTestNodeProperties(o) {
	const n = helper.getNode(o.id);
	for(let p in o) n.should.have.property(p, o[p]);
	return n;
}

const schemas=JSON.stringify({"1":{"type":"record","fields":[{"name":"name","type":"string"}]}});

const JSON2Confluencenode={
	id : "JSON2Confluence",
	type : "transform",
	name : "json to Confluence",
	actionSource: "JSON",
	actionTarget: "Confluence",
	sourceProperty:"msg.payload",
	targetProperty:"msg.payload",
	topicProperty:"'test topic'",
	schema:schemas
};
const Confluence2JSONnode={
	id : "Confluence2JSON",
	type : "transform",
	name : "Confluence to json",
	actionSource: "Confluence",
	actionTarget: "JSON",
	sourceProperty:"msg.payload",
	targetProperty:"msg.payload",
	topicProperty:"'test topic'",
	schema:schemas
};

//const header=Buffer.alloc(5);
//header[0]=0;
//header.writeInt32BE(1, 1);

const dataJSON={schema:1,data:{"name":"testname"}};
//const dataConfluence=header;
//const dataConfluence=Buffer.from([header],'binary');
const dataConfluence=Buffer.from([0,0,0,0,1,16,116,101,115,116,110,97,109,101]);


function testFlow(done,node,data,result) {
	const flow = [
		Object.assign(node,{wires : [ [ "outHelper" ],["errorHelper"] ]}),
		{id :"outHelper",	type : "helper"},
		{id :"errorHelper",	type : "helper"}
	];
	helper.load(transformNode, flow, function() {
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

describe('transform Confluence', function() {
	beforeEach(function(done) {
		helper.startServer(done);
	});
	afterEach(function(done) {
		helper.unload();
		helper.stopServer(done);
	});
	it('JSON to Confluence', function(done) {
		testFlow(done,JSON2Confluencenode,dataJSON,dataConfluence);
	});
	it('Confluence to JSON', function(done) {
		testFlow(done,Confluence2JSONnode,dataConfluence,dataJSON);
	});
});
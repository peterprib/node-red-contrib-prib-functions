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

const Array2XLSX={
	id : "Array2XLSX",
	type : "transform",
	name : "json to XLSX",
	actionSource: "JSON",
	actionTarget: "XLSX",
	sourceProperty:"msg.payload",
	targetProperty:"msg.xlsx"
};
const XLSX2Array={
	id : "XLSX2Array",
	type : "transform",
	name : "XLSX toArray",
	actionSource: "XLSX",
	actionTarget: "Array",
	sourceProperty:"msg.xlsx",
	targetProperty:"msg.json"
}
const dataJSON={"worksheet1":[[11,12],[21,22],[31,32]],"worksheet2":[[11,12],[21,22]]};

function testFlow(done,data,result) {
	const flow = [
		Object.assign(Array2XLSX,{wires : [ [ XLSX2Array.id ],["errorHelper"] ]}),
		Object.assign(XLSX2Array,{wires : [ [ "outHelper" ],["errorHelper"] ]}),
		{id :"outHelper",	type : "helper"},
		{id :"errorHelper",	type : "helper"}
	];
	helper.load(transformNode, flow, function() {
		const n=getAndTestNodeProperties(Array2XLSX);
		const outHelper = helper.getNode("outHelper");
		const errorHelper = helper.getNode("errorHelper");
		outHelper.on("input", function(msg) {
			console.log("outHelper "+JSON.stringify(msg.json));
			if(JSON.stringify(msg.payload)==JSON.stringify(msg.json)) {
				done();
			} else {
				done("mismatch expected: " +JSON.stringify(msg.payload)+"  actual: " +JSON.stringify(msg.json));
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

describe('transform XLSX', function() {
	beforeEach(function(done) {
		helper.startServer(done);
	});
	afterEach(function(done) {
		helper.unload();
		helper.stopServer(done);
	});
	it('JSON to XLSX to JSON', function(done) {
		testFlow(done,dataJSON,dataJSON);
	});
});
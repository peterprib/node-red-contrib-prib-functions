const should = require("should");
const helper = require("node-red-node-test-helper");
const transformNode = require("../transform/transform.js");

helper.init(require.resolve('node-red'));

function getAndTestNodeProperties(o) {
	const n = helper.getNode(o.id);
	for(let p in o) n.should.have.property(p, o[p]);
	return n;
}

const JSON2XMLnode={
	id : "JSON2XML",
	type : "transform",
	name : "json to xml",
	actionSource: "JSON",
	actionTarget: "XML",
	sourceProperty:"msg.payload",
	targetProperty:"msg.payload",
	topicProperty:"'test topic'"
};
const XML2JSONnode={
	id : "XML2JSON",
	type : "transform",
	name : "xml to json",
	actionSource: "XML",
	actionTarget: "JSON",
	sourceProperty:"msg.payload",
	targetProperty:"msg.payload",
	topicProperty:"'test topic'"
};
const dataJSON={"name":"testname"};
const dataXML="<testTag testAttr='atestAttrValue'>aTestTagValue<subtag>a subtag value</subtag></testTag>";

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


describe('transform xml', function() {
	beforeEach(function(done) {
		helper.startServer(done);
	});
	afterEach(function(done) {
		helper.unload();
		helper.stopServer(done);
	});
	it('JSON to XML', function(done) {
		testFlow(done,JSON2XMLnode,dataJSON,"<name>testname</name>");
	});
	it('XML to JSON', function(done) {
		testFlow(done,XML2JSONnode,dataXML,{"testTag":{"#text":"aTestTagValue","@_testAttr":"atestAttrValue","subtag":"a subtag value"}});
	});
});
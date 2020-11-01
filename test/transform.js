const should = require("should");
const helper = require("node-red-node-test-helper");
const transformNode = require("../transform/transform.js");

helper.init(require.resolve('node-red'));

describe('transform', function() {
	beforeEach(function(done) {
		helper.startServer(done);
	});
	afterEach(function(done) {
		helper.unload();
		helper.stopServer(done);
	});

	it('should be loaded', function(done) {
		const flow = [ {
			id : "n1",
			type : "transform",
			name : "transform name",
			actionSource: "Array",
			actionTarget: "Messages",
			sourceProperty:"msg.payload",
			targetProperty:"msg.payload",
			topicProperty:"'test topic'",
			maxMessages:1000,
			skipLeading: 0,
			skipTrailing: 0,
			delimiter: ","
		} ];
		helper.load(transformNode, flow, function() {
			const n1 = helper.getNode("n1");
			n1.should.have.property('name', 'transform name');
			n1.should.have.property('actionSource', "Array");
			n1.should.have.property('actionTarget',"Messages");
			n1.should.have.property('sourceProperty',"msg.payload");
			n1.should.have.property('targetProperty',"msg.payload");
			n1.should.have.property('topicProperty',"'test topic'");
			n1.should.have.property('maxMessages', 1000);
			n1.should.have.property('skipLeading', 0);
			n1.should.have.property('skipTrailing', 0);
			n1.should.have.property('delimiter', ",");
			done();
		});
	});

	it('should make payload messages', function(done) {
		const flow = [ {
			id : "n1",
			type : "transform",
			name : "transform name",
			actionSource: "Array",
			actionTarget: "Messages",
			sourceProperty:"msg.payload",
			targetProperty:"msg.payload",
			topicProperty:"index",
			maxMessages:1000,
			skipLeading: 0,
			skipTrailing: 0,
			delimiter: ",",
			wires : [ [ "n2" ] ]
		}, {id :"n2",	type : "helper"} ];
		
		helper.load(transformNode, flow, function() {
			const n1 = helper.getNode("n1");
			const n2 = helper.getNode("n2");
			let count = 0;
			const anArray = [ [ 1, "a" ],[2 ,"b"],[3 ,"c"] ];
			n2.on("input", function(msg) {
//				msg.should.have.property('payload', 'uppercase');
				console.log("test " + count);
				console.log(msg);
				if (++count>= anArray.length) done();
			});
			n1.receive({
				payload : anArray
			});
		});
	}).timeout(2000);

	it('AVRO', function(done) {
		const flow = [ 
			{	id : "JSON2AVRO",
				name : "JSON2AVROname",
				type : "transform",
				actionSource: "JSON",
				actionTarget: "AVRO",
				sourceProperty:"msg.payload",
				targetProperty:"msg.payload",
				schema: '{"type":"record","fields":[{"name":"name","type":"string"}]}',
				wires : [ [ "AVRO2JSON" ],["errorHelper"] ]
			}, 
			{	id : "AVRO2JSON",
				name : "AVRO2JSONname",
				type : "transform",
				actionSource: "AVRO",
				actionTarget: "JSON",
				sourceProperty:"msg.payload",
				targetProperty:"msg.payload",
				schema: '{"type":"record","fields":[{"name":"name","type":"string"}]}',
				wires : [ [ "outHelper" ],["errorHelper"] ]
			}, 
			{id :"outHelper",	type : "helper"},
			{id :"errorHelper",	type : "helper"}
		];
		helper.load(transformNode, flow, function() {
			const JSON2AVRO = helper.getNode("JSON2AVRO");
			const outHelper = helper.getNode("outHelper");
			const errorHelper = helper.getNode("errorHelper");
			const testData ='{"name":"testname"}';
			outHelper.on("input", function(msg) {
				console.log("outHelper "+msg.payload);
				if(JSON.stringify(msg.payload)==testData) {
					done();
				} else {
					console.log("mismatch  in: "+testData +" returned: "+JSON.stringify(msg.payload));
					done("mismatch");
				}
			});
			errorHelper.on("input", function(msg) {
				console.log("errorHelper "+msg.payload);
				done("error  check log output");
			});
			JSON2AVRO.receive({
				topic:"test",
				payload : JSON.parse(testData)
			});
		});
		
	});
});
const assert = require("assert");
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
			assert.strictEqual(n1.name, 'transform name');
			assert.strictEqual(n1.actionSource, "Array");
			assert.strictEqual(n1.actionTarget, "Messages");
			assert.strictEqual(n1.sourceProperty, "msg.payload");
			assert.strictEqual(n1.targetProperty, "msg.payload");
			assert.strictEqual(n1.topicProperty, "'test topic'");
			assert.strictEqual(n1.maxMessages, 1000);
			assert.strictEqual(n1.skipLeading, 0);
			assert.strictEqual(n1.skipTrailing, 0);
			assert.strictEqual(n1.delimiter, ",");
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
				try {
					console.log("test " + count);
					console.log(msg);
					assert.deepStrictEqual(msg.payload, anArray[count]);
					if (++count>= anArray.length) done();
				} catch (e) {
					done(e);
				}
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
				try {
					assert.strictEqual(JSON.stringify(msg.payload), testData);
					done();
				} catch (e) {
					done(e);
				}
			});
			errorHelper.on("input", function(msg) {
				console.log("errorHelper "+msg.payload);
				done(new Error("error check log output"));
			});
			JSON2AVRO.receive({
				topic:"test",
				payload : JSON.parse(testData)
			});
		});
		
	});
});
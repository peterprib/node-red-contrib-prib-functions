const assert=require('assert')
const helper = require("node-red-node-test-helper")
const NumPy = require("../transform/NumPy.js")
const transformNode = require("../transform/transform.js");
const fs = require('fs')
const path = require('path')
const filePath = path.join(__dirname, "data/float32vector10.npy")
const npyFloat32V10 = fs.readFileSync(filePath)
const npyInt2matrix2x3 = fs.readFileSync(path.join(__dirname, "data/int2matrix2x3.npy"))
const int2matrix2x3={"dataType":"int64","fortran_order":false,"shape":[1,2,3],"version":1.0,"dataVector":new BigInt64Array([1n,2n,3n,4n,5n,6n])}
if(!Buffer.prototype.toBufferArray)
    Buffer.prototype.toBufferArray = function() {return this.buffer.slice(this.byteOffset, this.byteOffset + this.byteLength)}

const float32V10 = new Float32Array([
	86,  46,  10, 148, 133,
	86, 103, 118,  62,  49
  ])
const NumPyJSON={
	"dataType":"float32",
	"fortran_order":false,
	version:1.0,
	"shape":[10],
	"dataVector":{"0":86,"1":46,"2":10,"3":148,"4":133,"5":86,"6":103,"7":118,"8":62,"9":49}
}
helper.init(require.resolve('node-red'));

const npy2JSONNode={
	id : "npy2JSON",
	type : "transform",
	name : "npy to JSON",
	actionSource: "npy",
	actionTarget: "JSON",
	sourceProperty:"msg.payload",
	targetProperty:"msg.payload",
	topicProperty:"'test topic'"
};
const JSON2npyNode={
	id : "npy2JSON",
	type : "transform",
	name : "JSON to npy",
	actionSource: "JSON",
	actionTarget: "npy",
	sourceProperty:"msg.payload",
	targetProperty:"msg.payload",
	topicProperty:"'test topic'"
};
function getAndTestNodeProperties(o) {
	const n = helper.getNode(o.id);
	for(let p in o) n.should.have.property(p, o[p]);
	return n;
}
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

describe('NumPy', function() {
	it("parse npyFloat10",(done)=>{
		const tensor=new NumPy(npyFloat32V10)
		assert.deepStrictEqual(tensor.dataType,'float32')
		assert.deepStrictEqual(tensor.shape,[10])
		assert.deepStrictEqual(tensor.fortran_order,false)
		assert.deepStrictEqual(tensor.dataVector,float32V10)
		done()
	});
	it("parse npyInt2matrix2x3",(done)=>{
		const tensor=new NumPy(npyInt2matrix2x3)
		assert.deepStrictEqual(tensor.toSerializable(),int2matrix2x3)
		done()
	});
	it("parse int2matrix2x3",(done)=>{
		const tensor=new NumPy(int2matrix2x3)
		assert.deepStrictEqual(tensor.toSerializable(),int2matrix2x3)
		console.log({label:"toString",result:tensor.toString()})
		const npy=tensor.toNpy()
		done();
	});
/*
	it("toNpy float32V10",(done)=>{
		const tensor=new NumPy(NumPyJSON)
		assert.deepStrictEqual(tensor.toNpy(),npyFloat32V10.toBufferArray())
		done();
	});

	it("toNpy int2matrix2x3",(done)=>{
		const tensor=new NumPy(int2matrix2x3)
		assert.deepStrictEqual(tensor.toNpy(),npyInt2matrix2x3.toBufferArray())
		done();
	});
*/
});

describe('transform numpy', function() {
	beforeEach(function(done) {
		helper.startServer(done);
	});
	afterEach(function(done) {
		helper.unload();
		helper.stopServer(done);
	});
	it('npy to Array', function(done) {
		testFlow(done,JSON2npyNode,int2matrix2x3,npyInt2matrix2x3);
	});
	it('npy to JSON', function(done) {
		testFlow(done,npy2JSONNode,npyInt2matrix2x3,int2matrix2x3);
	});
});
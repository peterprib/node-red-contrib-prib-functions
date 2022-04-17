const assert=require('assert');
const should=require("should");
const dataAnalysis=require("../dataAnalysis/dataAnalysis.js");
const helper=require("node-red-node-test-helper");
helper.init(require.resolve('node-red'));
const helperNodeResults={id :"helperNodeResults",	type : "helper"}
const helperNodeDetails={id :"helperNodeDetails",	type : "helper"}
const helperNodeOutliers={id :"helperNodeOutliers",	type : "helper"}

const base =  {
		id : "n1",
		type:"Data Analysis",
//	    action: "avg",
//	    outputs: {value:(["realtime","realtimePredict"].includes(this.action)?3:2),required:true},
//	    outliersBase: "sum",
//	    outliersStdDevs: 3,
//	    term:10,
//	    keyProperty:"msg.topic",
	    dataProperty: "msg.payload",
//	    dataProperties: ["msg.payload[0]","msg.payload[1]"],
	    wires : [[helperNodeResults.id],[helperNodeDetails.id],[helperNodeOutliers.id]]
} ;
function getNode(node) {
	const n=helper.getNode(node.id);
	if(n) return n; 
	throw Error("node id: "+node.id+"  not found, node: "+JSON.stringify(node))
} ;
function test(label,action,data,expected) {
	it(label+" "+action, function(done) {
		if(data.length==0) {
			done("no data")
			return
		}
		let errors=[];
		const newBase=Object.assign({},base,{action:action});
		const flow=[helperNodeResults,helperNodeDetails,helperNodeOutliers,newBase];
		let count=data.length;
		helper.load(dataAnalysis,flow, function() {
			try{
				const resultsNode=getNode(helperNodeResults);
				const detailsNode=getNode(helperNodeDetails);
				const outliersNode=getNode(helperNodeOutliers);
				const n1=getNode(newBase);
				n1.should.have.property("action", action);
				resultsNode.on("input", function(msg) {
					try{
						if(msg.error) throw Error(msg.error);
						assert.strictEqual(msg.result,expected[msg._i]);
					}  catch(ex) {
						console.log(JSON.stringify({label:"**** error ",test:label,error:ex.message,count:count,action:action,msg:msg,expected:expected[msg._i]}))
						errors.push(ex.message)
					}
					if(--count) return;
					if(errors.length) done(errors)
					else done();
				});
				detailsNode.on("input", function(msg) {
					console.log(JSON.stringify({label:"***** details ",action:action,msg:msg}))
				});
				outliersNode.on("input", function(msg) {
					console.log(JSON.stringify({label:"***** outliers ",action:action,msg:msg}))
				});
				data.forEach((e,i)=>{
					n1.receive({payload:e,_i :i});
				})
			} catch(ex) {
				console.log(ex.stack)
				done(ex);
			}
		});
	}).timeout(4000);
}

describe('Data Anaylsis', function() {
	beforeEach(function(done) {
		helper.startServer(done);
	});
	afterEach(function(done) {
		helper.unload();
		helper.stopServer(done);
	});
	const zeros=[undefined,[0],[0,0],[0,0,0]];
	test("test zeros","sum",zeros,[undefined,0,0,0]);
	test("test zeros","avg",zeros,[undefined,0,0,0]);
	test("test zeros","max",zeros,[undefined,0,0,0]);
	test("test zeros","min",zeros,[undefined,0,0,0]);
	test("test zeros","stdDev",zeros,[undefined,0,0,0]);
	const ones=[[1],[1,1],[1,1,1]];
	test("test ones","sum",ones,[1,2,3]);
	test("test ones","avg",ones,[1,1,1]);
	test("test ones","max",ones,[1,1,1]);
	test("test ones","min",ones,[1,1,1]);
	test("test ones","stdDev",ones,[0,0,0]);
	const minus=[[-1],[-1,1],[-1,1,-1]];
	test("test minus","sum",minus,[-1,0,-1]);
	test("test minus","avg",minus,[-1,0,-1/3]);
	test("test minus","max",minus,[-1,1,1]);
	test("test minus","min",minus,[-1,-1,-1]);
	test("test minus","stdDev",minus,[0,1,0.9428090415820634]);

	const twos=[[2],[2,2],[2,2,2],[2,2,2,2]];
	test("test twos","sum",twos,[2,4,6,8]);
	test("test twos","avg",twos,[2,2,2,2]);
	test("test twos","stdDev",twos,[0,0,0,0]);

	const c1234=[[1],[1,2],[1,2,3],[1,2,3,4]];
	test("test c1234","sum",c1234,[1,3,6,10]);
	test("test c1234","avg",c1234,[1,1.5,2,10/4]);
	test("test c1234","stdDev",c1234,[0,0.5,0.8164965809277263,1.118033988749895]);
	test("test c1234","sampleStdDev",c1234,[0,0.7071067811865476,1,1.2909944487358056]);
});	
	

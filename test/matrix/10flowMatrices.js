const assert=require('assert');
const should=require("should");
const Matrix=require("../../matrix/matrixNode.js");
const helper=require("node-red-node-test-helper");
helper.init(require.resolve('node-red'));
const helperNodeResults={id:"helperNodeResultsId",type: "helper"}

const matrixNode={
    "id": "matrixNodeId",
    "type": "matrixNode",
    "action": "create",
//    "targetProperty": "msg._matrix",
    "wires": [
        ["helperNodeResults"],
    ]
};

function getNode(node) {
	const n=helper.getNode(node.id);
	if(n) return n; 
	throw Error("node id: "+node.id+"  not found, node: "+JSON.stringify(node))
};
describe('matrix', function() {
	beforeEach(function(done) {
		helper.startServer(done);
	});
	afterEach(function(done) {
		helper.unload();
		helper.stopServer(done);
	});

/*
	it("test loading", function(done) {
		helper.load(Matrix,[matrixNode], function() {
            try{
                const nodeMatrix=getNode(matrixNode);
                done();
			} catch(ex) {
				done(ex);
			}
        });
    });
    const matrixFlow=[matrixNode,helperNodeResults]
	it("add", function(done) {
		let count=0;
		helper.load(Matrix,matrixFlow, function() {
			try{
				const nodeResults=getNode(helperNodeResults);
			    const nodeMatrix=getNode(matrixNode);
				nodeMatrix.should.have.property("action", "create");
				nodeResults.on("input", function(msg) {
					switch (msg.topic) {
						case "load" : 
							done();
							break
					default: done("unknown message "+msg.topic); 
					}
                    if(--count==0) done()
				});
				count++;nodeMatrix.receive({topic:"load",payload:[[1,2],[3,4]]});
			} catch(ex) {
				done(ex);
			}
		});
	}).timeout(5000);
*/

});
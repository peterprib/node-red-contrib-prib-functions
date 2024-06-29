//const assert=require('assert');
const assert = require('node:assert/strict');
const Table=require("../lib/Table");
describe('/lib/Table ', function() {
    const data=[[11,12,"one"],[1,2,"one"],[21,22,"two"],[21,22,"three"]]
	it("add column", function(done) {
        const table=new Table({data:data})
        assert.throws(()=>table.addColumn({type:"notvalid"},/^no column name$/))
//        table.addColumn({name:"col1"})
        assert.throws(()=>table.addColumn({name:"col1"}),/^Error: invalid type: null.*$/)
        assert.throws(()=>table.addColumn({name:"col1",type:"notvalid"}),/^Error: invalid type: notvalid.*$/)
        done()
    })
	it("columnar", function(done) {
        const table=new Table({data:data})
        .addColumn({name:"c1",type:"int"})
        .addColumn({name:"c2",type:"real"})
        .addColumn({name:"c3",type:"string"})
        .buildColumnIndices()
        done()
    })
})

const GraphDB=require("../lib/GraphDB");
describe('/lib/GraphDB ', function() {
	it("add vertex", function(done) {
        const nodes=[{},{}]
        const graphDB=new GraphDB()
        graphDB.addVertex(nodes[0])
        graphDB.addEdge(nodes[0],nodes[1])
        done()
    })
})
const assert=require('assert')
const GraphDB = require('../lib/GraphDB.js')

describe('GraphDB', function() {
    it("define vertices", function(done) {
        const graphDB=new GraphDB()
        assert.equal(graphDB.getVerticesCount(),0)
        assert.equal(graphDB.getEdgesCount(),0)
        graphDB.addVertex({id:"a"})
        assert.equal(graphDB.getVerticesCount(),1)
        graphDB.addVertex({id:"b"})
        assert.equal(graphDB.getVerticesCount(),2)
        done()
    });
    const graphDB=new GraphDB()
    const a=graphDB.addVertex({id:"a",name:"aname"})
    const b=graphDB.addVertex({id:"b",name:"bname"})
    const c=graphDB.addVertex({id:"c",name:"cname"})
    it("find vertices", function(done) {
        assert.deepEqual(graphDB.getVertices(v=>v.id=="d"),[])
        assert.deepEqual(graphDB.getVertices(v=>v.id=="a"),[a])
        assert.deepEqual(graphDB.getVertices(v=>v.id=="c"),[c])
        assert.deepEqual(graphDB.getVertices(v=>v.id=="a"||v.id=="c"),[a,c])
        done()
    });
    const ea=graphDB.addEdge(a,b,{id:"ea",name:"eaname"})
    const eb=graphDB.addEdge(b,c,{id:"eb",name:"ebname"})
    const ec=graphDB.addEdge(a,c,{id:"ec",name:"ecname"})
     it("define edges", function(done) {
        const g = new GraphDB();
        const v1 = g.addVertex({id:"v1"});
        const v2 = g.addVertex({id:"v2"});
        const v3 = g.addVertex({id:"v3"});
        assert.throws(() => g.addEdge({}), Error("from not type Vertex"));
        assert.throws(() => g.addEdge(v1, {}), Error("to not type Vertex"));
        assert.equal(g.getEdgesCount(),0);
        g.addEdge(v1, v2);
        assert.equal(g.getEdgesCount(),1);
        g.addEdge(v2, v3, {cost: 1});
        assert.equal(g.getEdgesCount(),2);
        done()
    });
    it("find edges", function(done) {
        assert.deepEqual(graphDB.getEdges(e=>e.id=="ed"),[])
        assert.deepEqual(graphDB.getEdges(e=>e.id=="ea"),[a])
        assert.deepEqual(graphDB.getEdges(e=>e.id=="ec"),[c])
        assert.deepEqual(graphDB.getEdges(e=>e.id=="ea"||e.id=="ec"),[ea,ec])
    });
})
const assert=require('assert');
const should=require("should");
require("../lib/objectExtensions");

describe('/lib/objectExtensions array ', function() {
	it("array find sorted empty set", function(done) {
        assert.strictEqual([].findSorted("1"),-0)
        done()
    })
	it("array find sorted [1] for 1", function(done) {
        assert.strictEqual(["0"].findSorted("0"),0)
        done()
    })
	it("array find sorted [1] for 2", function(done) {
        assert.strictEqual(["0"].findSorted("1"),-1)
        done()
    })
	it("array find sorted matches", function(done) {
        assert.strictEqual(["0","1"].findSorted("1"),1)
        assert.strictEqual(["0","1","2"].findSorted("1"),1)
        assert.strictEqual(["0","1","2"].findSorted("2"),2)
        done()
    })
	it("array find sorted misses", function(done) {
        assert.strictEqual(["1","3","5"].findSorted("0"),-0)
        assert.strictEqual(["1","3","5"].findSorted("2"),-1)
        assert.strictEqual(["1","3","5"].findSorted("4"),-2)
        assert.strictEqual(["1","3","5"].findSorted("6"),-3)
        done()
    })
	it("array add sorted empty set", function(done) {
        const result=[]
        result.addSorted("1")
        console.log(result)
        assert.strictEqual([].addSorted("1"),0)
        done()
    })
	it("array add sorted [1] for 1", function(done) {
        assert.strictEqual(["1"].addSorted("1"),-0)
        done()
    })
	it("array add sorted [1] for 2", function(done) {
        assert.strictEqual(["1"].addSorted("2"),1)
        done()
    })
	it("array add sorted matches", function(done) {
        assert.strictEqual(["1","2"].addSorted("2"),1)
        assert.strictEqual(["1","2","3"].addSorted("2"),1)
        assert.strictEqual(["1","2","3"].addSorted("3"),2)
        done()
    })
	it("array add sorted misses", function(done) {
        const list=["1","3","5"]
        assert.strictEqual(list.addSorted("0"),0)
        assert.deepStrictEqual(list,["0","1","3","5"])
        assert.strictEqual(list.addSorted("2"),2)
        assert.deepStrictEqual(list,["0","1","2","3","5"])
        assert.strictEqual(["0","1","2","3","5"].addSorted("4"),4)
        assert.strictEqual(list.addSorted("4"),4)
        assert.deepStrictEqual(list,['0',"1","2","3","4","5"])
        done()
    })
	it("array add sorted misses at lend", function(done) {
        assert.strictEqual(["1","3","5"].addSorted("6"),3)
        done()
    })
})
describe('/lib/objectExtensions object', function() {
	it("addList", function(done) {
        const list={}
        list.addList("1",1)
        assert.deepStrictEqual(list,{"1":[1]})
        list.addList("1",2)
        assert.deepStrictEqual(list,{"1":[1,2]})
        list.addList("3",3)
        assert.deepStrictEqual(list,{"1":[1,2],"3":[3]})
        list.addList("2",4)
        assert.deepStrictEqual(list,{"1":[1,2],"3":[3],"2":[4]})
        done()
    })
})
describe('/lib/objectExtensions csvLine', function() {
	it("standard", function(done) {
        assert.deepStrictEqual("".csvLine(),[])
        assert.deepStrictEqual("1".csvLine(),[1])
        assert.deepStrictEqual("1,2".csvLine(),[1,2])
        assert.deepStrictEqual("1,,2".csvLine(),[1,null,2])
        assert.deepStrictEqual("first,,last".csvLine(),["first",null,"last"])
        assert.deepStrictEqual("\"first\",,\"last\"".csvLine(),["first",null,"last"])
        assert.deepStrictEqual("\"first\",\"abc - 123\",\"~!@#$%^&*()_+-=`{}[]:;'|\\ <,>.?/\",\"last\"".csvLine()
                                   ,["first","abc - 123","~!@#$%^&*()_+-=`{}[]:;'|\\ <,>.?/","last"])
        done()
    })
})

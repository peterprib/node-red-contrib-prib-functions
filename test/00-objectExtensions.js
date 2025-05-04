const assert=require('assert');
const should=require("should");
const {coalesce,nullif}=require("../lib/objectExtensions");

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
describe('/lib/objectExtensions number', function() {
	it("isBetween", function(done) {
        assert.deepStrictEqual(Number(1).isBetween(0,1),true)
        assert.deepStrictEqual(Number(0).isBetween(0,1),true)
        assert.deepStrictEqual(Number(-1).isBetween(0,1),false)
        assert.deepStrictEqual(Number(2).isBetween(0,1),false)
        done()
    })
	it("toSimpleArray", function(done) {
        assert.deepStrictEqual({}.toSimpleArray(),[])
        assert.deepStrictEqual({a:1,b:"2"}.toSimpleArray(),[["a",1,"number"],["b","2","string"]])
        done()
    })
	it("toSimpleArrayIgnoreNulls", function(done) {
        assert.deepStrictEqual({}.toSimpleArrayIgnoreNulls(),[])
        assert.deepStrictEqual({a:1,b:"2"}.toSimpleArrayIgnoreNulls(),[["a",1,"number"],["b","2","string"]])
        assert.deepStrictEqual({a:1,b:"2",c:null}.toSimpleArrayIgnoreNulls(),[["a",1,"number"],["b","2","string"]])
        done()
    })
    it("in", function(done) {
        assert.deepStrictEqual("abc".in(),false)
        assert.deepStrictEqual("abc".in("abc"),true)
        assert.deepStrictEqual("abc".in("abc","c"),true)
        assert.deepStrictEqual("abc".in("a","abc","c"),true)
        assert.deepStrictEqual("abc".in("a","no","c"),false)
        done()
    })
    it("startsWithList", function(done) {
        assert.deepStrictEqual("abc".startsWithList("a"),true)
        assert.deepStrictEqual("Abc".startsWithList("a"),false)
        assert.deepStrictEqual("abc".startsWithList("b","ab"),true)
        assert.deepStrictEqual("abc".startsWithList("c"),false)
        done()
    })
    it("startsWithListAnyCase", function(done) {
        assert.deepStrictEqual("abc".startsWithListAnyCase("a"),true)
        assert.deepStrictEqual("Abc".startsWithListAnyCase("a"),true)
        assert.deepStrictEqual("aBc".startsWithListAnyCase("b","ab"),true)
        assert.deepStrictEqual("abc".startsWithListAnyCase("c"),false)
        done()
    })
    it("toAbbreviated", function(done) {
        const test=(n,a)=>{
            const t=n.toAbbreviated()
            console.log(n+" => "+t+" s/be "+a)
            assert.deepStrictEqual(t,a)
        }
        test(0,"0.00")
        test(1,"1.00")
        test(-1,"-1.00")
        test(0.1,"0.10")
        test(1.1234567,"1.12")
        test(1001.0,"1.00K")
        test(-1001.0,"-1.00K")
        test(1011.0,"1.01K")
        test(-1011.0,"-1.01K")
        test(2011000.1,"2.01M")
        test(2011002003,"2.01G")
        test(2011002003004,"2.01T")
        test(2011002003004005,"2.01P")
        done()
    })
    it("xmlStringEncode", function(done) {
        assert.deepStrictEqual("a&c".xmlStringEncode("a"),"a&amp;c")
        assert.deepStrictEqual("a\"c".xmlStringEncode("a"),"a&quot;c")
        assert.deepStrictEqual("a<>c".xmlStringEncode("a"),"a&lt;&gt;c")
        done()
    })
    it("getWord", function(done) {
        assert.deepStrictEqual("".getWord(1),"")
        assert.deepStrictEqual("one two three".getWord(1),"one")
        assert.deepStrictEqual("one two three".getWord(2),"two")
        assert.deepStrictEqual("one two three".getWord(3),"three")
        assert.deepStrictEqual("one two three".getWord(4),"")
        done()
    })
    it("coalesce", function(done) {
        const anull=null,notanull="notnull"
        assert.deepStrictEqual(coalesce(anull,"test"),"test")
        assert.deepStrictEqual(coalesce(notanull,"test"),"notnull")
        done()
    })
    it("nullif", function(done) {
        const anull="test",notanull="notnull"
        assert.deepStrictEqual(nullif(anull,"test"),null)
        assert.deepStrictEqual(nullif(notanull,"test"),"notnull")
        done()
    })
    it("deepClone", function(done) {
        const n=new Number(1)
        const s=new String("astring")
        const a=[s,n,[,s,n]]
        assert.deepStrictEqual({}.deepClone(),{})
        assert.deepStrictEqual([].deepClone(),[])
        assert.deepStrictEqual(n.deepClone(),n)
        assert.deepStrictEqual(s.deepClone(),s)
        assert.deepStrictEqual(a.deepClone(),a)
        done()
    })
    it("rangeLimit", function(done) {
        const test=(type,min,max,value,result)=>{
            const typedValue=new type(value)
            assert.deepStrictEqual(typedValue.rangeLimit(new type(min),new type(max)),new type(result))
        }
        test(Number,2,4,1,2)
        test(Number,2,4,2,2)
        test(Number,2,4,3,3)
        test(Number,2,4,4,4)
        test(Number,2,4,5,4)

        const test2=(type,min,max,value,result)=>{
            const typedValue=type(value)
            const typedResult=type(result)
            const typedMin=type(min)
            const typeMax=type(max)
            assert.equal(typedValue.rangeLimit(typedMin,typeMax),typedResult)
        }

        test2(BigInt,2,4,1,2)
        test2(BigInt,2,4,2,2)
        test2(BigInt,2,4,3,3)
        test2(BigInt,2,4,4,4)

        test2(Date,"2/2/2022","4/2/2022","1/2/2022","2/2/2022")
        test2(Date,"2/2/2022","4/2/2022","2/2/2022","2/2/2022")
        test2(Date,"2/2/2022","4/2/2022","3/2/2022","3/2/2022")
        test2(Date,"2/2/2022","4/2/2022","4/2/2022","4/2/2022")
        test2(Date,"2/2/2022","4/2/2022","5/2/2022","4/2/2022")

        test2(String,"bb","bcd","aa","bb")
        test2(String,"bb","bcd","bb","bb")
        test2(String,"bb","bcd","bc","bc")
        test2(String,"bb","bcd","bcd","bcd")
        test2(String,"bb","bcd","bce","bcd")
        done()
    })
    it("capitalize", function(done) {
        assert.equal("".capitalize(),"")
        assert.equal("abc".capitalize(),"Abc")
        assert.equal("aBcd".capitalize(),"ABcd")
        done()
    })
    it("toTitle", function(done) {
        assert.equal("".toTitle(),"")
        assert.equal("abc".toTitle(),"Abc")
        assert.equal("aBcd".toTitle(),"ABcd")
        assert.equal("aBcd def".toTitle(),"ABcd Def")
        done()
    })
    it("toTitleGrammatical", function(done) {
        assert.equal("to be or not to be".toTitleGrammatical(),"To Be or Not to Be")
        assert.equal("a small dog".toTitleGrammatical(),"A Small Dog")
        done()
    })
    it("deunderscore", function(done) {
        assert.equal("abc_def_".deunderscore(),"abc def ")
        done()
    })
    it("deunderscoreCapitilize", function(done) {
        assert.equal(" abc_def_".deunderscoreCapitilize()," Abc Def ")
        done()
    })
    it("dropSquareBracketPrefix", function(done) {
        assert.equal("[abc] def".dropSquareBracketPrefix(),"def")
        done()
    })
})
describe('/lib/objectExtensions string', function() {
	it("isBetween", function(done) {
        assert.deepStrictEqual("a".isBetween("b","de"),false)
        assert.deepStrictEqual("f".isBetween("b","de"),false)
        assert.deepStrictEqual("b".isBetween("b","de"),true)
        assert.deepStrictEqual("c".isBetween("b","de"),true)
        assert.deepStrictEqual("d".isBetween("b","de"),true)
        assert.deepStrictEqual("de".isBetween("b","de"),true)
        assert.deepStrictEqual("df".isBetween("b","de"),false)
        done()
    })
})
describe('/lib/objectExtensions Date', function() {
	it("isBetween", function(done) {
        const aDate=new Date("2025/05/02")
        assert.deepStrictEqual(aDate.isBetween("2025/05/01","2025/05/03"),true)
        assert.deepStrictEqual(aDate.isBetween(new Date("2025/05/01"),new Date("2025/05/03")),true)
        assert.deepStrictEqual(aDate.isBetween("2025/05/02","2025/05/03"),true)
        assert.deepStrictEqual(aDate.isBetween("2025/05/01","2025/05/02"),true)
        assert.deepStrictEqual(aDate.isBetween("2025/04/01","2025/05/01"),false)
        assert.deepStrictEqual(aDate.isBetween("2025/05/03","2025/06/01"),false)
        done()
    })
})

const assert=require('assert');
const should=require("should");
require("../dataAnalysis/arrayForEachRange.js");

describe('arrayForEachRange', function(){
	it("array partial", function(done){
		[1,2,3,4].forEachRange(2,3,(v,i,a)=>console.log(v));
		done();
	});
});	

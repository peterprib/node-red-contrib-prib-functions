const assert=require('assert');
const should=require("should");
const m2x2=[[11,12],[21,22]]
const m2x3=[[11,12,13],[21,22,23]]

describe('generatedVectorFunction', function(){
	const generateVectorFunction=require("../dataAnalysis/generateVectorFunction.js");
	it("error gen", function(done){
		assert.throws(()=>generateVectorFunction({
			code:"=a deliberate error in test",
			args:["arg1,arg2"]
		}),Error("code failed"))
		done();
	});
	it("for each", function(done){
		const forEach=generateVectorFunction({
			code:"vector[index]+=(index+1)*10",
			args:["arg1,arg2"]
		})
		const vector=[1,2,3,4]
		forEach(vector)
		assert.deepEqual(vector,[11,22,33,44])
		done();
	});
	it("for each range", function(done){
		const forEach=generateVectorFunction({code:"vector[index]+=(index+1)*10"})
		const vector=[1,2,3,4]
		forEach(vector,1,2)
		assert.deepEqual(vector,[1,22,33,4])
		done();
	});
	it("sumVector", function(done){
		const sumVector=generateVectorFunction({code:"returnValue+=vector[index]",args:[],returnValue:0})
		const vector=[1,2,3,4]
		assert.deepEqual(sumVector(vector),1+2+3+4)
		done();
	});
	it("sumVector range", function(done){
		const sumVector=generateVectorFunction({code:"returnValue+=vector[index]",returnValue:10})
		const vector=[1,2,3,4]
		assert.deepEqual(sumVector(vector,1,2,20),20+2+3)
		done();
	});
	it("mapVector range", function(done){
		const mapVector=generateVectorFunction({
			code:"returnValue[index-startOffset]=vector[index]",
			args:["dataType=Array"],
			returnValue:"new dataType(1+endOffset-startOffset)"
		})
		const vector=[1,2,3,4]
		assert.deepEqual(mapVector(vector,Array,1,2),[2,3])
		done();
	});
	it("mapVector range Float32Array", function(done){
		const mapVector=generateVectorFunction({
			code:"returnValue[index-startOffset]=vector[index]",
			args:["dataType=Array"],returnValue:"new dataType(1+endOffset-startOffset)"
		})
		const vector=[1,2,3,4]
		assert.deepEqual(mapVector(vector,Float32Array,1,2),new Float32Array([2,3]))
		done();
	});
});	
describe('generateMatrixFunction', function(){
	const generateMatrixFunction=require("../dataAnalysis/generateMatrixFunction.js")
	const breakLogic="\nconsole.log({loop:loop});if(--loop<0) throw Error('break loop');\n"
	const debugScript="console.log({rowOffset:rowOffset,rowEndOffset:rowEndOffset});"+
			"console.log({columnOffset:columnOffset,columnEndOffset:columnEndOffset});"+
			"console.log({elementOffset:elementOffset,matrixEndOffset:matrixEndOffset,element:element});"
	it("error gen", function(done){
		assert.throws(()=>generateMatrixFunction({
				code:"=a deliberate error in test ",
				args:["arg1,arg2"]
			}),Error("code failed"))
		done();
	});
	it("for each", function(done){
		const forEach=generateMatrixFunction({
			code:"row[columnOffset]=rowOffset*10+columnOffset"+breakLogic,
			args:["loop=111"],
			debug:true
		})
		const vector=[[1,2],[3,4]]
		forEach(vector)
		assert.deepEqual(vector,[[0,1],[10,11]])
		done();
	});
	it("for each setElement", function(done){
		const forEach=generateMatrixFunction({
			code:"setElement(rowOffset*10+columnOffset)"
		})
		const vector=[[1,2],[3,4]]
		forEach(vector)
		assert.deepEqual(vector,[[0,1],[10,11]])
		done();
	});
	it("for each vector", function(done){
		const forEach=generateMatrixFunction({
			code:"matrix[elementOffset]=rowOffset*10+columnOffset"+breakLogic,
			args:["loop=111"],
			debug:true
		})
		const vector=new Float32Array([1,2,3,4,5,6])
		try{
			forEach(vector,3,2)
		} catch(ex){
			console.error("error: "+ex.message)
			console.error(ex.stack)
			console.error(forEach.toString())
			done("failed")
		}
		assert.deepEqual(vector,new Float32Array([0,1,10,11,20,21]))
		done();
	});
	it("for each vector range row 1:1", function(done){
		const forEach=generateMatrixFunction({
			code:"matrix[elementOffset]=rowOffset*10+columnOffset"+breakLogic,
			args:["loop=111"],
			debug:true
		})
		const vector=new Float32Array([1,2,3,4,5,6])
		forEach(vector,3,2,111,1,1)
		assert.deepEqual(vector,new Float32Array([1,2,10,11,5,6]))
		done();
	});
	it("for each vector range row 1:1 assign", function(done){
		const forEach=generateMatrixFunction({
			code:"matrix[elementOffset]=rowOffset*10+columnOffset"+breakLogic,
			args:["loop=111"],
			debug:true});
		const vector=new Float32Array([1,2,3,4,5,6])
		forEach(vector,3,2,111,1,1)
		assert.deepEqual(vector,new Float32Array([1,2,10,11,5,6]))
		done();
	});
	it("for each vector", function(done){
		const forEach=generateMatrixFunction({
			code:"console.log(matrix);setElement(rowOffset*10+columnOffset);console.log(matrix)"
		})
		const vector=new Float32Array([1,2,3,4,5,6])
		forEach(vector,3,2)
		assert.deepEqual(vector,new Float32Array([0,1,10,11,20,21]))
		done();
	});
});	

describe('sum', function(){
	require("../dataAnalysis/arraySum.js");
	it("array 1 to 4", function(done){
		assert.deepEqual([1,2,3,4].sum(),1+2+3+4)
		done();
	});
	it("array 2 to 4", function(done){
		assert.deepEqual([1,2,3,4].sum(1),2+3+4)
		done();
	});
	it("array 2 to 3", function(done){
		assert.deepEqual([1,2,3,4].sum(1,2),2+3)
		done();
	});
});	
describe('sumSquared', function(){
	require("../dataAnalysis/arraySumSquared.js");
	it("array 1 to 4", function(done){
		assert.deepEqual([1,2,3,4].sumSquared(),1**2+2**2+3**2+4**2)
		done();
	});
	it("array 2 to 4", function(done){
		assert.deepEqual([1,2,3,4].sumSquared(1),2**2+3**2+4**2)
		done();
	});
	it("array 2 to 3", function(done){
		assert.deepEqual([1,2,3,4].sumSquared(1,2),2**2+3**2)
		done();
	});
});	
describe('product', function(){
	require("../dataAnalysis/arrayProduct.js");
	it("array 1 to 4", function(done){
		assert.deepEqual([1,2,3,4].product(),1*2*3*4)
		done();
	});
	it("array 2 to 4", function(done){
		assert.deepEqual([1,2,3,4].product(1),2*3*4)
		done();
	});
	it("array 2 to 3", function(done){
		assert.deepEqual([1,2,3,4].product(1,2),2*3)
		done();
	});
});	
describe('arrayDifference', function(){
	require("../dataAnalysis/arrayDifference.js");
	it("empty", function(done){
		const result=[].difference();
		console.log(result)
		assert.deepEqual(result,[])
		done();
	});
	it("1 value", function(done){
		const result=[1].difference();
		console.log(result)
		assert.deepEqual(result,[])
		done();
	});
	it("zero", function(done){
		const result=[1,1,1,1,1].difference();
		console.log(result)
		assert.deepEqual(result,[0,0,0,0])
		done();
	});
	it("equal 1", function(done){
		const result=[0,1,2,3,4].difference();
		console.log(result)
		assert.deepEqual(result,[1,1,1,1])
		done();
	});
	it("variance", function(done){
		const result=[0,0,1,3,6].difference();
		console.log(result)
		assert.deepEqual(result,[0,1,2,3])
		done();
	});
});
describe('arrayDifferenceSecondOrder', function(){
	require("../dataAnalysis/arrayDifferenceSecondOrder.js");
	it("empty", function(done){
		const result=[].differenceSecondOrder();
		console.log(result)
		assert.deepEqual(result,[])
		done();
	});
	it("1 value", function(done){
		const result=[1].differenceSecondOrder();
		console.log(result)
		assert.deepEqual(result,[])
		done();
	});
	it("2 values", function(done){
		const result=[1,2].differenceSecondOrder();
		console.log(result)
		assert.deepEqual(result,[])
		done();
	});
	it("zero", function(done){
		const result=[1,1,1].differenceSecondOrder();
		console.log(result)
		assert.deepEqual(result,[1-1-1+1]) //[0]
		done();
	});
	it("zero x 2", function(done){
		const result=[1,1,1,1].differenceSecondOrder();
		console.log(result)
		assert.deepEqual(result,[0,0])
		done();
	});
	it("one", function(done){
		const result=[0,1,2].differenceSecondOrder();
		console.log(result)
		assert.deepEqual(result,[(0-1)-(1-2)]) 
		done();
	});
	it("one x 2", function(done){
		const result=[0,1,2,3].differenceSecondOrder();
		console.log(result)
		assert.deepEqual(result,[(0-1)-(1-2),(1-2)-(2-3)])
		done();
	});
	it("variance", function(done){
		const result=[1,2,3,5,9].differenceSecondOrder();
		console.log(result)
		assert.deepEqual(result,[(1-2)-(2-3),(2-3)-(3-5),(3-5)-(5-9)]) 
		done();
	});
	it("differenceSecondOrder=difference(1)", function(done){
		const result1=[1,2,3,5,9].differenceSecondOrder();
		const result2=[1,2,3,5,9].difference(1);
		console.log(result1,result2)
		assert.deepEqual(result1,result2) 
		done();
	});
});
describe('arrayDifferenceSeasonal', function(){
	require("../dataAnalysis/arrayDifferenceSeasonal.js");
	it("value=[]", function(done){
		const result=[].differenceSeasonal();
		assert.deepEqual(result,[])
		const result1=[].differenceSeasonal(2);
		assert.deepEqual(result1,[])
		const result11=[].differenceSeasonal(1,1);
		assert.deepEqual(result11,[])
		done();
	});
	it("value=[1]", function(done){
		const v=[1]
		const result=v.differenceSeasonal();
		assert.deepEqual(result,[])
		const result1=v.differenceSeasonal(2);
		assert.deepEqual(result1,[])
		const result11=v.differenceSeasonal(1,1);
		assert.deepEqual(result11,[])
		done();
	});
	it("value=[1,2]", function(done){
		const v=[1,2]
		const result=v.differenceSeasonal();
		assert.deepEqual(result,[1])
		const result1=v.differenceSeasonal(2);
		assert.deepEqual(result1,[])
		const result11=v.differenceSeasonal(1,1);
		assert.deepEqual(result11,[])
		done();
	});
	it("value=[1,2,3,1,2,3] lag 3", function(done){
		const v=[1,2,3,1,2,3]
		const result=v.differenceSeasonal(3);
		assert.deepEqual(result,[0,0,0])
		done();
	});
	it("value=[1,2,3,2,3,4] lag 3", function(done){
		const v=[1,2,3,2,3,4]
		const result=v.differenceSeasonal(3);
		assert.deepEqual(result,[1,1,1])
		done();
	});
});
describe('arrayForEachRange', function(){
	require("../dataAnalysis/arrayForEachRange.js");
	it("array 2 to 3", function(done){
		const result=[];
		[0,1,2,3,4].forEachRange(2,3,(v,i,a)=>result.push(v));
		assert.deepEqual(result,[2,3])
		done();
	});
	it("array 3 to 2", function(done){
		const result=[];
		[0,1,2,3,4].forEachRange(3,2,(v,i,a)=>result.push(v));
		assert.deepEqual(result,[3,2])
		done();
	});
	it("array ", function(done){
		const result=[];
		[0,1,2,3,4].forEachRange(2,3,(v,i,a)=>result.push(v));
		assert.deepEqual(result,[2,3])
		done();
	});
});	
describe('arrayReduceRange', function(){
	require("../dataAnalysis/arrayReduceRange.js");
	it("array 3", function(done){
		const result=[0,1,2,3,4].reduceRange(3,3,(a,value,i,vector)=>a+value);
		assert.deepEqual(result,3)
		done();
	});
	it("array ", function(done){
		const result=[0,1,2,3,4].reduceRange(2,3,(a,value,i,vector)=>a+value);
		assert.deepEqual(result,2+3)
		done();
	});
});
describe('arrayRandom', function(){
	require("../dataAnalysis/arrayRandom.js");
	it("array 3", function(done){
		const result=[0,1,2,3,4].random();
		console.log(result)
		assert.notDeepEqual(result,[0,1,2,3,4])
		done();
	});
});	
describe('arraySwap', function(){
	require("../dataAnalysis/arraySwap.js");
	it("array 2 to 3", function(done){
		const result=[];
		[0,1,2,3,4].swap(2,3);
		assert.deepEqual([0,1,2,3,4].swap(2,3),[0,1,3,2,4])
		done();
	});
});	
describe('arrayScale', function(){
	require("../dataAnalysis/arrayScale.js");
	it("array all", function(done){
		const result=[];
		[0,1,2,3,4].scale(2);
		assert.deepEqual([0,1,2,3,4].scale(2),[0,1*2,2*2,3*2,4*2])
		done();
	});
	it("array 1,2", function(done){
		const result=[];
		[0,1,2,3,4].scale(2);
		assert.deepEqual([0,1,2,3,4].scale(2,1,2),[0,1*2,2*2,3,4])
		done();
	});
});	
describe('arrayCompareToPrecision', function(){
	require("../dataAnalysis/arrayCompareToPrecision.js");
	const arrayl=[0.12];
	const array1=[0.12,1.123];
	const array2=[0.12,1.124];
	it("length mismatch", function(done){
		assert.throws(()=>arrayl.compareToPrecision(array1,2))
		done();
	});
	it("vector precision 2", function(done){
		assert.doesNotThrow(()=>array1.compareToPrecision(array2,2))
		done();
	});
	it("vector precision 3", function(done){
		assert.throws(()=>array1.compareToPrecision(array2,4))
		done();
	});
});	
describe('arrayCompareToPrecision Float', function(){
	require("../dataAnalysis/arrayCompareToPrecision.js");
	const arrayl=new Float32Array([0.12]);
	const array1=new Float32Array([0.12,1.123]);
	const array2=new Float32Array([0.12,1.125]);
	it("length mismatch", function(done){
		assert.throws(()=>arrayl.compareToPrecision(array1,2))
		done();
	});
	it("vector precision 2", function(done){
		assert.doesNotThrow(()=>array1.compareToPrecision(array2,2))
		done();
	});
	it("vector precision 3", function(done){
		assert.throws(()=>array1.compareToPrecision(array2,3))
		done();
	});
});	
describe('pca', function(){
	const PCA=require("../dataAnalysis/pca.js");
	const pca=new PCA();
	it("getMatrix", function(done){
		assert.equal(JSON.stringify(pca.getMatrix(2,2,1)),"[[1,1],[1,1]]")
		done();
	})
	it("multipe ", function(done){
		assert.equal(JSON.stringify(pca.multiply([[1,2],[3,4],[5,1]],[[2],[4]]))
			,JSON.stringify([[10],[22],[14]]));
		done();
	})
	it("transpose ", function(done){
		assert.equal(JSON.stringify(pca.transpose([[1,2],[3,4],[5,1]],[[2],[4]]))
			,JSON.stringify([[1,3,5],[2,4,1]]));
		done();
	})
	it("x 1 matrices", function(done){
		assert.equal(JSON.stringify(pca.multiply(m2x2,pca.getMatrix(2,1,1))),JSON.stringify([[23],[43]]));
		assert.equal(JSON.stringify(pca.multiply(m2x2,pca.getMatrix(2,2,1))),JSON.stringify([[23,23],[43,43]]));
		assert.equal(JSON.stringify(pca.multiply(m2x3,pca.getMatrix(3,3,1))),JSON.stringify([[36,36,36],[66,66,66]]));
		done();
	})
	const generateVectorFunction=require("../dataAnalysis/generateVectorFunction.js");
	const generateMatrixFunction=require("../dataAnalysis/generateMatrixFunction.js");

	it("multiplyMatrix", function(done){
		const sumVector=generateVectorFunction({
			code:"returnValue+=vector[index]*matrix[index][column]; console.log({row:index,column:column,returnValue:returnValue})",
			args:["matrix","column"],
			returnValue:"0"
		})
		const multiplyMatrix=generateMatrixFunction({
			code:"setElement(sumVector(element,bMatrix,columnOffset));",
			args:["bMatrix"],
			sumVector:sumVector,
			returnValue:"()=>getMatrix()"
		})
		const matrix=[[1,2],[3,4],[5,6]];
		console.log(multiplyMatrix(matrix,3,2,[[1,1],[1,1]]));
		done();
	})
});

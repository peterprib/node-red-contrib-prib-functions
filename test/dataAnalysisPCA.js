const assert=require('assert');
const should=require("should");
require("../dataAnalysis/arrayCompareToPrecision.js");
const PCA=require("../dataAnalysis/pca.js");
const pca=new PCA();

const m2x2=[[11,12],[21,22]]
const m2x3=[[11,12,13],[21,22,23]]

describe('pca', function(){
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
	it("getEigenVectors", function(done){
		const data = [[40,50,60],[50,70,60],[80,70,90],[50,60,80]];
		const expected=
 [{
     "eigenvalue": 520.0992658908312,
     "vector": [0.744899700771276, 0.2849796479974595, 0.6032503924724023]
 }, {
     "eigenvalue": 78.10455398035167,
     "vector": [0.2313199078283626, 0.7377809866160473, -0.6341689964277106]
 }, {
     "eigenvalue": 18.462846795484058,
     "vector": [0.6257919271076777, -0.6119361208615616, -0.4836513702572988]
 }];
		const expectedEigenvalues=expected.map(element=>element.eigenvalue);
		const expectedVectors=expected.map(element=>element.vector);
		const result = pca.getEigenVectors(data);
 		console.log(result);
		const eigenvalues=result.map(element=>element.eigenvalue);
		const vectors=result.map(element=>element.vector);
		expectedEigenvalues.compareToPrecision(eigenvalues,6);
		expectedVectors.compareToPrecision(vectors,6);
		done();
	});
});	

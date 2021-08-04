const assert=require('assert');
const should=require("should");
const ed=require("../dataAnalysis/euclideanDistance.js");
require("../dataAnalysis/forNestedEach");

describe('euclideanDistance', function() { 
	it("array forNestedEach", function(done) {
		const atest=[1,2,3,4];
		atest.forNestedEach((e,i,a,l)=>e="a",{0:[2]})
		assert.deepEqual(atest,[ 1, 2, 3, 4 ])
		atest.forNestedEach((e,i,a,l)=>a[i]="a",{0:[2]})
		assert.deepEqual(atest,[ 1, 2, 'a', 4 ]);
		const atest1=[[11,12],[21,22],[31,32],[41,42]];
		atest1.forNestedEach((e,i,a,l)=>a[i]="a",{0:[0,4]})
		assert.deepEqual(atest1 ,[ [ 'a', 'a' ], [ 21, 22 ], [ 31, 32 ], [ 41, 42 ] ])
		done()
	});
	it("array pairs", function(done) {
		assert.strictEqual([].pairs().length,0)
		assert.strictEqual([1].pairs().length,0)
		assert.deepEqual([1,2].pairs(null),[[1,2,0,1]])
		assert.deepEqual([1,2,3].pairs(null),[[1,2,0,1],[1,3,0,2],[2,3,1,2]])
		assert.deepEqual([1,2,3,4].pairs(null),[[1,2,0,1],[1,3,0,2],[1,4,0,3],[2,3,1,2],[2,4,1,3],[3,4,2,3]])
		assert.deepEqual([1,2,3,4].pairs(),[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]])
		assert.deepEqual([[1,2],[3,4]].pairs(),[[[1,2],[3,4]]])
		done()
	});
	it("distance 1d", function(done) {
		assert.strictEqual(ed.distance([],[]),			NaN);
		assert.strictEqual(ed.distance([0],[0]),		0);
		assert.strictEqual(ed.distance([0],[1]),		1);
		assert.strictEqual(ed.distance([0],[-1]),		1);
		assert.strictEqual(ed.distance([1],[0]),		1);
		assert.strictEqual(ed.distance([-1],[0]),		1);
		assert.strictEqual(ed.distance([1],[2]),		1);
		assert.strictEqual(ed.distance([2],[1]),		1);
		assert.strictEqual(ed.distance([2],[4]),		2);
		done()
	});
	it("distance 2d", function(done) {
		assert.strictEqual(ed.distance([0,0],[0,0])	,0);
		assert.strictEqual(ed.distance([0,0],[1,0])	,1);
		assert.strictEqual(ed.distance([0,0],[0,1])	,1);
		assert.strictEqual(ed.distance([0,0],[1,1])	,Math.sqrt(1+1));
		assert.strictEqual(ed.distance([1,0],[0,0])	,1);
		assert.strictEqual(ed.distance([0,1],[0,0])	,1);
		assert.strictEqual(ed.distance([1,1],[0,0])	,Math.sqrt(1+1));
		assert.strictEqual(ed.distance([-1,1],[0,0])	,Math.sqrt(1+1));
		assert.strictEqual(ed.distance([-1,-1],[0,0])	,Math.sqrt(1+1));
		assert.strictEqual(ed.distance([1,1],[2,2]),	Math.sqrt(1+1));
		assert.strictEqual(ed.distance([0,1],[2,2]),	Math.sqrt(2*2+1));
		assert.strictEqual(ed.distance([0,0],[2,3]),	Math.sqrt(2*2+3*3));
		done()
	});
	it("distance 3d", function(done) {
		assert.strictEqual(ed.distance([0,0],[0,0]),	0);
		assert.strictEqual(ed.distance([1,1,1],[2,2,2]), Math.sqrt(1+1+1));
		assert.strictEqual(ed.distance([1,1,2],[2,0,4]), Math.sqrt(1+1+2*2));
		assert.strictEqual(ed.distance([0,-1,-2],[0,1,2]), Math.sqrt(0+2*2+4*4));
		done()
	});
	it("distanceColumns 1d", function(done) {
		assert.strictEqual(ed.distanceColumns(),	0);
		assert.strictEqual(ed.distanceColumns([1,2,3],[1,2,3]),	0);
		assert.strictEqual(ed.distanceColumns([1,2,3],[1,2,3],[]),	0);
		assert.strictEqual(ed.distanceColumns([0,0,0],[1,2,3],[0]),	1);
		assert.strictEqual(ed.distanceColumns([0,0,0],[1,2,3],[0,1]),	Math.sqrt(1+2*2));
		assert.strictEqual(ed.distanceColumns([0,0,0],[1,2,3],[0,1,2]),	Math.sqrt(1+2*2+3*3));
		done()
	});
	it("distances 1d", function(done) {
		assert.deepEqual(ed.distances([[1],[2],[3],[4]]),  [[1,0,1],[2,0,2],[3,0,3],[1,1,2],[2,1,3],[1,2,3]]  );
		assert.deepEqual(ed.distances([ [1,2,3,4],	[11,12,13,14],	[111,112,113,114]	]), 	[[20,0,1],[220,0,2],[200,1,2]]);
		done()
	});
	it("distancesColumns 1d", function(done) {
		assert.deepEqual(ed.distancesColumns([["d",1],["d",2],["d",3],["d",4]],[1]),  [[1,0,1],[2,0,2],[3,0,3],[1,1,2],[2,1,3],[1,2,3]]  );
		assert.deepEqual(ed.distancesColumns([	["d",1,2,3,4],	["d",11,12,13,14],	["d",111,112,113,114]	], [1,2,3,4]), [[20,0,1],[220,0,2],[200,1,2]]);
		done()
	}); 
	it("minDistance 1d", function(done) {
		assert.deepEqual(ed.minDistances([ [1],	[2],[3],[4]	]), [{distance:1,points:[[1],[2]],index:[0,1]},{distance:1,points:[[2],[3]],index:[1,2]},{distance:1,points:[[3],[4]],index:[2,3]}]);
		assert.deepEqual(ed.minDistances([ [4],	[3],[2],[1]	]), [{distance:1,points:[[4],[3]],index:[0,1]},{distance:1,points:[[3],[2]],index:[1,2]},{distance:1,points:[[2],[1]],index:[2,3]}]);
		done()
	});
	it("maxDistance 1d", function(done) {
		assert.deepEqual(ed.maxDistances([ [1],[2],[3],	[4]]),  [{distance:3,points:[[1],[4]],index:[0,3]}]);
		done()
	});
	it("maxDistance 2d", function(done) {
		assert.deepEqual(ed.maxDistances([ [1,1],[2,2],[3,3],[4,5]]),  [{distance:5,points:[[1,1],[4,5]],index:[0,3]}]);
		done()
	});
	it("maxDistance Columns", function(done) {
		assert.deepEqual(ed.maxDistances([ [1,1,"d"],[2,2,"d"],[3,3,"d"],[4,5,"d"]],[0,1]),  [{distance:5,points:[[1,1,"d"],[4,5,"d"]],index:[0,3]}]);
		done()
	});

});	

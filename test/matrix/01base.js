const assert=require('assert');
const Matrix=require("../../matrix/matrix");
describe("matrix 01base", function() {
	it('create no rows', function(done) {
		assert.throws(()=>new Matrix(),Error)
		assert.throws(()=>new Matrix(2),Error)
		assert.throws(()=>new Matrix({rows:2}),Error("columns not specified"))
		assert.throws(()=>new Matrix([]),Error)
		assert.throws(()=>new Matrix([1,2,4]),Error)
		assert.throws(()=>new Matrix([[]]),Error)
		done();
	});
	it('create 2,3', function(done) {
		const m=new Matrix(2,3); 
		assert.strictEqual(m.rows,2);
		assert.strictEqual(m.columns,3);
		assert.strictEqual(m.size,6);
		done();
	});
	it('create {rows:2,columns:3} ', function(done) {
		const m=new Matrix({rows:2,columns:3}); 
		assert.strictEqual(m.rows,2);
		assert.strictEqual(m.columns,3);
		assert.strictEqual(m.size,6);
		done();
	});
	it('getIndex', function(done) {
		const m=new Matrix({rows:2,columns:3}); 
		assert.strictEqual(m.getIndex(0,0),0);
		assert.strictEqual(m.getIndex(0,1),1);
		assert.strictEqual(m.getIndex(1,1),4);
		assert.strictEqual(m.getIndex(1,2),5);
		done();
	});
	it('equalsNearlyValues', function(done) {
		const m=new Matrix({rows:2,columns:3});
		assert.throws(()=>m.equalsNearlyValues(1,0))
		assert.throws(()=>m.equalsNearlyValues(0,1))
		assert.doesNotThrow(()=>m.equalsNearlyValues(0,0));
		assert.doesNotThrow(()=>m.equalsNearlyValues(1,1));
		assert.throws(()=>m.equalsNearlyValues(1,1.00001));
		assert.doesNotThrow(()=>m.equalsNearlyValues(1,1.00001,2));
		assert.throws(()=>m.equalsNearlyValues(1.000001,1));
		assert.doesNotThrow(()=>m.equalsNearlyValues(1.000001,1,2));
		assert.doesNotThrow(()=>m.equalsNearlyVector([0,0,0,0,0,0]));
		assert.throws(()=>m.equalsNearlyVector([1,2,3,4,5,6]));
		done();
	});
	it('fill', function(done) {
		const m=new Matrix({rows:2,columns:3});
		m.fill(1,0,2) 
		assert.doesNotThrow(()=>m.equalsNearlyVector([1,1,0,0,0,0]));
		m.fill(3,3,6) 
		assert.doesNotThrow(()=>m.equalsNearlyVector([1,1,0,3,3,3]));
		done();
	});
	it('setRow', function(done) {
		const m=new Matrix({rows:2,columns:3});
		m.setRow([1,2,3],1) 
		assert.doesNotThrow(()=>m.equalsNearlyVector([0,0,0,1,2,3]));
		done();
	});
	it('forEachCell', function(done) {
		const m=new Matrix([[00,01,02],[10,11,12]]); 
		m.forEachCell((v,r,c)=>assert.strictEqual(v,r*10+c));
		done();
	});
	it('getRow', function(done) {
		const m=new Matrix([[00,01,02],[10,11,12],[20,21,22]]);
		assert.deepEqual(m.getRow(1),new Float32Array([10,11,12]));
		done();
	});
	it('addRow', function(done) {
		const m=new Matrix({rows:2,columns:3}); //create a full zeroed
		m.addRow([00,01,02]);
		assert.doesNotThrow(()=>m.equalsNearlyVector(new Float32Array([0,0,0,0,1,2])));
		m.addRow([10,11,12]);
		assert.doesNotThrow(()=>m.equalsNearlyVector(new Float32Array([0,01,02,10,11,12])));
		m.addRow([20,21,22]);
		assert.doesNotThrow(()=>m.equalsNearlyVector(new Float32Array([10,11,12,20,21,22])));
		done();
	});
	it('addRow start empty', function(done) {
		const m=new Matrix({columns:3,rowsMax:2}); //create a full zeroed
		m.addRow([00,01,02]);
		assert.doesNotThrow(()=>m.equalsNearly([[0,1,2]]));
		m.addRow([10,11,12]);
		assert.doesNotThrow(()=>m.equalsNearly([[0,1,2],[10,11,12]]));
		m.addRow([20,21,22]);
		assert.doesNotThrow(()=>m.equalsNearly([[10,11,12],[20,21,22]]));
		done();
	});
	it('create with array', function(done) {
		const m=new Matrix([[00,01,02],[10,11,12]]); 
		assert.strictEqual(m.rows,2);
		assert.strictEqual(m.columns,3);
		assert.strictEqual(m.size,6);
		assert.doesNotThrow(()=>m.equalsNearlyVector(new Float32Array([00,01,02,10,11,12])));
		done();
	});
	it('reduceRow + sumRow', function(done) {
		const m=new Matrix([[00,01,02],[10,11,12]]);
		assert.strictEqual(m.sumRow(0),3);
		assert.strictEqual(m.sumRow(1),33);
		done();
	});
	it('set', function(done) {
		const m=new Matrix([[00,01,02],[10,11,12],[20,21,22]]);
		m.set(0,0,-1);
		m.set(1,1,-11);
		m.set(2,2,-22);
		assert.doesNotThrow(()=>m.equalsNearly([[-1,01,02],[10,-11,12],[20,21,-22]]));
		done();
	});
	it('toArray', function(done) {
		const a=[[0,1,2],[10,11,12]];
		const m=new Matrix(a);
		assert.deepEqual(m.toArray(),a);
		done();
	});
	it('multiply', function(done) {
		const left=new Matrix([[1,0,1],[2,1,1],[0,1,1],[1,1,2]]);
		const right=new Matrix([[1,2,1],[2,3,1],[4,2,2]]);
		const result=left.multiply(right);
		assert.deepEqual(result.toArray(),[[5,4,3],[8,9,5],[6,5,3],[11,9,6]])
		done();
	});
	it('transpose', function(done) {
		const m=new Matrix([[00,01,02],[10,11,12]]);
		assert.deepEqual(m.transpose().toArray(),[[00,10],[01,11],[02,12]])
		done();
	});
	it('swapRows', function(done) {
		const m=new Matrix([[00,01],[10,11],[20,21],[30,31]]);
		assert.deepEqual(m.swapRows(1,2).toArray(),[[00,01],[20,21],[10,11],[30,31]])
		done();
	});
	it('multiplyRow', function(done) {
		const m=new Matrix([[00,01],[10,11],[20,21],[30,31]]);
		assert.deepEqual(m.multiplyRow(1,2).toArray(),[[00,01],[20,22],[20,21],[30,31]])
		done();
	});
	it('addRow2Row', function(done) {
		const m=new Matrix([[00,01],[10,11],[20,21],[30,31]]);
		assert.deepEqual(m.addRow2Row(1,2,2).toArray(),[[00,01],[10,11],[40,43],[30,31]])
		done();
	});
	it('add', function(done) {
		const expect=[[00,02],[20,22],[40,42],[60,62]];
		const m=new Matrix([[00,01],[10,11],[20,21],[30,31]]);
		assert.deepEqual(m.add([[00,01],[10,11],[20,21],[30,31]]).toArray(),expect)
		const m1=new Matrix([[00,01],[10,11],[20,21],[30,31]]);
		assert.deepEqual(m1.add(m1).toArray(),expect)
		done();
	});
	it('substract', function(done) {
		const m=new Matrix([[00,01],[10,11],[20,21],[30,31]]);
		assert.deepEqual(m.substract([[00,01],[10,11],[20,21],[30,31]]).toArray(),[[0,0],[0,0],[0,0],[0,0]])
		const m1=new Matrix([[00,01],[10,11],[20,21],[30,31]]);
		assert.deepEqual(m1.substract(m1).toArray(),[[0,0],[0,0],[0,0],[0,0]])
		done();
	});
	it('identity', function(done) {
		const m=new Matrix([[00,01,02],[10,11,12],[20,21,22]]);
		assert.deepEqual(m.getIdentity().toArray(),[[1,0,0],[0,1,0],[0,0,1]]);
		done();
	});
	it('getMatrix', function(done) {
		const m=new Matrix([[00,01,02],[10,11,12],[20,21,22]]);
		assert.deepEqual(m.getMatrix(1,1,2,2).toArray(),[[11,12],[21,22]]);
		done();
	});
	it('getGaussJordanInverse', function(done) {
		const m=new Matrix([[1,2,-2],[-1,1,-2],[3,2,1]]);
		assert.deepEqual(m.getGaussJordanInverse().toArray(),[[1,2,1],[-6/5,7/5,4/5],[-2/5,4/5,3/5]]);
		done();
	});
});
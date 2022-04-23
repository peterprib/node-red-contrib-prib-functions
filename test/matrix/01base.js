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
});
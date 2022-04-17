const assert=require('assert');
const Matrix=require("../../matrix/matrix");
describe("matrix 01base", function() {
	it('create', function(done) {
		assert.throws(()=>new Matrix(),Error)
		assert.throws(()=>new Matrix(2),Error)
		assert.throws(()=>new Matrix({rows:2}),Error("columns not specified"))
		const m=new Matrix(2,3); 
		assert.strictEqual(m.rows,2);
		assert.strictEqual(m.columns,3);
		assert.strictEqual(m.size,6);
		const m1=new Matrix({rows:2,columns:3}); 
		assert.strictEqual(m1.rows,2);
		assert.strictEqual(m1.columns,3);
		assert.strictEqual(m1.size,6);
		done();
	});
});
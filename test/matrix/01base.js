const assert=require('assert');
const { describe, it } = require('node:test');
const Matrix=require("../../matrix/matrix");

const m22=new Matrix([[1,2],[3,4]]);
const m44=new Matrix([
	[ 1, 0, 2, -1 ],
	[ 3, 0, 0, 5 ],
	[ 2, 1, 4, -3 ],
	[ 1, 0, 5, 0 ]]);

describe("matrix 01base", ()=>{
	it('create no rows', ()=>{
		assert.throws(()=>new Matrix(),Error)
		assert.throws(()=>new Matrix(2),Error)
		assert.throws(()=>new Matrix({rows:2}),Error("columns not specified"))
		assert.throws(()=>new Matrix([]),Error)
		assert.throws(()=>new Matrix([1,2,4]),Error)
		assert.throws(()=>new Matrix([[]]),Error)
	});
	it('create 2,3', ()=>{
		const m=new Matrix(2,3); 
		assert.strictEqual(m.rows,2);
		assert.strictEqual(m.columns,3);
		assert.strictEqual(m.size,6);
	});
	it('create {rows:2,columns:3} ', ()=>{
		const m=new Matrix({rows:2,columns:3}); 
		assert.strictEqual(m.rows,2);
		assert.strictEqual(m.columns,3);
		assert.strictEqual(m.size,6);
	});
	it('getIndex', ()=>{
		const m=new Matrix({rows:2,columns:3}); 
		assert.strictEqual(m.getIndex(0,0),0);
		assert.strictEqual(m.getIndex(0,1),1);
		assert.strictEqual(m.getIndex(1,1),4);
		assert.strictEqual(m.getIndex(1,2),5);
	});
	it('equalsNearlyValues', ()=>{
		const m=new Matrix({rows:2,columns:3});
		assert.throws(()=>m.equalsNearlyValues(1,0))
		assert.throws(()=>m.equalsNearlyValues(0,1))
		assert.doesNotThrow(()=>m.equalsNearlyValues(0,0));
		assert.doesNotThrow(()=>m.equalsNearlyValues(1,1));
		assert.throws(()=>m.equalsNearlyValues(1,1.00001));
		assert.doesNotThrow(()=>m.equalsNearlyValues(1,1.00001,2));
		assert.throws(()=>m.equalsNearlyValues(1.000001,1));
		assert.doesNotThrow(()=>m.equalsNearlyValues(1.000001,1,2));
	});
	it('equalsNearlyVector', ()=>{
		const m=new Matrix({rows:2,columns:3});
		assert.doesNotThrow(()=>m.equalsNearlyVector([0,0,0,0,0,0]));
		assert.throws(()=>m.equalsNearlyVector([1,2,3,4,5,6]));
		
	});
	it('equalsNearly', ()=>{
		assert.doesNotThrow(()=>m22.equalsNearly(m22));
		assert.doesNotThrow(()=>m22.equalsNearly([[1,2],[3,4]]));
		assert.throws(()=>m.equalsNearly([1,1],[1,1]));
		
	});
	it('fill', ()=>{
		const m=new Matrix({rows:2,columns:3});
		m.fill(1,0,2) 
		assert.doesNotThrow(()=>m.equalsNearlyVector([1,1,0,0,0,0]));
		m.fill(3,3,6) 
		assert.doesNotThrow(()=>m.equalsNearlyVector([1,1,0,3,3,3]));
		
	});
	it('setRow', ()=>{
		const m=new Matrix({rows:2,columns:3});
		m.setRow([1,2,3],1) 
		assert.doesNotThrow(()=>m.equalsNearlyVector([0,0,0,1,2,3]));
		
	});
	it('findColumnRow', ()=>{
		const m=new Matrix([[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]]); 
		const row=m.findColumnRow(1,(value)=>value==10);
		assert.deepEqual(row,2);
		
	});
	it('findRowColumn', ()=>{
		const m=new Matrix([[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]]); 
		const column=m.findRowColumn(2,(value)=>value==11);
		assert.deepEqual(column,2);
		
	});
	it('forEachCell', ()=>{
		const m=new Matrix([[0,1,2],[10,11,12]]); 
		m.forEachCell((v,r,c)=>assert.strictEqual(v,r*10+c));
		
	});
	it('getRow', ()=>{
		const m=new Matrix([[0,1,2],[10,11,12],[20,21,22]]);
		assert.deepEqual(m.getRow(1),new Float32Array([10,11,12]));
		
	});
	it('addRow', ()=>{
		const m=new Matrix({rows:2,columns:3}); //create a full zeroed
		m.addRow([0,1,2]);
		assert.doesNotThrow(()=>m.equalsNearlyVector(new Float32Array([0,0,0,0,1,2])));
		m.addRow([10,11,12]);
		assert.doesNotThrow(()=>m.equalsNearlyVector(new Float32Array([0,1,2,10,11,12])));
		m.addRow([20,21,22]);
		assert.doesNotThrow(()=>m.equalsNearlyVector(new Float32Array([10,11,12,20,21,22])));
		
	});
	it('addRow start empty', ()=>{
		const m=new Matrix({columns:3,rowsMax:2}); //create a full zeroed
		m.addRow([0,1,2]);
		assert.doesNotThrow(()=>m.equalsNearly([[0,1,2]]));
		m.addRow([10,11,12]);
		assert.doesNotThrow(()=>m.equalsNearly([[0,1,2],[10,11,12]]));
		m.addRow([20,21,22]);
		assert.doesNotThrow(()=>m.equalsNearly([[10,11,12],[20,21,22]]));
		
	});
	it('create with array', ()=>{
		const m=new Matrix([[0,1,2],[10,11,12]]); 
		assert.strictEqual(m.rows,2);
		assert.strictEqual(m.columns,3);
		assert.strictEqual(m.size,6);
		assert.doesNotThrow(()=>m.equalsNearlyVector(new Float32Array([0,1,2,10,11,12])));
		
	});
	it('reduceRow + sumRow', ()=>{
		const m=new Matrix([[0,1,2],[10,11,12]]);
		assert.strictEqual(m.sumRow(0),3);
		assert.strictEqual(m.sumRow(1),33);
		
	});
	it('set', ()=>{
		const m=new Matrix([[0,1,2],[10,11,12],[20,21,22]]);
		m.set(0,0,-1);
		m.set(1,1,-11);
		m.set(2,2,-22);
		assert.doesNotThrow(()=>m.equalsNearly([[-1,1,2],[10,-11,12],[20,21,-22]]));
		
	});
	it('toArray', ()=>{
		const a=[[0,1,2],[10,11,12]];
		const m=new Matrix(a);
		assert.deepEqual(m.toArray(),a);
		
	});
	it('multiply', ()=>{
		const left=new Matrix([[1,0,1],[2,1,1],[0,1,1],[1,1,2]]);
		const right=new Matrix([[1,2,1],[2,3,1],[4,2,2]]);
		const result=left.multiply(right);
		assert.deepEqual(result.toArray(),[[5,4,3],[8,9,5],[6,5,3],[11,9,6]])
		
	});
	it('transpose', ()=>{
		const m=new Matrix([[0,1,2],[10,11,12]]);
		assert.deepEqual(m.transpose().toArray(),[[0,10],[1,11],[2,12]])
		
	});
	it('swapRows', ()=>{
		const m=new Matrix([[0,1],[10,11],[20,21],[30,31]]);
		assert.deepEqual(m.swapRows(1,2).toArray(),[[0,1],[20,21],[10,11],[30,31]])
		
	});
	it('multiplyRow', ()=>{
		const m=new Matrix([[0,1],[10,11],[20,21],[30,31]]);
		assert.deepEqual(m.multiplyRow(1,2).toArray(),[[0,1],[20,22],[20,21],[30,31]])
		
	});
	it('addRow2Row', ()=>{
		const m=new Matrix([[0,1],[10,11],[20,21],[30,31]]);
		assert.deepEqual(m.addRow2Row(1,2,2).toArray(),[[0,1],[10,11],[40,43],[30,31]])
		
	});
	it('add', ()=>{
		const expect=[[0,2],[20,22],[40,42],[60,62]];
		const m=new Matrix([[0,1],[10,11],[20,21],[30,31]]);
		assert.deepEqual(m.add([[0,1],[10,11],[20,21],[30,31]]).toArray(),expect)
		const m1=new Matrix([[0,1],[10,11],[20,21],[30,31]]);
		assert.deepEqual(m1.add(m1).toArray(),expect)
		
	});
	it('substract', ()=>{
		const m=new Matrix([[0,1],[10,11],[20,21],[30,31]]);
		assert.deepEqual(m.substract([[0,1],[10,11],[20,21],[30,31]]).toArray(),[[0,0],[0,0],[0,0],[0,0]])
		const m1=new Matrix([[0,1],[10,11],[20,21],[30,31]]);
		assert.deepEqual(m1.substract(m1).toArray(),[[0,0],[0,0],[0,0],[0,0]])
		
	});
	it('identity', ()=>{
		const m=new Matrix([[0,1,2],[10,11,12],[20,21,22]]);
		assert.deepEqual(m.getIdentity().toArray(),[[1,0,0],[0,1,0],[0,0,1]]);
		
	});
	it('getMatrix', ()=>{
		const m=new Matrix([[0,1,2],[10,11,12],[20,21,22]]);
		assert.deepEqual(m.getMatrix(1,1,2,2).toArray(),[[11,12],[21,22]]);
		
	});
	it('divideRow', ()=>{
		const m=new Matrix([[0,1,2,3],[10,11,12,13],[20,21,22,23]]);
		const r=new Matrix([[0,1,2,3],[10/2,11/2/2,12/2/2,13/2],[20,21,22,23]]);
		const p=new Matrix([[0,1,2,3],[10,11/2,12/2,13],[20,21,22,23]]);
		assert.deepEqual(m.divideRow(1,2,1,2).toArray(),p.toArray());
		assert.deepEqual(m.divideRow(1,2).toArray(),r.toArray());
		
	});
	it('rowEchelonForm 1', ()=>{
		const m=new Matrix([[3,4,-3],[2,5,5],[-2,-3,1]]).rowEchelonForm();
		assert.doesNotThrow(()=>m.equalsNearly([[3/3,4/3,-3/3],[0,1,3],[0,0,0]]));
		
	});
	it('rowEchelonForm 2', ()=>{
		const m=new Matrix([[0,3,-6,6,4,-5],
							[3,-7,8,-5,8,9],
							[3,-9,12,-9,6,15]]);
		const echelonForm =new Matrix(
							[[1,-7/3,8/3,-5/3,8/3,3],
							[0,1,-2,2,4/3,-5/3],
							[0,0,0,0,1,4]]);
		assert.doesNotThrow(()=>m.rowEchelonForm().equalsNearly(echelonForm));
		
	});
	it('rowEchelonForm 4x', ()=>{
		const m=new Matrix([[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]]);
		const a=new Matrix([[1,2,3,4],[0,1,2,3],[0,0,0,0],[0,0,0,0]]);
		assert.doesNotThrow(()=>m.rowEchelonForm().equalsNearly(a));
		
	});
	it('reducedRowEchelonForm 1', ()=>{
		const m=new Matrix([[0,1],[0,0],[5,9]]).reducedRowEchelonForm();
//		console.log(m.toArray());
		assert.doesNotThrow(()=>m.equalsNearly([[1,9/5],[0,1],[0,0]]));
		
	});
	it('reducedRowEchelonForm 2', ()=>{
		const m=new Matrix([[0,3,-6,6,4,-5],
							[3,-7,8,-5,8,9],
							[3,-9,12,-9,6,15]]).reducedRowEchelonForm();
		const reducedForm =[[1,0,-2,3,0,-24],
							[0,1,-2,2,0,-7],
							[0,0,0,0,1,4]];
//		console.log(m.toArray());
		assert.doesNotThrow(()=>m.equalsNearly(reducedForm));
		
	});
	it('getInverseGaussJordan', ()=>{
		const m=new Matrix([[1,2,-2],
							[1,-1,2],
							[3,2,1]]).getInverseGaussJordan();
//		console.log(m.toArray());
		assert.doesNotThrow(()=>m.equalsNearly([[1,6/5,-2/5],[-1,-7/5,4/5],[-1,-4/5,3/5]]));
		
	});
	const m33=new Matrix([[1,2,3],
						  [4,5,6],
						  [7,8,9]]);
	it('getCofactor33 0 0', ()=>{
		assert.doesNotThrow(()=>m33.getCofactor(0,0).equalsNearly([[5,6],[8,9]]));
		
	});
	it('getCofactor33 0 1', ()=>{
		assert.doesNotThrow(()=>m33.getCofactor(0,1).equalsNearly([[4,6],[7,9]]));
		
	});
	it('getCofactor33 0 2', ()=>{
		assert.doesNotThrow(()=>m33.getCofactor(0,2).equalsNearly([[4,5],[7,8]]));
		
	});
	it('getCofactor33 1 1', ()=>{
		assert.doesNotThrow(()=>m33.getCofactor(1,1).equalsNearly([[1,3],[7,9]]));
		
	});

	it('getDeterminantUsingCofactor22', ()=>{
		assert.deepEqual(m22.clone().getDeterminantUsingCofactor(),1*4-2*3);
		
	});
	
	it('getDeterminantUsingCofactor44', ()=>{
		assert.deepEqual(m44.clone().getDeterminantUsingCofactor(),30);
		
	});
	it('getDeterminantUsingRowEchelonForm22', ()=>{
		assert.deepEqual(m22.clone().getDeterminantUsingRowEchelonForm(),1*4-2*3);
		
	});
	it('getDeterminantUsingRowEchelonForm44', ()=>{
		assert.deepEqual(m44.clone().getDeterminantUsingRowEchelonForm(),30);
		
	});
	it('getDeterminant44', ()=>{
		assert.deepEqual(m44.clone().getDeterminant(),30);
		
	});
	it('forwardElimination', ()=>{
		const m=new Matrix([[3.0, 2.0, -4.0, 3.0],
							[2.0, 3.0, 3.0, 15.0],
							[5.0, -3, 1.0, 14.0]]).forwardElimination();
		assert.doesNotThrow(()=>m.equalsNearly(
							[[5.00,-3.00,1.00,14.00],
							[0.00,4.20,2.60,9.40],
							[0.00,0.00,-6.95,-13.90]],2));
		
	});
	it('gaussianElimination', ()=>{
		const m=new Matrix([[3.0, 2.0, -4.0, 3.0],
							[2.0, 3.0, 3.0, 15.0],
							[5.0, -3, 1.0, 14.0]]);
		const v=m.gaussianElimination();
		assert.doesNotThrow(()=>m.equalsNearlyVector(v,6,[3,1,2]));
		
	});
	it('getAdjoint', ()=>{
		const m=new Matrix([[-3,2,-5],
							[-1,0,-2],
							[3,-4,1]]).getAdjoint();
		const a=[
			[-8,18,-4],
			[-5,12,-1],
			[4,-6,2]
		]

		assert.doesNotThrow(()=>m.equalsNearly(a));
		
	});
	it('getInverseAdjointMethod', ()=>{
		const m=new Matrix([
			[1,2,-2],
			[1,-1,2],
			[3,2,1]]).getInverseAdjointMethod();
		assert.doesNotThrow(()=>m.equalsNearly([[1,6/5,-2/5],[-1,-7/5,4/5],[-1,-4/5,3/5]]));
		
	});
});
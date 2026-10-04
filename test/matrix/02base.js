const { describe, it } = require('node:test');
const assert=require('assert');
const Matrix=require("../../matrix/matrix");

const m22=new Matrix([[1,2],[3,4]]);
const m44=new Matrix([
	[ 1, 0, 2, -1 ],
	[ 3, 0, 0, 5 ],
	[ 2, 1, 4, -3 ],
	[ 1, 0, 5, 0 ]]);

describe("matrix 02base", ()=>{
	it('norm', ()=>{
        const m=new Matrix([[2,3,-1], [0,-1,4]])
        assert.strictEqual(m.norm(),5.5677643628300215); 
		
    });
	it('norm', ()=>{
        const m=new Matrix({rows:4,columns:4});
        assert.doesNotThrow(()=>m.setRunningSum().equalsNearly([
                                                [1,0,0,0],
                                                [1,1,0,0],
                                                [1,1,1,0],
                                                [1,1,1,1]]));
		
    });
	it('getVandermonde', ()=>{
        const m=(new Matrix(1,1)).getVandermonde([-1,0,0.5,1],5);
        assert.doesNotThrow(()=>m.equalsNearly([
            [ 1. , -1. , 1. , -1. , 1. ],
            [ 1. , 0. , 0. , 0. , 0. ],
            [ 1. , 0.5 , 0.25 , 0.125 , 0.0625],
            [ 1. , 1. , 1. , 1. , 1. ]]));
		
    });

});
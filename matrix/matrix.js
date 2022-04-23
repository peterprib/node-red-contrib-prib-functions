const logger = new (require("node-red-contrib-logger"))("Matrix");
logger.sendInfo("Copyright 2022 Jaroslav Peter Prib");

function Matrix(rows,columns,fill) {
	if(rows instanceof Array) {
		this.rows=rows.length;
		if(this.rows==0) throw Error("expected rows")
		const row=rows[0];
		if(!row instanceof Array) throw Error("expected row to be array of columns")
		this.columns=row.length;
		if(this.columns==0) throw Error("expected Columns")
		this.createVector().fillArray(rows);
		return this;
	} 
	if(rows instanceof Object) {
			Object.assign(this,rows)
	} else {
		this.rows=rows;
		this.columns=columns;
	}
	this.createVector();
	return this;
}
Matrix.prototype.addRow=function(vector){
	if(this.size==this.sizeMax){
		this.vector.copyWithin(0,this.columns,this.sizeMax);
		this.rows--;
		this.size-=this.columns;
	}
	this.vector.set(vector, this.rows*this.columns);
	this.rows++;
	this.size+=this.columns;
	return this;
}
Matrix.prototype.consoleLog=function(label){
	console.log({label:label,rows:this.rows,columns:this.columns,size:this.size,sizeMax:this.sizeMax})
	return this;
}
Matrix.prototype.createVector=function(){
	if(this.size==null) {
		if(this.rows==null){
			if(this.rowsMax==null)  throw Error("rows or rowsMax not specified")
			this.rows=0;
			this.sizeMax=this.rowsMax*this.columns;
		}
		if(this.columns==null) throw Error("columns not specified")
		this.size=this.rows*this.columns
		if(this.sizeMax==null) this.sizeMax=this.size
	} else {
		if(this.columns==null) throw Error("columns not specified")
		if(this.rows==null){
			this.rows=0;
		}  	
	}
	this.vector=new Float32Array(this.sizeMax);
	return this;
}
Matrix.prototype.equalsNearly=function(matrix,precision=6){
	if(matrix instanceof Array) {
		if(this.rows!=matrix.length) throw Error("rows counts not equal")
		if(this.columns!=matrix[0].length) throw Error("columns counts not equal")
		this.forEachRow((row,index)=>{
			row.forEach(v,column=>matrix.equalsNearlyVector(v,get(row,column)))
		})
		return this;
	}
	if(this.rows!=matrix.rows) throw Error("rows counts not equal")
	if(this.columns!=matrix.columns) throw Error("columns counts not equal")
return this;
}
Matrix.prototype.equalsNearlyValues=function(x,y,precision=6){
		if(x==0){
			if(y.toFixed(precision)==0) return this;
		} else {
			if((y/x).toFixed(precision)==1) return this;
		}
		throw Error("not equal");
	return this;
}
Matrix.prototype.equalsNearlyVector=function(vector,precision=6){
	this.vector.forEach((v,i,a)=>{
		try{
			this.equalsNearlyValues(v,vector[i],precision)
		} catch(ex) {
			throw Error('not equal, index '+i+' left: '+v+' right: '+vector[i]);
		}
	})
	return this;
}
Matrix.prototype.fill=function(value, start, end){
	this.vector.fill(value, start, end);
	return this;
}
Matrix.prototype.fillArray=function(a){
	const matrix=this;
	a.forEach((columns)=>matrix.addRow(columns))
	return this;
}
Matrix.prototype.forEachRow=call=>{
	for(let index=0;index<this.rows;index++) {
		call.apply(this,[this.getRow(index),index,this])
	}
	return this;
}
Matrix.prototype.get=function(row, column){
	return this.vector[row*this.columns+column];
}
Matrix.prototype.getRow=row=>{
	const start=rows*this.columns;
	return this.vector.subarray(start,start+this.columns);
}
Matrix.prototype.getIndex=function(row, column){
	const start=row*this.columns;
	return row*this.columns+column;
}
Matrix.prototype.setRow=function(vector,row){
	this.vector.set(vector, row*this.columns);
	return this;
}

module.exports=Matrix;
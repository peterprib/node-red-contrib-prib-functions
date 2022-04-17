const logger = new (require("node-red-contrib-logger"))("Matrix");
logger.sendInfo("Copyright 2022 Jaroslav Peter Prib");

function Matrix(rows,columns) {
	if(rows instanceof Object) {
		Object.assign(this,rows)
	} else {
		this.rows=rows;
		this.columns=columns;
	}
	this.createVector();
	return this;
}
Matrix.prototype.createVector=function(){
	if(this.size==null) {
		if(this.rows==null) throw Error("rows not specified")
		if(this.columns==null) throw Error("columns not specified")
		if(this.sizeMax==null) this.sizeMax=this.rows*this.columns
	}
	this.vector=new Float32Array();
}
module.exports=Matrix;
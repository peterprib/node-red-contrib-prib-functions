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
			Object.assign(this,rows);
	} else {
		this.rows=rows;
		this.columns=columns;
	}
	this.createVector();
	return this;
}
Matrix.prototype.add=function(matrix){
	this.forEachCellPairSet(matrix,(cellA,cellB)=>cellA+cellB)
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
Matrix.prototype.addRow2Row=function(rowA,rowB,factor=1){
	const diff=(rowA-rowB)*this.columns
	this.forRowCells(rowB,(value,column,offset,vector)=>vector[offset]+=factor*vector[offset+diff]);
	return this;
}
Matrix.prototype.clone=function(){
	const matrix= new Matrix({rows:this.rows,columns:this.columns,size:this.size,sizeMax:this.sizeMax})
	matrix.vector.set(this.vector,0);
	return matrix
}
Matrix.prototype.consoleLog=function(label){
	console.log({label:label,rows:this.rows,columns:this.columns,size:this.size,sizeMax:this.sizeMax})
	return this;
}
Matrix.prototype.createLike=function(matrix){
	return new Matrix({rows:this.rows,columns:this.columns,size:this.size,sizeMax:this.sizeMax})
}
Matrix.prototype.createForEachCellPairSet=function(matrix,call){
	const result=this.createLike();
	if(matrix instanceof Matrix){
		if(this.rows!=matrix.rows) throw Error("number of rows different");
		if(this.columns!=matrix.columns) throw Error("number of columns different");
		for(let offset=0;offset<this.size;offset++) 
			result.vector[offset]=call.apply(this,[this.vector[offset],matrix.vector[offset]]);
		return result;
	}
	if(this.rows!=matrix.length) throw Error("number of rows different");
	if(this.columns!=matrix[0].length) throw Error("number of columns different");
	for(let offset=0,row=0;row<this.rows;row++) {
		for(let column=0;column<this.columns;column++) {
			result.vector[offset]=call.apply(this,[this.vector[offset],matrix[row][column]]);
			offset++
		}
	}
	return result;
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
Matrix.prototype.getComplementMinor=function(cellRow, cellColumn) {
	const matrix = new Matrix(this.rows-1,this.columns-1);
	for(let row=0,column=0,sourceRow=0; sourceRow<this.rows; sourceRow++) {
		if(sourceRow==cellRow) continue;
		for(let sourceColumn=0; sourceColumn<this.columns; sourceColum++) {
			if(sourceColum==cellColumn) continue; // In the first sourceRow Data ellipsis of column
            matrix.set(row,column,this.get(sourceRow, sourceColumn));
			column++;
			if(column >= matrix.columns ) {
				column=0;
				row++;
			}
		}
	}
	return matrix;
}
Matrix.prototype.equalsNearly=function(matrix,precision=6){
	const thisObject=this;
	if(matrix instanceof Matrix){
		if(this.rows!=matrix.rows) throw Error("rows counts not equal actual: "+this.rows+" expected: "+matrix.rows)
		if(this.columns!=matrix.columns) throw Error("columns counts not equal actual: "+this.columns+" expected: "+matrix.columns)
	} else {
		if(this.rows!=matrix.length) throw Error("rows counts not equal actual: "+this.rows+" expected: "+matrix.length)
		if(this.columns!=matrix[0].length) throw Error("columns counts not equal actual: "+this.columns+" expected: "+matrix[0].length)
		this.forEachCell((value,row,column)=>{
			thisObject.equalsNearlyValues(value,matrix[row][column])
		});
	}
	return this;
}
Matrix.prototype.equalsNearlyValues=function(x,y,precision=6){
		if(x==0){
			if(y.toFixed(precision)==0) return this;
		} else {
			if((y/x).toFixed(precision)==1) return this;
		}
		throw Error(x+" != "+y);
	return this;
}
Matrix.prototype.equalsNearlyVector=function(vector,precision=6,baseVector=this.vector){
	baseVector.forEach((v,i,a)=>{
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
Matrix.prototype.forEachCell=function(call){
	for(let offset=0,row=0;row<this.rows;row++) {
		for(let column=0;column<this.columns;column++) {
			call.apply(this,[this.vector[offset],row,column,this.vector,offset,this]);
			offset++
		}
	}
	return this;
}
Matrix.prototype.forEachCellPairSet=function(matrix,call){
	if(matrix instanceof Matrix){
		if(this.rows!=matrix.rows) throw Error("number of rows different");
		if(this.columns!=matrix.columns) throw Error("number of columns different");
		for(let offset=0;offset<this.size;offset++) 
			this.vector[offset]=call.apply(this,[this.vector[offset],matrix.vector[offset]]);
		return this;
	}
	if(this.rows!=matrix.length) throw Error("number of rows different");
	if(this.columns!=matrix[0].length) throw Error("number of columns different");
	for(let offset=0,row=0;row<this.rows;row++) {
		for(let column=0;column<this.columns;column++) {
			this.vector[offset]=call.apply(this,[this.vector[offset],matrix[row][column]]);
			offset++
		}
	}
	return this;
}
Matrix.prototype.forEachRow=function(call){
	for(let row=0;row<this.rows;row++) {
		const rowVector=this.getRow(row);
		call.apply(this,[rowVector,row,this])
	}
	return this;
}
Matrix.prototype.forRowCells=function(row,call){
	const start=row*this.columns;
	const end=start+this.columns;
	for(let column=0,offset=start;offset<end;offset++){
		call.apply(this,[this.vector[offset],column++,offset,this.vector]);
	}
	return this;
}
Matrix.prototype.get=function(row, column){
	return this.vector[row*this.columns+column];
}
Matrix.prototype.getAdjoint=function(){
	if(this.columns==1) return new Matrix([[1]]);
	const adjoint=this.createLike();
	for(let offset=0,row=0;row<adjoint.rows;row++) {
		for(let column=0;column<adjoint.columns;column++) {
			const temp=this.getCofactor(column,rows); // get reverse
			adjoint.vector[offset]=((row+column)%2== 0)?temp.getDeterminant():-temp.getDeterminant();
			offset++
		}
	}
}
Matrix.prototype.getCofactor=function(cellRow,cellColumn){
	const matrixSize=this.rows-1;
	const matrix=new Matrix(matrixSize,matrixSize)
	const startLength=cellColumn;
	const endLength=matrixSize-cellColumn;
	const columnOffsetPart2=cellColumn+1;
	let thisRowOffset=0;matrixRowOffset=0;
	for(let row=0;row<this.rows;row++) {
		if(row==cellRow) continue;
		const vectorStart=this.vector.slice(thisRowOffset,thisRowOffset+startLength);
		const thisRowOffsetPart2=thisRowOffset+columnOffsetPart2;
		const vectorEnd=this.vector.slice(thisRowOffsetPart2,thisRowOffsetPart2+endLength);
		matrix.vector.set(vectorStart,matrixRowOffset);
		matrix.vector.set(vectorEnd,matrixRowOffset+cellColumn)
		matrixROwOffset=matrixRowOffset+matrixSize; //next row
	}
	return matrix;
}
Matrix.prototype.getInverseGaussJordan=function(){
	this.testIsSquare();
    const matrix = new Matrix(this.rows, this.columns * 2);
    for (let row=0,offset=this.columns; row<this.rows; ++row) {
		matrix.setRow(this.getRow(row),row);
        matrix.vector[offset+row]=1;
		offset+=matrix.columns
    }
	matrix.reducedRowEchelonForm();
	return matrix.getMatrix(0,this.columns,this.rows,this.columns);
}
Matrix.prototype.getIdentity=function(){
	const identity=this.createLike();
	for(let offset=0;offset<identity.size;offset+=identity.columns+1) identity.vector[offset]=1;
	return identity;
}
Matrix.prototype.getIndex=function(row, column){
	const start=row*this.columns;
	return row*this.columns+column;
}
Matrix.prototype.getInverse=Matrix.prototype.getInverseGaussJordan;
Matrix.prototype.getMatrix=function(row,column,rows,columns){
    const matrix = new Matrix(rows,columns);
    for(let matrixOffset=0,thisOffset=row*this.columns+column; row<this.rows; ++row,thisOffset+=this.columns,matrixOffset+=rows) {
		matrix.vector.set(this.vector.subarray(thisOffset,thisOffset+columns),matrixOffset)
	}
	return matrix;
}
Matrix.prototype.getRow=function(row){
	const start=row*this.columns;
	return this.vector.subarray(start,start+this.columns);
}
Matrix.prototype.multiply=function(rightMatrix){
	const leftMatrix=this;
	if(leftMatrix.columns!=rightMatrix.rows) throw Error(leftMatrix.columns+ "columns != "+rightMatrix.rows+" rows of argument");
	const result=new Matrix({rows:leftMatrix.rows,columns:rightMatrix.columns})
	result.forEachCell((cell,row,column)=>{
		const value=leftMatrix.reduceRow(row,
			(value,rowCell,leftRow,leftColumn)=>
				value+rowCell*rightMatrix.get(leftColumn,column)
		);
		result.set(row,column,value);
	})
	return result;
}
Matrix.prototype.multiplyRow=function(row,factor){
	this.determinant*=factor;
	this.forRowCells(row,(cell,column,offset,vector)=>vector[offset]*=factor)
	return this;
}
Matrix.prototype.reducedRowEchelonForm=function(){
	for(let row=0, leadColumn=0; row<this.rows && leadColumn<this.columns; ++row, ++leadColumn) {
		let rowOffset=row*this.columns
        while(this.vector[rowOffset+leadColumn] == 0) {
			rowOffset+=this.columns;
        	if(rowOffset>=this.size){
				rowOffset=row*this.columns
                if(++leadColumn==this.columns) return;
        	}
        }
        this.swapRows(rowOffset/this.columns, row);
		rowOffset=row*this.columns
		const leadCell=this.vector[rowOffset+leadColumn]
        if(leadCell != 0) {
            const factor=leadCell;
            for(let column=leadColumn; column<this.columns; ++column)
                this.vector[rowOffset+column] /= factor;
        }
        for(let jRowOffset=0; jRowOffset<this.size; jRowOffset=jRowOffset+this.columns) {
            if(jRowOffset==rowOffset) continue;
            const factor=this.vector[jRowOffset+leadColumn];
            for (let column=leadColumn; column<this.columns; ++column)
                this.vector[jRowOffset+column] -= factor*this.vector[rowOffset+column];
        }
    }
}
Matrix.prototype.reduceRow=function(row,call,value=0){
	this.forRowCells(row,(cell,column,offset,vector)=>{
		value=call.apply(this,[value,cell,row,column]);
	});
	return value;
}
Matrix.prototype.set=function(row,column,value){
	this.vector[this.getIndex(row,column)]=value;
	return this;
}
Matrix.prototype.setRow=function(vector,row){
	this.vector.set(vector, row*this.columns);
	return this;
}
Matrix.prototype.substract=function(matrix){
	this.forEachCellPairSet(matrix,(cellA,cellB)=>cellA-cellB)
	return this;
}
Matrix.prototype.subtractCell=function(row,column,value){
	this.vector[this.getIndex(row,column)]-=value;
	return this;
}
Matrix.prototype.sumRow=function(row){
	return this.reduceRow(row,(value,cell)=>value+cell);
}
Matrix.prototype.swapRows=function(rowA,rowB){
	this.determinant=-this.determinant;
	const startRowA=rowA*this.columns;
	const rowAVector=this.vector.slice(startRowA,startRowA+this.columns);
	const startRowB=rowB*this.columns
	this.vector.copyWithin(startRowA,startRowB,startRowB+this.columns);
	this.vector.set(rowAVector,startRowB);
	return this;
}
Matrix.prototype.testIsSquare=function(){
	if(this.rows!=this.columns) throw Error("not square matrix");
	return this;
}
Matrix.prototype.toArray=function(precision=6){
	const result=[];
	this.forEachRow((row,index)=>{
		const columns=[];
		row.forEach(value=>columns.push(value.toFixed(precision)))
		result.push(columns)
	})
	return result;
}
Matrix.prototype.transpose=function(){
	const matrix=new Matrix({rows:this.columns,columns:this.rows})
	this.forEachCell((cell,row,column)=>matrix.set(column,row,cell))
	return matrix;
}
Matrix.prototype.getDeterminant=function(){
	if(this.determinant) return this.determinant
	this.testIsSquare();
	return this.setDeterminant();
}
Matrix.prototype.setDeterminant=function(){
	if(this.rows==1) return this.vector[0];
	this.determinant=0;
	let	sign=1;
	for(let column=0; column<this.columns; column++) {
		temp=(this.rows>2?this.getCofactor(0,column).getDeterminant():this.vector[1-column]);
		this.determinant += sign*this.vector[column]*temp;
		sign=-sign;
	}
	return this.determinant;
}

Matrix.prototype.getInverseAdjointMethod=function(){
    const determinant=this.getDeterminant();
	if(determinant==0) throw Error("Singular matrix, can't find its inverse");
	const adjoint=this.getAdjoint();

	for(let offset=0;offset<adjoint.size;offset++) {
		adjoint.vector[offset]/=determinant;
	}
	return adjoint;
}

module.exports=Matrix;

/*

function setDataPoint(value,term,node,dp) {
		Object.assign(dp,{
			avg:0,
			count:0, =rows
			movingSum:0,
			movingSumSquared:0,
			movingSumCubed:0,
			outlier:false,
			sum:0,
			sumSquared:0,
			sumCubed:0,
			term:term,
			weightedMovingSum:0,
			exponentialWeightedMoving:[new EMA(0.25),new EMA(0.5),new EMA(0.75)]
		});
	};
	dp.max=Math.max(dp.max||value,value);
	dp.min=Math.min(dp.min||value,value);
	dp.range=dp.max-dp.min;
	dp.sum+=value;
	dp.sumSquared+=Math.pow(value,2);
	dp.sumCubed+=Math.pow(value,3);
	dp.movingSum+=value-removedValue;
	dp.movingSumSquared+=Math.pow(value,2)-Math.pow(removedValue,2);
	dp.movingSumCubed+=Math.pow(value,3)-Math.pow(removedValue,3);
//	dp.avg=dp.sum/this.rows;
	const avg=dp.avg;
	dp.normalised=dp.range ? (value-avg)/dp.range : 0;
//	dp.movingAvg=dp.movingSum/values.length;
//	dp.variance=dp.sumSquared/count - Math.pow(avg,2);
//	dp.stdDev=Math.sqrt(dp.variance);
	dp.movingVariance=dp.movingSumSquared/values.length - Math.pow(dp.movingAvg,2);
	dp.movingStdDev=Math.sqrt(dp.movingVariance);
	dp.median=functions.median(values);
	dp.standardized=( (value-avg)/dp.stdDev )||0;
	dp.movingStandardized=( (value-dp.movingAvg)/dp.movingStdDev )||0;
	dp.skewness=(dp.sumCubed-3*avg*dp.variance-Math.pow(avg,3))/dp.variance*dp.stdDev;
	dp.movingSkewness=(dp.movingSumCubed-3*dp.movingAvg*dp.movingVariance-Math.pow(dp.movingAvg,3))/dp.movingVariance*dp.stdDev;
	dp.outlier=node.outliersFunction(node,dp,value);
	dp.weightedMovingSum+=count*value;
	dp.weightedMovingAvg=(dp.weightedMovingAvg*2/count)/(count+1);
	dp.exponentialWeightedMoving.forEach(c=>c.sample(value));
}
*/
Matrix.prototype.gaussianElimination=function(){
	return this.forwardElimination().backwardSubstitution();
}
Matrix.prototype.forwardElimination=function(){
	let maxValue,maxRow;
	for(let pivotRowColumn=0; pivotRowColumn<this.rows; pivotRowColumn++) {
		maxRow=pivotRowColumn; 	// Initialize maximum value and index for pivot
		maxValue=this.get(maxRow,pivotRowColumn);
		for(let row=pivotRowColumn+1; row<this.rows; row++){
			const value=Math.abs(this.get(row,pivotRowColumn))
			if(value>maxValue) {
				maxValue=value;
				maxRow=row;
			}
		}
		// if a principal diagonal element is zero then matrix is singular + division-by-zero later
		if(this.get(pivotRowColumn,maxRow)==0) {
			throw Error("Singular matrix, "+(this.get(pivotRowColumn,this.columns)==0?"may have infinitely many solutions":"inconsistent system"))
		} 
		if(maxRow!=pivotRowColumn) this.swapRows(pivotRowColumn, maxRow);
		for(let row=pivotRowColumn+1; row<this.rows; row++){
			const factor=this.get(row,pivotRowColumn)/maxValue;
			for(let column=pivotRowColumn+1; column<this.columns; column++){
				this.subtractCell(row,column,this.get(pivotRowColumn,column)*factor);
			}
			this.set(row,pivotRowColumn,0);
		}
	}
	return this;
}
Matrix.prototype.backwardSubstitution=function(){
	const vector=new Float32Array(this.rows);
	for(let row=this.rows-1; row>=0; row--) {
		vector[row] = this.get(row,this.rows);
		for(let column=row+1; column<this.rows; column++)	{
			vector[row] -= this.get(row,column)*vector[column];
		}
		vector[row] /= this.get(row,row);
	}
	return vector;
}

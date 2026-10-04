const logger = new (require("node-red-contrib-logger"))("Matrix");
logger.sendInfo("Copyright 2022 Jaroslav Peter Prib");

const typedArrays= {Array:Array,Int8Array:Int8Array,Uint8Array:Uint8Array,Uint8ClampedArray:Uint8ClampedArray,Int16Array:Int16Array,Uint16Array:Uint16Array,
  Int32Array:Int32Array,Uint32Array:Uint32Array,Float32Array:Float32Array,
  Float64Array:Float64Array,BigInt64Array:BigInt64Array,BigUint64Array:BigUint64Array}

  Object.keys(typedArrays).map(t=>typedArrays[t]).forEach(object=>{
    if(object.prototype.setAll==null)
        Object.defineProperty(object.prototype, "setAll", {
            value(call,size=this.length) {
                let i=size
                while(i) this[--i]=call();
                return this;
            },
            writable: true,
            configurable: true
        })
	if(object.prototype.setOne==null)
			Object.defineProperty(object.prototype, "setOne", {
				value(call,size=this.length) {
					let i=size
					while(i) this[--i]=1;
					return this;
				},
				writable: true,
				configurable: true
			})
	if(object.prototype.setZero==null)
        Object.defineProperty(object.prototype, "setZero", {
            value(call,size=this.length) {
                let i=size
                while(i) this[--i]=0;
                return this;
            },
            writable: true,
            configurable: true
        })
    if(object.prototype.setRandom==null)
        Object.defineProperty(object.prototype, "setRandom", {
            value(size=this.length) {
				return this.setAll(Math.random,size)
            },
            writable: true,
            configurable: true
        })
})

const zeroFloat32Value=1e-6;
function Matrix(rows,columns,fill,dataType="Float32Array") {
	this.dataType=dataType
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
		this.dataType??="Float32Array"
	} else {
		this.rows=rows;
		this.columns=columns;
	}
	if(this.columns) this.columns=parseInt(this.columns);
	if(this.rows)this.rows=parseInt(this.rows)
	if(this.rowsMax) this.rowsMax=parseInt(this.rowsMax)
	this.createVector();
	if(fill) {
		if(fill instanceof Function) this.setAll(fill)
		else this.vector.set(fill)
	}  
	return this;
}
Matrix.prototype.add=function(matrix){
	if (matrix instanceof Matrix && this.rows === matrix.rows && this.columns === matrix.columns) {
		const vecA = this.vector, vecB = matrix.vector;
		for (let i = 0, len = this.size; i < len; i++) vecA[i] += vecB[i];
	} else {
		this.forEachCellPairSet(matrix,(cellA,cellB)=>cellA+cellB)
	}
	return this;
}
Matrix.prototype.addCell=function(row,column,value){
	this.vector[this.getIndex(row,column)]+=value;
	return this;
}
Matrix.prototype.addRow=function(row,vectorIn){
	if(vectorIn & row>=0){
		this.forRowCells(row,(value,column,offset,vector)=>vector[offset]+=vectorIn[column]);
		return this;
	}
	const vector=vectorIn?vectorIn:row;
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
Matrix.prototype.addRow2Row=function(rowA,rowB,factor=1,startColumn=0,endColumn=this.columns-1){
	const cols = this.columns;
	const offA = rowA * cols;
	const offB = rowB * cols;
	const vec = this.vector;
	for (let c = startColumn; c <= endColumn; c++) {
		vec[offB + c] += vec[offA + c] * factor;
	}
	return this;
}
Matrix.prototype.backwardSubstitution=function(){
	const vector=new typedArrays[this.dataType](this.rows);
	for(let row=this.rows-1; row>=0; row--) {
		vector[row] = this.get(row,this.rows);
		for(let column=row+1; column<this.rows; column++)	{
			vector[row] -= this.get(row,column)*vector[column];
		}
		vector[row] /= this.get(row,row);
	}
	return vector;
}
Matrix.prototype.clone=function(){
	const matrix= new Matrix({rows:this.rows,columns:this.columns,size:this.size,sizeMax:this.sizeMax,rowsMax:this.rowsMax,dataType:this.dataType})
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
	if (matrix instanceof Matrix) {
		if (this.rows != matrix.rows) throw Error("number of rows different");
		if (this.columns != matrix.columns) throw Error("number of columns different");
		const vecA = this.vector, vecB = matrix.vector, resVec = result.vector;
		for (let offset = 0, len = this.size; offset < len; offset++)
			resVec[offset] = call(vecA[offset], vecB[offset]);
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
	} else {
		if(this.columns==null) throw Error("columns not specified")
		if(this.columns==0) throw Error("columns = 0")
		if(this.rows==null){
			this.rows=0;
		}  	
	}
	this.size=this.rows*this.columns
	if(this.sizeMax==null) this.sizeMax=this.size
	if(this.sizeMax==null) throw Error("max size not specified or calculated")
	this.vector=new typedArrays[this.dataType](this.sizeMax);
	return this;
}
Matrix.prototype.divideCell=function(row,column,value){
	this.vector[this.getIndex(row,column)]/=value;
	return this;
}
Matrix.prototype.divideRow=function(row,factor,startColumn=0,endColumn=this.columns-1){
	this.determinant /= factor;
	const offset = row * this.columns;
	const vec = this.vector;
	for (let c = startColumn; c <= endColumn; c++) {
		vec[offset + c] /= factor;
	}
	return this;
}
Matrix.prototype.equalsNearly=function(matrix,precision=6){
	const thisObject=this;
	if(matrix instanceof Matrix){
		if(this.rows!=matrix.rows) throw Error("rows counts not equal actual: "+this.rows+" expected: "+matrix.rows)
		if(this.columns!=matrix.columns) throw Error("columns counts not equal actual: "+this.columns+" expected: "+matrix.columns)
		this.forEachCell((value,row,column,vector,offset)=>{
			try{
				thisObject.equalsNearlyValues(value,matrix.vector[offset],precision)
			} catch(ex) {
				throw Error("row: "+row+" column: "+column+", cell values "+ex.message)
			}
		});
	} else {
		if(this.rows!=matrix.length) throw Error("rows counts not equal actual: "+this.rows+" expected: "+matrix.length)
		if(this.columns!=matrix[0].length) throw Error("columns counts not equal actual: "+this.columns+" expected: "+matrix[0].length)
		this.forEachCell((value,row,column)=>{
			try{
				thisObject.equalsNearlyValues(value,matrix[row][column],precision)
			} catch(ex) {
				throw Error("row: "+row+" column: "+column+", cell values "+ex.message)
			}
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
Matrix.prototype.findColumnRow=function(column,call,startRow=0,endRow=this.rows-1){
	let offset=startRow*this.columns+column;
	for(let row=startRow;row<=this.rows;row++){
		if(call.apply(this,[this.vector[offset],row,column,offset,this.vector])) {
			return row;
		}
		offset+=this.columns;
	}
	return -1;
}
Matrix.prototype.findRowColumn=function(row,call,startColumn=0,endColumn=this.columns-1){
	let offset=row*this.columns+startColumn;
	for(let column=startColumn;column<=endColumn;column++){
		if(call.apply(this,[this.vector[offset],column,offset,this.vector]))
			return column;
		offset++;
	}
	return -1;
}
Matrix.prototype.forColumnCells=function(column,call,startRow=0,endRow=this.rows-1){
	let offset=startRow*this.columns+column;
	for(let row=startRow;row<=endRow;row++){
		call.apply(this,[this.vector[offset],row,offset,this.vector]);
		offset+=this.columns;
	}
	return this;
}
Matrix.prototype.forEachCell=function(call){
	const rows = this.rows, cols = this.columns, vec = this.vector;
	for(let offset=0,row=0;row<rows;row++) {
		for(let column=0;column<cols;column++) {
			call(vec[offset],row,column,vec,offset,this);
			offset++
		}
	}
	return this;
}
Matrix.prototype.forEachCellLowerTriangle=function(call){
	this.testIsSquare();
	for(let row=0;row<this.rows;row++) {
		let offset=row*this.columns;
		for(let column=0;column<=row;column++) {
			call.apply(this,[this.vector[offset],row,column,this.vector,offset,this]);
			offset++
		}
	}
	return this;
}
Matrix.prototype.forEachCellPairSet=function(matrix,call){
	if (matrix instanceof Matrix) {
		if (this.rows != matrix.rows) throw Error("number of rows different");
		if (this.columns != matrix.columns) throw Error("number of columns different");
		const vecA = this.vector, vecB = matrix.vector;
		for (let offset = 0, len = this.size; offset < len; offset++)
			vecA[offset] = call(vecA[offset], vecB[offset]);
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
Matrix.prototype.forEachCellUpperTriangle=function(call){
	this.testIsSquare();
	for(let row=0;row<this.rows;row++) {
		let offset=row*this.columns;
		for(let column=row;column<=this.columns;column++) {
			call.apply(this,[this.vector[offset],row,column,this.vector,offset,this]);
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
Matrix.prototype.forRowCells=function(row,call,startColumn=0,endColumn=this.columns-1){
	let offset=row*this.columns+startColumn;
	for(let column=startColumn;column<=endColumn;column++){
		call.apply(this,[this.vector[offset],column,offset,this.vector]);
		offset++;
	}
	return this;
}
Matrix.prototype.forwardElimination=function(){
	let maxValue,maxRow;
	for(let pivotRowColumn=0; pivotRowColumn<this.rows; pivotRowColumn++) {
		maxRow=pivotRowColumn; 	// Initialize maximum value and index for pivot
		maxValue=Math.abs(this.get(maxRow,pivotRowColumn));
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
		pivotValue=this.get(pivotRowColumn,pivotRowColumn);
		for(let row=pivotRowColumn+1; row<this.rows; row++){
			const factor=this.get(row,pivotRowColumn)/pivotValue;
			for(let column=pivotRowColumn+1; column<this.columns; column++){
				this.subtractCell(row,column,this.get(pivotRowColumn,column)*factor);
			}
			this.set(row,pivotRowColumn,0);
		}
	}
	return this;
}
Matrix.prototype.gaussianElimination=function(){
	return this.forwardElimination().backwardSubstitution();
}
Matrix.prototype.get=function(row, column){
	return this.vector[row*this.columns+column];
}
Matrix.prototype.getAdjoint=function(){
	if(this.columns==1) return new Matrix([[1]]);
	const adjoint=this.createLike();
	for(let offset=0,row=0;row<adjoint.rows;row++) {
		for(let column=0;column<adjoint.columns;column++) {
			const temp=this.getCofactor(column,row); // get reverse
			adjoint.vector[offset]=((row+column)%2==0)?temp.getDeterminant():-temp.getDeterminant();
			offset++
		}
	}
	return adjoint;
}
Matrix.prototype.getCofactor=function(cellRow,cellColumn){
	const matrixSize=this.rows-1;
	const matrix = new Matrix(matrixSize, matrixSize, null, this.dataType);
	const vec = this.vector, mVec = matrix.vector, cols = this.columns;
	let mOff = 0;
	for (let r = 0; r < this.rows; r++) {
		if (r === cellRow) continue;
		const rOff = r * cols;
		for (let c = 0; c < cols; c++) {
			if (c === cellColumn) continue;
			mVec[mOff++] = vec[rOff + c];
		}
	}
	return matrix;
}
Matrix.prototype.getComplementMinor=function(cellRow, cellColumn){
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
Matrix.prototype.getDeterminant=function(){
	if(this.determinant) return this.determinant
	this.testIsSquare();
	return this.setDeterminant();
}
Matrix.prototype.getDeterminantUsingCofactor=function(){
	this.determinant=0;
	if(this.rows>2) {
		let	sign=1;
		for(let column=0; column<this.columns; column++) {
			this.determinant += sign*this.vector[column]*this.getCofactor(0,column).getDeterminantUsingCofactor();
			sign=-sign;
		}
	} else {
		this.determinant=this.vector[0]*this.vector[3]- this.vector[1]*this.vector[2];
	}
	return this.determinant;
}
Matrix.prototype.getRank = function() {
	const temp = this.clone();
	temp.rowEchelonForm();
	let rank = 0;
	for (let r = 0; r < temp.rows; r++) {
		let isNonZeroRow = false;
		for (let c = 0; c < temp.columns; c++) {
			if (Math.abs(temp.get(r, c)) > zeroFloat32Value) {
				isNonZeroRow = true;
				break;
			}
		}
		if (isNonZeroRow) rank++;
	}
	return rank;
}
Matrix.prototype.getDeterminantUsingRowEchelonForm=function(){
	if(this.rows==1) return this.vector[0];
	const matrix=this.clone();
	matrix.determinant=parseFloat(1); //force use of float
	matrix.rowEchelonForm();
	this.determinant=1/matrix.determinant;
	return this.determinant;
}
Matrix.prototype.getDiagonal = function() {
	const size = Math.min(this.rows, this.columns);
	const result = new typedArrays[this.dataType](size);
	for (let i = 0; i < size; i++) {
		result[i] = this.get(i, i);
	}
	return result;
}
Matrix.prototype.getIdentity=function(){
	const identity=this.createLike();
	for(let offset=0;offset<identity.size;offset+=identity.columns+1) identity.vector[offset]=1;
	return identity;
}
Matrix.prototype.getIndex=function(row, column){
	return row*this.columns+column;
}
Matrix.prototype.getInverse=Matrix.prototype.getInverseGaussJordan;
Matrix.prototype.getInverseAdjointMethod=function(){
    const determinant=this.getDeterminant();
	if(determinant==0) throw Error("Singular matrix, can't find its inverse");
	const adjoint=this.getAdjoint();
	for(let offset=0;offset<adjoint.size;offset++) {
		adjoint.vector[offset]/=determinant;
	}
	return adjoint;
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
Matrix.prototype.getVandermonde=function(vectorIn,columns){
    const matrix = new Matrix(vectorIn.length,columns);
	matrix.forEachCell((cell,row,column,vector,offset,object)=>vector[offset]=vectorIn[row]**column)
	return matrix;
}
Matrix.prototype.getZeroed=function(row, column){
	const offset=row*this.columns+column;
	const value=this.vector[offset];
	if(value==0 || Math.abs(value)>zeroFloat32Value) return value; 
	this.vector[offset]=0;
	return 0;
}
Matrix.prototype.maxAbsColumn=function(column,startRow=0){
	let rowColumnOffset=startRow*this.columns+column;
	let maxValue=Math.abs(this.vector[rowColumnOffset]);
	rowColumnOffset+=this.columns;
	while (rowColumnOffset<this.size) {
		const value=Math.abs(this.vector[rowColumnOffset])
		if(value>maxValue) {
			maxValue=value;
			maxRowColumnOffset=rowColumnOffset;
		};
		rowColumnOffset+=this.columns;
	}
	return {row:(maxRowColumnOffset-column)/this.columns,value:this.vector[maxRowColumnOffset]}
}
Matrix.prototype.maxColumn=function(column,startRow=0){
	let rowColumnOffset=startRow*this.columns+column;
	let maxValue=this.vector[rowColumnOffset];
	rowColumnOffset+=this.columns;
	while (rowColumnOffset<this.size) {
		const value=this.vector[rowColumnOffset];
		if(value>maxValue) {
			maxValue=value;
			maxRowColumnOffset=rowColumnOffset;
		};
		rowColumnOffset+=this.columns;
	}
	return {row:(maxRowColumnOffset-column)/this.columns,value:this.vector[maxRowColumnOffset]}
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
Matrix.prototype.multiplyScalar = function(factor) {
	for (let i = 0; i < this.size; i++) this.vector[i] *= factor;
	return this;
}
Matrix.prototype.reshape = function(rows, columns) {
	if (rows * columns !== this.size) throw Error("New dimensions must maintain same size");
	this.rows = rows;
	this.columns = columns;
	return this;
}
Matrix.prototype.setMatrix = function(matrix, row, column) {
	const mRows = matrix.rows, mCols = matrix.columns, cols = this.columns;
	const vec = this.vector, mVec = matrix.vector;
	for (let r = 0; r < mRows; r++) {
		if (row + r >= this.rows) break;
		const length = Math.min(mCols, cols - column);
		if (length > 0) vec.set(mVec.subarray(r * mCols, r * mCols + length), (row + r) * cols + column);
	}
	return this;
}
Matrix.prototype.multiplyRow=function(row,factor){
	this.determinant*=factor;
	this.forRowCells(row,(cell,column,offset,vector)=>vector[offset]*=factor)
	return this;
}
Matrix.prototype.norm=function(){
	const vec = this.vector;
	let sumSq = 0;
	for (let i = 0, len = this.size; i < len; i++) {
		const val = vec[i];
		sumSq += val * val;
	}
	return Math.sqrt(sumSq);
}
Matrix.prototype.hadamardProduct = function(matrix) {
	this.forEachCellPairSet(matrix, (cellA, cellB) => cellA * cellB);
	return this;
}
Matrix.prototype.frobeniusInnerProduct = function(matrix) {
	if (this.rows !== matrix.rows || this.columns !== matrix.columns) {
		throw Error("Dimensions must match for Frobenius inner product");
	}
	let sum = 0;
	const vecA = this.vector, vecB = matrix.vector;
	for (let i = 0, len = this.size; i < len; i++) sum += vecA[i] * vecB[i];
	return sum;
}
Matrix.prototype.luDecomposition = function() {
	this.testIsSquare();
	const n = this.rows;
	const L = new Matrix(n, n, null, this.dataType).setIdentity();
	const U = this.clone();
	const uVec = U.vector, lVec = L.vector;

	for (let i = 0; i < n; i++) {
		const iOff = i * n;
		const pivot = uVec[iOff + i];
		if (Math.abs(pivot) < zeroFloat32Value) throw Error("Zero pivot in LU decomposition");
		for (let j = i + 1; j < n; j++) {
			const jOff = j * n;
			const factor = uVec[jOff + i] / pivot;
			lVec[jOff + i] = factor;
			for (let k = i; k < n; k++) uVec[jOff + k] -= factor * uVec[iOff + k];
		}
	}
	return { L, U };
}
Matrix.prototype.getTrace = function() {
	this.testIsSquare();
	let trace = 0;
	for (let i = 0; i < this.rows; i++) {
		trace += this.get(i, i);
	}
	return trace;
}
Matrix.prototype.reduce=function(call,aggregate=0){
	this.forEachCell((cell,row,column,vector,offset,object)=>
		aggregate=call.apply(this,[aggregate,cell,row,column,vector,offset,object])
	);
	return aggregate;
}
Matrix.prototype.reducedRowEchelonForm=function(){
	const lastColumn=this.columns-1;
    for(let pivotColumn=0,pivotRow=0;pivotRow<this.rows;pivotRow++){
        if(this.rows<=pivotRow) throw Error("logic error")
        let row=pivotRow;
        while(this.getZeroed(row,pivotColumn)==0){
            row++
            if(this.rows==row){
                row=pivotRow;
                pivotColumn++
                if(pivotColumn>=this.columns) {
					if(row==this.rows-1) return this;
					throw Error("row all zeroes which is not last row")
				}
			}
		}
		if(row!==pivotRow) this.swapRows(row,pivotRow)
		const factor=this.get(pivotRow,pivotColumn)
		for(let column=pivotColumn;column<this.columns;column++)
        	this.divideCell(pivotRow,column,factor)
		if(pivotColumn==lastColumn) break;
		for(let row=0;row<this.rows;row++){
			if(row==pivotRow) continue;
			const factor=-this.getZeroed(row,pivotColumn);
			if(factor==0) continue;
			for(let column=pivotColumn;column<this.columns;column++){
				const value=this.get(pivotRow,column);
				if(value)
					this.addCell(row,column,factor*value)
			}
		}
  		if(++pivotColumn>this.columns) break;
	}
	return this;
}
Matrix.prototype.rowEchelonForm=function(){
	const columns=this.columns;
    let pivotRow=0,pivotColumn=0,lastRowAdj=this.rows-1;
    nextPivot: while(pivotRow<=lastRowAdj & pivotColumn<columns){
		let pivotValue=this.getZeroed(pivotRow, pivotColumn);
		if(pivotValue==0) {
			const i=this.findRowColumn(pivotRow,value=>Math.abs(value)>zeroFloat32Value,pivotColumn+1,lastRowAdj)  //none zeroe?
			if(i==-1){
				if(pivotRow==lastRowAdj) {
					pivotColumn++;				
					continue nextPivot;
				}
				this.swapRows(pivotRow,lastRowAdj--);
				if(lastRowAdj<=1) return this;
        	    continue nextPivot;
			}
  			const row=this.findColumnRow(pivotColumn,value=>Math.abs(value)>zeroFloat32Value,pivotRow+1,lastRowAdj);
			if(row==-1) {
				pivotColumn++;				
        	    continue nextPivot;
			}
        	this.swapRows(pivotRow,row);
			pivotValue=this.get(pivotRow, pivotColumn);
		}
		this.divideRow(pivotRow,pivotValue,pivotColumn);
		for(let row=pivotRow+1; row<=lastRowAdj; row++) {
			const factor=-this.get(row, pivotColumn);
			this.addRow2Row(pivotRow,row,factor,pivotColumn);
		}
        pivotRow++;
		pivotColumn++;		
	}
	return this;
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
Matrix.prototype.setAll=function(call){
	for(let offset=0,row=0;row<this.rows;row++) {
		for(let column=0;column<this.columns;column++) {
			this.vector[offset]=call.apply(this,[row,column,this.vector[offset],this.vector,offset,this]);
			offset++
		}
	}
	this.rows=this.rowsMax
	this.size=this.sizeMax
	return this;
}
Matrix.prototype.setDeterminant=function(){
	this.determinant=this.getDeterminantUsingRowEchelonForm();
	return this.determinant;
}
Matrix.prototype.setIdentity=function(){
	if(this.columns != (this.rowsMax || this.rows)) throw Error("not square matrix");
	this.setZero()
	for(let offset=0;offset<this.size;offset+=this.columns+1) this.vector[offset]=1;
	return this;
}
Matrix.prototype.setWithFunction=function(f){
	this.vector[f](this.sizeMax)
	if (this.rowsMax != null) this.rows = this.rowsMax;
	if (this.sizeMax != null) this.size = this.sizeMax;
	return this;
}
Matrix.prototype.setOne=function(){
    return this.setWithFunction("setOne")
}
Matrix.prototype.setRandom=function(){
    return this.setWithFunction("setRandom")
}
Matrix.prototype.setRow=function(vector,row){
	this.vector.set(vector, row*this.columns);
	return this;
}
Matrix.prototype.setRunningSum=function(){
	this.forEachCellLowerTriangle((cell,row,column,vector,offset,object)=>vector[offset]=1);
}
Matrix.prototype.setZero=function(){
	return this.setWithFunction("setZero")
}
Matrix.prototype.substract=function(matrix){
	if (matrix instanceof Matrix && this.rows === matrix.rows && this.columns === matrix.columns) {
		const vecA = this.vector, vecB = matrix.vector;
		for (let i = 0, len = this.size; i < len; i++) vecA[i] -= vecB[i];
	} else {
		this.forEachCellPairSet(matrix, (cellA, cellB) => cellA - cellB);
	}
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
Matrix.prototype.isSquare=function(){
	return this.rows==this.columns;
}
Matrix.prototype.isSymmetric = function(precision = 6) {
	if (this.rows !== this.columns) return false;
	for (let r = 0; r < this.rows; r++) {
		for (let c = r + 1; c < this.columns; c++) {
			if (this.get(r, c).toFixed(precision) !== this.get(c, r).toFixed(precision)) return false;
		}
	}
	return true;
}
Matrix.prototype.toArray=function(precision=6){
	const result=[];
	this.forEachRow((row,index)=>{
		const columns=[];
		row.forEach(value=>columns.push(value))
		result.push(columns)
	})
	return result;
}
Matrix.prototype.transpose=function(){
	const rows = this.rows, cols = this.columns;
	const matrix = new Matrix(cols, rows, null, this.dataType);
	const resVec = matrix.vector, thisVec = this.vector;
	for (let r = 0; r < rows; r++) {
		const rOff = r * cols;
		for (let c = 0; c < cols; c++) {
			resVec[c * rows + r] = thisVec[rOff + c];
		}
	}
	return matrix;
}
module.exports=Matrix;
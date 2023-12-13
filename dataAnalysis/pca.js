require("./arrayAllRowsSwap");
require("./arrayForEachRange.js");
require("./arrayReduceRange.js");
require("./arrayScale.js");
require("./arraySwap.js");
require("./arraySum.js");
require("./arraySumSquared.js");
const generatedMatrixFunction = require("./generateMatrixFunction");
const generateVectorFunction=require("./generateVectorFunction.js")

function PCA() { //Principal Component Analysis 
}
PCA.prototype.rowType=Array;
PCA.prototype.getDeviationMatrix=function(matrix) {
    const rows=matrix.length;
    const onesMatrix=this.getMatrix(rows,rows,1);
    const scaled=this.scale(this.multiply(onesMatrix, matrix),1/rows)
    return this.subtract(matrix, scaled);
}
PCA.prototype.getDeviationScores=function(deviation) {
    const transposed=this.transpose(deviation)
    return this.multiply(transposed, deviation);
}
PCA.prototype.getVarianceCovariance=function(devSumOfSquares, sample) {
    return this.scale(devSumOfSquares, 1/devSumOfSquares.length);
}
PCA.prototype.getVarianceCovarianceSample=function(devSumOfSquares) {
    const factor=devSumOfSquares.length-1
    return this.scale(devSumOfSquares, 1/factor);
}

PCA.prototype.getAdjustedData=function(data, ...vectorObjs){ //  reduced after removing some dimensions
    const vectors = vectorObjs.map((v)=>v.vector);
    const matrixMinusMean = this.getDeviationMatrix(data);
    const adjustedData = this.multiply(vectors, this.transpose(matrixMinusMean));
    const rows=data.length
    const avgData =this.scale(multiply(this.getMatrix(rows,rows,1),data), -1/rows); //NOTE get the averages to add back
    return {
        adjustedData: adjustedData,
        formattedAdjustedData:formatData(adjustedData, 2),
        avgData: avgData,
        selectedVectors: vectors
    };
}
// Get original data set from reduced data set (decompress)
PCA.prototype.getOriginalData=function(adjustedData, vectors, avgData) {
    const originalWithoutMean = this.transpose(multiply(transpose(vectors), adjustedData));
    const originalWithMean = this.subtract(originalWithoutMean, avgData);
    return {
        originalData: originalWithMean,
        formattedOriginalData: this.formatData(originalWithMean, 2)
    }
}
PCA.prototype.getPercentageExplained=function(vectors, ...selected) {
    const total = vectors.map((v)=>v.eigenvalue).sum();
    const explained = selected.map((v)=>v.eigenvalue).sum();
    return (explained / total);
}
PCA.prototype.getEigenVectors=function(data) {
    const deviationMatrix=this.getDeviationMatrix(data);
    const deviationScores=this.getDeviationScores(deviationMatrix)
    const matrix=this.getVarianceCovariance(deviationScores)
    const result = this.svd(matrix);
    const eigenvectors = result.U;
    const eigenvalues = result.S;
    return eigenvalues.map((value,i)=>{
        return {
            eigenvalue:value,
            vector:eigenvectors.map((vector,j)=>-vector[i]) //prevent completely negative vectors
        }
    });
}
PCA.prototype.getTopResult=function(data){
    const eigenVectors = this.getEigenVectors(data);
    const sorted = eigenVectors.sort((a, b)=>b.eigenvalue-a.eigenvalue);
    const selected = sorted[0].vector;
    return this.getAdjustedData(data, selected);
}
PCA.prototype.formatData=function(data, precision) {
    const factor= Math.pow(10, precision || 2);
    return data.map((d,i)=>d.map((n)=>Math.round(n * factor) / factor))
}
PCA.prototype.testIsMatrix=(a)=>{
    if(!(a instanceof Array)) throw Error("Not matrix at row level, found type of "+typeof a)
    const row=a[0];
    if(row instanceof Array) return; 
    if(row instanceof this.rowType) return; 
    throw Error("Not matrix at column level, found type of "+typeof a[0])
}
const sumVector1=generateVectorFunction({
    code:"returnValue+=vector[index]*matrix[index][col]",
    args:["matrix","col"],
    returnValue:0
})
const multiplyMatrix=generatedMatrixFunction({
    code:"setElement(sumVector1(element,bMatrix,columnOffset));",
    args:["bMatrix"],
    returnValue:"Object.create(Object.getPrototypeOf(matrix))"
})

PCA.prototype.multiply=function(a, b){
    this.testIsMatrix(a);
    this.testIsMatrix(b);
    const rows=a.length;
    if(a[0].length !== b.length) throw Error("Non-conformable matrices, left columns: "+a[0].length+" != right rows "+b.length);
    const columns=b[0].length;
    const result=this.getMatrix(rows,columns);
    for(let ri=0;ri<rows;ri++){
        for(let ci=0;ci<columns;ci++){
            result[ri][ci]=sumVector1(a[ri],b,ci);
//            result[ri][ci]=a[ri].reduce((sum,value,rci)=>sum+value*b[rci][ci],0);
        }
    }
    return result
}

PCA.prototype.subtract=function(a,b) {
    if(!(a.length === b.length && a[0].length === b[0].length)) throw Error('Both A and B should have the same dimensions');
    const rows=a.length;
    const columns=a[0].length;
    const result=this.getMatrix(rows,columns);
    for(let ri=0;ri<rows;ri++){
        for(let ci=0;ci<columns;ci++){
            result[ri][ci]=a[ri][ci]-b[ri][ci];
        }
    }
    return result
}
function mapMatrix(matrix,callFunction) {
    if(callFunction)
        return matrix.map((row,ri)=>row.map((cell,ci)=>callFunction(cell,ri,ci,matrix)));
    return this.cloneMatrix(matrix);
};

const mapVector=generateVectorFunction({
    code:"vector[index]=fromVector[index]",
    args:["fromVector"],
});

const cloneVector=generateVectorFunction({
    code:"returnValue[index]=vector[index]",
    args:["type=Array"],
});

function cloneMatrix(matrix){
    const columns=matrix.length
    const rows=matrix[0].length
    const result=new Array(rows)
    for(let ri=0;ri<rows;ri++){
        const row=new this.rowType(columns);
        mapVector(row,matrix[ri]);
        result[ri]=row;
    }
    return result;
}
const transposeVector=generateVectorFunction({
    code:"vector[index]=fromVector[index][column]",
    args:["fromVector","column"],
});
//const mapVector=generateVectorFunction("returnValue[index]=vector[index]",[])
PCA.prototype.map=mapMatrix;
PCA.prototype.cloneMatrix=cloneMatrix;
PCA.prototype.mapTranspose=function(matrix) {
    const columns=matrix.length
    const rows=matrix[0].length
    const result=new this.rowType(rows)
    for(let ri=0;ri<rows;ri++){
        const row=new this.rowType(columns);
        transposeVector(row,matrix,ri)
        result[ri]=row;
    }
    return result;
}
PCA.prototype.transpose=PCA.prototype.mapTranspose
PCA.prototype.forEachRow=function(matrix,callFunction) {
    matrix.forEach(row,RowIndex=>callFunction(row,rowIndex,matrix))
    return this
}
PCA.prototype.forEachRowColumn=function(matrix,rowIndex,callFunction) {
    const row=matrix[rowIndex];
    const columns=row[0].length;
    for(let columnIndex=0;columnIndex<columns;columnIndex++)
        callFunction(row[columnIndex],rowIndex,columnIndex,matrix)
    return this
}

PCA.prototype.forEachColumn=function(matrix,columnIndex,callFunction) {
    const rows=matrix.length;
    for(let rowIndex=0;rowIndex<rows;rowIndex++)
        callFunction(matrix[rowIndex][columnIndex],rowIndex,columnIndex,matrix)
    return this
}
PCA.prototype.forEachCell=function(matrix,callFunction) {
    const rows=matrix.length;
    const columns=matrix[0].length;
    for(let rowIndex=0;rowIndex<rows;rowIndex++){
        const row=matrix[rowIndex];
        for(let columnIndex=0;columnIndex<columns;columnIndex++)
            callFunction(row[columnIndex],rowIndex,columnIndex,matrix)
    }
    return this
}
PCA.prototype.forEachSetCell=function(matrix,callFunction) {
    const rows=matrix.length;
    const columns=matrix[0].length;
    for(let rowIndex=0;rowIndex<rows;rowIndex++){
        const row=matrix[rowIndex];
        for(let columnIndex=0;columnIndex<columns;columnIndex++)
            row[columnIndex]=callFunction(rowIndex,columnIndex,cell,row,matrix)
    }
    return this
}
PCA.prototype.scale=function(matrix,factor){return this.map(matrix,c=>c*factor)};

function getMatrix(rows=2,columns=rows,fill=0) {
    const matrix=new Array(rows);
    for(let i=0; i<rows; i++) matrix[i]=new this.rowType(columns).fill(fill);
    return matrix;
}

PCA.prototype.getMatrix=getMatrix

PCA.prototype.pythag=(a,b)=>{
    if(b == 0.0) return a
    const a2 = a**2
    const b2 = b**2
    return a > b ? a * Math.sqrt(1.0 + b2/a2) : b * Math.sqrt(1.0 + a2/b2)
};
PCA.prototype.rep=function(s,v,k=0){
    const n=s[k],returnVector=new this.rowType(n).fill(0);
    if(k === s.length-1){
        returnVector.fill(v,0,n-1)
    } else {
        const kPlusOne=k+1;
        for(let i=n-1;i>=0;i--) returnVector[i]=this.rep(s,v,kPlusOne);
    }
    return returnVector;
 }
module.exports = PCA;

PCA.prototype.getDeterminant=function(matrix){
  const result = this.getDecomposed(matrix);
  return result.lum.product()*result.toggle;
}
PCA.prototype.getDecomposed=function(matrix){
  // Crout's LU decomposition for matrix determinant and inverse
  // lum is lower & upper matrix
  // perm is row permuations vector
  const rows = matrix.length, rowsMinus1 = rows-1;
  const perm = new this.rowType(rows).fill(0.0);
  let toggle = +1; // even (+1) or odd (-1) row permutatuions
  const result=Object.assign([],matrix);
  const lum=Object.assign([],matrix);

  for(let ri=0; ri<rows; ++ri) perm[ri]=ri
  let piv=rows;
  for(let j=0; j<rowsMinus1; ++j) { 
    const lumRowJ=lum[j];
    let max = Math.abs(lumRowJ[j]);
    for(let ri=j+1; ri<rows; ++ri) {  // pivot index
      const xrij = Math.abs(lum[ri][j]);
      if(xrij > max) {
        max = xrij;
        piv = ri;
      }
    }

    if(piv != j) {
      lum.swap(piv,j)
      perm.swap(piv,j);
      toggle = -toggle;
    }
    const xjj = lumRowJ[j];
    if(xjj !== 0.0) {  
      for(let i=j+1; i<rows; ++i) {
        const lumRow=lum[i]
        const xij = lumRow[j]/xjj;
        lumRow[j] = xij;
        for(let ci=0; ci<columns; ++ci) lumRow[ci] -= xij*lumRowJ[ci]
      }
    }
  }
  return {toggle:toggle,lum:lum,perm:perm}
}

PCA.prototype.getReduced=function(lum, b){
  const rows = lum.length, rowsMinus1 = rows-1;
  const x=new this.rowType(n).fill(0.0)
  let sum;
  for(let ri=0; ri<rows; ++ri) x[ri]=b[ri];
  for(let ri=1; ri<rows; ++ri) {
    const lumRow=lum[ri];
    sum=x[ri];
    for(let ci=0;ci<columns;ci++) sum-=lumRow[ci]*x[ci];
    x[ri]=sum;
  }
  x[rowsMinus1] /= lum[rowsMinus1][rowsMinus1];
  for (let ri=rows-2; ri>0; --ri) {
    sum=x[ri];
    for(let ci=0;ci<columns;ci++) sum-=lumRow[ci]*x[ci];
    x[ri]=sum/lumRow[ri];
  }
  return x;
}

function svd(matrix) {//singular value decomposition 
    const eps=this.rowType instanceof Float64Array?
        2**-52:
        this.rowType instanceof Float32Array?2**-23:Number.EPSILON;
    let precision = eps;
    const tolerance = 1.e-64;
    const itmax = 50;
    const rows=matrix.length
    const rowOffsetEnd=rows-1;
    const columns=matrix[0].length;
    const columnOffsetEnd=columns-1;
    if (rows < columns) throw "Need more rows than columns"
    let temp;
    let c= 0;
    let i = 0;
    let j = 0;
    let k = 0;
    let l = 0;
    const u = this.cloneMatrix(matrix);
    const e = new this.rowType(columns).fill(0.0); //vector1
    const q = new this.rowType(columns).fill(0.0); //vector2
    const v = this.rep([columns, columns], 0);
                    //Householder's reduction to bidiagonal form
    let f = 0.0;
    let g = 0.0;
    let h = 0.0;
    let x = 0.0;
    let y = 0.0;
    let z = 0.0;
    let s = 0.0;

    for(i=0; i<columns; i++) {
        e[i] = g; //vector
        const uRow=u[i]
        const iPlus1=i+1;
        const sum=u.reduceRange(i,rowOffsetEnd,(previousValue,row)=>previousValue+row[i]**2)
        if(sum <= tolerance)
            g = 0.0;
        else {
            f = uRow[i];
            g = Math.sqrt(sum)*(f<0?1:-1);
            h = f * g - sum
            uRow[i] = f - g;
            for(j=iPlus1; j<columns; j++) {
                const factor=u.reduceRange(i,rowOffsetEnd,(previousValue,row)=>previousValue+row[i]*row[j])/h;
                for(let ri=i;ri<=rowOffsetEnd;ri++) u[ri][j]+=factor*u[ri][i]
            }
        }
        q[i] = g
        const sumCols=u.reduceRange(iPlus1,columnOffsetEnd,(previousValue,cell,ci)=>previousValue+u[i][ci]**2)
        if(sumCols <= tolerance)
            g = 0.0
        else {
            f = uRow[iPlus1]
            g = Math.sqrt(sumCols) * (f<0? 1:-1)
            h = f * g - sumCols
            uRow[iPlus1] = f - g;
            for(let ci=iPlus1;ci<=columnOffsetEnd;ci++) e[ci]=uRow[ci]/h;
            for(j = iPlus1; j < rows; j++) {
                const uj=u[j];
                const sum=uj.reduceRange(iPlus1,columnOffsetEnd,(previousValue,column,ci)=>previousValue+column*uRow[ci]);
                for(let ci=iPlus1;ci<=columnOffsetEnd;ci++) uj[ci]+=sum*e[ci];           }
        }
        y = Math.abs(q[i]) + Math.abs(e[i])
        if(y>x) x=y
    }
    l=columns;
    // accumulation of right hand transformations
    for(i=columnOffsetEnd; i != -1; i += -1) {
        if (g != 0.0) {
            const uRow=u[i]
            h = g * uRow[i+1]
            for(j=l; j<columns; j++)
                v[j][i] = uRow[j] / h //u is array, v is square of columns
            for(j=l; j < columns; j++) {
                const sum=v.reduceRange(l,columnOffsetEnd,(previousValue,row,ri)=>previousValue+u[i][ri] * row[j])
                for(let ci=l;ci<columns;ci++){
                    const vRow=v[ci];
                    vRow[j]+=vRow[i]*sum
                }
            }
        }
        const vRow=v[i]
        for(j=l; j<columns; j++) {
            vRow[j] = 0;
            v[j][i] = 0;
        }
        vRow[i] = 1;
        g = e[i]
        l = i
    }

    // accumulation of left hand transformations
    for (i = columns - 1; i != -1; i += -1) {
        l = i + 1
        g = q[i]
        const uRow=u[i];
        for(j=l; j<columns; j++) uRow[j]=0;
        if (g != 0.0)
            for(let i=0;i<rows;i++) u[i][i];
        else {
            h = uRow[i] * g
            for (j = l; j < columns; j++) {
                const factor=u.reduceRange(l,rowOffsetEnd,(previousValue,row)=>previousValue+row[i]*row[j])/h;
                for(let ci=i;ci<=rowOffsetEnd;ci++){
                    const row=u[ci];
                    row[j]+=row[i]*factor
                }
            }
            for(let ri=i;ri<=rowOffsetEnd;ri++) u[ri][i]/=g;
        } 
        uRow[i]++;
    }

    // diagonalization of the bidiagonal form
    precision = precision * x;
    for (k = columns - 1; k != -1; k += -1) {
        for (var iteration = 0; iteration < itmax; iteration++) { // test f splitting
            let test_convergence = false
            for (l=k; l>=0; l--) {
                if (Math.abs(e[l]) <= precision) {
                    test_convergence = true
                    break
                }
                if (Math.abs(q[l - 1]) <= precision)
                    break
            }
            if (!test_convergence) { // cancellation of e[l] if l>0
                c = 0.0
                s = 1.0
                const l1 = l - 1
                for(i=l; i<=k; i++) {
                    const ei=e[i];
                    f = s * ei
                    e[i] = c * ei
                    if (Math.abs(f) <= precision)
                        break
                    g = q[i]
                    h = this.pythag(f, g)
                    q[i] = h
                    c = g / h
                    s = -f / h
                    for(let ci=l;ci<=columnOffsetEnd;ci++){
                        const row=u[ci];
                        const cl1 = row[l1]
                        const ci = row[i]
                        row[l1] = cl1 * c + (ci * s)
                        row[i] = -cl1 * s + (ci * c)
                    }
                }
            }
            // test f convergence
            z = q[k]
            if(l == k) { //convergence
                if(z < 0.0) { //q[k] is made non-negative
                    q[k] = -z
                    for(let ci=l;ci<=columnOffsetEnd;ci++) v[ci][k]*=-1;
                }
                break //break out of iteration loop and move on to next k value
            }
            if(iteration >= itmax - 1)
                throw 'Error: no convergence.'
            // shift from bottom 2x2 minor
            x = q[l]
            const kMinus1=k-1;
            y = q[kMinus1]
            g = e[kMinus1]
            h = e[k]
            const z2=z**2
            f = ((y**2 - z2 + g**2 - h*h)) / (2.0 * h * y)
            g = this.pythag(f, 1.0)
            const fg=f+f< 0.0?-g:g;
            f = (x**2 - z2 + h * (y / fg - h)) / x
            // next QR transformation
            c = 1.0
            s = 1.0
            for(i=l+1; i <= k; i++) {
                const iMinus1=i-1;
                g = e[i]
                y = q[i]
                h = s * g
                g = c * g
                z = this.pythag(f, h)
                e[iMinus1] = z
                c = f / z
                s = h / z
                f = x * c + g * s
                g = -x * s + g * c
                h = y * s
                y = y * c
                for(j=0; j<columns; j++) {
                    const row=v[j];
                    x = row[iMinus1]
                    z = row[i]
                    row[iMinus1] = x * c + z * s
                    row[i] = -x * s + z * c
                }
                z = this.pythag(f, h)
                q[iMinus1] = z
                c = f / z
                s = h / z
                f = c * g + s * y
                x = -s * g + c * y
                for(j=0; j<rows; j++) {
                    const row=u[j];
                    y = row[iMinus1]
                    z = row[i]
                    row[iMinus1] = y * c + z * s
                    row[i] = -y * s + z * c
                }
            }
            e[l] = 0.0
            e[k] = f
            q[k] = x
        }
    }
    const ql=q.length;
    for(i=0; i<ql; i++) if(q[i]<precision) q[i]=0;

    //sort eigenvalues	
    for(i=0; i<columns; i++) {
        for(j=i-1; j>=0; j--) {
            const qj=q[j];
            const qi=q[i]
            if(qj < qi) {
                c = qj
                q[j] = qi
                q[i] = c
                u.allRowsSwap(i,j);
                v.allRowsSwap(i,j);
                i=j
            }
        }
    }
    return {
        U: u,
        S: q,
        V: v
    }
}
PCA.prototype.svd=svd;
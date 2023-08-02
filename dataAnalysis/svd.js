// SVD Singular Value Decomposition and Least Squares Solutions

require("./arrayForEachRange.js");
require("./arrayReduceRange.js");
require("./arraySwap.js");
require("./arrayOverlay.js");

function getMatrix(rows=2,columns=rows,fill=0,rowType=Float32Array) {
    const matrix=Array(rows);
    for(let i=0; i<rows; i++) matrix[i]=new rowType(columns).fill(fill);
    return matrix;
}

/*
 *   matrix = U * diag(q) * V(t), U(t) * U = V(t) * V = I
 */
const SVD = (matrix, orthonormalizedColumns=true, orthogonalMatrix=true,rowType=Float64Array) => {
    let eps=rowType instanceof Float64Array?
        Math.pow(2, -52):
        rowType instanceof Float32Array?Math.pow(2, -23):Number.EPSILON;
    tolerance = 1e-64 / eps
    if(!matrix) throw new TypeError('Matrix is not defined')
    const columns=matrix[0].length;
    const rows = matrix.length;
    if(rows < columns) throw new TypeError('Invalid matrix for SVD: rows < columns')
    const columnEndOffset=columns-1;
    const rowEndOffset=rows-1;

    let i, j, k, l,c, f, g=0, h, s, x=0, y, z
    const e = [];
    const rowsOrColumns = (orthonormalizedColumns === 'f') ? rows : columns
    const u=getMatrix(rows,rowsOrColumns);
    const v=getMatrix(columns,columns);
    const q = new rowType(columns).fill(0)
    u.overlay(matrix);
  
    for(i = 0; i < columns; i++) {
      const ui=u[i];
      e[i] = g
      const iPlus1=i+1;
      const sumSqCol=u.reduceRange(i,rowEndOffset,(previousValue,row)=>previousValue+Math.pow(row[i],2));
      if(sumSqCol < tolerance) {
        g = 0
      } else {
        const uii = ui[i]
        g = uii < 0 ? Math.sqrt(sumSqCol) : -Math.sqrt(sumSqCol)
        h = uii * g - sumSqCol
        ui[i]-= g
        for(j = iPlus1; j < columns; j++) {
          const factor=u.reduceRange(i,rowEndOffset,(previousValue,row)=>previousValue+row[i]*row[j])/h;
          u.forEachRange(i,rowEndOffset,row=>row[j]+=factor * row[i])
        }
      }
      q[i] = g

      const sumSqRow=ui.reduceRange(iPlus1,columnEndOffset,(previousValue,cell)=>previousValue+cell*cell);
      if(sumSqRow < tolerance) {
        g = 0
      } else {
        f = ui[iPlus1]
        g = f < 0 ? Math.sqrt(sumSqRow) : -Math.sqrt(sumSqRow)
        h = f * g - sumSqRow
        ui[iPlus1] -= g
        ui.forEachRange(iPlus1,columnEndOffset,(cell,columnIndex)=>e[columnIndex]=cell/h)
        u.forEachRange(iPlus1,rowEndOffset,row=>{
            const factor=ui.reduceRange(iPlus1,columnEndOffset,(previousValue,cell,columnIndex)=>previousValue+row[columnIndex]*cell);
            row.forEachRange(iPlus1,columnEndOffset,(cell,columnIndex)=>row[columnIndex]+=factor*e[columnIndex])
        })
      }
      y = Math.abs(q[i]) + Math.abs(e[i])
      if(y > x) {
        x = y
      }
    }
  
    // Accumulation of right-hand transformations
    if(orthogonalMatrix) {
      l=columns;
      for(i = columns - 1; i >= 0; i--) {
        const ui=u[i];
        const vi=v[i];
        if(g !== 0) {
          h = ui[i+1] * g
          v.forEachRange(l,columnEndOffset,(row,j)=>row[i]=ui[j]/h)
          console.log({l:l,columns:columns})
          for(j = l; j < columns; j++) {
            const sum=ui.reduceRange(l,columnEndOffset,(previousValue,cell,k)=>previousValue+cell*v[k][j]);
            v.forEachRange(l,columnEndOffset,row=>row[j]+= sum*row[i])
          }
        }
        if(l<=columnEndOffset){
            v.forEachRange(l,columnEndOffset,(row,rowIndex)=>{
                vi[rowIndex] = 0;
                row[i] = 0;
            })
        }
        vi[i] = 1
        g = e[i]
        l = i
      }
    }
  
    // Accumulation of left-hand transformations
    if(orthonormalizedColumns) {
      if(orthonormalizedColumns !== true) {
        u.forEachRange(columns,rowEndOffset,(row,rowIndex)=>{
            row.forEachRange(columns,rowEndOffset,(cell,columnIndex)=>row[columnIndex]=0)
            row[rowIndex]=1;
        })
      }
      for(i = columns - 1; i >= 0; i--) {
        l = i + 1
        g = q[i]
        const ui = u[i];

        if(l<rowsOrColumns)
            ui.forEachRange(l,rowsOrColumns-1,(cell,columnIndex,row)=>row[columnIndex]=0)
        if(g !== 0) {
          h = ui[i] * g
          for(j = l; j < rowsOrColumns; j++) {
            f=u.reduceRange(l,rowEndOffset,(previousValue,row)=>previousValue+row[i]*row[j])/h
            u.forEachRange(i,rowEndOffset,row=>row[j]+=f*row[i])
          }
          u.forEachRange(i,rowEndOffset,row=>row[i]/=g)
        } else {
            u.forEachRange(i,rowEndOffset,row=>row[i]=0)
        }
        ui[i]++;
      }
    }
  
    // Diagonalisation of the bidiagonal form
    eps = eps * x
    let testConvergence
    for(k = columns - 1; k >= 0; k--) {
      for(let iteration = 0; iteration < 50; iteration++) { // test-f-splitting
        testConvergence = false
        for (l = k; l >= 0; l--) {
          testConvergence=(Math.abs(e[l])<=eps);
          if(testConvergence) break
          if(Math.abs(q[l - 1]) <= eps) break
        }
        if(!testConvergence) { // cancellation of e[l] if l>0
          c = 0
          s = 1
          const lMinus1 = l - 1;
          try{
            e.forEachRange(l,k+1,(cell,i)=>{
                f = s * cell
                e[i] *= c;
                if(Math.abs(f) <= eps) throw Error("convergence") 
                const qi = q[i]
                const h=Math.sqrt(f*f + qi*qi);
                q[i] = h
                c = g / h
                s = -f / h
                if(orthonormalizedColumns) {
                    v.forEach(row=>{
                        const y = row[lMinus1]
                        const ri = row[i]
                        row[lMinus1] = ri * s + y * c
                        row[i] = ri * c -y * s
                    })
                }
              })
          } catch(ex){
            if(ex.message!="convergence") throw ex;
          }
        }
        z = q[k]
        if(l === k) { // convergence
          if(z < 0) { // q[k] is made non-negative
            q[k] = -z
            if(orthogonalMatrix) v.forEach(row=>row[k]*=-1)
          }
          break // break out of iteration loop and move on to next k value
        }
  
        // Shift from bottom 2x2 minor
        const kMinus1=k-1;
        x = q[l]
        y = q[kMinus1]
        g = e[kMinus1]
        const ek=e[k]
        const zSq=z*z;
        f = (y*y - zSq + g*g - ek*ek ) / (2 * ek * y)
        g = Math.sqrt(f*f + 1)*(f < 0 ?-1:1)
        f = (x*x - zSq + ek * (y /(f+g) - ek)) / x
  
        // Next QR transformation
        c = s= 1;
        for(i = l + 1; i <= k ; i++) {
          const iMinus1=i-1;
          const ei=e[i]
          const qi = q[i]
          h = s * ei
          g = c * ei
          z = Math.sqrt(f * f + h * h)
          e[iMinus1] = z
          c = f / z
          s = h / z
          f = x * c + g * s
          g = -x * s + g * c
          h = qi * s
          y = qi * c
          if(orthogonalMatrix) {
            v.forEach(row=>{
                const columnMinus1 = row[iMinus1]
                const column = row[i]
                row[iMinus1] = columnMinus1 * c + column * s
                row[i] = -columnMinus1 * s + column * c
            })
          }
          z = Math.sqrt(f * f + h * h)
          q[iMinus1] = z
          c = f / z
          s = h / z
          f = c * g + s * y
          x = -s * g + c * y
          if(orthonormalizedColumns) {
            u.forEach(row=>{
                const columnMinus1 = row[iMinus1]
                const column = row[i]
                row[iMinus1] = columnMinus1 * c + column * s
                row[i] = -columnMinus1 * s + column * c
            })
          }
        }
        e[l] = 0
        e[k] = f
        q[k] = x
      }
    }
    q.filter(v=>v<eps).forEach((v,i)=>q[i]=0);   //orthonormalizedColumns=true, orthogonalMatrix=true,
    return {singularValues:q,
        orthonormalizedColumns:orthonormalizedColumns==true?u:null,
        orthogonalMatrix:orthogonalMatrix==true?v:null} 
}
module.exports = SVD;
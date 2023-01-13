function PCA() {
}
PCA.prototype.computeDeviationMatrix=function(matrix) {
    const columns=matrix.length;
    return this.subtract(matrix, this.scale(this.multiply(this.getMatrix(columns,columns,1), matrix), 1/columns));
}
PCA.prototype.computeDeviationScores=function(deviation) {
    return this.multiply(this.transpose(deviation), deviation);
}
PCA.prototype.computeVarianceCovariance=function(devSumOfSquares, sample) {
    return this.scale(devSumOfSquares, 1/devSumOfSquares.length);
}
PCA.prototype.computeVarianceCovarianceSample=function(devSumOfSquares) {
    const factor=devSumOfSquares.length-1
    return this.scale(devSumOfSquares, 1/factor);
}
//     Get reduced dataset after removing some dimensions

PCA.prototype.computeAdjustedData=function(data, ...vectorObjs){
    const vectors = vectorObjs.map((v)=>v.vector);
    const matrixMinusMean = this.computeDeviationMatrix(data);
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
PCA.prototype.computeOriginalData=function(adjustedData, vectors, avgData) {
    const originalWithoutMean = this.transpose(multiply(transpose(vectors), adjustedData));
    const originalWithMean = this.subtract(originalWithoutMean, avgData);
    return {
        originalData: originalWithMean,
        formattedOriginalData: this.formatData(originalWithMean, 2)
    }
}
PCA.prototype.computePercentageExplained=function(vectors, ...selected) {
    const total = vectors.map((v)=>v.eigenvalue).reduce((a,b)=>a+b);
    const explained = selected.map((v)=>v.eigenvalue).reduce((a,b)=>a+b);
    return (explained / total);
}
PCA.prototype.getEigenVectors=function(data) {
    const matrix=this.computeVarianceCovariance(this.computeDeviationScores(this.computeDeviationMatrix(data)))
    const result = this.svd(matrix);
    const eigenvectors = result.U;
    const eigenvalues = result.S;
    return eigenvalues.map((value,i)=>{
        return {
            eigenvalue:value,
            vector:eigenvectors.map((vector,j)=>-vector[i]) //HACK prevent completely negative vectors
        }
    });
}
PCA.prototype.analyseTopResult=function(data){
    const eigenVectors = this.getEigenVectors(data);
    const sorted = this.eigenVectors.sort((a, b)=>b.eigenvalue-a.eigenvalue);
    const selected = sorted[0].vector;
    return this.computeAdjustedData(data, selected);
}
PCA.prototype.formatData=function(data, precision) {
    const factor= Math.pow(10, precision || 2);
    return data.map((d,i)=>d.map((n)=>Math.round(n * factor) / factor))
}
PCA.prototype.testIsMatrix=(a)=>{if(!a[0] || !a.length) throw Error("Not matrix")}
PCA.prototype.multiply=function(a, b){
    this.testIsMatrix(a);
    this.testIsMatrix(b);
    const rows=a.length;
    const columns=b.length;
    if(rows!==b[0].length) throw new Error('Columns in B should be the same as the number of rows in A');
    if(columns!==a[0].length) throw new Error('Columns in A should be the same as the number of rows in B');
    const product=this.getMatrix(rows,columns,0);
    for(let i=0; i<rows; i++) {
        const row=a[i]
        const productRow=product[i];
        for(let j=0; j<rows; j++) {
            for (let k=0; k < columns; k++) {
                productRow[j]+=row[k]*b[k][j];
            }
        }
    }
    return product;
}
PCA.prototype.subtract=function(a,b) {
    if(!(a.length === b.length && a[0].length === b[0].length)) throw Error('Both A and B should have the same dimensions');
    return this.map(a,(cell,row,column)=>a[row][column]-b[row][column])
}
PCA.prototype.map=function(matrix,call=(c)=>c) {
    return matrix.map(
        (row,ri)=>r.map(
            (cell,ci)=>call(cell,ri,ci,matrix)
        )
    )
}
PCA.prototype.clone=PCA.prototype.map
PCA.prototype.mapTranspose=function(matrix,call=(c)=>c) {
    return matrix[0].map(
        (column,ci)=>column.map(
            (row,ri)=>call(row[ri],ci,ri,matrix)
        )
    )
}
PCA.prototype.transpose=PCA.prototype.mapTranspose
PCA.prototype.forEachRow=function(matrix,call) {
    matrix.forEach((row,RowIndex)=>call(row,frowIndex,matrix))
    return this
}
PCA.prototype.forEachCell=function(matrix,call) {
    matrix.forEach(
        (row,rowIndex)=>row.forEach(
            (cell,columnIndex)=>call(cell,rowIndex,columnIndex,matrix)
        )
    )
    return this
}
PCA.prototype.forEachSetCell=function(matrix,call) {
    matrix.forEach(
        (row,rowIndex)=>row.forEach(
            (cell,columnIndex)=>matrix=call(rowIndex,columnIndex,matrix)
        )
    )
    return this
}
PCA.prototype.scale=(matrix,factor)=>this.map(matrix,c=>c*factor);
PCA.prototype.getMatrix=function(rows=2,columns=rows,fill=0) {
    return Array(rows).map(row=>Array(columns).fill(fill));
}
PCA.prototype.svd=function(A) {
        let temp;
        const prec = Math.pow(2, -52) // double presision
        const tolerance = 1.e-64 // precision;
        const itmax = 50;
        let c = 0;
        let i = 0;
        let j = 0;
        let k = 0;
        let l = 0;
        const u = this.clone(A);
        const m = u.length;
        const n = u[0].length;
        if (m < n) throw "Need more rows than columns"

        const e = new Array(n); //vector1
        const q = new Array(n); //vector2
        for (i = 0; i < n; i++) e[i] = q[i] = 0.0;
        var v = rep([n, n], 0);

        function pythag(a, b) {
            a = Math.abs(a)
            b = Math.abs(b)
            if(a > b) return a * Math.sqrt(1.0 + (b * b / a / a))
            if(b == 0.0) return a
            return b * Math.sqrt(1.0 + (a * a / b / b))
        }
        function rep(s, v, k=0) {
            const n=s[k],
                ret=Array(n);
            let i;
            if(k === s.length - 1) {
                for(i=n-2; i >= 0; i-=2) {
                    ret[i+1] = v;
                    ret[i] = v;
                }
                if(i === -1) ret[0] = v;
                return ret;
            }
            const kPlusOne=k++;
            for (i= n-1; i>=0; i--) {
                ret[i] = rep(s, v, kPlusOne);
            }
            return ret;
        }
        let f = 0.0;
        let g = 0.0;
        let h = 0.0;
        let x = 0.0;
        let y = 0.0;
        let z = 0.0;
        let s = 0.0;

        for(i=0; i<n; i++) {
            e[i] = g; //vector
            s = 0.0; //sum
            l = i+1; //stays i+1
            for(j=i; j<m; j++)
                s += (u[j][i] * u[j][i]);
            if(s <= tolerance)
                g = 0.0;
            else {
                f = u[i][i];
                g = Math.sqrt(s);
                if(f >= 0.0) g = -g;
                h = f * g - s
                u[i][i] = f - g;
                for(j=l; j<n; j++) {
                    s = 0.0
                    for(k=i; k < m; k++)
                        s += u[k][i] * u[k][j]
                    f = s / h
                    for(k=i; k<m; k++)
                        u[k][j] += f * u[k][i]
                }
            }
            q[i] = g
            s = 0.0
            for(j=l; j<n; j++)
                s = s + u[i][j] * u[i][j]
            if (s <= tolerance)
                g = 0.0
            else {
                f = u[i][i + 1]
                g = Math.sqrt(s)
                if (f >= 0.0) g = -g
                h = f * g - s
                u[i][i + 1] = f - g;
                for(j=l; j < n; j++) e[j] = u[i][j] / h
                for(j=l; j < m; j++) {
                    s = 0.0
                    for(k=l; k<n; k++)
                        s += (u[j][k] * u[i][k])
                    for(k=l; k<n; k++)
                        u[j][k] += s * e[k]
                }
            }
            y = Math.abs(q[i]) + Math.abs(e[i])
            if(y > x)
                x = y
        }

        // accumulation of right hand transformations
        for(i = n-1; i!=-1; i--) {
            if (g != 0.0) {
                h = g * u[i][i + 1]
                for (j = l; j < n; j++)
                    v[j][i] = u[i][j] / h //u is array, v is square of columns
                for (j = l; j < n; j++) {
                    s = 0.0
                    for (k = l; k < n; k++)
                        s += u[i][k] * v[k][j]
                    for (k = l; k < n; k++)
                        v[k][j] += (s * v[k][i])
                }
            }
            for (j = l; j < n; j++) {
                v[i][j] = 0;
                v[j][i] = 0;
            }
            v[i][i] = 1;
            g = e[i]
            l = i
        }

        // accumulation of left hand transformations
        for(i=n-1; i != -1; i += -1) {
            l = i + 1
            g = q[i]
            for (j = l; j < n; j++)
                u[i][j] = 0;
            if (g != 0.0) {
                h = u[i][i] * g
                for (j = l; j < n; j++) {
                    s = 0.0
                    for (k = l; k < m; k++) s += u[k][i] * u[k][j];
                    f = s / h
                    for (k = i; k < m; k++) u[k][j] += f * u[k][i];
                }
                for (j = i; j < m; j++) u[j][i] = u[j][i] / g;
            } else
                for (j = i; j < m; j++) u[j][i] = 0;
            u[i][i] += 1;
        }

        // diagonalization of the bidiagonal form
        prec = prec * x
        for(k=n-1; k != -1; k--) {
            const kPlusOne=k+1;
            const kMinusOne=k-1;
            for(let iteration = 0; iteration < itmax; iteration++) { // test f splitting
                let test_convergence = false
                for(l=k; l != -1; l--) {
                    if(Math.abs(e[l]) <= prec) {
                        test_convergence = true
                        break
                    }
                    if (Math.abs(q[l - 1]) <= prec)
                        break
                }
                if (!test_convergence) { // cancellation of e[l] if l>0
                    c = 0.0
                    s = 1.0
                    const l1 = l - 1
                    for(i=l; i<kPlusOne; i++) {
                        f = s * e[i]
                        e[i] = c * e[i]
                        if (Math.abs(f) <= prec)
                            break
                        g = q[i]
                        h = pythag(f, g)
                        q[i] = h
                        c = g / h
                        s = -f / h
                        for(j = 0; j<m; j++) {
                            y = u[j][l1]
                            z = u[j][i]
                            u[j][l1] = y * c + (z * s)
                            u[j][i] = -y * s + (z * c)
                        }
                    }
                }
                // test f convergence
                z = q[k]
                if(l == k) { //convergence
                    if(z < 0.0) { //q[k] is made non-negative
                        q[k] = -z
                        for (j=0; j<n; j++)
                            v[j][k] = -v[j][k]
                    }
                    break //break out of iteration loop and move on to next k value
                }
                if (iteration >= itmax - 1)
                    throw 'Error: no convergence.'
                // shift from bottom 2x2 minor
                x = q[l]
                y = q[kMinusOne]
                g = e[kMinusOne]
                h = e[k]
                f = ((y - z) * (y + z) + (g - h) * (g + h)) / (2.0 * h * y)
                g = pythag(f, 1.0)
                if(f < 0.0)
                    f = ((x - z) * (x + z) + h * (y / (f - g) - h)) / x
                else
                    f = ((x - z) * (x + z) + h * (y / (f + g) - h)) / x
                // next QR transformation
                c = 1.0
                s = 1.0
                for(i=l+1; i<kPlusOne; i++) {
                    g = e[i]
                    y = q[i]
                    h = s * g
                    g = c * g
                    z = pythag(f, h)
                    e[i - 1] = z
                    c = f / z
                    s = h / z
                    f = x * c + g * s
                    g = -x * s + g * c
                    h = y * s
                    y = y * c
                    for (j = 0; j < n; j++) {
                        x = v[j][i - 1]
                        z = v[j][i]
                        v[j][i - 1] = x * c + z * s
                        v[j][i] = -x * s + z * c
                    }
                    z = pythag(f, h)
                    q[i - 1] = z
                    c = f / z
                    s = h / z
                    f = c * g + s * y
                    x = -s * g + c * y
                    for (j = 0; j < m; j++) {
                        y = u[j][i - 1]
                        z = u[j][i]
                        u[j][i - 1] = y * c + z * s
                        u[j][i] = -y * s + z * c
                    }
                }
                e[l] = 0.0
                e[k] = f
                q[k] = x
            }
        }
        const ql=q.length;
        for(i=0; i<ql; i++)
            if (q[i] < prec) q[i] = 0

        //sort eigenvalues	
        for(i=0; i<n; i++) {
            for(j=i-1; j>=0; j--) {
                if(q[j] < q[i]) {
                    c = q[j]
                    q[j] = q[i]
                    q[i] = c
                    const ul=u.length;
                    for(k = 0; k< ul; k++) {
                        temp = u[k][i];
                        u[k][i] = u[k][j];
                        u[k][j] = temp;
                    }
                    const vl=v.length;
                    for(k=0; k<vl; k++) {
                        temp = v[k][i];
                        v[k][i] = v[k][j];
                        v[k][j] = temp;
                    }
                    i = j
                }
            }
        }
        return {
            U: u,
            S: q,
            V: v
        }
    }
}

module.exports = PCA;
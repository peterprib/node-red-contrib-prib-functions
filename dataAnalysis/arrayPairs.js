if(Array.prototype.pairs==null)
	Array.prototype.pairs=function (func) {
		const l=this.length,li=l-1;
		if(func) {
			for (let i=0; i<li ; i++) {
				for (let j =i+1; j<l; j++) {
					func(this[i], this[j],i,j,this);
				}
			}
		} else {
			const r=[];
			this.pairs(func===null? (p1,p2,i1,i2)=>r.push([p1,p2,i1,i2]) : (p1,p2)=>r.push([p1,p2]) )
			return r;
		}
	}
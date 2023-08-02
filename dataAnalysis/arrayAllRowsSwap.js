if(Array.prototype.allRowsSwap==null)
	  Object.defineProperty(Array.prototype, "allRowsSwap", {
		  value(x,y) {
			const l=this.length;
			for(let i=0; i<l; i++) {
				const row=this[i]
        		const temp = row[x];
        		row[x] = row[y];
        		row[y] = temp;
			}
  			return this;
		  },
		  writable: true,
		  configurable: true
	  });
if(Array.prototype.swap==null)
	  Object.defineProperty(Array.prototype, "swap", {
		  value(x,y) {
        	const temp = this[x];
        	this[x] = this[y];
        	this[y] = temp;
  			return this;
		  },
		  writable: true,
		  configurable: true
	  });
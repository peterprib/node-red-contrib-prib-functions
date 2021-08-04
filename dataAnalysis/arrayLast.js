if(Array.prototype.last==null)
	Object.defineProperty(Array.prototype, "last", {
		value() {
			return this[this.length-1];
		},
		writable: true,
		configurable: true
	});
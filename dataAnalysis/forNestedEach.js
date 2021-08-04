if(Array.prototype.forNestedEach==null)
	Array.prototype.forNestedEach=function (func,filter,level=[]) {
		const l=level.length;
		if(filter.hasOwnProperty(l)) {
			const e=filter[l];
			const callFilter=(v)=>!e.includes(v);
			this.forEach((element, index, array) => {
				if(callFilter(index)) return;
				if(element instanceof Array) {
					element.forNestedEach(func,filter,level.push(index))
				} else {
					func(element,index,array,level)
				}
			} )
			return
		}
		this.forEach((element, index, array) => {
			if(element instanceof Array) {
				element.forNestedEach(func,filter,level.push(index))
			} else {
				func(element,index,array,level)
			}
		} )
	}
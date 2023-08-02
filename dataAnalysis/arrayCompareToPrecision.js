[Array,Float32Array,Float64Array].forEach(object=>{
	if(object.prototype.compareToPrecision==null)
		Object.defineProperty(object.prototype, "compareToPrecision", {
			value(toArray,precision=6) {
				const basePrecision=Math.pow(10,-precision);
				if(this.length!=toArray.length) throw Error("array length different")
				this.forEach((element,index)=>{
					const toElement=toArray[index];
					if(typeof element !== typeof toElement) throw Error("types no same for "+index)
					if(typeof element == "array"){
						element.compareToPrecision(toElement,precision)
						return
					}
					switch (typeof element) {
					case "array":
						try{
							element.compareRounded(toElement,precision)
						} catch(ex) {
							throw Error(index+","+ex.message)
						}
						return;
					default:
						const diff = Math.abs(element-toElement) ;
//						console.log({diff:diff,basePrecision:basePrecision})
						if(Math.abs(element-toElement)/element > basePrecision)
							throw Error(index+ " failed "+element+" <> "+toElement);
					}
				});
			},
			writable: true,
			configurable: true
		});
		
});

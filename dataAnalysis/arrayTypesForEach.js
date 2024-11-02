const typedArrays= {Array:Array,Int8Array:Int8Array,Uint8Array:Uint8Array,Uint8ClampedArray:Uint8ClampedArray,Int16Array:Int16Array,Uint16Array:Uint16Array,
    Int32Array:Int32Array,Uint32Array:Uint32Array,Float32Array:Float32Array,
    Float64Array:Float64Array,BigInt64Array:BigInt64Array,BigUint64Array:BigUint64Array}
 
module.exports=(call)=>Object.keys(typedArrays).map(t=>typedArrays[t]).forEach(type=>call(type))

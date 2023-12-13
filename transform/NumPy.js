if(!BigInt.prototype.toJSON)
    BigInt.prototype.toJSON = function(){return Number(this.toString())}
if(!Buffer.prototype.toBufferArray)
    Buffer.prototype.toBufferArray = function() {return this.buffer.slice(this.byteOffset, this.byteOffset + this.byteLength)}
//const bufferToArrayBuffer = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
const MAGIC_STRING = "\x93NUMPY"
const defaultVersionStr = "\x01\x00" // version 1.0
const defaultVersion = 1.0
const getTotalCells = (shape)=> shape.reduce((a, b) => a * b, 1);
const dataTypes = {
    "|b1": {
        bytes4DataType: 1,
        name: "bool",
        cellConstructor: Uint8Array,
        setDataView: "setUint8"
      },
    "<u1": {
        name: "uint8",
        bytes4DataType: 8,
        cellConstructor: Uint8Array,
        setDataView: "setUint8"
    },
    "|u1": {
        name: "uint8",
        bytes4DataType: 8,
        cellConstructor: Uint8Array,
        setDataView: "setUint8"
    },
    "|i1": {
        name: "int8",
        bytes4DataType: 8,
        cellConstructor: Int8Array,
        setDataView: "setInt8"
    },
    "<u2": {
        name: "uint16",
        bytes4DataType: 16,
        cellConstructor: Uint16Array,
        setDataView: "setUint16"
    },
    "<i1": {
        name: "int8",
        bytes4DataType: 8,
        cellConstructor: Int8Array,
        setDataView: "setInt16"
    },
    "<i2": {
        name: "int16",
        bytes4DataType: 16,
        cellConstructor: Int16Array,
        setDataView: "setInt16"
    },
    "<u4": {
        name: "uint32",
        bytes4DataType: 32,
        cellConstructor: Int32Array,
        setDataView: "setInt32"
    },
    "<i4": {
        name: "int32",
        bytes4DataType: 32,
        cellConstructor: Int32Array,
        setDataView: "setInt32"
    },
    "<u8": {
        name: "uint64",
        bytes4DataType: 64,
        cellConstructor: BigUint64Array,
        setDataView: "setBigUint64"
    },
    "<i8": {
        name: "int64",
        bytes4DataType: 64,
        cellConstructor: BigInt64Array,
        setDataView: "setBigInt64"
    },
    "<f4": {
        name: "float32",
        bytes4DataType: 32,
        cellConstructor: Float32Array,
        setDataView: "setFloat32"
    },
    "<f8": {
        name: "float64",
        bytes4DataType: 64,
        cellConstructor: Float64Array,
        setDataView: "setFloat64"
    },
};

/*
‘S’ - swap dtype from current to opposite endian
{‘<’, ‘little’} - little endian
{‘>’, ‘big’} - big endian
{‘=’, ‘native’} - native order
{‘|’, ‘I’} - ignore (no change to byte order)

b boolean
i signed integer
u unsigned integer f floating-point
c complex floating-point
m timedelta
M datetime
O object
S (byte-)string
U Unicode
V void


* Float data
    typestr == '>f4'
    descr == [('','>f4')]

* Complex double
    typestr == '>c8'
    descr == [('real','>f4'), ('imag','>f4')]

* RGB Pixel data
    typestr == '|V3'
    descr == [('r','|u1'), ('g','|u1'), ('b','|u1')]

* Mixed endian (weird but could happen).
    typestr == '|V8' (or '>u8')
    descr == [('big','>i4'), ('little','<i4')]

* Nested structure
    struct {
        int ival;
        struct {
            unsigned short sval;
            unsigned char bval;
            unsigned char cval;
        } sub;
    }
    typestr == '|V8' (or '<u8' if you want)
    descr == [('ival','<i4'), ('sub', [('sval','<u2'), ('bval','|u1'), ('cval','|u1') ]) ]

* Nested array
    struct {
        int ival;
        double data[16*4];
    }
    typestr == '|V516'
    descr == [('ival','>i4'), ('data','>f8',(16,4))]

* Padded structure
    struct {
        int ival;
        double dval;
    }
    typestr == '|V16'
    descr == [('ival','>i4'),('','|V4'),('dval','>f8')]
*/
const dataTypeToNumpyDescr = new Map([
    ["float32", "<f4"],
    ["float64", "<f8"],
    ["int8",  "<i1"],
    ["int16", "<i2"],
    ["int32", "<i4"],
    ["int64", "<i8"],
    ["uint8",  "<u1"],
    ["uint16", "<u2"],
    ["uint32", "<u4"],
    ["uint64", "<u8"],
    ["bool", "|b1"],
  ]);
/*
function array2Npy (tensor) {
    const versionStr = "\x01\x00"; // version 1.0
    const shapeStr = tensor.shape.join(",") + ","
    const descr = dataTypeToNumpyDescr.get(tensor.dtype);
    const header = "{'descr':"+descr+", 'fortran_order': false, 'shape': ("+shapeStr+"), }"
    const unpaddedLength = MAGIC_STRING.length + versionStr.length + 2 + header.length;
    // Spaces to 16-bit align.
    const padding = " ".repeat((16 - (unpaddedLength % 16)) % 16)
    header += padding;
    // Number of bytes is in the Numpy descr
    const bytesPerElement = Number.parseInt(descr[2], 10)
    const dataLen = bytesPerElement * getTotalCells(tensor.shape)
    const totalSize = unpaddedLength + padding.length + dataLen
    const arrayBuffer = new ArrayBuffer(totalSize)
    const view = new DataView(arrayBuffer)
    let pos = writeStrToDataView(view, MAGIC_STRING + versionStr, 0)
    view.setUint16(pos, header.length, true);
    pos += 2 + writeStrToDataView(view, header, pos);
    const setDataView = view.setDataView[dataTypes[descr].setDataView];
    for (let i = 0; i < data.length; i++) {
         view.setDataView(pos,data[i],true)
        pos += bytesPerElement;
    }
    return arrayBuffer;
}
*/
function writeStrToDataView(dataView, str, pos) {
    const sl=str.length
    for (let i = 0; i < sl; i++) {
        dataView.setInt8(pos + i, str.charCodeAt(i));
    }
    return pos + sl;
  }
function NumPy (tensor){
    this.fortran_order=false
    this.version=defaultVersion
    return this.parse(tensor)
}
NumPy.prototype.getBytes4DataType = function(){
    const descr  = dataTypeToNumpyDescr.get(this.dtype);
    return Number.parseInt(descr[2], 10)
}
NumPy.prototype.getDesc = function() {
    return dataTypeToNumpyDescr.get(this.dtype);
}
NumPy.prototype.setDType = function(dataType) {
    this.dataType=dataType
    const descr=dataTypeToNumpyDescr.get(this.dataType);
    if(descr==null) throw Error("data type not found for "+dataType)
    this.setDescr(descr)
    return this
}
NumPy.prototype.setDescr = function(descr) {
    this.descr=descr
    const dataTypeDetails = dataTypes[this.descr];
    this.dataType=dataTypeDetails.name
    this.setDataView = dataTypeDetails.setDataView;
    this.cellConstructor = dataTypeDetails.cellConstructor
    this.bytes4DataType = Number.parseInt(this.descr[2], 10)
    return this
}
NumPy.prototype.toNpy = function () {
    const versionStr = "\x01\x00"; // version 1.0
    const shapeStr = this.shape.join(",") + ","
    let header = "{'descr':"+this.descr+", 'fortran_order': false, 'shape': ("+shapeStr+"), }"
    const unpaddedLength = MAGIC_STRING.length + versionStr.length + 2 + header.length;
    // 16-bit align with spaces
    header += " ".repeat((16 - (unpaddedLength % 16)) % 16);
    // SIze of Npy
    const totalSize = header.length + this.bytes4DataType * getTotalCells(this.shape)
//    const totalSize = unpaddedLength + padding.length + this.bytes4DataType * getTotalCells(this.shape)
    const arrayBuffer = new ArrayBuffer(totalSize)
    const view = new DataView(arrayBuffer)
    let pos = writeStrToDataView(view, MAGIC_STRING + defaultVersionStr, 0)
    view.setUint16(pos, header.length, true);
    pos += 2 + writeStrToDataView(view, header, pos);
    const data=this.dataVector
//    const setDataView = view[this.setDataView];
    for (let i = 0; i < data.length; i++) {
//        setDataView(pos,data[i],true)
        view[pos]=data[i]
        pos += this.bytes4DataType;
    }
    return arrayBuffer;
}
NumPy.prototype.toNpyBuffer = function () {
    return Buffer.from(this.toNpy())
}
NumPy.prototype.parse = function(contentIn={dataType:"int8",
        shape:[1],
        dataVector:new int8Array(0)}) {
    if(!contentIn instanceof Object) throw Error("not an object")
    if(contentIn.hasOwnProperty("dataVector")) {
        Object.assign(this,contentIn)
        if(contentIn.dataType) this.setDType(contentIn.dataType)
        else if(contentIn.descr) this.setDescr(contentIn.descr)
        else throw Error("data type not defined")
        if(this.shape==null) this.shape=[1];
        return this
    }
    return this.parseNpy(contentIn)
}
NumPy.prototype.parseNpy = function(npyContentIn) {
//    this.npyContent=npyContentIn instanceof ArrayBuffer ? npyContentIn : bufferToArrayBuffer(npyContentIn) 
    this.npyContent=npyContentIn instanceof ArrayBuffer ? npyContentIn : npyContentIn.toBufferArray() 
    const headerLength = new DataView(this.npyContent.slice(8, 10)).getUint8(0)
    const offsetBytes = 10 + headerLength;
    const headerContents = new TextDecoder("utf-8").decode(
        new Uint8Array(this.npyContent.slice(10, 10 + headerLength))
    );
    const header = JSON.parse(
        headerContents
            .toLowerCase() // True -> true
            .replace(/'/g, '"')
            .replace("(", "[")
            .replace(/,*\),*/g, "]")
    );
    this.setDescr(header.descr);
    this.shape = header.shape
    this.dataVector=new this.cellConstructor(this.npyContent, offsetBytes)
    if(header.fortran_order) this.fortran_order=header.fortran_order
    return this
}
NumPy.prototype.toSerializable = function() {
    return {
        dataType:this.dataType,
        fortran_order: this.fortran_order,
        shape:this.shape,
        version:this.version,
        dataVector:this.dataVector
    }
}
NumPy.prototype.toString = function() {
    return JSON.stringify(this.toSerializable())
}
module.exports=NumPy;
function generatedMatrixFunction(arg1) {
    if(typeof arg1 !=="object") throw Error("no definitional JSON found");
    Object.assign(this,{
        args:[],
        dimensionOrder:["row","column"],
        debug:false
    },arg1);
    const extendedArgs=[
        this.dimensionOrder[0]+"StartOffset=0",
        this.dimensionOrder[0]+"EndOffset",
        this.dimensionOrder[1]+"StartOffset=0",
        this.dimensionOrder[1]+"EndOffset",
        "returnValue="+this.returnValue,
        "matrixEndOffset=matrix.length-1",
        "rowOffset",
        "columnOffset",
        "rowVectorOffset",
        "columnVectorOffset",
        "elementOffset",
        "element",
        "getElementArray=()=>matrix[rowOffset][columnOffset]",
        "getElementVector=()=>matrix[elementOffset]",
        "setElementArray=(v)=>matrix[rowOffset][columnOffset]=v",
        "setElementVector=(v)=>matrix[elementOffset]=v",
        "getElement=getElementVector",
        "setElement=setElementVector",
        "getMatrix=()=>Object.create(Object.getPrototypeOf(matrix))",
        "arrayFunctions={"+
          "forEachRowColumn:(call)=>for(rowOffset=0;rowOffset<=rowEndOffset;rowOffset++) call(),"+
          "forEachColumnRow:(call)=>for(columnOffset=0;columnOffset<=columnEndOffset;columnOffset++) call()"+
          "}",
        "vectorFunctions={}"
    ];
    const functionCode=
        "("+["matrix","rows",
            "columns"
            ].concat(this.args,extendedArgs).join()+
        ")=>{\n"+
        "  const isArray=(matrix!==null&&matrix instanceof Array);\n"+
        "  if(isArray){\n"+
        "    rows=matrix.length;\n"+
        "    columns=matrix[0].length;\n"+
        "    getElement=getElementArray;\n"+
        "    setElement=setElementArray;\n"+
        "  }\n"+
        "  if(rows<=0) throw Error('rows < 1');\n"+
        "  if(columns<=0) throw Error('rows < 1');\n"+
        "  if(rowEndOffset==null) rowEndOffset=rows-1;\n"+
        "  if(columnEndOffset==null) columnEndOffset=columns-1;\n"+
        (this.debug?"console.log({matrix:matrix,matrixEndOffset:matrixEndOffset,rowEndOffset:rowEndOffset,columnEndOffset:columnEndOffset,rows:rows,columns:columns});\n":"")+
        "  if(isArray){\n"+
        "    for("+this.dimensionOrder[0]+"Offset="+this.dimensionOrder[0]+"StartOffset;"+this.dimensionOrder[0]+"Offset<="+this.dimensionOrder[0]+"EndOffset;"+this.dimensionOrder[0]+"Offset++){\n"+
        "      const "+this.dimensionOrder[0]+"=matrix["+this.dimensionOrder[0]+"Offset];\n"+
        (this.debug?"console.log({"+this.dimensionOrder[0]+"Offset:"+this.dimensionOrder[0]+"Offset,});\n":"")+";\n"+
        "      for("+this.dimensionOrder[1]+"Offset="+this.dimensionOrder[1]+"StartOffset;"+this.dimensionOrder[1]+"Offset<="+this.dimensionOrder[1]+"EndOffset;"+this.dimensionOrder[1]+"Offset++){\n"+
        "        const element=matrix["+this.dimensionOrder[1]+"Offset];\n"+
        (this.debug?"console.log({"+this.dimensionOrder[1]+"Offset:"+this.dimensionOrder[1]+"Offset,element:element});\n":"")+
                 this.code+";\n"+
        "      }\n"+
        "    }\n"+
        "  } else {\n"+
        "    const innerSize="+(this.dimensionOrder[0]=="row"?"columns":"1")+";\n"+
        "    const outerSize="+(this.dimensionOrder[0]=="row"?"1":"columns")+";\n"+
        "    for("+this.dimensionOrder[0]+"Offset="+this.dimensionOrder[0]+"StartOffset;"+this.dimensionOrder[0]+"Offset<="+this.dimensionOrder[0]+"EndOffset;"+this.dimensionOrder[0]+"Offset++){\n"+
        "      const "+this.dimensionOrder[0]+"VectorOffset="+this.dimensionOrder[0]+"Offset*innerSize;\n"+
        (debug?"console.log({"+this.dimensionOrder[0]+"Offset:"+this.dimensionOrder[0]+"Offset,});\n":"")+
        "      for("+this.dimensionOrder[1]+"Offset="+this.dimensionOrder[1]+"StartOffset;"+this.dimensionOrder[1]+"Offset<="+this.dimensionOrder[1]+"EndOffset;"+this.dimensionOrder[1]+"Offset++){\n"+
        "        "+this.dimensionOrder[1]+"VectorOffset="+this.dimensionOrder[1]+"Offset*outerSize;\n"+
        "        elementOffset=rowVectorOffset +columnOffset;\n"+
        "        element=matrix[elementOffset];\n"+
        (debug?"console.log({"+this.dimensionOrder[1]+"Offset:"+this.dimensionOrder[1]+"Offset,rowVectorOffset:rowVectorOffset,columnVectorOffset:columnVectorOffset,elementOffset:elementOffset,element:element});\n":"")+
                 this.code+";\n"+
        "      }\n"+
        "    }\n"+
        "  }\n"+
          (this.returnValue==undefined?"  return this":"  return returnValue")+
        "\n}";
    try{
        const evaluatedCode=eval(functionCode);
        return evaluatedCode;
    } catch(ex) {
        console.error("built function: \n"+functionCode)
        console.error("error: "+ex.message)
        console.error(ex.stack)
        throw Error("code failed")
    }
}
module.exports = generatedMatrixFunction;

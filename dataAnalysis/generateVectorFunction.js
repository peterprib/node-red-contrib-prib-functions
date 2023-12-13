function generatedVectorFunction(arg1) {
    if(typeof arg1 !=="object") throw Error("no definitional JSON found");
    Object.assign(this,{
        args:[],
        debug:false,
        returnValue:"this"
    },arg1);
    const extendedArgs=["startOffset=0","endOffset=vector.length-1,returnValue="+this.returnValue]
    const functionCode=
        "("+["vector"].concat(this.args,extendedArgs).join()+")=>{"+
        "for(let index=startOffset;index<=endOffset;index++){\n"+
        this.code+";\n"+
        "}\n"+
        "return returnValue\n}";
    try{
        if(debug==true) console.log(functionCode);
        const evaluatedCode=eval(functionCode);
        return evaluatedCode;
    } catch(ex) {
        console.error("built function: "+functionCode)
        console.error("error: "+ex.message)
        throw Error("code failed")
    }
}
module.exports = generatedVectorFunction;
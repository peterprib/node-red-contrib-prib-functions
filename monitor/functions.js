module.exports={
    coalesce:()=>{
        const args = coalesce.arguments;
        for (let i=0; i<args.length; ++i)
            if (args[i] !=  null) return args[i];
        return null; 
    },
    deepClone:(deepObject)=>{
        if(deepObject==null) return null;
        if(deepObject instanceof Array) 
            let newObj=[];
        else if(deepObject instanceof String) 
            return new String(deepObject);  
        else if(deepObject instanceof Number) 
            return new Number(deepObject);  
        else if(deepObject instanceof Date)  
            return new Date(deepObject);
        else if(typeof deepObject == "object")
            let newObj={};
        else return deepObject;
        for (i in deepObject)
            newObj[i]=deepClone(deepObject[i]);
        return newObj;
    },
    getWord:(value,wordPosition)=>value.split(/\s+/g,wordPosition+1)[wordPosition-1],
    rangeLimit (value,min,max) {
        if(min!=null)
            if(value<min) 
                return min;	
        if(max!=null) 
            if(value>max) 
                return max;
        return value;
    },
    nullif:(a,b)=>(a==b?null:a)
}
const Column=require("../lib/Column")
function Table(properties) {
    Object.assign(this,{columns:[],columnNames:{},data:[],lists:{}},properties)
}
Table.prototype.error=function(ex){
    if(this.errorStack){
        this.errorStack.forEach((callFunction)=>{
            try{
                callFunction(ex)
            }catch(ex) {}
        })
        return
    }
    if(typeof ex == "string") throw Error(msg)
    throw ex
}

Table.prototype.onError=function(call){
    if(this.errorStack) this.errorStack.push(call)
    else this.errorStack=[this.call]
    return this
}
Table.prototype.error=function(msg="no error message"){
    const ex=typeof msg == "string"?msg=Error(msg):msg
    if(this.errorStack){
      this.errorStack.forEach((callFunction)=>{
          try{
          callFunction(msg)
          }catch(ex2) {}
      })
      return
    }
    throw ex
}
Table.prototype.addColumn=function(values){
    values.table=this
    values.columnIndex=this.columns.length
    const column=new Column(values)
    if(column.name in this.columnNames) return this.error("dupicate column "+column.name)
    this.columnNames[column.name]=this.columns.length
    this.columns.push(column)
    return this
}
Table.prototype.getcolumn=function(name){
    return this.columns[this.columnNames[name]]
}
Table.prototype.columnNumbers=function(list=[],error=this.error){
    try{
        return list.map(c=>this.columnNames[c])
    } catch(ex){
        error(ex)
    }
}
Table.prototype.forColumnNames=function(list=[],callFunction,error=this.error,workArea={}){
    this.forColumnNumbers(this.columnNumbers(list),callFunction,error)
    return this
}
Table.prototype.forColumnNumbers=function(list=[],callFunction,error=this.error){
    list.forEach((columnNumber,i)=>{
        try{
            callFunction.apply(this,[this.columns[columnNumber],i,error,workArea])
        } catch(ex){
            error(ex)
        }
    })
    return this
}
Table.prototype.forEachColumn=function(callFunction,columns=this.columns,filter,error=this.error,workArea={}){
    for(let i=0; i<columns.length; i++)	{
        const column=columns[i]
        try{
            if(filter && filter(column) ) continue
            callFunction.apply(this,[column,i,error,workArea])
        } catch(ex){
            onEror(ex)
        }
    }
    return this
}

Table.prototype.forEachRow=function(callFunction,filter,error=this.error,workArea={}){
    for(let i= 0; i<this.data.length; i++)	{
        const row=this.data[i]
        try{
            if(filter && filter(row) )continue
            callFunction.apply(this,[row,i,error,workArea])
        } catch(ex){
            error(ex)
        }
    }
    return this
}
Table.prototype.forEachRowColumns=function(columnNumbers,callFunction,filter,error=this.error,workArea={}){
    this.forEachRow((row,i)=>{
        if(filter && filter(row) ) return
        const newRow=columnNumbers.map((columnIndex)=>row[columnIndex])
        callFunction.apply(this,[newRow,i,row,workArea,error])
    },error)
    return this
}
Table.prototype.forEachRowDelta=function(callFunction,filter,error=this.error,workArea={}){
    if(data.length<2) return
    let last=this.data[0]
    for(let i=1; i<this.data.length; i++){
        const current=this.data[i]
        if(filter && filter(current) ) continue
        try{
            const row=[]
            this.list.delta.numbers().forEach(i=>{
                row.push(current[i]-last[i])
            })
            callFunction.apply(this,[row,i])
        } catch(ex){
            error(ex)
        }
    }
    return this
}
Table.prototype.buildColumnIndices=function(){
    this.columns.forEach((column,i)=>column.buildColumnnar())
    return this
}
Table.prototype.forEachRowGroup=function(callFunction,filter,error=this.error,workArea={}){
    if(this.data.length==0) return [];
    const group=this.lists.group.numbers
    let sums=[]
    groupValues=group.map(c=>row[c]) 
    data.forEachRow((row,i,error,workArea)=>{
        if(filter && filter(current) ) return
        let diff=group.find((c,i)=>groupValues[i]!=row[c])
        if(diff) {
            callFunction(groupValues,sums,error)
            for(;diff<group.length;diff++){
                groupValues[diff]!=row[group[diff]]
            }
            workArea.groupValues=group.map(c=>row[c])
        } else {
            cnt++
            measures.forEach((c,i)=>workArea.sums[i]+=row[c])
        }
    },null,error,workArea)


    for(let i=0; i<this.data.length; i++) {
        const column=this.table.columns[i]
        try{
            const l=data.find((element,idx) => element!=data[group[idx]] )
            if(l) {
                measureFunctions.forEach((measureFunction,mIndx)=>{
                    measures[mIndx]=measureFunction(measures[mIndx],row)
                })
                continue
            }
            callFunction.apply(this,[data,measures])
            data=group.map(c=>this.data[c])
        } catch(ex){
            error(ex)
        }
    }
    return this
}

Table.prototype.getSelectHTML=function(list=[],onClick,filter=(column)=>true,multiple='multiple="multiple"'){
  let options=""
  if(typeof list == "string") list=this.grouping.split(',')
  this.forEachColumn((column,i)=>{
      if(filter(column==true)) return
      options+='<option value="'+column.name+'" '+(list.includes(column.name)?'selected="selected"':"")+'>'+column.title+'</option>'
  })
  return '<select '+multiple+' onclick="'+onClick+'"/>'+options+'</select>'
}
Table.prototype.setDelta=function(list){
    setListProperty("delta",list,(c)=>c.isMeasure())
    return this
}
Table.prototype.setGroup=function(list){
    setListProperty("group",list)
    return this
}
Table.prototype.setListProperty=function(property,list,filter=()=>true) {
    const listArrray={names:list instanceof Array?list:list.join(","),numbers:[]}
    this.lists[property].numbers=this.columnNumbers(listArrray.names)
    return this
}
module.exports=Table  

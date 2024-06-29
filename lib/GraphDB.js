require("../lib/objectExtensions")
function GraphDB(properties){
    Object.assign(this,{type:null,vertices:[],edges:[]},properties)

}
GraphDB.prototype.addVertex=function(vertex) {
    this.vertices.addList(vertex)
}
GraphDB.prototype.addEdge=function(from,to) {
    this.edges.addList({from:from,to:to})
}

this.addErrorFunctions()
module.exports=GraphDB  
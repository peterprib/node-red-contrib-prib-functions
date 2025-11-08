require("../lib/objectExtensions")
function Edge(from,to,properties){
  if(!from) throw Error("from vertix is not defined")
  if(!to) throw Error("to vertix is not defined")
  if(!from instanceof Vertex) throw Error("from not type Vertex")
  if(!to instanceof Vertex) throw Error("to not type Vertex")
  Object.assign(this,{_from:from,_to:to},properties)
  from.addTo(this)
  to.addFrom(this)
}
function Vertex(properties){
  Object.assign(this,{_to:[],_from:[]},properties)
}
Vertex.prototype.addTo=function(r){
  this._to.push(r)  
}
Vertex.prototype.addFrom=function(r){
  this._from.push(r)  
}
function GraphDB(properties){
  Object.assign(this,{vertices:[],edges:[]},properties)
}
GraphDB.prototype.addEdge=function(from,to,properties) {
  const edge=new Edge(from,to,properties)
  this.edges.push(edge)
  return edge
}
GraphDB.prototype.addVertex=function(vertexDetails) {
  const vertex=new Vertex(vertexDetails)
  this.vertices.push(vertex)
  return vertex
}
GraphDB.prototype.getEdgesCount=function() {
  return this.edges.length
}
GraphDB.prototype.getVerticesCount=function() {
  return this.vertices.length
}
GraphDB.prototype.getVertices=function(filterFunction) {
  return this.vertices.filter(filterFunction)
}
GraphDB.prototype.getEdges=function(filterFunction) {
  return this.Edges.filter(filterFunction)
}
module.exports=GraphDB
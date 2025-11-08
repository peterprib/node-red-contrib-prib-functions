function minimax(node, depth, 
    isTerminalNode=node=>node.children.lenght==0 ,
    forEachChild=call=>this.children.forEach(c=>call(c)),
    getHeuristicValue =node=>node.value,
    maximizingPlayer=true
){
    if( depth == 0 || isTerminalNode(node)) return getHeuristicValue (node)
    const notMaximizingPlayer=!maximizingPlayer
    const minMaxFunction=maximizingPlayer?Math.max:Math.min
    let value=Infinity*(maximizingPlayer?-1:1)
    forEachChild(child=> value = minMaxFunction(value,
         minimax(child,depth-1,isTerminalNode,forEachChild,getHeuristicValue ,notMaximizingPlayer))
    )
    return value
}

module.exports=minimax
function alphabeta(node, depth, 
    isTerminalNode=node=>node.children.lenght==0 ,
    forEachChild=call=>this.children.forEach(c=>call(c)),
    getHeuristicValue=node=>node.value,
    alpha=-Infinity, beta=Infinity,
    maximizingPlayer=true
){
    if( depth == 0 || isTerminalNode(node)) return getHeuristicValue (node)
    const notMaximizingPlayer=!maximizingPlayer
    const minMaxFunction=maximizingPlayer?Math.max:Math.min
    let value=Infinity*(maximizingPlayer?-1:1)
    let loopFunction=maximizingPlayer?
        child=>{ 
            value = minMaxFunction(value,
                minimax(child,depth-1,isTerminalNode,forEachChild,getHeuristicValue ,alpha, beta, notMaximizingPlayer))
            if(value >= beta ) throw Error("break")
            else alpha = minMaxFunction(alpha, value)
        }:child=>{
            value = minMaxFunction(value,
                minimax(child,depth-1,isTerminalNode,forEachChild,getHeuristicValue ,alpha, beta, notMaximizingPlayer))
            if(value <= alpha) throw Error("break") 
            beta = minMaxFunction(beta, value)
        }
    try{
        forEachChild(loopFunction)
    } catch(ex){
        if(ex.message!=="break") throw ex
    }
    return value
}

module.exports=alphabeta
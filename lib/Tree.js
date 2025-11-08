function Level(parent,...children){
    this.children=children
    this.setBTree(10)
}
function Leaf(parent,value){
    this.values=[]
}
Leaf.prototype.find=function(value,foundCall,notFoundCall=foundCall,notFoundAllCall=v=>notFoundCall(0,v)){
    let i=this.keys.length
    const key=this.getKey(value)
    while (i >= 0){
        const currentKey=this.getKey(this.values[i])
        if(key>currentKey) return notFoundCall(i,key)
        if(key==currentKey) return foundCall(i,key)
        i--
    }
    notFoundAllCall(key)
}
Leaf.prototype.getKey=function(node){return node}
Leaf.prototype.insert=function(value){
    const _this=this
    this.find(value,i=>_this.values.splice(i, 0, value))
}
function Tree (root=new Level(null)){
  this.root=root
}
Tree.prototype.setDegree=function(v){this.degree=v}



Tree.prototype.insert(key,value) {
    const root = this.root;
    if(root.keys.length === (2 * this.degree - 1)) { // Root is full
        const newRoot = new BTreeNode(false);
        newRoot.children.push(root);
            this.splitChild(newRoot, 0, root);
            this.root = newRoot;
            this.insertNonFull(newRoot, key);
        } else {
            this.insertNonFull(root, key);
        }
}

Tree.prototype.insertNonFull(node, key) {
    let i = node.keys.length - 1;
    if (node.isLeaf) {

    } else {
            while (i >= 0 && key < node.keys[i]) {
                i--;
            }
            i++;
            if (node.children[i].keys.length === (2 * this.degree - 1)) {
                this.splitChild(node, i, node.children[i]);
                if (key > node.keys[i]) {
                    i++;
                }
            }
            this.insertNonFull(node.children[i], key);
        }
    }


module.exports=Tree
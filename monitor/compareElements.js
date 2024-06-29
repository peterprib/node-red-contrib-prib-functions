function compareNodes(oldNode, newNode, compare) {      //  this function under construction
    if( compare==null)
        var compare= {
             attribute: {
                 match: function(attribute) {
                     }
                ,mismatch: function(oldAttribute,newAttribute) {
                    return '<attribute key="'+oldAttribute.nodeName+'" old="'+oldAttribute.nodeValue+'" new="'+newAttribute.nodeValue+'"/>';
                    }
                ,missingNew: function(attribute) {
                    return '<attribute key="'+attribute.nodeName+'" new="'+attribute.nodeValue+'"/>';
                    } 
                ,missingOld : function(attribute) {
                    return '<attribute key="'+attribute.nodeName+'" old="'+attribute.nodeValue+'"/>';
                    }
                }
            ,node: {
                 isSameElement: function(oldNode,newNode) {
                         if(oldNode.nodeType != newNode.nodeType) return false;
                         if(oldNode.nodeType != 1) return true;
                        return (oldNode.nodeName = newNode.nodeName);
                     }
                ,match: function(node) {
                     }
                ,mismatch: function(oldNode,newNode) {
                        return '<pair><new th>"'+node.nodeValue+'</new></node>'
                    }
                ,missingNew: function(node) {
                        return '<node key="'+node.nodeName+'"><new>"'+node.nodeValue+'</new></node>'
                    } 
                ,missingOld : function(node) {
                        return '<node key="'+node.nodeName+'"><old>"'+node.nodeValue+'</old></node>'
                    }
                }
            };
    var diff="";
    if(oldNode == null)
        var oldAttributes=[] , oldNodes=[];
    else 
        var oldAttributes=oldNode.attributes , oldNodes=oldNode.childNodes;
    if(newNode == null)
        var newAttributes=[] , newNodes=[];
    else 
        var newAttributes=newNode.attributes , newNodes=oldNode.childNodes;
    if( !compare.node.isSameElement(oldNode,newNode)   	
    || oldNode.nodeValue != newNode.nodeValue )
        diff += compare.node.mismatch(oldNode,newNode);
    else
        diff += compare.node.match(oldNode,newNode);
    var o=0;n=0;
    while (o<oldAttributes.length || n<newAttributes.length) {
        var oldAttribute=oldAttributes[o],newAttribute=newAttributes[n];
        if(oldAttributes.nodeName==newAttribute.nodeName) {
            if(oldAttribute.nodeValue==newAttribute.nodeValue)
                diff += compare.attribute.match(oldAttribute);
            else
                diff += compare.attribute.mismatch(oldAttribute,newAttribute);
            o++;n++;
            continue;
        }
        if(oldAttribute.nodeName>newAttribute.nodeName) {
            diff += compare.attribute.missingNew(newAttribute);
            n++;
            continue;
        }
        diff+= compare.attribute.missingOld(oldAttribute);
        o++;
    }
    for (o=o;oldAttributes.length;o++) diff += compare.attribute.missingOld(oldAttributes[o]);
    for (n=n;newAttributes.length;n++) diff += compare.attribute.missingANew(newAttributes[n]);
    o=0;n=0;
    while (o<oldNodes.length || n<newNodes.length) {
        var oldNode=oldNodes[o]; newNode=newNodes[n]; 
        if(compare.node.isSameElement(oldNode,newNode)) {
            diff+=compareNodes(oldNode,newNode,compare);
            n++;o++;
            continue;
        }
        for (i=o;i<oldNodes.length;i++)    // search for same element 
            if(compare.node.isSameElement(oldNodes[i],newNode)) break;
        for (j=n;j<newNodes.length;j++)    // search for same element
            if(compare.node.isSameElement(oldNode,newNodes[j])) break;
   
        if(i>=oldNodes.length) i=9999; 
        if(j>=newNodes.length) j=9999;
        if((i-o)>(j-n))
            for (n=n;n<j;n++) compare.node.missingNew(newNodes[n]);
        else 
            for (o=o;o<i;o++) compare.node.missingOld(oldNodes[o]);
        continue;
    }
    for (o=o;o<oldNodes.length;o++) compare.node.missingOld(oldNodes[o]);
    for (n=n;n<newNodes.length;n++) compare.node.missingNew(newNodes[n]);
   }
   
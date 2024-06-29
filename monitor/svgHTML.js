const { action } = require("./defs");

function drawSVGElement(element,p,baseId) {
    if(p==null) throw Error("No properities")
    const el=typeof element === "string"?document.getElementById(element):element
    if(el==null) throw Error("element not found or null for "+element)
    if (p.constructor === String)
        return el.appendChild(document.createTextNode(p));
    if(p instanceof Array) {
        for(var i=0;i<p.length;i++) {
            drawSVGElement(el,p[i],baseId);
        }
        return;
    }
    if(p.action=="clear"){
        el.parentNode.replaceChild(el.cloneNode(false), el);
        return;
    }
    if(p.action=="update"){
      return updateSVGElement(el,p,baseId)
    }
    if(["setStyle","setConicGradient"].includes(p.action)){
      return drawSVGElement(el,getSetStyle("#"+baseId+p.id),baseId)
    }
    let newEl = document.createElementNS("http://www.w3.org/2000/svg", p.action);
    if(newEl==undefined) throw Error("svg invalid function "+p.action);
    updateSVGElement(newEl,p,baseId)
    el.appendChild(newEl);
    return newEl;
};
function getSVGTransform(t){ 
  const result= (t.translate?(" translate( " + (t.translate.x??0) + " "+ (t.translate.y??" ")+")" ):"") +
    (t.scale?(" scale( "+t.scale.x+" "+(t.scale.y??" ")+")"):"") +
    (t.rotate?(" rotate( "+t.rotate.angle+" "+(t.rotate.x??" ")+" "+(t.rotate.y??" ")+")"):"") +
    (t.matrix?(" matrix( "+t.matrix.map(c=>c instanceof Array?c.join(","):c).join(" ")+")"):"") +
    (t.skewX?(" skewX( "+t.skewX+")"):"") +
    (t.skewY?(" skewY( "+t.skewY+")"):"")
  if(result=="") throw Error("no valid transform for "+t)
  return result
} 
const svgArray2Points=(a)=>a.map(c=>c.join(',')).join(" ")

function getSVGPath(t){
  return t.reduce((p,c,i)=>{
    if(typeof c !== "object") return p+" "+ c
    if(c instanceof Array) {
//      if(c.length && c[0] instanceof Array) return p+" "+getSVGPath(c) 
//      return p+" "+c.join(" ")
      return p+" "+getSVGPath(c)
    }
    try{
      switch (c.action){
        case "M":
        case "moveTo":
          return p+"M "+c.x+" "+c.y+" "
        case "m":
        case "deltaMoveTo":
          return p+"m "+c.x+" "+c.y+" "
        case "L":
        case "lineTo":
          return p+"L "+c.x+" "+c.y+" "
        case "l":
        case "deltaLineTo":
          return p+"l "+c.x+" "+c.y+" "
        case "H":
        case "horizontalLineTo":
          return p+"H "+c+" "
        case "h":
        case "deltaHorizontalLineTo":
          return p+"h "+c+" "
        case "V":
        case "verticalLineTo":
          return p+"V "+c+" "
        case "v":
        case "deltaVerticalLineTo":
          return p+"h "+c+" "
        case "A":
        case "arc":
          return p+"A "+c.radius.x+" "+c.radius.y+" "+(c.angle??0)+" "+(c.large?1:0)+" "+(c.sweep?1:0)+c.x+" "+c.y+" "
        case "a":
        case "deltaArc":
          return p+"a "+c.radius.x+" "+c.radius.y+" "+(c.angle??0)+" "+(c.large?1:0)+" "+(c.sweep?1:0)+c.x+" "+c.y+" "
        case "Q":
          return p+"Q "+c.x1+" "+c.y1+" "+c.x+" "+c.y+" "
        case "q":
          return p+"q "+c.x1+" "+c.y1+" "+c.x+" "+c.y+" "
        case "T":
          return p+"T "+c.x+" "+c.y+" "
        case "t":
          return p+"t "+c.x+" "+c.y+" "
        case "C":
          return p+"C "+c.x1+" "+c.y1+" "+c.x2+" "+c.y2+" "+c.x+" "+c.y+" "
        case "c":
          return p+"c "+c.x1+" "+c.y1+" "+c.x2+" "+c.y2+" "+c.x+" "+c.y+" "
        case "S":
          return p+"S "+c.x2+" "+c.y2+" "+c.x+" "+c.y+" "
        case "s":
          return p+"s "+c.x2+" "+c.y2+" "+c.x+" "+c.y+" "
        case "Z":
        case "z":
        case "close":
          return p+"Z "
        default: throw Error("unknown path action: "+c.action)
        }
      } catch(ex) {
        throw Error(ex.message+ " in "+JSON.stringify(c))     
      }
    },"")
}
function updateSVGElement(element,p,baseId="") {
  if(p.action=="update" && p.id) {
    element= document.getElementById(baseId+p.id)
    if(element==null) throw Error("element id not found for "+baseId+p.id)
    if(element instanceof SVGTextElement) {
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
    }
  }
  const el=typeof element === "string"?document.getElementById(baseId+element):element
  if(el==null) throw Error("element not found or null for "+baseId+element)
  for(var a in p){
      if(a=="action") continue;
      if(a=="children" && p[a] instanceof Array) {
          drawSVGElement(el,p[a],baseId);
          continue;
      }
      if(a instanceof Function) {
          el.addEventListener((p.substr(0,2)=="on"?p.substr(2):p), a.bind(this), false);
          continue;
      }
      const pa=p[a]
      if(typeof pa==="object"){
        switch (a) {
          case "points":
            el.setAttributeNS(null, a, svgArray2Points(pa));
            continue
          case "path":
          case "d":
            const path=getSVGPath(pa)
              el.setAttributeNS(null, a, path)
            continue
          case "href":
            el.setAttributeNS(null, a, "url("+pa.id?"#"+ baseId+pa.id +")":"" )
            continue 
          case "transform":
            const v=getSVGTransform(pa)
            el.setAttributeNS(null, a, v);
            continue 
          case "viewBox":
            el.setAttributeNS(null, a, svgArray2Points((pa.x??0)+" "+(pa.y??0) +" "+(pa.width??0)+" "+(pa.height??0)));
            continue 
          case "stroke":
            let style=""
            if(pa.class) style+="url(."+baseId+pa.url+")"
            if(pa.element) style+="url(#"+baseId+pa.element+")"
            el.setAttributeNS(null, a, style);
            continue 
          default:
            throw Error("unknown "+p.action+" property"+a)
        }
      }
      try{
        el.setAttributeNS(null, a, (a=="id"?baseId:"")+pa);
      } catch(ex) {
          throw Error("failed set attribute "+a+" to "+pa+" error "+ex.message)
      }
  }
  switch (p.action){
      case "foreignObject" :
          el.setAttributeNS(null, "requiredExtensions", "http://www.w3.org/1999/xhtml");
          break;
  }
  return el;
};

const getSetStyle = (id,value="background: conic-gradient(red, orange, yellow, green);")=>{
  return {action:"style",children:[id+" { "+value+" }"]}
}
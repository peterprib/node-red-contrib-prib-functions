const heatGradient=[
  {action:"stop",offset:"5%","stop-color":"lightgreen"},
  {action:"stop",offset:"80%","stop-color":"yellow"},
  {action:"stop",offset:"95%","stop-color":"red`"}
]
const heatGradientReverse=[
  {action:"stop",offset:"95%","stop-color":"lightgreen"},
  {action:"stop",offset:"20%","stop-color":"yellow"},
  {action:"stop",offset:"5%","stop-color":"red`"}
]

const defs=
  {action:"defs",children:[
    {action:"style",children:[".red2green { background: conic-gradient(red, orange, yellow, green)}"]},
    {action:"linearGradient",id:"heatGradientAcross",children:heatGradient},
    {action:"linearGradient",id:"heatGradientAcrossCircle",x1:"0%",y1:"0%",x2:"100%",y2:"0%",children:heatGradient},
    {action:"linearGradient",id:"heatGradientAcrossReverse",children:heatGradientReverse},
    {action:"linearGradient",id:"heatGradientDown",children:heatGradient,gradientTransform:"rotate(90)"},
    {action:"linearGradient",id:"heatGradientDownReverse",children:heatGradientReverse,gradientTransform:"rotate(90)"},
    {action:"radialGradient",id:"heatGradientRadial",cx:"50%",cy:"50%",r:"50%",fx:"50%",fy:"50%",children:heatGradient}
  ]}

module.exports=defs

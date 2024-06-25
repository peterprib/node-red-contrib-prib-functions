const getBarGauge=(max,min)=>{
    return {action:"g",id:"barGauge",children:[
      defs,
      {action:"rect",x:x,y:y,width:width,height:height,children:[
        {action:"animate",attributeName:"transform",values:"0;5;0",dur:"10s",repeatCount:"indefinite"}
      ]},
    ]}
  }
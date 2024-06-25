const logger = new (require("node-red-contrib-logger"))("eChart");
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");
function error(node,message,shortMessage){
	if(logger.active) logger.send({label:"error",node:node.id,error:error,shortMessage});
	node.error(message);
	node.status({fill:"red",shape:"ring",text:shortMessage});
}
function evalFunction(id,mapping){
	try{
		return eval(mapping);
	} catch(ex) {
		throw Error(id+" "+ex.message);
	}
}
module.exports = function (RED) {
	function loggerNode (n) {
	    RED.nodes.createNode(this, n);
	    const node = Object.assign(this, n);
	    
		const source1Map="(RED,node,msg)=>"+(node.source1Property||"msg.payload"),
			targetMap="(RED,node,msg,data)=>{"+(node.targetProperty||"msg.payload")+"=data;}";
		logger.sendInfo({label:"mappings",source1:source1Map,source2:source2Map,target:targetMap});
		try{
			node.getData1=evalFunction("source1",source1Map);
			node.setData=evalFunction("target",targetMap);
		} catch(ex) {
			error(node,ex,"Invalid setup "+ex.message);
			return;
		}
	    node.on('input', function (msg) {
	    	try{
	    		node.setData(RED,node,msg,node.generateChart(node.getData1(RED,node,msg)));
	    		node.send(msg);
			} catch(ex) {
				msg.error=ex.message;
				error(node,ex,"Error(s), check log");
				node.send([null,msg]);
			}
	    });
	}
	RED.nodes.registerType(logger.label, loggerNode);
};
/*

<div id="main"></div>
<script type="text/javascript">
  var myChart = echarts.init(document.getElementById('main'), null, {
    width: 600,
    height: 400
  });

</script>
    <div id="main" style="width: 600px;height:400px;"></div>
    <script type="text/javascript">
      var myChart = echarts.init(document.getElementById('main'));
      var option = {
        title: {
          text: 'ECharts Getting Started Example'
        },
        tooltip: {

		},
        legend: {
          data: ['sales']
        },
        xAxis: {
          data: ['Shirts', 'Cardigans', 'Chiffons', 'Pants', 'Heels', 'Socks']
        },
        yAxis: {

		},
        series: [
          {
            name: 'sales',
            type: 'bar',
            data: [5, 20, 36, 10, 10, 20]
          }
        ]
      };
      myChart.setOption(option);
	window.addEventListener('resize', function() {
      myChart.resize();
    });
    </script>
*/
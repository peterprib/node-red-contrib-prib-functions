const logger = new (require("node-red-contrib-logger"))("append");
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");

const fs=require('fs'),
	path=require('path');

module.exports = function (RED) {
	function appendNode(config) {
		var node=this, cnt=0, loadCnt=0, errCnt=0;
		RED.nodes.createNode(node, config);
		node.name = config.name;
		node.files = config.files;
		node.data="";
		for (const file of node.files) {
			if (file.type=="text") {
				node.data+=file.value;
				continue;
			} else if (file.type=="file") {
				node.log("loading: "+file.value);
				node.data+=fs.readFileSync(file.value);
				continue;
			}
			try{
				var filename= require.resolve(file.value);
				node.log("loading: "+filename);
				node.data+=fs.readFileSync(filename);
			} catch(ex) {
				logger.send("not found require")
				node.error("require "+file.value+" "+ex);
				errCnt++;
			}
		}
		node.status({fill:errCnt<1?"green":"red",shape:"ring",text:"initially loaded: "+loadCnt+" errors: "+errCnt});
		node.on("input", function(msg) {
			msg.payload+=node.data;
			node.status({fill:"green",shape:"ring",text:"processed "+(++cnt) + " errors: "+errCnt});
			node.send(msg);
		});
	}
	RED.nodes.registerType(logger.label,appendNode);
};

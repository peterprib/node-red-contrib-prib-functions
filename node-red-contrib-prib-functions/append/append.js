/*
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

var fs=require('fs'),
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
        	}
        	if (file.type=="file") {
            	node.log("loading: "+file.value);
            	node.data+=fs.readFileSync(file.value);
        		continue;
        	}
        	try{
            	var filename= require.resolve(file.value);
            	node.log("loading: "+filename);
            	node.data+=fs.readFileSync(filename);
       	} catch(err) {
				node.error("require "+file.value+err);
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
    RED.nodes.registerType("append",appendNode);
};

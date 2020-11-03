const logger = new (require("node-red-contrib-logger"))("transform");
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");

const regexCSV=/,(?=(?:(?:[^"]*"){2})*[^"]*$)/,
	Buffer=require('buffer').Buffer,
	os=require('os'),
	path=require('path'),
	process=require('process');
let  avsc,snappy,xmlParser,json2xmlParser,XLSX;
const {ISO8583BitMapId,ISO8583BitMapName}=require("./ISO8583BitMap");
let ISO8583,ISO8583message;
const XMLoptions = {
//	    attributeNamePrefix : "@_",
//	    attrNodeName: "attr", //default is 'false'
//	    textNodeName : "#text",
	    ignoreAttributes : false,
	    ignoreNameSpace : false,
	    allowBooleanAttributes : true,
	    parseNodeValue : true,
	    parseAttributeValue : false,
//	    cdataTagName: "__cdata", //default is 'false'
//	    cdataPositionChar: "\\c",
//	    parseTrueNumberOnly: false,
//	    arrayMode: false, //"strict"
//	    attrValueProcessor: (val, attrName) => he.decode(val, {isAttributeValue: true}),//default is a=>a
//	    tagValueProcessor : (val, tagName) => he.decode(val), //default is a=>a
//	    stopNodes: ["parse-me-as-string"]
	    trimValues: false
	};
function error(node,ex,shortMessage){
	if(logger.active) logger.send({label:"transformNode catch",shortMessage:shortMessage,error:ex.message,stack:ex.stack});
	node.error(ex.message);
	node.status({fill:"red",shape:"ring",text:(shortMessage||ex.message).substr(0,50)});
}
function getAvroTransformer(node,schema) {
	try{
		return avsc.Type.forSchema(node.schemas[schema]);
	} catch(ex){
		if(node.schemas.hasOwnProperty(schema)) throw ex;
		throw Error("schema not found for "+schema);
	}
}

function addWorksheet2JSON(object,worksheet,workbook,options){
	object[worksheet]=XLSX.utils.sheet_to_json(workbook.Sheets[worksheet],options);
	if(options.header) object[worksheet].shift();
	if(logger.active) logger.send({label:"addWorksheet2JSON",object:object,worksheet:worksheet})
	return object;
}
function XLSXObjectToJSON(RED,node,msg,data){
	return data.SheetNames.reduce((a,worksheet)=>addWorksheet2JSON(a,worksheet,data),{})
}
function XLSXToArray(RED,node,msg,data){
	return XLSXObjectToArray(RED,node,msg,XLSXToXLSXObject(RED,node,msg,data));
}
function XLSXToJSON(RED,node,msg,data){
	return XLSXObjectToJSON(RED,node,msg,XLSXToXLSXObject(RED,node,msg,data));
}
function XLSXToXLSXObject(RED,node,msg,data){
	return XLSX.read(data, {raw:true,type: 'buffer' });
}
function XLSXObjectToArray(RED,node,msg,data){
	return data.SheetNames.reduce((a,worksheet)=>addWorksheet2JSON(a,worksheet,data,{header:1,raw:true}),{})
}
function JSONToXLSX(RED,node,msg,data){
	const workbook=JSONToXLSXObject(RED,node,msg,data);
	return XLSX.write(workbook, {bookType:"xlsx", type:'buffer'}); 
}
function JSONToXLSXObject(RED,node,msg,data){
	const workbook = XLSX.utils.book_new();
	for(const worksheet in data) {
		const  ws=XLSX.utils.json_to_sheet(data[worksheet]);
		XLSX.utils.book_append_sheet(workbook, ws, worksheet);
	}
	return workbook;
}
function ArrayToXLSX(RED,node,msg,data){
	const workbook=ArrayToXLSXObject(RED,node,msg,data);
	return XLSX.write(workbook, {bookType:"xlsx", type:'buffer'}); 
}
function ArrayToXLSXObject(RED,node,msg,data){
	const workbook = XLSX.utils.book_new();
	if(Array.isArray(data)) {
		const  ws=XLSX.utils.aoa_to_sheet(data);
		XLSX.utils.book_append_sheet(workbook, ws,"worksheet 1");
		return workbook;
	} 
	for(const worksheet in data) {
		const  ws=XLSX.utils.aoa_to_sheet(data[worksheet]);
		XLSX.utils.book_append_sheet(workbook, ws, worksheet);
	}
	return workbook;
}
function ConfluenceToJSON(RED,node,msg,data){
	if(!Buffer.isBuffer(data)) data=Buffer.from(data);
	const magicByte=data.readUInt8();
	if(magicByte!==0) throw Error("expected magic byte and not found, found "+magicByte);
	if(data.length<5) throw Error("missing schema, data length "+data.length);
	const schema=data.readInt32BE(1);
	const avroTransformer=getAvroTransformer(node,schema);
	return {schema:schema,data:avroTransformer.fromBuffer(data.subarray(5))};
}

function JSONToConfluence(RED,node,msg,data){
		if(!data.schema) throw Error("property schema not defined");
		if(!data.data) throw Error("property data not defined");
		const header=Buffer.alloc(5);
		header[0]=0;
		header.writeInt32BE(data.schema, 1);
		const transformer=getAvroTransformer(node,data.schema);
		const avro=transformer.toBuffer(data.data);
		return Buffer.concat([header,avro]);
}

function SendArray(RED,node,msg,array){
	if(logger.active) logger.send({label:"SendArray",size:array.length});
	this.index=0;
	this.RED=RED;
	this.node=node;
	this.msg=msg;
	this.array=array;
	node.deleteSourceProperty(RED,node,msg);
	this.next();
}
SendArray.prototype.next=function() {
	this.usageCPU=process.cpuUsage(this.usageCPU);
	this.resourceUsage=process.resourceUsage();
	const memoryUsage=process.memoryUsage(), 
		heapUsedRatio=memoryUsage.heapUsed/memoryUsage.heapTotal,
		memoryUsedRatio=os.freemem()/os.totalmem();
		currentTime=Date.now(),
		cpuUsedRatio=(this.usageCPU.user+this.usageCPU.system)/((currentTime-this.lastTouchTime)*100000);
	if(logger.active) logger.send({label:"SendArray.next",index:this.index,cpuUsedRatio:cpuUsedRatio,memoryUsedRatio:memoryUsedRatio,heapUsedRatio:heapUsedRatio});
	this.lastTouchTime=currentTime;
	
	let i=cpuUsedRatio>0.9 || memoryUsedRatio>0.9 || heapUsedRatio>0.99?1:100;
	while(--i) {
		if(this.index>=this.array.length) {
			delete this;
			return;	
		}
		const newMsg=this.RED.util.cloneMessage(this.msg),index=this.index;
		newMsg._msgid=newMsg._msgid+":"+index;
		this.node.setData(this.RED,this.node,newMsg,this.array[index],index)
		this.index++;
		this.node.send(newMsg);
	}
	const call=this.next.bind(this);
	this.timeoutID=setTimeout(call, 100);
};
function removeQuotes(data){
	try{
		const d=data.trim();
		if(d.length>1 && d.startsWith('"') && d.endsWith('"')) return d.slice(1,-1);
		const r=Number(d); 
		return r?r:d;
	} catch(ex) {
		return data;
	}
}
function csvLines(data,skipLeading=0,skipTrailing=0) {
	if(logger.active) logger.send({label:"csvLines",skipLeading:skipLeading,skipTrailing:skipTrailing});
	let lines=data.split(/[\r\n]+/g),skip=skipLeading;
	while(skip--) lines.shift();
	skip=skipTrailing;
	while(skip--) lines.pop();
	return lines;
}
function array2tag(a,t,tf){
	const ts="<"+t+">",te="</"+t+">"
	return a.reduce((a,c)=>a+=ts+tf(c)+te,"");
}
const functions={
	ArrayToCSV: (RED,node,msg,data)=>data.map(c=>JSON.stringify(c)).join("\n"),
	ArrayToHTML: (RED,node,msg,data)=>
		"<table>"+ array2tag(data,"tr",(c)=>(
			Array.isArray(c)?
				array2tag(c,"td",(cc)=>
					Array.isArray(cc)?
						functions.ArrayToHTML(RED,node,msg,cc):
						"<![CDATA["+cc+"]]>"
					):
				"<![CDATA["+c+"]]>"
			)
		)+"</table>",
	ArrayToISO8385: (RED,node,msg,data)=>ISO8583message.packSync(data),
	ArrayToMessages: (RED,node,msg,data)=>{
		if(logger.active) logger.send({label:"ArrayToMessages",arraySize:data.length});
		if(data.length>node.maxMessages) throw Error("messages to be created "+data.length +"> max: "+node.maxMessages);
		data.map((row,i)=>{
			const newMsg=RED.util.cloneMessage(msg);
			newMsg._msgid=newMsg._msgid+":"+i;
			if(logger.active) logger.send({label:"ArrayToMessages",row:row,index:i});
			node.setData(RED,node,newMsg,row,i)
			node.send(newMsg);
		});
	},
	ArrayToXLSX:ArrayToXLSX,
	ArrayToXLSXObject:ArrayToXLSXObject,
	AVROToJSON: (RED,node,msg,data)=>node.avroTransformer.fromBuffer(data), // = {kind: 'CAT', name: 'Albert'}
	ConfluenceToJSON: ConfluenceToJSON,
	CSVToArray: (RED,node,msg,data)=>{
		let lines=csvLines(data,node.skipLeading,node.skipTrailing);
		lines.forEach((value, idx) => {
			lines[idx]=value.split(regexCSV).map((c)=>removeQuotes(c));
		});
		return lines;
	},
	CSVToHTML: (RED,node,msg,data)=>
		"<table>"+ array2tag(csvLines(data,node.skipLeading,node.skipTrailing),"tr",(line)=>
			array2tag(line.split(regexCSV),"td",(c)=>"<![CDATA["+removeQuotes(c)+"]]>")
		)+"</table>",
	CSVToMessages: (RED,node,msg,data)=>{
		functions.ArrayToMessages(RED,node,msg,csvLines(data,this.skipLeading,this.skipTrailing));
	},
	CSVWithHeaderToArray: (RED,node,msg,data)=>{
		let r=functions.CSVToArray(RED,node,msg,data);
		r.shift();
		return r;	
	},
	CSVWithHeaderToHTML: (RED,node,msg,data)=>{
		let lines=csvLines(data,node.skipLeading,node.skipTrailing);
		const header=array2tag(lines.shift().split(regexCSV),"th",(c)=>"<![CDATA["+removeQuotes(c)+"]]>");
		return "<table><tr>"+header+"</tr>"+array2tag(lines,"tr",(line)=>
			array2tag(line.split(regexCSV),'td',(c)=>"<![CDATA["+removeQuotes(c)+"]]>")
		)+"</table>"
	},
	CSVWithHeaderToJSON: (RED,node,msg,data)=>{
		let lines=csvLines(data,node.skipLeading,node.skipTrailing);
		let header=lines.shift().split(regexCSV);
		if(logger.active) logger.send({label:"CSVWithHeaderToJSON",header:header});
		lines.forEach((value, idx) => {
			let o={};
			value.split(regexCSV).forEach((c,i)=>{
				o[header[i]]=removeQuotes(c);
			});
			lines[idx]=o;
		});
		return lines;
	},
	ISO8385ToArray: (RED,node,msg,data)=>ISO8583message.unpackSync(data, data.length),
	ISO8385ToJSON: (RED,node,msg,data)=>{
		let j={},d=ISO8583message.unpackSync(data, data.length);
		d.forEach((r)=>{
			j[ISO8583BitMapId(r[0]).name]=r[1];
		});
		return r;
	},
	JSONToArray: (RED,node,msg,data)=>{
		if(data instanceof Object){
			let a=[];
			for(let p in data) {
				a.push([p,functions.JSONToArray(RED,node,msg,data[p])]);
			}
			return a;
		}
		return data;
	},
	JSONToConfluence:JSONToConfluence,
	JSONToCSV: (RED,node,msg,data)=>functions.ArrayToCSV(RED,node,msg,functions.JSONToArray(RED,node,msg,data)),
	JSONToAVRO: (RED,node,msg,data)=>node.avroTransformer.toBuffer(data), // Encoded buffer.
	JSONToHTML: (RED,node,msg,data,level=0)=>{
		if(Array.isArray(data)) {
			return data.length?"<table><tr>"+data.map((r)=>functions.JSONToHTML(RED,node,msg,r,++level)).join("</tr><tr>")+"</tr><table>":"";
		}
		if(data instanceof Object){
			let a=[];
			for(let p in data) {
				a.push("<td style='vertical-align: top;'>"+escape(p)+":</td><td>"+functions.JSONToHTML(RED,node,msg,data[p],++level)+"</td>");
			}
			return "<table><tr>"+a.join("</tr><tr>")+"</tr><table>";
		}
		return escape(data);
	},
	JSONToISO8385: (RED,node,msg,data)=>{
		var d=[];
		Object.getOwnPropertyNames(data).forEach((v)=>d.push([ISO8583BitMapName[v].id,data[v]]));
		d.sort((a, b) => a[0] - b[0]);
		return ISO8583message.packSync(d);
	},
	JSONToMessages: (RED,node,msg,data)=>{
		if(logger.active) logger.send({label:"JSONToMessages",messages:data.length});
		if(Array.isArray(data)) {
			new node.SendArray(RED,node,msg,data);
//			functions.ArrayToMessages(RED,node,msg,data);
		} else {
			const newMsg=RED.util.cloneMessage(msg);
			newMsg._msgid=newMsg._msgid+":0";
			node.setData(RED,node,newMsg,data,0)
			node.send(newMsg);
		}
	},
	JSONToString: (RED,node,msg,data)=>JSON.stringify(data),
	JSONToXLSX:JSONToXLSX,
	JSONToXLSXObject:JSONToXLSXObject,
	JSONToXML: (RED,node,msg,data)=>json2xmlParser.parse(data),
	StringToJSON: (RED,node,msg,data)=>JSON.parse(data),  
	pathToBasename: (RED,node,msg,data)=>path.basename(data),
	pathToDirname: (RED,node,msg,data)=>path.dirname(data),
	pathToExtname: (RED,node,msg,data)=>path.extname(data),
	pathToFormat: (RED,node,msg,data)=>path.format(data),
	pathToIsAbsolute: (RED,node,msg,data)=>path.isAbsolute(data),
	pathToJoin: (RED,node,msg,...data)=>path.join(...data),
	pathToParse: (RED,node,msg,data)=>path.parse(data),
	pathToNormalize: (RED,node,msg,data)=>path.normalize(data),
	pathToResolve: (RED,node,msg,data)=>path.resolve(data),
	snappyToCompress: (RED,node,msg,data)=>{
		if(logger.active) logger.send({label:"snappyToCompress"});
		snappy.compress(data, (err, data)=>{ 
			if(logger.active) logger.send({label:"snappy.compress",error:err})
			if(err) {
				error(node,Error(err));
				return;
			}
			node.setData(RED,node,msg,data)
			node.send(msg);
		})
	},
	snappyToUncompress: (RED,node,msg,data)=>{
		if(logger.active) logger.send({label:"snappyToUncompress"});
		snappy.uncompress(data, { asBuffer: false }, (err, data)=>{
			if(logger.active) logger.send({label:"snappy.uncompress",error:err});
			if(err) {
				error(node,Error(err));
				return;
			}
			node.setData(RED,node,msg,data)
			node.send(msg);
		})
	},
	XLSXToArray:XLSXToArray,
	XLSXObjectToArray:XLSXObjectToArray,
	XLSXToJSON:XLSXToJSON,
	XLSXObjectToJSON:XLSXObjectToJSON,
	XLSXToXLSXObject:XLSXToXLSXObject,
	XMLToJSON: (RED,node,msg,data)=>xmlParser.parse(data,XMLoptions,true),
	invalidArray:(v=>!Array.isArray(v))
};

function evalFunction(id,mapping){
	try{
		return eval(mapping);
	} catch(ex) {
		throw Error(id+" "+ex.message);
	}
}
function is(node,value){
	return node.actionSource==value||node.actionTarget==value;
}
module.exports = function (RED) {
	function transformNode(n) {
		RED.nodes.createNode(this,n);
		if(logger.active) logger.send({label:"transformNode",node:n});
		let node=Object.assign(this,{maxMessages:1000,SendArray:SendArray},n,{RED:RED});
		try{
			if(is(node,"XLSX")||is(node,"XLSXObject") ) {
				if(!XLSX) XLSX=require('xlsx');
			} else if(is(node,"AVRO") || is(node,"Confluence")) {
				if(avsc==null) avsc=require('avsc');
				try{
					node.schemaValid=eval("("+node.schema+")");
				} catch(ex){
					throw Error("schema "+ex.message);
				}
				if(!node.schemaValid) throw Error("invalid schema")
			} else if(is(node,"snappy")) {
				if(snappy==null) snappy=require('snappy');
			} else if(is(node,"XML")) {
				if(xmlParser==null) xmlParser=require('fast-xml-parser');
				if(json2xmlParser==null) {
					const j2xParser=xmlParser.j2xParser;
					json2xmlParser=new j2xParser(XMLoptions);
				}
				if(logger.active) logger.send({label:"load xml",xmlParserKeys:Object.keys(xmlParser),json2xmlParser:Object.keys(json2xmlParser)});
			}
			node.sendInFunction=["snappy"].includes(node.actionSource)||["Messages"].includes(node.actionTarget);
			node.hasNewTopic=![null,""].includes(node.topicProperty);
			const sourceMap="(RED,node,msg)=>"+(node.sourceProperty||"msg.payload"),
				sourceDelete="(RED,node,msg)=>{delete "+(node.sourceProperty||"msg.payload")+";}",
					targetMap="(RED,node,msg,data,index)=>{"+(node.targetProperty||"msg.payload")+"=data;"+
					(node.sendInFunction && node.hasNewTopic? "msg.topic=node.topicFunction(RED,node,msg,data,index);":"")+
					(node.sendInFunction ? "" : "node.send(msg);" )+
					"}",
				topicMap="(RED,node,msg,data,index)=>"+(node.topicProperty||"msg.topic");
			logger.sendInfo({label:"mappings",source:sourceMap,target:targetMap,topicMap:topicMap});
			node.getData=evalFunction("source",sourceMap);
			node.deleteSourceProperty=evalFunction("source delete",sourceDelete);
			node.setData=evalFunction("target",targetMap);
			node.topicFunction=evalFunction("topic",topicMap);
			if(is(node,"AVRO")) {
				 node.avroTransformer=avsc.Type.forSchema(node.schemaValid);
			} else 	if(is(node,"Confluence")) {
				node.schemas={};
				for(const schema in node.schemaValid )
					node.schemas[schema]=avsc.Type.forSchema(node.schemaValid[schema]);
				logger.info({label:"confluence",schemas:Object.keys(node.schemas)});
			}
		} catch(ex) {
			error(node,ex,"Invalid setup "+ex.message);
			return;
		}
		if(node.actionSource=="ISO8583" || node.actionTarget=="ISO8583") {
			if(!ISO8583) {
				try{
					ISO8583=require('iso-8583');
					ISO8583message=ISO8583.Message();
					node.log("loaded iso-8583");
				} catch (ex) {
					error(node,Error("need to run 'npm install iso-8583'"),"iso-8583 not installed");
					return;
				}
			}
		}
		const typeValidate="invalid"+node.actionSource;
		node.invalidSourceType=typeValidate in functions &! ["XLSX","XLSXObject"].includes(node.actionTarget)?functions[typeValidate]:(()=>false);
		try {
			node.transform=functions[node.actionSource+"To"+node.actionTarget];
			if(!node.transform) throw Error("transform routine not found for "+node.actionSource+" to "+node.actionTarget);
		} catch (ex) {
			error(node,ex,node.actionSource+"\nto "+node.actionTarget + " not implemented")
			return;
		}
		
		this.status({fill:"green",shape:"ring",text:"Ready"});
		node.on("input", function(msg) {
			if(logger.active) logger.send({label:"input",msgid:msg._msgid,topic:msg.topic});
			try{
				const data=node.getData(RED,node,msg);
				if(node.invalidSourceType(data)) throw Error("expected source data type "+node.actionSource); 
				node.setData(RED,node,msg,node.transform(RED,node,msg,data));
			} catch (ex) {
				msg.error=node.actionSource+" to "+node.actionTarget + " " +ex.message;
				error(node,Error(msg.error),"Error(s)");
				node.send([null,msg]);
			}
		});				
	}
	RED.nodes.registerType(logger.label,transformNode);
};
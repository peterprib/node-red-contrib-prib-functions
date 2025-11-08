const logger = new (require("node-red-contrib-logger"))("transform");
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");
const NumPy = require("./NumPy.js")
const typedInput = require("../lib/typedInput.js")
const {coalesce,nullif,toDateTypeZulu}=require("../lib/objectExtensions")
const regexCSV=/,(?=(?:(?:[^"]*"){2})*[^"]*$)/,
	Buffer=require('buffer').Buffer,
	os=require('os'),
	path=require('path'),
	process=require('process');
let  avsc,snappy,xmlParser,json2xmlParser,XLSX,compressor;
const {ISO8583BitMapId,ISO8583BitMapName}=require("./ISO8583BitMap");
const { callbackify } = require("util");
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
const makeDateType=data=>(data instanceof Date?	data:new Date(data))
const error=(node,ex,shortMessage)=>{
	if(!ex) ex =Error("no exception/error")
	if(logger.active) logger.send({label:"transformNode catch",shortMessage:shortMessage,error:ex.message,stack:ex.stack});
	node.error(ex.message);
	node.status({fill:"red",shape:"ring",text:(shortMessage??ex.message??"unknown error").substr(0,50)});
}
const getAvroTransformer=(node,schema)=>{
	try{
		return avsc.Type.forSchema(node.schemas[schema])
	} catch(ex){
		if(node.schemas.hasOwnProperty(schema)) throw ex
		throw Error("schema not found for "+schema)
	}
}
const xlsx2=require("./xlsx2")

const ConfluenceToJSON=(RED,node,msg,data,callback)=>{
	if(!Buffer.isBuffer(data)) data=Buffer.from(data)
	const magicByte=data.readUInt8()
	if(magicByte!==0) throw Error("expected magic byte and not found, found "+magicByte)
	if(data.length<5) throw Error("missing schema, data length "+data.length)
	const schema=data.readInt32BE(1)
	const avroTransformer=getAvroTransformer(node,schema)
	callback(RED,node,msg,data,{schema:schema,data:avroTransformer.fromBuffer(data.subarray(5))})
}
const JSONToConfluence=(RED,node,msg,data,callback)=>{
		if(!data.schema) throw Error("property schema not defined");
		if(!data.data) throw Error("property data not defined");
		const header=Buffer.alloc(5);
		header[0]=0;
		header.writeInt32BE(data.schema, 1);
		const transformer=getAvroTransformer(node,data.schema);
		const avro=transformer.toBuffer(data.data);
		callback(RED,node,msg,data,Buffer.concat([header,avro]))
}
function SendArray(RED,node,msg,array){
	if(logger.active) logger.send({label:"SendArray",size:array.length});
	this.index=0;
	this.RED=RED;
	this.node=node;
	this.msg=msg;
	this.array=array;
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
	const newMsgs=[]
	while(--i) {
		if(this.index>=this.array.length) {
			delete this;
			return;	
		}
		const newMsg=this.RED.util.cloneMessage(this.msg),index=this.index;
		newMsg._msgid=newMsg._msgid+":"+index;
		this.node.setData(this.RED,this.node,newMsg,this.array[index],index)
		this.index++;
		newMsgs.push(newMsg);
	}
	this.node.send([newMsgs]);
	const call=this.next.bind(this);
	this.timeoutID=setTimeout(call, 100);
};
const removeQuotes=(data)=>{
	try{
		const d=data.trim();
		if(d.length>1 && d.startsWith('"') && d.endsWith('"')) return d.slice(1,-1);
		const r=Number(d); 
		return r?r:d;
	} catch(ex) {
		return data;
	}
}
const csvLines=(data,skipLeading=0,skipTrailing=0)=>{
	if(logger.active) logger.send({label:"csvLines",skipLeading:skipLeading,skipTrailing:skipTrailing});
	let lines=data.split(/[\r\n]+/g),skip=skipLeading;
	while(skip--) lines.shift();
	skip=skipTrailing;
	while(skip--) lines.pop();
	return lines;
}
const array2tag=(a,t,tf)=>{
	const ts="<"+t+">",te="</"+t+">"
	return a.reduce((a,c)=>a+=ts+tf(c)+te,"");
}
const Array2csv=(node,data)=>{
	if(!(data instanceof Array)) return JSON.stringify(data);
	if(data.length==0) return;
	if(data[0] instanceof Array) {
		return data.map(r=>
			r instanceof Array?r.map(c=>JSON.stringify(c)).join(node.delimiter):JSON.stringify(r)
		).join("\n");
	} else if(data[0] instanceof Object) {
		const properties=[];
		data.forEach(r=>{
			if(typeof r == "object" && ! (r instanceof Array)){
				Object.keys(r).forEach(p=>{
					if(properties.includes(p)) return
					properties.push(p)
				})
			}
		})
		properties.sort();
		const rows=data.map(r=>{
			if(typeof r == "object" && ! (r instanceof Array)) {
				return properties.map(c=>r[c]||"").join(node.delimiter)
			} else {
				return node.delimiter.repeat(properties.length)+JSON.stringify(r)
			}
		})
		return properties.join(node.delimiter)+"\n"+rows.join("\n");
	}
	return data.map(r=>JSON.stringify(r)).join("/n");
}
const JSON2Array=data=>{
	if(data instanceof Object){
		let a=[];
		properties=Object.keys(data)
		for(const p of properties) {
			a.push([p,JSON2Array(data[p])]);
		}
		return a;
	}
	return [data]
}
const JSON2HTML=(data,level=0)=>{
	if(Array.isArray(data)) {
		return data.length?"<table><tr>"+data.map((r)=>JSON2HTML(r,++level)).join("</tr><tr>")+"</tr><table>":"";
	}
	if(data instanceof Object){
		let a=[];
		for(let p in data) {
			a.push("<td style='vertical-align: top;'>"+escape(p)+":</td><td>"+functions.JSONToHTML(data[p],++level)+"</td>");
		}
		return "<table><tr>"+a.join("</tr><tr>")+"</tr><table>";
	}
	return escape(data);
}

const functions={
	ArrayToCSV: (RED,node,msg,data,callback)=>callback(RED,node,msg,data.map(c=>JSON.stringify(c)).join("\n")),
	ArrayToHTML: (RED,node,msg,data,callback)=>callback(RED,node,msg,
		"<table>"+ array2tag(data,"tr",(c)=>(
			Array.isArray(c)?
				array2tag(c,"td",(cc)=>
					Array.isArray(cc)?
						functions.ArrayToHTML(RED,node,msg,cc):
						"<![CDATA["+cc+"]]>"
					):
				"<![CDATA["+c+"]]>"
			)
		)+"</table>"),
	ArrayToISO8385: (RED,node,msg,data,callback)=>callback(RED,node,msg,ISO8583message.packSync(data)),
	ArrayToMessages: (RED,node,msg,data,callback)=>{
		if(logger.active) logger.send({label:"ArrayToMessages",arraySize:data.length});
		if(data.length>node.maxMessages) throw Error("messages to be created "+data.length +"> max: "+node.maxMessages);
		const newMsgs=[]
		data.map((row,i)=>{
			const newMsg=RED.util.cloneMessage(msg);
			newMsg._msgid=newMsg._msgid+":"+i;
			if(logger.active) logger.send({label:"ArrayToMessages",row:row,index:i});
			node.setData(RED,node,newMsg,row,i)
			newMsgs.push(newMsg);
		});
		node.send([newMsgs])
	},
	ArrayToXLSX:(RED,node,msg,data,callback)=>callback(RED,node,msg,xlsx2.Array2XLSX(data)),
	ArrayToXLSXObject:(RED,node,msg,data,callback)=>callback(RED,node,msg,xlsx2.Array2XLSXObject(data)),
	AVROToJSON: (RED,node,msg,data,callback)=>callback(RED,node,msg,node.avroTransformer.fromBuffer(data)), // = {kind: 'CAT', name: 'Albert'}
	BigIntToRangeLimit: (RED,node,msg,data,callback)=> callback(RED,node,msg,data?data.rangeLimit(node.minBigIntTyped,node.maxBigIntTyped):node.minBigInt),
	BufferToCompressed: (RED,node,msg,data,callback)=>compressor.compress(data,
		compressed=>node.setData(RED,node,msg,compressed,callback),
		err=>error(node,Error(err))
	),
	CompressedToBuffer:(RED,node,msg,data,callback)=>compressor.decompress(data,
		uncompressed=>node.setData(RED,node,msg,uncompressed,callback),
		err=>error(node,Error(err))
	),
	CompressedToJSON:(RED,node,msg,data,callback)=>compressor.decompress(data,
		uncompressed=>{
			try{
				node.setData(RED,node,msg,JSON.parse(uncompresse,callback));
			} catch(ex){
				msg.error=ex.message
				node.setData(RED,node,msg,uncompressed,callback);
			}
		},
		err=>error(node,Error(err))
	),
	CompressedToString:(RED,node,msg,data,callback)=>compressor.decompress(data,
		uncompressed=>{
			try{
				node.setData(RED,node,msg,uncompressed.toString(),callback)
			} catch(ex){
				msg.error=ex.message;
				node.setData(RED,node,msg,uncompressed,callback)
			}
		},
		err=>error(node,Error(err))
	),
	ConfluenceToJSON: ConfluenceToJSON,
	CSVToArray: (RED,node,msg,data,callback)=>{
		let lines=csvLines(data,node.skipLeading,node.skipTrailing);
		lines.forEach((value, idx) => {
			lines[idx]=value.split(regexCSV).map((c)=>removeQuotes(c));
		});
		callback(RED,node,msg,lines)
	},
	CSVToHTML: (RED,node,msg,data,callback)=>callback(RED,node,msg,
		"<table>"+ array2tag(csvLines(data,node.skipLeading,node.skipTrailing),"tr",(line)=>
			array2tag(line.split(regexCSV),"td",(c)=>"<![CDATA["+removeQuotes(c)+"]]>")
		)+"</table>"),
	CSVToMessages: (RED,node,msg,data,callback)=>functions.ArrayToMessages(RED,node,msg,csvLines(data,this.skipLeading,this.skipTrailing),callback),
	CSVWithHeaderToArray: (RED,node,msg,data,callback)=>{
		let r=functions.CSVToArray(RED,node,msg,data);
		r.shift();
		rcallback(RED,node,msg,r)
	},
	CSVWithHeaderToHTML: (RED,node,msg,data,callback)=>{
		let lines=csvLines(data,node.skipLeading,node.skipTrailing);
		const header=array2tag(lines.shift().split(regexCSV),"th",(c)=>"<![CDATA["+removeQuotes(c)+"]]>");
		const result= "<table><tr>"+header+"</tr>"+array2tag(lines,"tr",(line)=>
				array2tag(line.split(regexCSV),'td',(c)=>"<![CDATA["+removeQuotes(c)+"]]>")
			)+"</table>"
		callback(RED,node,msg,result)
	},
	CSVWithHeaderToJSON: (RED,node,msg,data,callback)=>{
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
		callback(RED,node,msg,lines)
	},
	DateToisBetween: (RED,node,msg,data,callback)=> callback(RED,node,msg,toDateTypeZulu(data).isBetween(node.minDateTyped,node.maxDateTyped)),
	DateToISODate: (RED,node,msg,data,callback)=> callback(RED,node,msg,toDateTypeZulu(data).toISOString().slice(0,10)),
	DateToLocalDate: (RED,node,msg,data,callback)=> callback(RED,node,msg,toDateTypeZulu(data).toLocaleDateString().slice(0,10)),
	DateToRangeLimit: (RED,node,msg,data,callback)=> callback(RED,node,msg,(data? toDateTypeZulu(data).rangeLimit(node.minDateTyped,node.maxDateTyped):node.minDateTyped)),
	ISO8385ToArray: (RED,node,msg,data,callback)=>callback(RED,node,msg,ISO8583message.unpackSync(data, data.length)),
	ISO8385ToJSON: (RED,node,msg,data,callback)=>{
		let j={},d=ISO8583message.unpackSync(data, data.length);
		d.forEach((r)=>{
			j[ISO8583BitMapId(r[0]).name]=r[1];
		});
		callback(RED,node,msg,r)
	},
	JSONToArray: (RED,node,msg,data,callback)=>callback(RED,node,msg,JSON2Array(data)),
	JSONToAVRO: (RED,node,msg,data,callback)=>callback(RED,node,msg,node.avroTransformer.toBuffer(data)), // Encoded buffer.
	JSONToCompressed: (RED,node,msg,data,callback)=>compressor.compress(JSON.stringify(data),
		compressed=>node.setData(RED,node,msg,compressed.callback),
		err=>error(node,Error(err))
	),
	JSONToConfluence:JSONToConfluence,
	JSONToCSV: (RED,node,msg,data,callback)=>callback(RED,node,msg,Array2csv(node,data)),
	JSONToHTML: (RED,node,msg,data,callback)=>callback(RED,node,msg,JSON2HTML(data)),
	JSONToISO8385: (RED,node,msg,data,callback)=>{
		var d=[];
		Object.getOwnPropertyNames(data).forEach((v)=>d.push([ISO8583BitMapName[v].id,data[v]]));
		d.sort((a, b) => a[0] - b[0]);
		callback(RED,node,msg, ISO8583message.packSync(d))
	},
	JSONToJSON: (RED,node,msg,data,callback)=>callback(RED,node,msg,data),
	JSONToMessages: (RED,node,msg,data,callback)=>{
		if(logger.active) logger.send({label:"JSONToMessages",messages:data.length});
		if(Array.isArray(data)) {
			new node.SendArray(RED,node,msg,data);
		} else {
			const newMsg=RED.util.cloneMessage(msg);
			newMsg._msgid=newMsg._msgid+":0";
			node.setData(RED,node,newMsg,data,callback)
		}
	},
	JSONTonpy: (RED,node,msg,data,callback)=>callback(RED,node,msg,new NumPy(data).toNpyBuffer()),
	JSONToNumPyObject: (RED,node,msg,data,callback)=>callback(RED,node,msg,new NumPy(data)),
	JSONToString: (RED,node,msg,data,callback)=>callback(RED,node,msg,JSON.stringify(data)),
	JSONToXLSX:(RED,node,msg,data,callback)=>callback(RED,node,msg,xlsx2.JSON2XLSX(data)),
	JSONToXLSXObject:(RED,node,msg,data,callback)=>callback(RED,node,msg,xlsx2.JSON2XLSXObject(data)),
	JSONToXML: (RED,node,msg,data,callback)=>callback(RED,node,msg,json2xmlParser.parse(data)),
	npyToJSON: (RED,node,msg,data,callback)=>callback(RED,node,msg,new NumPy(data).toSerializable()),
	npyToNumPyObject: (RED,node,msg,data,callback)=>callback(RED,node,msg,new NumPy(data)),
	NumPyObjectToJSON: (RED,node,msg,data,callback)=> callback(RED,node,msg,data.toSerializable()),
	NumberToAbbreviated: (RED,node,msg,data,callback)=> callback(RED,node,msg,data?data.isAbbreviated():data),
	NumberToisBetween: (RED,node,msg,data,callback)=> callback(RED,node,msg,data.isBetween(node.minNumber,node.maxNumber)),
    NumberToRangeLimit: (RED,node,msg,data)=> callback(RED,node,msg,data?data.rangeLimit(node.minNumber,node.maxNumber):node.minNumber),
	ObjectToCoalesce: (RED,node,msg,data,callback)=>callback(RED,node,msg,coalesce(data,node.value)),
	ObjectToDeepClone: (RED,node,msg,data,callback)=>callback(RED,node,msg,data.deepClone()),
	ObjectToNullif: (RED,node,msg,data,callback)=>callback(RED,node,msg,nullif(data,node.value)),
	StringToAppend: (RED,node,msg,data,callback)=>callback(RED,node,msg,data.concat(node.getString(msg))),
	StringToArrayByDelimiter: (RED,node,msg,data,callback)=>callback(RED,node,msg,data
	  .split(node.delimiter??',')
	  .map(entry => entry.trim())
	  .filter(entry => entry)),	
	StringToAt: (RED,node,msg,data,callback)=>callback(RED,node,msg,data.At(node.index)),
	StringToCapitalize: (RED,node,msg,data,callback)=> callback(RED,node,msg,data.capitalize()),
	StringToCamelize: (RED,node,msg,data,callback)=>callback(RED,node,msg,data.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())),
	StringToCharAt: (RED,node,msg,data,callback)=>callback(RED,node,msg,data.charAt(node.index)),
	StringToCharCodeAt: (RED,node,msg,data,callback)=>callback(RED,node,msg,data.charCodeAt(node.index)),
	StringToCodePointAt: (RED,node,msg,data,callback)=>callback(RED,node,msg,data.codePointAt(node.index)),
	StringToCompressed: (RED,node,msg,data,callback)=>compressor.compress(data,
		compressed=>node.setData(RED,node,msg,compressed,callback),
		err=>error(node,Error(err))
	),
	StringToConcat: (RED,node,msg,data,callback)=>callback(RED,node,msg,data.concat(node.getString(msg))),
	StringToDate: (RED,node,msg,data,callback)=>callback(RED,node,msg,toDateTypeZulu(data)),
	StringToDateLocal: (RED,node,msg,data,callback)=>callback(RED,node,msg,new Date(data)),
	StringToTimestamp: (RED,node,msg,data,callback)=>callback(RED,node,msg,Date.parse(data)),
	StringToDelimiterOnCase:(RED,node,msg,data,callback)=>callback(RED,node,msg,
		data.replace(/[A-Z]/g, (letter, index) => {
        	const lcLet = letter.toLowerCase();
			const separator= node.delimiter??"-"
        	return index ? separator + lcLet : lcLet;
      	})
		.replace(/([-_ ]){1,}/g,node.delimiter??"-")
	),
	StringToDeunderscore: (RED,node,msg,data,callback)=> callback(RED,node,msg,data.deunderscore()),
	StringToDeunderscoreCapitilize: (RED,node,msg,data,callback)=> callback(RED,node,msg,data.deunderscoreCapitilize()),
	StringToDropSquareBracketPrefix: (RED,node,msg,data,callback)=> callback(RED,node,msg,data.dropSquareBracketPrefix()),
	StringToEndsWith: (RED,node,msg,data,callback)=> callback(RED,node,msg,data.endsWith(node.getString(msg))),
	StringToFloat: (RED,node,msg,data,callback)=>callback(RED,node,msg,parseFloat(data)),
	StringToGetWord: (RED,node,msg,data,callback)=> callback(RED,node,msg,data.getWord(node.index)),
	StringToInteger: (RED,node,msg,data,callback)=>callback(RED,node,msg,parseInt(data, node.radix??10)),
	StringToisBetween: (RED,node,msg,data,callback)=> callback(RED,node,msg,data.isBetween(node.minString,node.maxString)),
	StringToJSON: (RED,node,msg,data,callback)=>callback(RED,node,msg,JSON.parse(data)),
	StringToLowerCase: (RED,node,msg,data,callback)=> callback(RED,node,msg,data.toLowerCase()),
	StringToNumber: (RED,node,msg,data,callback)=>callback(RED,node,msg,Number(data)),
	StringToPrepend: (RED,node,msg,data,callback)=>callback(RED,node,msg,node.getString(msg).concat(data)),
    StringToRangeLimit: (RED,node,msg,data,callback)=> callback(RED,node,msg,data?data.rangeLimit(node.minString,node.maxString):node.minString),
	StringToReal: (RED,node,msg,data,callback)=> callback(RED,node,msg,data.toReal()),
	StringToSplit: (RED,node,msg,data,callback)=>callback(RED,node,msg,data.split(node.getString(msg))),
	StringToStartsWith: (RED,node,msg,data,callback)=> callback(RED,node,msg,data.startsWith(node.getString(msg))),
	StringToTitle: (RED,node,msg,data,callback)=>callback(RED,node,msg,data.toTitle()),
	StringTotTitleGrammatical: (RED,node,msg,data,callback)=>callback(RED,node,msg,data.toTitleGrammatical()),
	StringToTrim: (RED,node,msg,data,callback)=>callback(RED,node,msg,data.trim()),
	StringToTrimEnd: (RED,node,msg,data,callback)=>callback(RED,node,msg,data.trimEnd()),
	StringToTrimStart: (RED,node,msg,data,callback)=>callback(RED,node,msg,data.trimStart()),
	StringToUpperCase: (RED,node,msg,data,callback)=> callback(RED,node,msg,data.toUpperCase()),
	StringToXmlStringEncode: (RED,node,msg,data,callback)=> callback(RED,node,msg,data.xmlStringEncode()),
	pathToBasename: (RED,node,msg,data,callback)=>callback(RED,node,msg,path.basename(data)),
	pathToDirname: (RED,node,msg,data,callback)=>callback(RED,node,msg,path.dirname(data)),
	pathToExtname: (RED,node,msg,data,callback)=>callback(RED,node,msg,path.extname(data)),
	pathToFormat: (RED,node,msg,data,callback)=>callback(RED,node,msg,path.format(data)),
	pathToIsAbsolute: (RED,node,msg,data,callback)=>callback(RED,node,msg,path.isAbsolute(data)),
	pathToJoin: (RED,node,msg,data)=>callback(RED,node,msg,path.join(data)),
	pathToParse: (RED,node,msg,data,callback)=>callback(RED,node,msg,path.parse(data)),
	pathToNormalize: (RED,node,msg,data,callback)=>callback(RED,node,msg,path.normalize(data)),
	pathToResolve: (RED,node,msg,data,callback)=>callback(RED,node,msg,path.resolve(data)),
	snappyToCompress: (RED,node,msg,data,callback)=>{
		if(logger.active) logger.send({label:"snappyToCompress"});
		snappy.compress(data, (err, data)=>{ 
			if(logger.active) logger.send({label:"snappy.compress",error:err})
			if(err) return error(node,Error(err))
			node.setData(RED,node,msg,data,callback)
		})
	},
	snappyToUncompress: (RED,node,msg,data,callback)=>{
		if(logger.active) logger.send({label:"snappyToUncompress"});
		snappy.uncompress(data, { asBuffer: false }, (err, data)=>{
			if(logger.active) logger.send({label:"snappy.uncompress",error:err});
			if(err) {
				error(node,Error(err));
				return;
			}
			node.setData(RED,node,msg,data,callback)
		})
	},
	XLSXToArray:(RED,node,msg,data,callback)=>callback(RED,node,msg,xlsx2.XLSX2Array(data)),
	XLSXObjectToArray:(RED,node,msg,data,callback)=>callback(RED,node,msg,xlsx2.XLSXObject2Array(data)),
	XLSXToJSON:(RED,node,msg,data,callback)=>callback(RED,node,msg,xlsx2.XLSX2JSON(data)),
	XLSXObjectToJSON:(RED,node,msg,data,callback)=>callback(RED,node,msg,xlsx2.XLSXObject2JSON(data)),
	XLSXToXLSXObject:(RED,node,msg,data,callback)=>callback(RED,node,msg,xlsx2.XLSX2XLSXObject(data)),
	XMLToJSON: (RED,node,msg,data,callback)=>callback(RED,node,msg,xmlParser.parse(data,XMLoptions,true)),
	invalidArray:(v=>!Array.isArray(v))
};

function evalFunction(id,mapping){
	try{
		return eval(mapping);
	} catch(ex) {
		throw Error(id+" "+ex.message);
	}
}
const is=(node,value)=>{
	return node.actionSource==value||node.actionTarget==value;
}
let jsonata;
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
			if(['Append','Concat','EndsWith','Prepend','Split','StartsWith'].includes(node.actionTarget)) {
				typedInput.setGetFunction(RED,node,"string")
			}
			const source=(node.sourceProperty||"msg.payload")
			const target=(node.targetProperty||"msg.payload")
			const sourceMap="(RED,node,msg)=>"+source,
			    deleteSource=typedInput.getValue(RED,node,"deleteSource",true)
				targetMap="(RED,node,msg,data,callback)=>{"+target+"=data;"+
					(node.topicProperty? "msg.topic=node.topicFunction(RED,node,msg,data);":"")+
					(deleteSource&&source!==target?"delete "+source+";"+"delete "+source+";":"")+
					"}",
				topicMap="(RED,node,msg,data,index)=>"+(node.topicProperty||"msg.topic");
			logger.sendInfo({label:"mappings",source:sourceMap,deleteSource:deleteSource,target:targetMap,topicMap:topicMap});
			const getData=evalFunction("source",sourceMap);
			node.getData=(RED,node,msg,callback)=>callback(RED,node,msg,getData(RED,node,msg))
			const setData1=evalFunction("target",targetMap);
			node.setData=(RED,node,msg,data,callback)=>{
				setData1(RED,node,msg,data)
				callback(RED,node,msg,data)
			}
			node.topicFunction=evalFunction("topic",topicMap);
			if(is(node,"AVRO")) {
				 node.avroTransformer=avsc.Type.forSchema(node.schemaValid);
			} else if(is(node,"Compressed")) {
				if(compressor==null) {
					const CompressionTool = require('compressiontool')
					compressor=new CompressionTool();
					compressor[node.compressionType]();
				}
			} else if(is(node,"Confluence")) {
				node.schemas={};
				for(const schema in node.schemaValid )
					node.schemas[schema]=avsc.Type.forSchema(node.schemaValid[schema]);
				logger.info({label:"confluence",schemas:Object.keys(node.schemas)});
			} else if(node.actionSource=="Date") {
				if(node.maxDate) node.maxDateTyped=toDateTypeZulu(node.maxDate)
				if(node.minDate) node.minDateTyped=toDateTypeZulu(node.minDate)
			}
		} catch(ex) {
			logger.error(n);
			error(node,ex,"Invalid setup "+ex.message);
			return;
		}
		if(is(node,"ISO8583")) {
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
		if(node.actionSource=="JSON" && node.JSONataSource){
			try{
				if(!jsonata) jsonata=require('jsonata')
				node.JSONataSourceExpression = jsonata(node.JSONataSource)
				node.getData1=node.getData
			    node.getData=(RED,node,msg,callback)=>
					node.getData1(RED,node,msg,(RED,node,msg,data)=>
						node.JSONataSourceExpression.evaluate(data,
							{msg:msg,RED:RED,node:node},
							(err,response)=>err?error(node,Error(err),err):callback(RED,node,msg,response))
						)
			} catch (ex) {
				console.log("JSONata source:",node.JSONataSource)
				error(node,ex,"JSONata source function error")
				return
			}
		}
		if(node.actionTarget=="JSON"&& node.JSONataTarget){
			try{
				if(!jsonata) jsonata=require('jsonata')
				node.JSONataTargetExpression = jsonata(node.JSONataTarget)
				node.setData1=node.setData
			    node.setData=(RED,node,msg,data,callback)=>{
					node.JSONataTargetExpression.evaluate(data,{msg:msg,RED:RED,node:node},
						(err,data)=>{
							if(err) error(node,ex,"JSONata target evaluate error")
							node.setData1(RED,node,msg,data,callback)
						}
					) 	
				} 
			} catch (ex) {
				console.log("JSONata Target:",node.JSONataTarget)
				error(node,ex,"JSONata target function error")
				return
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
//		node.processMsg=node.sendInFunction?this.transform
//			:(RED,node,msg,data,callback)=>node.setData(RED,node,msg,node.transform(RED,node,msg,data),callback);
		this.status({fill:"green",shape:"ring",text:"Ready"});
		node.on("input", function(msg) {
			if(logger.active) logger.send({label:"input",msgid:msg._msgid,topic:msg.topic});
			try{
				node.getData(RED,node,msg,(RED,node,msg,data)=>{
					if(node.invalidSourceType(data)) {
						msg.error=node.actionSource+" to "+node.actionTarget + " expected source data type "+node.actionSource;
						error(node,Error(msg.error),"Error(s)");
						node.send([null,msg]);
					}
					node.transform(RED,node,msg,data,(RED,node,msg,dataTransformed)=>node.setData(RED,node,msg,dataTransformed,()=>node.send([msg]) ))
				})
			} catch (ex) {
				logger.sendErrorAndDump("on input error",ex)
				msg.error=node.actionSource+" to "+node.actionTarget + " " +ex.message;
				error(node,Error(msg.error),"Error(s)");
				node.send([null,msg]);
			}
		});				
	}
	RED.nodes.registerType(logger.label,transformNode);
};
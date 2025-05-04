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
	if(logger.active) logger.send({label:"transformNode catch",shortMessage:shortMessage,error:ex.message,stack:ex.stack});
	node.error(ex.message);
	node.status({fill:"red",shape:"ring",text:(shortMessage||ex.message).substr(0,50)});
}
const getAvroTransformer=(node,schema)=>{
	try{
		return avsc.Type.forSchema(node.schemas[schema]);
	} catch(ex){
		if(node.schemas.hasOwnProperty(schema)) throw ex;
		throw Error("schema not found for "+schema);
	}
}

const addWorksheet2JSON=(object,worksheet,workbook,options)=>{
	object[worksheet]=XLSX.utils.sheet_to_json(workbook.Sheets[worksheet],options);
	if(options.header) object[worksheet].shift();
	if(logger.active) logger.send({label:"addWorksheet2JSON",object:object,worksheet:worksheet})
	return object;
}
const XLSXObjectToJSON=(RED,node,msg,data)=>data.SheetNames.reduce((a,worksheet)=>addWorksheet2JSON(a,worksheet,data),{})
const XLSXToArray=(RED,node,msg,data)=>XLSXObjectToArray(RED,node,msg,XLSXToXLSXObject(RED,node,msg,data))
const XLSXToJSON=(RED,node,msg,data)=>XLSXObjectToJSON(RED,node,msg,XLSXToXLSXObject(RED,node,msg,data))
const XLSXToXLSXObject=(RED,node,msg,data)=>XLSX.read(data, {raw:true,type: 'buffer' })
const XLSXObjectToArray=(RED,node,msg,data)=>data.SheetNames.reduce((a,worksheet)=>addWorksheet2JSON(a,worksheet,data,{header:1,raw:true}),{})
const JSONToXLSX=(RED,node,msg,data)=>XLSX.write(JSONToXLSXObject(RED,node,msg,data), {bookType:"xlsx", type:'buffer'})
const JSONToXLSXObject=(RED,node,msg,data)=>{
	const workbook = XLSX.utils.book_new();
	for(const worksheet in data) {
		const  ws=XLSX.utils.json_to_sheet(data[worksheet]);
		XLSX.utils.book_append_sheet(workbook, ws, worksheet);
	}
	return workbook;
}
const ArrayToXLSX=(RED,node,msg,data)=>XLSX.write(ArrayToXLSXObject(RED,node,msg,data), {bookType:"xlsx", type:'buffer'})
const ArrayToXLSXObject=(RED,node,msg,data)=>{
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
const ConfluenceToJSON=(RED,node,msg,data)=>{
	if(!Buffer.isBuffer(data)) data=Buffer.from(data);
	const magicByte=data.readUInt8();
	if(magicByte!==0) throw Error("expected magic byte and not found, found "+magicByte);
	if(data.length<5) throw Error("missing schema, data length "+data.length);
	const schema=data.readInt32BE(1);
	const avroTransformer=getAvroTransformer(node,schema);
	return {schema:schema,data:avroTransformer.fromBuffer(data.subarray(5))};
}
const JSONToConfluence=(RED,node,msg,data)=>{
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
	return data .map(r=>JSON.stringify(r)).join("/n");
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
	ArrayToXLSX:ArrayToXLSX,
	ArrayToXLSXObject:ArrayToXLSXObject,
	AVROToJSON: (RED,node,msg,data)=>node.avroTransformer.fromBuffer(data), // = {kind: 'CAT', name: 'Albert'}
	BigIntToRangeLimit: (RED,node,msg,data)=> data?data.rangeLimit(node.minBigIntTyped,node.maxBigIntTyped):node.minBigInt,
	BufferToCompressed: (RED,node,msg,data)=>compressor.compress(data,
		(compressed)=>{
			node.setData(RED,node,msg,compressed);
			node.send(msg);
		},
		(err)=>{
			error(node,Error(err));
		}
	),
	CompressedToBuffer:(RED,node,msg,data)=>compressor.decompress(data,
		(uncompressed)=>{
			node.setData(RED,node,msg,uncompressed);
			node.send(msg);
		},
		(err)=>{
			error(node,Error(err));
		}
	),
	CompressedToJSON:(RED,node,msg,data)=>compressor.decompress(data,
		(uncompressed)=>{
			try{
				node.setData(RED,node,msg,JSON.parse(uncompressed));
				node.send(msg);
			} catch(ex){
				msg.error=ex.message
				node.setData(RED,node,msg,uncompressed);
			}
		},
		(err)=>{
			error(node,Error(err));
		}
	),
	CompressedToString:(RED,node,msg,data)=>compressor.decompress(data,
		(uncompressed)=>{
			try{
				node.setData(RED,node,msg,uncompressed.toString());
				node.send(msg);
			} catch(ex){
				msg.error=ex.message;
				node.setData(RED,node,msg,uncompressed);
			}
		},
		(err)=>{
			error(node,Error(err));
		}
	),
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
	DateToisBetween: (RED,node,msg,data)=> toDateTypeZulu(data).isBetween(node.minDateTyped,node.maxDateTyped),
	DateToISODate: (RED,node,msg,data)=> toDateTypeZulu(data).toISOString().slice(0,10),
	DateToLocalDate: (RED,node,msg,data)=> toDateTypeZulu(data).toLocaleDateString().slice(0,10),
	DateToRangeLimit: (RED,node,msg,data)=> (data? toDateTypeZulu(data).rangeLimit(node.minDateTyped,node.maxDateTyped):node.minDateTyped),
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
			properties=Object.keys(data)
			for(const p of properties) {
				a.push([p,functions.JSONToArray(RED,node,msg,data[p])]);
			}
			return a;
		}
		return data;
	},
	JSONToAVRO: (RED,node,msg,data)=>node.avroTransformer.toBuffer(data), // Encoded buffer.
	JSONToCompressed: (RED,node,msg,data)=>compressor.compress(JSON.stringify(data),
		(compressed)=>{
			node.setData(RED,node,msg,compressed);
			node.send(msg);
		},
		(err)=>{
			error(node,Error(err));
		}
	),
	JSONToConfluence:JSONToConfluence,
	JSONToCSV: (RED,node,msg,data)=>Array2csv(node,data),
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
		} else {
			const newMsg=RED.util.cloneMessage(msg);
			newMsg._msgid=newMsg._msgid+":0";
			node.setData(RED,node,newMsg,data,0)
			node.send(newMsg);
		}
	},
	JSONTonpy: (RED,node,msg,data)=>new NumPy(data).toNpyBuffer(),
	JSONToNumPyObject: (RED,node,msg,data)=>new NumPy(data),
	JSONToString: (RED,node,msg,data)=>JSON.stringify(data),
	JSONToXLSX:JSONToXLSX,
	JSONToXLSXObject:JSONToXLSXObject,
	JSONToXML: (RED,node,msg,data)=>json2xmlParser.parse(data),
	npyToJSON: (RED,node,msg,data)=>new NumPy(data).toSerializable(),
	npyToNumPyObject: (RED,node,msg,data)=>new NumPy(data),
	NumPyObjectToJSON: (RED,node,msg,data)=> data.toSerializable(),
	NumberToAbbreviated: (RED,node,msg,data)=> data?data.isAbbreviated():data,
	NumberToisBetween: (RED,node,msg,data)=> data.isBetween(node.minNumber,node.maxNumber),
    NumberToRangeLimit: (RED,node,msg,data)=> data?data.rangeLimit(node.minNumber,node.maxNumber):node.minNumber,
	ObjectToCoalesce: (RED,node,msg,data)=>coalesce(data,node.value),
	ObjectToDeepClone: (RED,node,msg,data)=>daat.deepClone(),
	ObjectToNullif: (RED,node,msg,data)=>nullif(data,node.value),
	StringToAppend: (RED,node,msg,data)=>data.concat(node.getString(msg)),
	StringToArrayByDelimiter: (RED,node,msg,data)=>data
	  .split(node.delimiter??',')
	  .map(entry => entry.trim())
	  .filter(entry => entry),	
	StringToAt: (RED,node,msg,data)=>data.At(node.index),
	StringToCapitalize: (RED,node,msg,data)=> data.capitalize(),
	StringToCamelize: (RED,node,msg,data)=>data.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase()),
	StringToCharAt: (RED,node,msg,data)=>data.charAt(node.index),
	StringToCharCodeAt: (RED,node,msg,data)=>data.charCodeAt(node.index),
	StringToCodePointAt: (RED,node,msg,data)=>data.codePointAt(node.index),
	StringToCompressed: (RED,node,msg,data)=>compressor.compress(data,
		(compressed)=>{
			node.setData(RED,node,msg,compressed);
			node.send(msg);
		},
		(err)=>{
			error(node,Error(err));
		}
	),
	StringToConcat: (RED,node,msg,data)=>data.concat(node.getString(msg)),
	StringToDate: (RED,node,msg,data)=>toDateTypeZulu(data),
	StringToDateLocal: (RED,node,msg,data)=>new Date(data),
	StringToTimestamp: (RED,node,msg,data)=>Date.parse(data),
	StringToDelimiterOnCase:(RED,node,msg,data)=>data.replace(/[A-Z]/g, (letter, index) => {
        const lcLet = letter.toLowerCase();
		const separator= node.delimiter??"-"
        return index ? separator + lcLet : lcLet;
      })
      .replace(/([-_ ]){1,}/g,node.delimiter??"-"),
	StringToDeunderscore: (RED,node,msg,data)=> data.deunderscore(),
	StringToDeunderscoreCapitilize: (RED,node,msg,data)=> data.deunderscoreCapitilize(),
	StringToDropSquareBracketPrefix: (RED,node,msg,data)=> data.dropSquareBracketPrefix(),
	StringToEndsWith: (RED,node,msg,data)=> data.endsWith(node.getString(msg)),
	StringToFloat: (RED,node,msg,data)=>parseFloat(data),
	StringToGetWord: (RED,node,msg,data)=> data.getWord(node.index),
	StringToInteger: (RED,node,msg,data)=>parseInt(data, node.radix??10),
	StringToisBetween: (RED,node,msg,data)=> data.isBetween(node.minString,node.maxString),
	StringToJSON: (RED,node,msg,data)=>JSON.parse(data),
	StringToLowerCase: (RED,node,msg,data)=> data.toLowerCase(),
	StringToNumber: (RED,node,msg,data)=>Number(data),
	StringToPrepend: (RED,node,msg,data)=>node.getString(msg).concat(data),
    StringToRangeLimit: (RED,node,msg,data)=> data?data.rangeLimit(node.minString,node.maxString):node.minString,
	StringToReal: (RED,node,msg,data)=> data.toReal(),
	StringToSplit: (RED,node,msg,data)=>data.split(node.getString(msg)),
	StringToStartsWith: (RED,node,msg,data)=> data.startsWith(node.getString(msg)),
	StringToTitle: (RED,node,msg,data)=>data.toTitle(),
	StringTotTitleGrammatical: (RED,node,msg,data)=>data.toTitleGrammatical(),
	StringToTrim: (RED,node,msg,data)=>data.trim(),
	StringToTrimEnd: (RED,node,msg,data)=>data.trimEnd(),
	StringToTrimStart: (RED,node,msg,data)=>data.trimStart(),
	StringToUpperCase: (RED,node,msg,data)=> data.toUpperCase(),
	StringToXmlStringEncode: (RED,node,msg,data)=> data.xmlStringEncode(),
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
const is=(node,value)=>{
	return node.actionSource==value||node.actionTarget==value;
}
let jsonata;
function JSONataTransform(data,ok,error){
/*
(async () => {
    return result = await expression.evaluate(data);
})()
*/

	this.transformFunctionCompiled.evalFunction(data,{},(error, result) => {
		if(error) {
		  console.error(error);
		  return;
		}
		console.log("Finished with", result);
	});
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
			if(['Append','Concat','EndsWith','Prepend','Split','StartsWith'].includes(node.actionTarget)) {
				typedInput.setGetFunction(RED,node,"string")
			}
			node.sendInFunction=["snappy","Compressed"].includes(node.actionSource)||["Messages","Compressed"].includes(node.actionTarget);
			node.hasNewTopic=![null,""].includes(node.topicProperty);
			const source=(node.sourceProperty||"msg.payload")
			const target=(node.targetProperty||"msg.payload")
			const sourceMap="(RED,node,msg)=>"+source,
			    deleteSource=typedInput.getValue(RED,node,"deleteSource",true)
				targetMap="(RED,node,msg,data,index)=>{"+target+"=data;"+
					(node.sendInFunction && node.hasNewTopic? "msg.topic=node.topicFunction(RED,node,msg,data,index);":"")+
					(deleteSource&&source!==target?"delete "+source+";"+"delete "+source+";":"")+
					(node.sendInFunction ? "" : "node.send(msg);" )+
					"}",
				topicMap="(RED,node,msg,data,index)=>"+(node.topicProperty||"msg.topic");
			logger.sendInfo({label:"mappings",source:sourceMap,deleteSource:deleteSource,target:targetMap,topicMap:topicMap});
			node.getData=evalFunction("source",sourceMap);
			node.setData=evalFunction("target",targetMap);
			node.topicFunction=evalFunction("topic",topicMap);
			if(is(node,"AVRO")) {
				 node.avroTransformer=avsc.Type.forSchema(node.schemaValid);
			} else if(is(node,"Compressed")) {
				const CompressionTool = require('compressiontool')
				compressor=new CompressionTool();
				compressor[node.compressionType]();
			} else if(is(node,"Confluence")) {
				node.schemas={};
				for(const schema in node.schemaValid )
					node.schemas[schema]=avsc.Type.forSchema(node.schemaValid[schema]);
				logger.info({label:"confluence",schemas:Object.keys(node.schemas)});
			} else if(node.actionSource=="Date") {
				if(node.maxDate) node.maxDateTyped=toDateTypeZulu(node.maxDate)
				if(node.minDate) node.minDateTyped=toDateTypeZulu(node.minDate)
			}
			if(node.actionTarget=="Compressed"){
				const CompressionTool = require('compressiontool')
				compressor=new CompressionTool();
				compressor[node.compressionType]();
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
		if(node.transformFunction && is(node,"JSON")) {
			try{
				if(!jsonata) jsonata=require('jsonata')
				node.transformFunctionCompiled = jsonata(node.transformFunction);
			} catch (ex) {
				error(node,ex,"Transform function error");
				return;
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
		node.processMsg=node.sendInFunction?this.transform
			:(RED,node,msg,data)=>node.setData(RED,node,msg,node.transform(RED,node,msg,data));
		this.status({fill:"green",shape:"ring",text:"Ready"});
		node.on("input", function(msg) {
			if(logger.active) logger.send({label:"input",msgid:msg._msgid,topic:msg.topic});
			try{
				const data=node.getData(RED,node,msg);
				if(node.invalidSourceType(data)) throw Error("expected source data type "+node.actionSource); 
				node.processMsg(RED,node,msg,data);
			} catch (ex) {
				if(logger.active) logger.sendErrorAndDump("on input error",ex)
				msg.error=node.actionSource+" to "+node.actionTarget + " " +ex.message;
				error(node,Error(msg.error),"Error(s)");
				node.send([null,msg]);
			}
		});				
	}
	RED.nodes.registerType(logger.label,transformNode);
};
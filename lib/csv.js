const csvLines=(data,skipLeading=0,skipTrailing=0)=>{
	const lines=data.split(/[\r\n]+/g),skip=skipLeading;
	while(skip--) lines.shift();
	skip=skipTrailing;
	while(skip--) lines.pop();
	return lines;
}
const csvLinesforEach=(data,callback,skipLeading=0,skipTrailing=0)=>{
	const lines=csvLines(data,skipLeading,skipTrailing);	
	lines.forEach((value, idx) => {
		callback(value,idx);
	});
}
const array2tag=(a,t,tf)=>{
	const ts="<"+t+">",te="</"+t+">"
	return a.reduce((a,c)=>a+=ts+tf(c)+te,"");
}
const ArrayToCSV=data=>data.map(c=>JSON.stringify(c)).join("\n");
const regexCSV=/,(?=(?:(?:[^"]*"){2})*[^"]*$)/g;
const removeQuotes=s=>s.replace(/^"(.*)"$/, '$1').replace(/""/g, '"');
const CSVWithHeaderToARVO=data=>{
	const lines=csvLines(data);
	const header=lines.shift().split(regexCSV);
	const array=lines.map(line=>{	
		line.split(regexCSV).forEach((c,i)=>{
			o[header[i]]=c;
		});
		return o;
	});
}
const CSVToArray=data=>{
	const lines=csvLines(data,node.skipLeading,node.skipTrailing);
	lines.forEach((value, idx) => {
		lines[idx]=value.split(regexCSV).map((c)=>removeQuotes(c));
	});
	return lines;
}

const CSVToHTML=data=>
	"<table>"+ array2tag(csvLines(data,node.skipLeading,node.skipTrailing),"tr",(line)=>
		array2tag(line.split(regexCSV),"td",(c)=>"<![CDATA["+removeQuotes(c)+"]]>")
	)+"</table>";

const CSVWithHeaderToArray=data=>{
	let r=CSVToArray(RED,node,msg,data);
	r.shift();
	return r
}
const CSVWithHeaderToHTML=data=>{
	const lines=csvLines(data,node.skipLeading,node.skipTrailing);
	const header=array2tag(lines.shift().split(regexCSV),"th",(c)=>"<![CDATA["+removeQuotes(c)+"]]>");
	const result= "<table><tr>"+header+"</tr>"+
		array2tag(lines,
			"tr",
			(line)=>array2tag(
				line.split(regexCSV),
				'td',
				(c)=>"<![CDATA["+removeQuotes(c)+"]]>"
			)
		)+"</table>"
	return result;
}
const CSVLine2Array=(line)=>line.split(regexCSV).map((c)=>removeQuotes(c));
const CSVLine2JSON=(line,header)=>{
	const o={};	
	line.split(regexCSV).forEach((c,i)=>{
		o[header[i]]=c;
	});
	return o;
}
const CSVWithHeaderToJSON=data=>{
	const lines=csvLines(data,node.skipLeading,node.skipTrailing);
	const header=lines.shift().split(regexCSV);
	lines.forEach((value, idx) => {
		lines[idx]=CSVLine2JSON(value,header);
	});
	return lines;
}

const csvForEach=(
	data,
	callback,
	skipLeading=0,
	skipTrailing=0,
	hasHeader=true,
	returnJSON=hasHeader
)=>{
	const lines=csvLines(data,skipLeading,skipTrailing)
	const header=hasHeader ? lines.shift().split(regexCSV) : null;
	this.lines=csvline
	if(returnJSON){
		lines.forEach((value, idx) => {
			callback(CSVLine2JSON(value,header),idx,header);
		});
		return;
	} 
	lines.forEach((value, idx) => {
		callback(value,idx,header);
	});
}
class CSV(data,skipLeading=0,skipTrailing=0,hasHeader=true){
	this.parse(data,skipLeading,skipTrailing,hasHeader);
}
CSV.prototype.forEach=(callback,returnJSON=this.hasHeader)=>{
	if(returnJSON){
		this.lines.forEach((value, idx) => {
			callback(CSVLine2JSON(value,this.schema),idx,this.schema);
		});
		return;
	}
	this.lines.forEach((value, idx) => {
		callback(value,idx,this.schema);
	});
};
CSV.prototype.forEachLine=(callback)=>{
	this.lines.forEach((value, idx) => {
		callback(...value);
	});
};

CSV.prototype.parse=function(data,skipLeading=0,skipTrailing=0,hasHeader=true){
	this.lines=csvLines(data,skipLeading,skipTrailing).map(line=>this.parseLine(line));
	this.hasHeader=hasHeader;
	this.schema=hasHeader ? this.lines.shift().split(regexCSV) : null;

}
CSV.prototype.parseLine=(line)=>{
	return line.split(regexCSV).map((c)=>removeQuotes(c));
}
CSV.prototype.toARVO=function(){
	const array=this.lines.map(line=>{	
		const o={};
		line.split(regexCSV).forEach((c,i)=>{
			o[this.schema[i]]=c;
		});
		return o;
	});
	return {
  		"type": "record",
  		"name": "User",
  		"namespace": "example.avro",
  		"fields": [
    		{"name": "username", "type": "string"},
    		{"name": "age", "type": ["int", "null"], "default": 18}
  		]
		};
}
CSV.prototype.toHTML=function(){
	const header=this.schema ? array2tag(this.schema,"th",(c)=>"<![CDATA["+removeQuotes(c)+"]]>") : "";
	return "<table>"+(header ? "<tr>"+header+"</tr>" : "")+	array2tag(this.lines,"tr",(line)=>
		array2tag(line.split(regexCSV),"td",(c)=>"<![CDATA["+removeQuotes(c)+"]]>")
	)+"</table>";
}

module.exports={
	ArrayToCSV:ArrayToCSV,
	CSVToArray:CSVToArray,
	CSVToHTML:CSVToHTML,
	CSVWithHeaderToArray:CSVWithHeaderToArray,
	CSVWithHeaderToHTML:CSVWithHeaderToHTML,
	CSVWithHeaderToJSON:CSVWithHeaderToJSON
}

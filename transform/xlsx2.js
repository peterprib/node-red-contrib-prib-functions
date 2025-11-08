//see https://docs.sheetjs.com/docs/api/utilities/array

let XLSX=()=>{
    const requireXLSX=require('xlsx')
  XLSX=()=>requireXLSX
  return requireXLSX
}
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
	}

const addWorksheet2JSON=(object,worksheet,workbook,options={header:1,raw:true})=>{
	object[worksheet]=XLSX().utils.sheet_to_json(workbook.Sheets[worksheet],options)
	return object
}

const XLSXObject2JSON=(workbook,options)=>workbook.SheetNames.reduce((a,worksheet)=>addWorksheet2JSON(a,worksheet,workbook,options),{})
const XLSX2Array=data=>XLSXObject2Array(XLSX2XLSXObject(data))
const XLSX2JSON=data=>XLSX2XLSXObject(XLSXObject2JSON(data))
const XLSX2XLSXObject=data=>XLSX().read(data, {raw:true,type: 'buffer' })
const XLSXObject2Array=(workbookoptions={header:1,raw:true})=>workbook.SheetNames.reduce((a,worksheet)=>{
	a.push(XLSX().utils.sheet_to_json(workbook.Sheets[worksheet],options))
	return a
},[])
const JSON2XLSX=data=>XLSX().write(JSON2XLSXObject(data), {bookType:"xlsx", type:'buffer'})
const JSON2XLSXObject=data=>{
	const workbook = XLSX().utils.book_new();
	for(const worksheet in data) {
		const  ws=XLSX().utils.json_to_sheet(data[worksheet]);
		XLSX().utils.book_append_sheet(workbook, ws, worksheet);
	}
	return workbook
}
const Array2XLSX=data=>XLSX().write(Array2XLSXObject(data), {bookType:"xlsx", type:'buffer'})
const Array2XLSXObject=data=>{
	const workbook = XLSX().utils.book_new();
	if(Array.isArray(data)) {
		const  ws=XLSX().utils.aoa_to_sheet(data);
		XLSX().utils.book_append_sheet(workbook, ws,"worksheet 1");
		return workbook
	} 
	for(const worksheet in data) {
		const  ws=XLSX().utils.aoa_to_sheet(data[worksheet]);
		XLSX().utils.book_append_sheet(workbook, ws, worksheet);
	}
	return workbook
}
module.exports={
  addWorksheet2JSON:addWorksheet2JSON,
  XLSXObject2JSON:XLSXObject2JSON,
  XLSX2Array:XLSX2Array,
  XLSX2JSON:XLSX2JSON,
  XLSX2XLSXObject:XLSX2XLSXObject,
  XLSXObject2Array:XLSXObject2Array,
  JSON2XLSX:JSON2XLSX,
  JSON2XLSXObject:JSON2XLSXObject,
  Array2XLSX:Array2XLSX,
  Array2XLSXObject:Array2XLSXObject
}
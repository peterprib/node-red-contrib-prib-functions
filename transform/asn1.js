const throwError=(msg,p)=>{throw Object.assign(new Error(msg),p)}
const Uint8ArrayFromBase64=(b64)=>new Uint8Array(Buffer.from(b64, "base64"))
const base64FromUint8Array=(a)=>Buffer.toString(a, "base64")
const hexFromArray=(a)=>Buffer.from(a).toString('hex')
const UInt8ToBinary=(a)=> {
	const buf = Buffer.allocUnsafe(a.length);
	a.forEach((c,i)=>buf.writeUInt8(c,i))
	return buf
};

const test={
		PrintableString:(s)=>{if(s.test(/^[a-z0-9  '()+,-./:=?]*$/i)) return; throw Error("invalid PrintableString")}
}

function Classes() {}
Classes.prototype.UNIVERSAL=0b00000000; 
Classes.prototype.APPLICATION=0b01000000;
Classes.prototype.CONTEXTSPECIFIC=0b10000000;
Classes.prototype.PRIVATE=0b11000000;
Classes.prototype.values={1:Classes.prototype.UNIVERSAL,2:Classes.prototype.APPLICATION,3:Classes.prototype.CONTEXTSPECIFIC,4:Classes.prototype.PRIVATE};
Classes.prototype.names={1:"UNIVERSAL",2:"APPLICATION",3:"CONTEXT-SPECIFIC",4:"PRIVATE"};
Classes.prototype.setOctet=(octet,tag)=>octet|=(Classes.prototype.values[tag]);	
Classes.prototype.setOctetName=(octet,tagName)=>octet|=(Classes.prototype[tagName]);	
Classes.prototype.getOctetValue=(octet)=>octet>>6+1;
//Classes.prototype.getOctetTag=(octet)=>octet|=Classes.prototype[tag];	
//Classes.prototype.toString=(octet)=>classes.names[Classes.getOctetTag(octet)];	
const classes=new Classes()

function PC() {}
PC.prototype.P=0b0000; 
PC.prototype.Primitive=0b00000000; 
PC.prototype.C=0b00100000; 
PC.prototype.Constructed =0b00100000; 
PC.prototype.isPrimitive =(octet)=>octet&0b00000000; 
PC.prototype.isConstructed =(octet)=>octet&0b00100000; 
PC.prototype.setOctet=(octet)=>octet|=(classes[tag]);
PC.prototype.toString=(octet)=>pc.isPrimitive(octet)?"Primitive":"Constructed";
PC.prototype.set=(octet,action)=>octet=(octet^0b00100000)&pc[action];
const pc=new PC();

function Octet1(v) {
	this.value=v
}
Octet1.prototype.getClass=()=>Classes.getOctetValue(this.value);
Octet1.prototype.getTag=()=>this.value&0b00011111;
Octet1.prototype.isLongForm=()=>(this.value^0b10000000) & (this.value^0b01111111);
Octet1.prototype.toJSON=()=>{return {"class":this.getClass(this.value), tag:this.getTag(this.value), longForm:this.isLongForm(this.value)};};
Octet1.prototype.toString=function(){const r=this.toJSON();r.className=classes.names(r.classID) ;return JSON.stringify(r)};
Octet1.prototype.isConstructed=()=>pc.isConstructed(this.value);

function IdentifierOctets(dataArray,i){
	if(dataArray) this.decode(dataArray,i)
}
IdentifierOctets.prototype.decode=function (dataArray,i){
	this.tags=[];
	if(!dataArray.length) return;
	const octet1=new Octet1(dataArray[i++]);
	this.tagClass=octet1.getClass();
	this.isConstructed=octet1.isConstructed();
	if(octet1.isLongForm())  //isLongForm
		this.tags.push(octet1.getTag());
	else {
		let more=true
		while (more) {
			const octet=dataArray[i++];
			const tag=octet&0b01111111;
			if(tag>0x24) throw Error("tag = 0x00")
			if(tag>0x24) throw Error("tag > 0x24")
			this.tags.push(tag);  
			more=octet&0b1000000;;
		}
	}
};
IdentifierOctets.prototype.toJSON=function (){
	return {"class":this.tagClass,constructed:this.isConstructed,tags:this.tags}
}
IdentifierOctets.prototype.toJSONExtended=function (){
	const r=this.toJSON();
	r.tags=r.tags.map(c=>({id:c,name:tags[c].name}));
	return r
};
IdentifierOctets.prototype.toString==function (){
	return JSON.stringify(this.toJSONExtended())
};

//Basic Encoding Rules (BER)
function BERencoding(dataArray,i=0) {
	//Identifier octets	Type  i++
	//	if(!(dataArray  instanceof Uint8Array) ) throw Error("data not Uint8Array  but "+dataArray.constructor.name)
	this.decodeBER(dataArray,i);
}
BERencoding.prototype.encode=function(v){
	for(const p in v) {
		switch (p) {
		case "Identifier":
			this.setIdentifier(v[p])
			next;
		default:
			throw Error("unknown base property "+p)
		}
	}
}
BERencoding.prototype.setIdentifier=function(v){
	for(const p in v) {
		switch (p) {
		case "class":
			this.tagClass=v[p]
			next;
		case "tag":
			this.tags=[v[p]]
			next;
		case "constructed":
			this.isConstructed=v[p]
			next;
		default:
			throw Error("unknown identifier property "+p)
		}
	}
}
BERencoding.prototype.setSchema=function(schema){
}

BERencoding.prototype.decodeBER=function(dataArray,i){
	if(dataArray.constructor.name!=="Uint8Array") throw Error("data not Uint8Array but "+dataArray.constructor.name)
	this.identifier=new IdentifierOctets(dataArray,i);
	if(dataArray[i]===0xFF) { //isIndefinite
		const eocIndex=dataArray.indexOf(0x00,i) 
		this.data=dataArray.slice(i,eocIndex-1);
		i=eocIndex+1;
	} else {
		const endPosition=i+LengthOctet.prototype.getLength(dataArray,i);
		this.data=dataArray.slice(i,endPosition);
		i=endPosition+1;
	}
}
BERencoding.prototype.decode=BERencoding.prototype.decodeBER;
BERencoding.prototype.toJSON= function(){
	return {identifier:this.identifier.toJSONExtended(),data:this.data,dataHex:this.data2Hex()};
}
BERencoding.prototype.toString= function(){
	return JSON.stringify(this.toJSON());
}
BERencoding.prototype.data2Hex= function(){
	const r=[];
	this.data.forEach(c=>r.push("0x"+c.toString(16)))
	return r;
}
const constructPrimitive=null;
const constructConstructed=false
const constructBoth=true;
const constructReserved=undefined;
const PrintableString2Value=(a,i,l)=>{
	const s=i;
	i=i+l;
	return a.slice(s,i)
};
const Value2PrintableString=(v)=>{
	test.PrintableString(v);
	return v;
}

const tags=[
	{name:"End-of-Content (EOC)",permittedConstruction:constructPrimitive},
	{name:"BOOLEAN",permittedConstruction:constructPrimitive,translatedTo:(v)=>v?0x01:0x00,translatedFrom:(a,i)=>a[i++]==0x01},
	{name:"INTEGER",permittedConstruction:constructPrimitive},
	{name:"BIT STRING",permittedConstruction:constructBoth},
	{name:"OCTET STRING",permittedConstruction:constructBoth},
	{name:"NULL",permittedConstruction:constructPrimitive},
	{name:"OBJECT IDENTIFIER",permittedConstruction:constructPrimitive},
	{name:"Object Descriptor",permittedConstruction:constructBoth},
	{name:"EXTERNAL",permittedConstruction:constructConstructed},
	{name:"REAL (float)",permittedConstruction:constructPrimitive},
	{name:"ENUMERATED",permittedConstruction:constructPrimitive},
	{name:"EMBEDDED PDV",permittedConstruction:constructConstructed},
	{name:"UTF8String",permittedConstruction:constructBoth},
	{name:"RELATIVE-OID",permittedConstruction:constructPrimitive},
	{name:"TIME",permittedConstruction:constructPrimitive},
	{name:"Reserved",permittedConstruction:constructReserved},
	{name:"SEQUENCE and SEQUENCE OF",permittedConstruction:constructConstructed},
	{name:"SET and SET OF",permittedConstruction:constructConstructed},
	{name:"NumericString",permittedConstruction:constructBoth},
	{name:"PrintableString",permittedConstruction:constructBoth,translatedTo:Value2PrintableString,translatedFrom:PrintableString2Value},
	{name:"T61String",permittedConstruction:constructBoth},
	{name:"VideotexString",permittedConstruction:constructBoth},
	{name:"IA5String",permittedConstruction:constructBoth},
	{name:"UTCTime",permittedConstruction:constructBoth},
	{name:"GeneralizedTime",permittedConstruction:constructBoth},
	{name:"GraphicString",permittedConstruction:constructBoth},
	{name:"VisibleString",permittedConstruction:constructBoth},
	{name:"GeneralString",permittedConstruction:constructBoth},
	{name:"UniversalString",permittedConstruction:constructBoth},
	{name:"CHARACTER STRING",permittedConstruction:constructConstructed},
	{name:"BMPString",permittedConstruction:constructBoth},
	{name:"DATE",permittedConstruction:constructPrimitive},
	{name:"TIME-OF-DAY",permittedConstruction:constructPrimitive},
	{name:"DATE-TIME",permittedConstruction:constructPrimitive},
	{name:"DURATION",permittedConstruction:constructPrimitive},
	{name:"OID-IRI",permittedConstruction:constructPrimitive},
	{name:"RELATIVE-OID-IRI",permittedConstruction:constructPrimitive},
];

function LengthOctet() {}
LengthOctet.prototype.definiteShort=0x00;
LengthOctet.prototype.definiteLong=0xC0;
LengthOctet.prototype.indefinite= 0xC0;
LengthOctet.prototype.reserved=0xFF;
LengthOctet.prototype.isIndefinite= (o)=>o&0xC0;
LengthOctet.prototype.octets=(o)=>o^0b01111111;
LengthOctet.prototype.getLength=(octets,i)=>{
	const octet=octets[i++];
	if(octet===0xC0) return  undefined; 
	if(octet&0xC0) return octet; //isDefiniteShort
	if(octet===0xFF) return NaN; //isReserved
	let l=octet&0b01111111;  // length
	let length=octets[i++];
	while (l--) length=length*256+octets[i++]
	 if(length < 0) throw new Error('Negative length: ' + length);
	return length;
}

// Canonical Encoding Rules (CER)
function CERencoding(dataArray,i=0) {
	throw Error("to be done")
}
//Distinguished Encoding Rules (DER)
function DERencoding(dataArray,i=0) {
	throw Error("to be done")
}

module.exports={
		base64:Uint8ArrayFromBase64,
		hex:hexFromArray,
		decode:(dataArray,i)=>new BERencoding(dataArray,i),
		decodeBER:(dataArray,i)=>new BERencoding(dataArray,i),
		decodeBase64:(v)=>BERencoding(arrayFromBase46(v)),
		encode:BERencoding
}

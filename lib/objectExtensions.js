const defineMethod=(object,name,call)=>{
    if(name in object.prototype) return
    try{
        Object.defineProperty(object.prototype, name, {
            enumerable: false,
              value: call
        }) 
    } catch(ex){
        console.error("defining "+name,ex.message)
    }
}
const toDateType=aDate=>aDate instanceof Date? aDate : new Date(Date.parse(aDate))
const toDateTypeZulu=aDate=>aDate instanceof Date? aDate : new Date(aDate)
defineMethod(Array,'move',function(from, to) {
    if(from<to) to--
    this.splice(to, 0, this.splice(from, 1)[0])
})
defineMethod(String,"in",function (...str) {
    for (var i = 0; i < arguments.length; i++)
        if(this==arguments[i]) return true
   return false
})
defineMethod(String,"capitalize",function() {return this.charAt(0).toUpperCase() + this.slice(1)})
defineMethod(String,"toCapitalized",function() {return this.charAt(0).toUpperCase() + this.slice(1)})
defineMethod(String,"to",function (type) {
    if(type==null) return value
    return this['to'+type.capitalize()]
})
defineMethod(String,"toReal",function (){return parseFloat(this)})
defineMethod(String,"toTitle", function (){return this.replace(/\w\S*/g, text => text.capitalize())})

defineMethod(String,"toTitleGrammatical", function (){   
    const lowerCaseList = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'as', 'at', 
        'by', 'from', 'in', 'into', 'of', 'on', 'onto', 'to', 'with', 'yet', 'so','upon', 'like', 'over', 'plus', 'up', 'down', 'off', 'near'];
    const title=this.replace(/\p{L}+/gu, (word)=>{
        const wordLowerCase=word.toLowerCase()
        return lowerCaseList.includes(wordLowerCase) ? wordLowerCase : word.capitalize()
    })
    return title.capitalize()
})

defineMethod(String,"toInt",function() {return parseInt(this)})
if(!String.prototype.toInt) String.prototype.toInteger=String.prototype.toInt
defineMethod(String,"toTimestamp",function () {
    return Date.parse(this.substring(0,4)+'/'+this.substring(5,2)+'/'+this.substring(8,11))
         + parseInt(this.substring(21,3));
})
defineMethod(String,"toTime",function () {return  Date.parse(this)})
defineMethod(String,"CRLF2BR", function(){return  this.replace("\n\r","<br/>").replace("\n","<br/>")})

defineMethod(Array,"findSorted",function(searchElement,minIndex = 0,maxIndex = this.length - 1) {
    let currentIndex, currentElement
    while(minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) / 2 | 0
        currentElement = this[currentIndex]
        if(currentElement < searchElement) {
            minIndex = currentIndex + 1;
        } else if(currentElement > searchElement) {
            maxIndex = currentIndex - 1;
        } else return currentIndex
    }
    return -minIndex
 })
 defineMethod(Array,"addSorted",function(element) {
   if(this.length){
    const position = -this.findSorted(element)
    if(position<0 ) return -position
    this.splice(position, 0, element)
    return position
   }
   this.push(element)
   return 0
})

defineMethod(Object,"addList",function(property,object) {
    try{
        this[property].push(object)
    } catch(ex) {
        this[property]=[object]
    }
})
defineMethod(Object,"addErrorFunctions",function(){ 
    this.onError=function(call){
        if(this.errorStack) this.errorStack.push(call)
        else this.errorStack=[this.call]
        return this
    }
    this.error=function(ex="no error message"){
        if(this.errorStack){
            this.errorStack.forEach((callFunction)=>{
              try{
                    callFunction(ex)
                }catch(ex) {}
            })
            return
        }
        if(typeof ex == "string") throw Error(ex)
        throw ex
    }
})

const colourSmallList={
    "Red":'#FF0000',
    "Turquoise":'#00FFFF',
    "Grass Green":'#408080',
    "Dark Blue":'#0000A0', 		
    "Orange":'#FF8040',	
    "Yellow":'#FFFF00',  	 	
    "Burgundy":'#800000',  	
    "Dark Purple":'#800080',  	
    "Brown":'#804000',  	
    "Pastel Green":'#00FF00',  		
    "Pink":'#FF00FF',  	 	
    "Light Grey":'#C0C0C0',  	
    "Forest Green":'#808000',  	
    "Light Blue":'#0000FF',  	 	
    "Light Purple":'#FF0080',  	 	
    "Dark Grey":'#808080'
}
const colours ={
    AliceBlue: '#F0F8FF',
    AntiqueWhite: '#FAEBD7',
    Aqua: '#00FFFF',
    Aquamarine: '#7FFFD4',
    Azure: '#F0FFFF',
    Beige: '#F5F5DC',
    Bisque: '#FFE4C4',
    Black: '#000000',
    BlanchedAlmond: '#FFEBCD',
    Blue: '#0000FF',
    BlueViolet: '#8A2BE2',
    Brown: '#A52A2A',
    BurlyWood: '#DEB887',
    CadetBlue: '#5F9EA0',
    Chartreuse: '#7FFF00',
    Chocolate: '#D2691E',
    Coral: '#FF7F50',
    CornflowerBlue: '#6495ED',
    Cornsilk: '#FFF8DC',
    Crimson: '#DC143C',
    Cyan: '#00FFFF',
    DarkBlue: '#00008B',
    DarkCyan: '#008B8B',
    DarkGoldenRod: '#B8860B',
    DarkGray: '#A9A9A9',
    DarkGrey: '#A9A9A9',
    DarkGreen: '#006400',
    DarkKhaki: '#BDB76B',
    DarkMagenta: '#8B008B',
    DarkOliveGreen: '#556B2F',
    DarkOrange: '#FF8C00',
    DarkOrchid: '#9932CC',
    DarkRed: '#8B0000',
    DarkSalmon: '#E9967A',
    DarkSeaGreen: '#8FBC8F',
    DarkSlateBlue: '#483D8B',
    DarkSlateGray: '#2F4F4F',
    DarkSlateGrey: '#2F4F4F',
    DarkTurquoise: '#00CED1',
    DarkViolet: '#9400D3',
    DeepPink: '#FF1493',
    DeepSkyBlue: '#00BFFF',
    DimGray: '#696969',
    DimGrey: '#696969',
    DodgerBlue: '#1E90FF',
    FireBrick: '#B22222',
    FloralWhite: '#FFFAF0',
    ForestGreen: '#228B22',
    Fuchsia: '#FF00FF',
    Gainsboro: '#DCDCDC',
    GhostWhite: '#F8F8FF',
    Gold: '#FFD700',
    GoldenRod: '#DAA520',
    Gray: '#808080',
    Grey: '#808080',
    Green: '#008000',
    GreenYellow: '#ADFF2F',
    HoneyDew: '#F0FFF0',
    HotPink: '#FF69B4',
    IndianRed: '#CD5C5C',
    Indigo: '#4B0082',
    Ivory: '#FFFFF0',
    Khaki: '#F0E68C',
    Lavender: '#E6E6FA',
    LavenderBlush: '#FFF0F5',
    LawnGreen: '#7CFC00',
    LemonChiffon: '#FFFACD',
    LightBlue: '#ADD8E6',
    LightCoral: '#F08080',
    LightCyan: '#E0FFFF',
    LightGoldenRodYellow: '#FAFAD2',
    LightGray: '#D3D3D3',
    LightGrey: '#D3D3D3',
    LightGreen: '#90EE90',
    LightPink: '#FFB6C1',
    LightSalmon: '#FFA07A',
    LightSeaGreen: '#20B2AA',
    LightSkyBlue: '#87CEFA',
    LightSlateGray: '#778899',
    LightSlateGrey: '#778899',
    LightSteelBlue: '#B0C4DE',
    LightYellow: '#FFFFE0',
    Lime: '#00FF00',
    LimeGreen: '#32CD32',
    Linen: '#FAF0E6',
    Magenta: '#FF00FF',
    Maroon: '#800000',
    MediumAquaMarine: '#66CDAA',
    MediumBlue: '#0000CD',
    MediumOrchid: '#BA55D3',
    MediumPurple: '#9370DB',
    MediumSeaGreen: '#3CB371',
    MediumSlateBlue: '#7B68EE',
    MediumSpringGreen: '#00FA9A',
    MediumTurquoise: '#48D1CC',
    MediumVioletRed: '#C71585',
    MidnightBlue: '#191970',
    MintCream: '#F5FFFA',
    MistyRose: '#FFE4E1',
    Moccasin: '#FFE4B5',
    NavajoWhite: '#FFDEAD',
    Navy: '#000080',
    OldLace: '#FDF5E6',
    Olive: '#808000',
    OliveDrab: '#6B8E23',
    Orange: '#FFA500',
    OrangeRed: '#FF4500',
    Orchid: '#DA70D6',
    PaleGoldenRod: '#EEE8AA',
    PaleGreen: '#98FB98',
    PaleTurquoise: '#AFEEEE',
    PaleVioletRed: '#DB7093',
    PapayaWhip: '#FFEFD5',
    PeachPuff: '#FFDAB9',
    Peru: '#CD853F',
    Pink: '#FFC0CB',
    Plum: '#DDA0DD',
    PowderBlue: '#B0E0E6',
    Purple: '#800080',
    RebeccaPurple: '#663399',
    Red: '#FF0000',
    RosyBrown: '#BC8F8F',
    RoyalBlue: '#4169E1',
    SaddleBrown: '#8B4513',
    Salmon: '#FA8072',
    SandyBrown: '#F4A460',
    SeaGreen: '#2E8B57',
    SeaShell: '#FFF5EE',
    Sienna: '#A0522D',
    Silver: '#C0C0C0',
    SkyBlue: '#87CEEB',
    SlateBlue: '#6A5ACD',
    SlateGray: '#708090',
    SlateGrey: '#708090',
    Snow: '#FFFAFA',
    SpringGreen: '#00FF7F',
    SteelBlue: '#4682B4',
    Tan: '#D2B48C',
    Teal: '#008080',
    Thistle: '#D8BFD8',
    Tomato: '#FF6347',
    Turquoise: '#40E0D0',
    Violet: '#EE82EE',
    Wheat: '#F5DEB3',
    White: '#FFFFFF',
    WhiteSmoke: '#F5F5F5',
    Yellow: '#FFFF00',
    YellowGreen: '#9ACD32'
}
defineMethod(String,"csvLine",function(delimiter=",",quote='"'){
    let i=this.length,j=i,charInQuote,result=[]
    if(i==0) return result
    delimiter:while(i--){
        const char=this[i]
        if(char==quote) {
            j=i
            quote:while(i--){
                charInQuote=this[i]
                if(charInQuote==quote){
                    if(!i) {
                        result.unshift(this.substring(i+1,j).replace(quote+quote,quote))
                        return result
                    } 
                    charInQuote=this[--i]
                    if(charInQuote==quote) continue quote
                    if(charInQuote==delimiter) {
                        result.unshift(this.substring(i+2,j).replace(quote+quote,quote))
                        j=i
                        continue delimiter
                    }
            
                    throw Error("invalid csv on quotes at "+(i+1)+" to " + j)
                }
            }
        } else if(char==delimiter) {
            const v=this.substring(i+1,j)
            result.unshift(v.length?isNaN(v)? v : Number(v):null)
            j=i
        }
    }
    const v=this.substring(i+1,j)
    result.unshift(v.length?isNaN(v)? v : Number(v):null)
    return result
})
defineMethod(String,"csvFile",function(delimiter=",",quote='"'){
    let i=this.length,j=i,charInQuote,result=[],line=[]
    if(i==0) return result
    line:while(i--){
        delimiter:while(i--){
            const char=this[i]
            if(char=="\n") {
                break delimiter
            } else if(char==quote) {
                j=i
                quote:while(i--){
                    charInQuote=this[i]
                    if(charInQuote==quote){
                        if(!i) {
                            result.unshift(this.substring(i+1,j).replace(quote+quote,quote))
                            return result
                        } 
                        charInQuote=this[--i]
                        if(charInQuote==quote) continue quote
                        if(charInQuote==delimiter) {
                            result.unshift(this.substring(i+2,j).replace(quote+quote,quote))
                            j=i
                            continue delimiter
                        }
                
                        throw Error("invalid csv on quotes at "+(i+1)+" to " + j)
                    }
                }
            } else if(char==delimiter) {
                const v=this.substring(i+1,j)
                result.unshift(v.length?isNaN(v)? v : Number(v):null)
                j=i
            }
        }
        const v=this.substring(i+1,j)
        line.unshift(v.length?isNaN(v)? v : Number(v):null)
        result.unshift(line)
    }
    return result
})

defineMethod(Date,"isBetween",function(min, max) {return !(this < toDateType(min) || this > toDateType(max))}) 
defineMethod(Number,"isBetween",function(min, max) {return !(this < min || this > max)})
defineMethod(String,"isBetween",function(min, max) {return !(this < min || this > max)})
defineMethod(Object,"toSimpleArray",function(prefix) {
	const returnValue=[]
	for (let property in this) {
		if(this[property]==null || this[property].enumerable==null || this[property].enumerable)
		  	returnValue.push([(prefix?prefix:"")+property,this[property],typeof this[property]])
		}
	return returnValue
})
defineMethod(Object,"toSimpleArrayIgnoreNulls",function(prefix) {
	const returnValue=[]
	for (let property in this) {
		if(this[property]==null ) continue
		if(this[property].enumerable==null || this[property].enumerable)
		  	returnValue.push([(prefix?prefix:"")+property,this[property],typeof this[property]])
		}
	return returnValue
})

defineMethod(String,"in",function () {
	for (let i = 0; i < arguments.length; i++)
		if(this.toString()===arguments[i]) return true;
	return false
})
defineMethod(String,"startsWithList",function () {
	for (var i = 0; i < arguments.length; i++)
		if(this.slice(0, arguments[i].length)===arguments[i]) return true
	return false
})
defineMethod(String,"startsWithListAnyCase",function (...list) {
	for (var i = 0; i < list.length; i++){
        const testString=list[i].toLowerCase()
		if(this.slice(0, testString.length).toLowerCase()==testString) return true
    }
	return false
})
defineMethod(String,"xmlStringEncode",function() {
	return this.toString().replace(/([\&"<>])/g, function(str, item) {
		return {
			'&': '&amp;',
			'"': '&quot;',
			'<': '&lt;',
			'>': '&gt;'
		}[item]
	});
})

defineMethod(Number,"toAbbreviated",function() {
    const digits=(v,e)=>{
        const nv=v/Math.pow(10,e)
        const anv=Math.abs(nv)
        if(anv<10)   return nv.toFixed(2).toString()    
        if(anv<100)   return nv.toFixed(1).toString()
        return nv.toFixed(0).toString()    
    }
    const a=Math.abs(this)
	if(a>Math.pow(10,15)) return digits(this,15)+'P'
	if(a>Math.pow(10,12)) return digits(this,12)+'T'
	if(a>Math.pow(10,9)) return digits(this,9)+'G'
	if(a>Math.pow(10,6)) return digits(this,6)+'M'
	if(a>Math.pow(10,3)) return digits(this,3)+'K'
	return digits(this,0)
})

defineMethod(BigInt,"toAbbreviated",function() {
    const digits=(v,e)=>{
        const nv=v/Math.pow(10,e)
        const anv=Math.abs(nv)
        if(anv<10)   return nv.toFixed(2).toString()    
        if(anv<100)   return nv.toFixed(1).toString()
        return nv.toFixed(0).toString()    
    }
    const a=Math.abs(this)
	if(a>Math.pow(10,15)) return digits(this,15)+'P'
	if(a>Math.pow(10,12)) return digits(this,12)+'T'
	if(a>Math.pow(10,9)) return digits(this,9)+'G'
	if(a>Math.pow(10,6)) return digits(this,6)+'M'
	if(a>Math.pow(10,3)) return digits(this,3)+'K'
	return digits(this,0)
})


defineMethod(String,"getWord",function(wordPosition) {return this.split(/\s+/g,wordPosition+1)[wordPosition-1]??""})

const coalesce=(...args)=>{
	for (var i=0; i<args.length; ++i)
 		if (args[i] !=  null) return args[i]
	return null; 
}
const nullif=(a,b)=>{return a==b?null:a}
//missing Float16Array,
[ArrayBuffer,Number,Boolean,BigInt,Date,String,Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,BigInt64Array,BigUint64Array,Float32Array,Float64Array].forEach(type=>{
  defineMethod(type,"deepClone",function(){ return new type(this)})
})


//defineMethod(TypedArray,"deepClone",function(){ return new type(this)})
defineMethod(Array,"deepClone",function(){
    const clone=[]
	for (let i in this)
		clone[i]=this[i].deepClone()
    return clone
})
defineMethod(Object,"deepClone",function(){
    const clone={}
	for (let i in this)
		clone[i]=this[i].deepClone()
    return clone
})
defineMethod(Number, "rangeLimit",function(min,max) {return (min!=null && this<min) ? min : ((max!=null && this>max) ? max : this)})
defineMethod(BigInt, "rangeLimit",function(min,max) {return (min!=null && this<min) ? min : ((max!=null && this>max) ? max : this)})
defineMethod(Date, "rangeLimit",function(min,max) {return (min!=null && this<min) ? min : ((max!=null && this>max) ? max : this)})
defineMethod(String, "rangeLimit",function(min,max) {return (min!=null && this<min) ? min : ((max!=null && this>max) ? max : this)})
defineMethod(String,"deunderscore",function(){return this.replace(/_/g," ")})
defineMethod(String,"deunderscoreCapitilize",function(){return this.replace(/_/g," ").toTitle()})
defineMethod(String,"dropSquareBracketPrefix",function(bracket="[",endBracket="]"){return (this.substr(0,1)==bracket)? this.split(endBracket+" ")[1] : this})
module.exports={
    coalesce:coalesce,
    colours:colours,
    colourSmallList:colourSmallList,
    nullif:nullif,
    toDateType,
    toDateTypeZulu,
}
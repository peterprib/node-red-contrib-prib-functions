const Format=require('./Format')
function json2xml(tag, obj, emptyIsNull, hexObjectWhenTag) {
    try{
        if(hexObjectWhenTag!=null) {
            const l=hexObjectWhenTag.length
            for(let i=0;i<l;i++)
                if(hexObjectWhenTag[i]==tag)		
                    return '<' + tag + '><jsonObject>' 
                        + Format.StringToHex(JSON.stringify(obj)) 
                        + '</jsonObject></' + tag + '>'
        }
        if (typeof obj === 'undefined' || obj === null) 
            return '<' + tag + '/>';
        if (typeof obj !== 'object')
            return '<' + tag + '>' 
                + Format.xmlEncodeString(obj) 
                + '</' + tag + '>';
   
        let elementValue ='';
        if (obj.constructor === Array) {
            for (let i = 0; i < obj.length; i++) {
                if (typeof obj[i] !== 'object'
                || obj[i].constructor == Object) {
                    elementValue += json2xml('jsonArrayElement', obj[i],emptyIsNull, hexObjectWhenTag);
                    continue;
                }
                throw new Error((typeof obj[i]) + ' is not supported.');
            }
            return '<'+tag+'>' + elementValue + '</'+tag+'>';
        }
        if (obj.constructor !== Object)
            return '<' + tag + '/>';
        let attributes ='';
        if (typeof obj['#text'] !== 'undefined') {
            if (typeof obj['#text'] == 'object')
                throw new Error((typeof obj['#text']) + ' which is #text, not supported.');
            elementValue += Format.xmlEncodeString(obj['#text']);
        }
        for (let name in obj) {
            if(name==null) continue;
            let objElement=obj[name];
            if(objElement==null) continue
            if (name.charAt(0) == '$') {
                elementValue += '<jsonDollarParameter name="' + name + '">'+Format.xmlEncodeString(objElement)+'</jsonDollarParameter>';
                continue;
            }
            if (name.charAt(0) == '@') {
                if (typeof obj[b] == 'object')
                    throw new Error((typeof objElement) + ' attribute not supported.');
                attributes += ' ' + name.substring(1) + '="' + Format.xmlEncodeString(objElement) + '"';
                continue;
            } 
            switch (obj[name].constructor) {
                case Array :
                    if(hexObjectWhenTag!=null) {
                        for(let i=0;i<hexObjectWhenTag.length;i++)
                            if(hexObjectWhenTag[i]==name) {		
                                elementValue += '<' + name + '><jsonObject>' 
                                    + Format.StringToHex(JSON.stringify(objElement)) 
                                    + '</jsonObject></' + name + '>';
                                break;
                            }
                        if( i<hexObjectWhenTag.length) continue;
                    }
                    elementValue+='<'+name+'>';
                    for (let i = 0; i < objElement.length; i++) {
                        if (typeof objElement[i] !== 'object'
                        || objElement[i].constructor == Object) {
                            elementValue += json2xml('jsonArrayElement', objElement[i],emptyIsNull, hexObjectWhenTag);
                            continue;
                        }
                        throw new Error((typeof objElement[i]) + ' is not supported.');
                    }
                    elementValue+='</'+name+'>';
                    continue;
                case Object :
                    elementValue += json2xml(name, objElement,emptyIsNull, hexObjectWhenTag);
                    continue;
                case String :
                    if(objElement==null) continue;
                    if(emptyIsNull&&objElement=="") continue;
                    if(objElement.length<36) {
                        attributes += ' '+name+'="'+Format.xmlEncodeString(objElement)+'"';
                        continue;
                    }
                    elementValue += '<' + name + '>' + Format.xmlEncodeString(objElement) + '</' + name + '>';
                    continue;
                case Number :
                    attributes += ' '+name+'="'+objElement+'"';
                    continue;			
                case Boolean :
                    attributes += ' '+name+'="'+(objElement?'jsonTrue':'jsonFalse')+'"';
                    continue;			
                default:
                    throw new Error((typeof objElement) + ' is not supported.');
            }
        }
        return '<' + tag + attributes + ( elementValue =='' ? '/>' : '>'+ elementValue + '</' + tag + '>' );
       } catch(e) {
        throw new Error('jso2xml error: '+e);
       }
   }
   module.exports=json2xml

const Format={
    NumberToAbbreviated:(value)=>{
     if(typeof value!='number') value=parseFloat(value);
     if (value>Math.pow(10,16)) return Math.round(value/Math.pow(10,15)).toString()+'P'
     if (value>Math.pow(10,13)) return Math.round(value/Math.pow(10,12)).toString()+'T'
     if (value>Math.pow(10,10)) return Math.round(value/Math.pow(10,9)).toString()+'G'
     if (value>Math.pow(10,7)) return Math.round(value/Math.pow(10,6)).toString()+'M'
     if (value>Math.pow(10,4)) return Math.round(value/Math.pow(10,3)).toString()+'K'
     if (value == Math.round(value)) return value.toString()
     if (value>=10000) return value.toFixed(0).toString()
     if (value>=1000) return value.toFixed(1).toString()
     if (value>=100) return value.toFixed(2).toString()
     if (value>=10) return value.toFixed(3).toString()
     return value.toString()
    },
    HexToString: (value)=>{
       if(value==null) return null;
       let valueString = '';
       for (let i = 0; i < value.length; i += 2)
           valueString += String.fromCharCode(parseInt(value.substr(i, 2), 16));
       return valueString;
    },
    padLeadZero:(value,size)=>"000000000000".substr(0,size-value.toString().length)+value,
    toString:(type,value)=>{
      switch (type) {
        case 'timestamp' :
        case 'datetime' :
        case 'time' :
        case 'date' :
          var ts = new Date();
          ts.setTime(parseInt(value));
          var axisLabel='';
          switch (this.dataType[0]) {
              case 'timestamp' :
              case 'date' :
              case 'datetime' :
                if (this.precision[0] >= 1440) axisLabel+=ts.getFullYear()+'-';
                if (this.precision[0] >= 1440) axisLabel+=Format.padLeadZero(ts.getMonth()+1,2)+'-';
                if (this.precision[0] >= 1440) axisLabel+=Format.padLeadZero(ts.getDate(),2);
                if (this.precision[0] >= 1440) axisLabel+=' ';
              case 'time' :
                if (this.precision[0] >= 360) axisLabel+=Format.padLeadZero(ts.getHours(),2)+':';
                if (this.precision[0] >=  60) axisLabel+=Format.padLeadZero(ts.getMinutes(),2)+':';
                if (this.precision[0] >=  1) axisLabel+=Format.padLeadZero(ts.getSeconds(),2);
          }
          return 	axisLabel;
        case 'int' :
        case 'real' :
        case 'number' :
          return format.NumberToAbbreviated(value)
      }
      return value.toString();
    },
    StringToHex:(value)=>{
      if(value==null) return null;
      let hex = '';
      for(let i=0;i<value.length;i++) 
        hex += ''+value.charCodeAt(i).toString(16);
      return hex;
    },
    xmlEncodeString(value) {
        if(value==null) return null;
        return value.toString().replace(/([\&"<>])/g, function(str, item) {
            return {
                '&': '&amp;',
                '"': '&quot;',
                '<': '&lt;',
                '>': '&gt;'
            }[item];
        });
    }
  }
  
module.exports=Format
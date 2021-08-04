require("./arrayPairs");
function distance(point1,point2) {
	try{
		if(point1==null  | point2==null | point2.length==0 ) return NaN;
		if(point1.length!==point2.length) throw Error("argument 1 array size not equal argument 2 array size") ;
		const sum=point1.reduce((s,c,i)=>{
			const d=c-point2[i];
			return s+d*d;
		},0);
		return Math.sqrt(sum);
	} catch(ex){
		if(!(point1 instanceof Array)) throw Error("argument 1 not array") ;
		if(!(point2 instanceof Array)) throw Error("argument 2 not array") ;
		throw ex;
	}
}

function distanceColumns(point1,point2,columns=[]) {
	const sum=columns.reduce((s,c)=>{
		const d=point1[c]-point2[c];
		return s+d*d;
	},0);
	return Math.sqrt(sum)
}
function arrayPairs(points,f=distance,args) {
	if(!(points instanceof Array)) throw Error("argument 1 not array") ;
	const r=[];
	points.pairs((p1,p2,i1,i2)=>{
		r.push([ f(p1,p2,args), i1, i2])
	});
	return r;
}
function arrayPairsSet(points,f=distance,args,sf=(a,b)=>a>b,maxSetSize) {
	let m,r=[],pi1,pi2;
	points.pairs((p1,p2,i1,i2)=>{
		const d=f(p1,p2,args);
		if(m===d) {
			r.push({points:[p1,p2],index:[i1,i2],distance:d});
			if(maxSetSize && maxSetSize>r.length) r.shift
		} else if(m==null | sf(m,d)==true) {
			m=d;
			r=[{points:[p1,p2],index:[i1,i2],distance:d}];
		}
	});
	return r;
}
module.exports={
		distance:distance,
		distanceColumns:distanceColumns,
		distances:arrayPairs,
		distancesColumns:(a,columns)=>arrayPairs(a,distanceColumns,columns),
		minDistances:(a,columns)=>arrayPairsSet(a,	columns?distanceColumns:distance,	columns,	(a,b)=>a>b),
		maxDistances:(a,columns)=>arrayPairsSet(a,	columns?distanceColumns:distance,	columns,	(a,b)=>a<b)
};
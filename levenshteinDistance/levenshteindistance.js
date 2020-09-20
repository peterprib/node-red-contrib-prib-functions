const logger = new (require("node-red-contrib-logger"))("LevenshteinDistance");
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");

// distance between the two given strings

function levenshteinDistance(a="", b="") {
	const al=a.length;
	const bl=b.length;
	if(!al) return bl; 	
	if(!bl) return al;
	const aa=[...a],
		ba=[...b];
	let i,j,matrix=[];
	for(i=0; i<=bl; ++i) matrix[i]=[i];
	const m0=matrix[0];
	for(j=0; j<=al; ++j) m0[j]=j;
	const alm1=al-1,blm1=bl-1;
	for(i=0; i<=blm1; ++i){
		for(j=0; j<=alm1; ++j){
			const mi=matrix[i],mi1=matrix[i+1];
			mi1[j+1]=aa[j]==ba[i]?
				mi[j]:
				Math.min(
					mi[j]+1, // substitution
					mi1[j]+1, // insertion
					mi[j+1]+1 // deletion
				);
    	}
	}
	return matrix[bl][al];
}

module.exports=levenshteinDistance;
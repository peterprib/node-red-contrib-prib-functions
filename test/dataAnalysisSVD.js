const assert=require('assert');
const should=require("should");
const svd=require("../dataAnalysis/svd.js");
require("../dataAnalysis/arrayCompareToPrecision.js");

const expected={
	orthonormalizedColumns: [
	  [ -0.3913289321676804, 0.3487948014410755, 0.10448989927485411 ],
	  [ -0.4639397307294648, -0.34948424610207607, 0.7962721013609022 ],
	  [ -0.6197155556759748, -0.5188940242462491, -0.5888137410546312 ],
	  [ -0.4975683100363125, 0.6978194177691509, -0.0912742016622088 ]
	],
	singularValues: [ 223.85445199527607, 13.695880509722402, 17.366841363876695 ],
	orthogonalMatrix: [
	  [ -0.5061583666044986, -0.7405855572048029, -0.44196916224541927 ],
	  [ -0.5596333427471312, -0.10788454127728717, 0.8216881692217926 ],
	  [ -0.6562120309792694, 0.6632450212500965, -0.35984970777398323 ]
	]
  }

describe('SVD', function(){
	it("getEigenVectors", function(done){
		const data = [[40,50,60],[50,70,60],[80,70,90],[50,60,80]];
		const vectors = svd(data);
		console.log(vectors)
		vectors.orthonormalizedColumns.compareToPrecision(expected.orthonormalizedColumns)
		vectors.singularValues.compareToPrecision(expected.singularValues)
		vectors.orthogonalMatrix.compareToPrecision(expected.orthogonalMatrix)
		done();
	});
});	

const assert=require('assert');
const levenshteinDistance=require("../levenshteinDistance/levenshteinDistance");
describe("Levenshtein Distance", function() {
	it('sameword', function(done) {
		assert.strictEqual(levenshteinDistance("",""),0);
		assert.strictEqual(levenshteinDistance("","a"),1);
		assert.strictEqual(levenshteinDistance("a",""),1);
		assert.strictEqual(levenshteinDistance("a","a"),0);
		assert.strictEqual(levenshteinDistance("a","b"),1);
		assert.strictEqual(levenshteinDistance("az","az"),0);
		assert.strictEqual(levenshteinDistance("aiz","aiz"),0);
		assert.strictEqual(levenshteinDistance("atestword","atestword"),0);
		assert.strictEqual(levenshteinDistance("atesggword","ateshhtword"),3);
		done();
	});
});
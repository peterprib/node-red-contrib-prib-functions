const should = require('should');
const {SimpleColumnarStore} = require('../columnar/columnar.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Columnar Store', function() {
    it('writes, reads and queries using columnar rid maps or filters', async function() {
        // methods are static; we call them directly on the class
        const tmp = path.join(os.tmpdir(), 'prib-test.columnar');
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

        const records = [
            {id: 1, name: 'a', age: 20},
            {id: 2, name: 'b', age: 30},
            {id: 3, name: 'c', age: 40}
        ];

        // write and then read the full set back
        await SimpleColumnarStore.writeRecords(records, tmp);
        const all = await SimpleColumnarStore.readRecords(tmp);
        all.should.have.property('records');
        all.records.length.should.equal(3);
        // schema is an object mapping field names to types
        Object.keys(all.schema).should.containEql('age');

        // filter using a javascript predicate
        const filtered = await SimpleColumnarStore.queryRecords(tmp, {filter: r => r.age > 25});
        filtered.records.length.should.equal(2);

        // filter using a ridMap on the 'age' column
        const ridMap = {age: [1, 2]};
        const filtered2 = await SimpleColumnarStore.queryRecords(tmp, {ridMap});
        filtered2.records.length.should.equal(2);
        // ensure the rows returned correspond to the expected indices
        filtered2.records[0].should.deepEqual(records[1]);
        filtered2.records[1].should.deepEqual(records[2]);
    });
});

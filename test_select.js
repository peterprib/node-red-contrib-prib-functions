const { SimpleColumnarStore } = require('./columnar/columnar.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

(async () => {
  const tmp = path.join(os.tmpdir(), 'test-select-issue.columnar');
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

  const records = [
    { id: 1, name: 'Alice', age: 25 },
    { id: 2, name: 'Bob', age: 30 },
    { id: 3, name: 'Charlie', age: 35 },
    { id: 4, name: 'Diana', age: 28 },
    { id: 5, name: 'Eve', age: 32 },
    { id: 6, name: 'Frank', age: 29 },
  ];

  await SimpleColumnarStore.writeRecords(records, tmp);

  // Test the exact SQL from Node-RED
  const sql = 'SELECT "a1" as test,:msg.payload as name,COUNT(*) AS cnt1 FROM ? a where name= :msg.payload';
  console.log('Testing SQL:', sql);

  const result = await SimpleColumnarStore.sqlQuery(
    tmp,
    sql,
    null,
    { msg: { payload: 'Alice' }, flow: {}, global: {} }
  );

  console.log('Result:', JSON.stringify(result, null, 2));
  console.log('Number of columns in first record:', Object.keys(result[0]).length);
  console.log('Column names:', Object.keys(result[0]));

  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
})();
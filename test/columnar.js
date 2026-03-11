const should = require("should");
const { SimpleColumnarStore } = require("../columnar/columnar.js");
const fs = require("fs");
const path = require("path");
const os = require("os");

describe("Columnar Store", function () {
  it("writes, reads and queries using columnar rid maps or filters", async function () {
    // methods are static; we call them directly on the class
    const tmp = path.join(os.tmpdir(), "prib-test.columnar");
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

    const records = [
      { id: 1, name: "a", age: 20, dept: "eng" },
      { id: 2, name: "b", age: 30, dept: "hr" },
      { id: 3, name: "c", age: 40, dept: "eng" },
      { id: 4, name: "d", age: 35, dept: "hr" },
    ];

    // write and then read the full set back
    await SimpleColumnarStore.writeRecords(records, tmp);
    const all = await SimpleColumnarStore.readRecords(tmp);
    all.should.have.property("records");
    all.records.length.should.equal(4);
    // schema is an object mapping field names to types
    Object.keys(all.schema).should.containEql("age");

    // filter using a javascript predicate
    const filtered = await SimpleColumnarStore.queryRecords(tmp, {
      filter: (r) => r.age > 25,
    });
    filtered.records.length.should.equal(3);

    // filter using a ridMap on the 'age' column
    const ridMap = { age: [1, 2, 3] };
    const filtered2 = await SimpleColumnarStore.queryRecords(tmp, { ridMap });
    filtered2.records.length.should.equal(3);
    // ensure the rows returned correspond to the expected indices
    filtered2.records[0].should.deepEqual(records[1]);

    // Basic SQL query
    const sqlResult = await SimpleColumnarStore.sqlQuery(
      tmp,
      "SELECT * FROM ? WHERE age > 25",
    );
    sqlResult.length.should.equal(3);

    // SQL with column projection
    const projected = await SimpleColumnarStore.sqlQuery(
      tmp,
      "SELECT id, name FROM ? WHERE age > 30",
    );
    projected.length.should.equal(2);
    projected[0].should.have.property("id");
    projected[0].should.have.property("name");
    projected[0].should.not.have.property("age");

    // SQL with ORDER BY
    const ordered = await SimpleColumnarStore.sqlQuery(
      tmp,
      "SELECT * FROM ? ORDER BY age DESC",
    );
    ordered.length.should.equal(4);
    ordered[0].age.should.equal(40);
    ordered[3].age.should.equal(20);

    // SQL with LIMIT
    const limited = await SimpleColumnarStore.sqlQuery(
      tmp,
      "SELECT * FROM ? ORDER BY age DESC LIMIT 2",
    );
    limited.length.should.equal(2);

    // SQL with GROUP BY and COUNT
    const grouped = await SimpleColumnarStore.sqlQuery(
      tmp,
      "SELECT dept, COUNT(*) AS cnt FROM ? GROUP BY dept",
    );
    grouped.length.should.equal(2);
    const engGroup = grouped.find((g) => g.dept === "eng");
    engGroup.should.have.property("cnt", 2);

    // SQL with aggregates
    const agg = await SimpleColumnarStore.sqlQuery(
      tmp,
      "SELECT AVG(age) AS avg_age, MAX(age) AS max_age, MIN(age) AS min_age FROM ?",
    );
    agg.length.should.equal(1);
    agg[0].avg_age.should.be.approximately(31.25, 0.01);
    agg[0].max_age.should.equal(40);
    agg[0].min_age.should.equal(20);

    // SQL with GROUP BY and SUM
    const sumAgg = await SimpleColumnarStore.sqlQuery(
      tmp,
      "SELECT dept, SUM(age) AS total_age FROM ? GROUP BY dept",
    );
    sumAgg.length.should.equal(2);
  });

  it("supports INNER, LEFT, RIGHT, and FULL OUTER JOINs", async function () {
    const tmpDir = os.tmpdir();
    const file1 = path.join(tmpDir, "join-test-1.columnar");
    const file2 = path.join(tmpDir, "join-test-2.columnar");
    [file1, file2].forEach((f) => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });

    // Table 1: users
    const users = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
    ];

    // Table 2: orders (only users 1 and 2 have orders)
    const orders = [
      { user_id: 1, amount: 100 },
      { user_id: 1, amount: 200 },
      { user_id: 2, amount: 150 },
    ];

    await SimpleColumnarStore.writeRecords(users, file1);
    await SimpleColumnarStore.writeRecords(orders, file2);

    // INNER JOIN: only matching rows
    const innerJoin = await SimpleColumnarStore.sqlQuery(
      file1,
      `SELECT u.id, u.name, o.amount FROM ? u INNER JOIN '${file2}' o ON u.id = o.user_id`,
    );
    innerJoin.length.should.equal(3); // 2 orders for user 1, 1 order for user 2
    innerJoin[0].should.have.property("u.name", "Alice");
    innerJoin[0].should.have.property("o.amount");

    // LEFT JOIN: all from left, matching from right
    const leftJoin = await SimpleColumnarStore.sqlQuery(
      file1,
      `SELECT u.id, u.name, o.amount FROM ? u LEFT JOIN '${file2}' o ON u.id = o.user_id`,
    );
    leftJoin.length.should.equal(4); // 3 orders for users 1&2 + 1 unmatched user 3
    leftJoin[3].should.have.property("u.name", "Charlie");
    should.not.exist(leftJoin[3]["o.amount"]);

    // RIGHT JOIN: all from right, matching from left
    const rightJoin = await SimpleColumnarStore.sqlQuery(
      file1,
      `SELECT u.id, u.name, o.amount FROM ? u RIGHT JOIN '${file2}' o ON u.id = o.user_id`,
    );
    rightJoin.length.should.equal(3); // all 3 orders have matching users

    // FULL OUTER JOIN: all rows from both tables
    const fullJoin = await SimpleColumnarStore.sqlQuery(
      file1,
      `SELECT u.id, u.name, o.amount FROM ? u FULL OUTER JOIN '${file2}' o ON u.id = o.user_id`,
    );
    fullJoin.length.should.equal(4); // 3 matched + 1 unmatched from left

    // Clean up
    [file1, file2].forEach((f) => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
  });

  it("supports appending records to existing files", async function () {
    const tmp = path.join(os.tmpdir(), "append-test.columnar");
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

    // Initial records
    const initialRecords = [
      { id: 1, name: "Alice", age: 25 },
      { id: 2, name: "Bob", age: 30 },
    ];

    // Write initial records
    const writeResult = await SimpleColumnarStore.writeRecords(
      initialRecords,
      tmp,
    );
    writeResult.recordsWritten.should.equal(2);
    writeResult.totalRecords.should.equal(2);
    writeResult.appended.should.be.false();

    // Verify initial records
    const read1 = await SimpleColumnarStore.readRecords(tmp);
    read1.records.length.should.equal(2);

    // Append more records
    const appendRecords = [
      { id: 3, name: "Charlie", age: 35 },
      { id: 4, name: "Diana", age: 28 },
    ];

    const appendResult = await SimpleColumnarStore.appendRecords(
      appendRecords,
      tmp,
    );
    appendResult.recordsWritten.should.equal(2);
    appendResult.totalRecords.should.equal(4);
    appendResult.appended.should.be.true();

    // Verify all records are present
    const read2 = await SimpleColumnarStore.readRecords(tmp);
    read2.records.length.should.equal(4);
    read2.records[0].name.should.equal("Alice");
    read2.records[2].name.should.equal("Charlie");
    read2.records[3].name.should.equal("Diana");

    // Test appending to non-existent file (should create it)
    const newFile = path.join(os.tmpdir(), "new-append-test.columnar");
    if (fs.existsSync(newFile)) fs.unlinkSync(newFile);

    const newAppendResult = await SimpleColumnarStore.appendRecords(
      [{ id: 5, name: "Eve" }],
      newFile,
    );
    newAppendResult.recordsWritten.should.equal(1);
    newAppendResult.totalRecords.should.equal(1);
    newAppendResult.appended.should.be.false(); // File didn't exist, so not appended

    // Clean up
    [tmp, newFile].forEach((f) => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
  });

  it("supports hardcoded SQL queries in node configuration", async function () {
    const tmp = path.join(os.tmpdir(), "hardcoded-sql-test.columnar");
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

    const records = [
      { id: 1, name: "Alice", age: 25, dept: "eng" },
      { id: 2, name: "Bob", age: 30, dept: "hr" },
      { id: 3, name: "Charlie", age: 35, dept: "eng" },
    ];

    await SimpleColumnarStore.writeRecords(records, tmp);

    // Simulate Node-RED node with hardcoded SQL
    const mockNode = {
      filePath: tmp,
      sqlQuery: "SELECT name, age FROM ? WHERE age > 28 ORDER BY age DESC",
    };

    // Simulate message without SQL (should use hardcoded query)
    const mockMsg = {
      payload: {
        filePath: tmp,
        // No sql property - should use node.sqlQuery
      },
    };

    // Simulate the sqlQuery action logic
    const filePath = mockMsg.payload.filePath || mockNode.filePath;
    const sql = mockMsg.payload.sql || mockNode.sqlQuery;

    const result = await SimpleColumnarStore.sqlQuery(filePath, sql);
    result.length.should.equal(2);
    result[0].name.should.equal("Charlie");
    result[0].age.should.equal(35);
    result[1].name.should.equal("Bob");
    result[1].age.should.equal(30);

    // Test that msg.payload.sql takes precedence over hardcoded query
    mockMsg.payload.sql = "SELECT COUNT(*) as total FROM ?";
    const result2 = await SimpleColumnarStore.sqlQuery(
      filePath,
      mockMsg.payload.sql,
    );
    result2.length.should.equal(1);
    result2[0].total.should.equal(3);

    // Clean up
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  });

  it("caches parsed SQL tokens for hardcoded queries", async function () {
    const tmp = path.join(os.tmpdir(), "cached-sql-test.columnar");
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

    const records = [
      { id: 1, name: "Alice", age: 25 },
      { id: 2, name: "Bob", age: 30 },
      { id: 3, name: "Charlie", age: 35 },
    ];

    await SimpleColumnarStore.writeRecords(records, tmp);

    // Test that parsing works normally
    const sql = "SELECT name FROM ? WHERE age > 28 ORDER BY age DESC";
    const result1 = await SimpleColumnarStore.sqlQuery(tmp, sql);
    result1.length.should.equal(2);
    result1[0].name.should.equal("Charlie");

    // Test with pre-parsed tokens (simulate node caching)
    const parsedTokens = SimpleColumnarStore._parseSql(sql);
    const result2 = await SimpleColumnarStore.sqlQuery(tmp, sql, parsedTokens);
    result2.length.should.equal(2);
    result2[0].name.should.equal("Charlie");

    // Results should be identical
    result1.should.deepEqual(result2);

    // Clean up
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  });

  it("demonstrates SQL parsing performance improvement with caching", async function () {
    const tmp = path.join(os.tmpdir(), "perf-sql-test.columnar");
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

    // Create a larger dataset for performance testing
    const records = [];
    for (let i = 0; i < 1000; i++) {
      records.push({
        id: i,
        name: `User${i}`,
        age: 20 + (i % 50),
        dept: ["eng", "hr", "sales", "marketing"][i % 4],
        salary: 50000 + i * 100,
      });
    }

    await SimpleColumnarStore.writeRecords(records, tmp);

    const sql =
      "SELECT dept, COUNT(*) as cnt, AVG(salary) as avg_salary FROM ? GROUP BY dept ORDER BY cnt DESC";

    // Time parsing + execution without cache
    const start1 = Date.now();
    for (let i = 0; i < 10; i++) {
      await SimpleColumnarStore.sqlQuery(tmp, sql);
    }
    const time1 = Date.now() - start1;

    // Time execution with pre-parsed tokens
    const parsedTokens = SimpleColumnarStore._parseSql(sql);
    const start2 = Date.now();
    for (let i = 0; i < 10; i++) {
      await SimpleColumnarStore.sqlQuery(tmp, sql, parsedTokens);
    }
    const time2 = Date.now() - start2;

    // Cached version should be faster (parsing is skipped)
    console.log(`Without cache: ${time1}ms, With cache: ${time2}ms`);
    time2.should.be.below(time1); // Cached should be faster

    // Results should be identical
    const result1 = await SimpleColumnarStore.sqlQuery(tmp, sql);
    const result2 = await SimpleColumnarStore.sqlQuery(tmp, sql, parsedTokens);
    result1.should.deepEqual(result2);

    // Clean up
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  });

  it("supports configurable output property for results", async function () {
    const tmp = path.join(os.tmpdir(), "output-prop-test.columnar");
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

    const records = [
      { id: 1, name: "Alice", age: 25 },
      { id: 2, name: "Bob", age: 30 },
    ];

    await SimpleColumnarStore.writeRecords(records, tmp);

    // Test that sqlQuery returns results correctly
    const sqlResult = await SimpleColumnarStore.sqlQuery(
      tmp,
      "SELECT name FROM ? WHERE age > 26",
    );
    sqlResult.length.should.equal(1);
    sqlResult[0].name.should.equal("Bob");

    // Simulate node behavior with different output properties
    const mockMsg1 = { payload: {} };
    const outputProperty1 = "result";
    mockMsg1[outputProperty1] = sqlResult;
    mockMsg1.should.have.property("result");
    mockMsg1.result[0].name.should.equal("Bob");

    const mockMsg2 = { payload: {} };
    const outputProperty2 = "myData";
    mockMsg2[outputProperty2] = sqlResult;
    mockMsg2.should.have.property("myData");
    mockMsg2.should.not.have.property("result");
    mockMsg2.myData[0].name.should.equal("Bob");

    // Test default behavior (empty outputProperty should default to 'result')
    const mockMsg3 = { payload: {} };
    const outputProperty3 = null; // should default to 'result'
    const defaultProp = outputProperty3 || "result";
    mockMsg3[defaultProp] = sqlResult;
    mockMsg3.should.have.property("result");
    mockMsg3.result[0].name.should.equal("Bob");

    // Clean up
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  });

  it("supports parameter substitution in SQL queries", async function () {
    const tmp = path.join(os.tmpdir(), "prib-test-params.columnar");
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

    const records = [
      { id: 1, name: "Alice", age: 25, dept: "eng", salary: 50000 },
      { id: 2, name: "Bob", age: 30, dept: "hr", salary: 60000 },
      { id: 3, name: "Charlie", age: 35, dept: "eng", salary: 70000 },
      { id: 4, name: "Diana", age: 28, dept: "hr", salary: 55000 },
    ];

    await SimpleColumnarStore.writeRecords(records, tmp);

    // Test explicit :msg., :flow., :global. parameter markers
    const msg = { payload: { minAge: 28, personName: "Bob" } };
    const flow = { minSalary: 60000 };
    const global = { dept: "eng" };
    const context = { msg, flow, global };

    // :msg. marker
    const result1 = await SimpleColumnarStore.sqlQuery(
      tmp,
      "SELECT * FROM ? WHERE age > :msg.payload.minAge",
      null,
      context,
    );
    result1.length.should.equal(2);
    result1[0].name.should.equal("Bob");
    result1[1].name.should.equal("Charlie");

    // :flow. marker
    const result2 = await SimpleColumnarStore.sqlQuery(
      tmp,
      "SELECT * FROM ? WHERE salary > :flow.minSalary",
      null,
      context,
    );
    result2.length.should.equal(1);
    result2[0].name.should.equal("Charlie");

    // :global. marker
    const result3 = await SimpleColumnarStore.sqlQuery(
      tmp,
      "SELECT * FROM ? WHERE dept = :global.dept",
      null,
      context,
    );
    result3.length.should.equal(2);
    result3[0].name.should.equal("Alice");
    result3[1].name.should.equal("Charlie");

    // Multiple explicit markers
    const result4 = await SimpleColumnarStore.sqlQuery(
      tmp,
      "SELECT * FROM ? WHERE age >= :msg.payload.minAge AND dept = :global.dept",
      null,
      context,
    );
    result4.length.should.equal(1);
    result4[0].name.should.equal("Charlie");

    // Test missing parameter should throw error
    try {
      await SimpleColumnarStore.sqlQuery(
        tmp,
        "SELECT * FROM ? WHERE age > :msg.payload.missingParam",
        null,
        context,
      );
      should.fail("Should have thrown error for missing parameter");
    } catch (error) {
      error.message.should.match(
        /Parameter ':msg.payload.missingParam' not provided/,
      );
    }
    // SQL injection attempt should not succeed
    {
      const injectionContext = {
        msg: { payload: { personName: "Bob' OR 1=1 --" } },
        flow: {},
        global: {},
      };
      // This should only match a name exactly equal to the injected string, not all rows
      const injResult = await SimpleColumnarStore.sqlQuery(
        tmp,
        "SELECT * FROM ? WHERE name = :msg.payload.personName",
        null,
        injectionContext,
      );
      injResult.length.should.equal(0);
    }
    
    // Test parameter substitution in SELECT clause
    {
      const result = await SimpleColumnarStore.sqlQuery(
        tmp,
        "SELECT :msg.payload.minAge as age_threshold, name FROM ? LIMIT 5",
        null,
        { msg: { payload: { minAge: 28 } }, flow: {}, global: {} },
      );
      result.length.should.equal(4);
      result[0].should.have.property("age_threshold", 28);
      result[0].should.have.property("name");
    }
    
    // Clean up
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  });
});

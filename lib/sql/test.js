import { schema, col, Database } from './index.js';

const UsersSchema = schema('users', {
  id:      col.int32().primaryKey(),
  name:    col.string().notNull(),
  age:     col.int32().check(v => v >= 0),
  dept_id: col.int32().foreignKey('depts', 'id'),
  salary:  col.float64().default(0.0),
});

const DeptsSchema = schema('depts', {
  id:   col.int32().primaryKey(),
  name: col.string().notNull(),
});

const db = new Database()
  .register(DeptsSchema, [
    { id: 1, name: 'Engineering' },
    { id: 2, name: 'Marketing'   },
  ])
  .register(UsersSchema, [
    { id: 1, name: 'Alice', age: 32, dept_id: 1, salary: 95000 },
    { id: 2, name: 'Bob',   age: 28, dept_id: 2, salary: 72000 },
    { id: 3, name: 'Carol', age: 35, dept_id: 1, salary: 110000 },
  ]);

const tests = [
  [`SELECT *  FROM users`,                                     3],
  [`SELECT name, salary FROM users WHERE dept_id = 1 ORDER BY salary DESC`, 2],
  [`SELECT COUNT(id) FROM users`,                              1],
  [`SELECT dept_id, COUNT(id), AVG(age) FROM users GROUP BY dept_id`, 2],
  [`SELECT name, salary FROM users WHERE age BETWEEN 28 AND 32`, 2],
  [`SELECT name FROM users WHERE name LIKE 'A%'`,              1],
  [`SELECT name FROM users WHERE dept_id IN (1, 2)`,           3],
  [`SELECT name FROM users LIMIT 2`,                           2],
];

let passed = 0;
for (const [sql, expected] of tests) {
  try {
    const rows = db.query(sql);
    const ok   = rows.length === expected;
    console.log(`${ok ? '✓' : '✗'} [${rows.length}/${expected}]  ${sql.trim()}`);
    if (ok) passed++;
    else    console.log('  result:', rows);
  } catch (e) {
    console.log(`✗ ERROR  ${sql.trim()}\n  ${e.message}`);
  }
}

console.log(`\n${passed}/${tests.length} tests passed`);
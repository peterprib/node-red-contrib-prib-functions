import { Table }    from '../storage/Table.js';
import { Executor } from '../sql/executor.js';
import { parse }    from '../sql/parser.js';

export class Database {
  constructor(mode = 'hybrid') {
    this.tables = new Map();
    this.mode   = mode;
  }

  // Register a table with a schema and optional seed rows
  register(schema, rows = []) {
    this.tables.set(schema.tableName, Table.create(schema, this.mode, rows));
    return this;
  }

  // Register a specific table with a different mode than the database default
  registerAs(schema, mode, rows = []) {
    this.tables.set(schema.tableName, Table.create(schema, mode, rows));
    return this;
  }

  // Insert a single row into a named table
  insert(tableName, row) {
    const table = this.tables.get(tableName);
    if (!table) throw new Error(`Unknown table: '${tableName}'`);
    table.insert(row);
    return this;
  }

  // Execute a SQL query and return plain row objects
  query(sql) {
    const ast    = parse(sql);
    const result = new Executor(this.tables).execute(ast);
    return result.toRows();
  }

  // Return storage stats for all tables
  stats() {
    return Object.fromEntries(
      [...this.tables.entries()].map(([name, table]) => [name, table.stats()])
    );
  }
}
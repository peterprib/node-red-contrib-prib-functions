import { ITableStore } from './ITableStore.js';
import { Schema }      from '../schema/Schema.js';

export class RowStore extends ITableStore {
  constructor(schema) {
    super();
    this.schema = schema;
    this.rows   = [];
  }

  get length() { return this.rows.length; }

  getColumn(name) {
    if (!this.schema.defs[name])
      throw new Error(`Unknown column '${name}' in table '${this.schema.tableName}'`);
    // Return a plain array — supports [i] indexing like typed arrays
    return this.rows.map(r => r[name] ?? null);
  }

  getRow(i) { return { ...this.rows[i] }; }

  insert(row) { this.rows.push({ ...row }); }

  filter(bitmap) {
    const next = new RowStore(this.schema);
    for (const i of bitmap.toIndices()) next.rows.push({ ...this.rows[i] });
    return next;
  }

  project(colNames, aliases) {
    const resultSchema = this.schema.derive(colNames, aliases);
    const next         = new RowStore(resultSchema);
    next.rows = this.rows.map(row =>
      Object.fromEntries(colNames.map((src, i) => [aliases[i] || src, row[src] ?? null]))
    );
    return next;
  }

  toRows() { return this.rows.map(r => ({ ...r })); }

  static fromRows(schema, rows) {
    const s = new RowStore(schema);
    for (const row of rows) s.rows.push(schema.validate({ ...row }));
    return s;
  }
}
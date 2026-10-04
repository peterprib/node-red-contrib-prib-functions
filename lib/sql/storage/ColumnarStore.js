import { ITableStore } from './ITableStore.js';
import { Column }      from './Column.js';
import { Schema }      from '../schema/Schema.js';

export class ColumnarStore extends ITableStore {
  constructor(schema) {
    super();
    this.schema  = schema;
    this._length = 0;
    this._cols   = {};   // name -> Column
  }

  get length() { return this._length; }

  getColumn(name) {
    const col = this._cols[name];
    if (!col) throw new Error(`Unknown column '${name}' in table '${this.schema.tableName}'`);
    // Return via proxy so col[i] works in executor tight loops
    return Column.asProxy(col);
  }

  getRow(i) {
    return Object.fromEntries(
      this.schema.columns.map(name => [name, this._cols[name].get(i)])
    );
  }

  insert(row) {
    // ColumnarStore is optimised for bulk load — for frequent inserts use HybridStore
    // Rebuild columns with the new row appended
    const newLen = this._length + 1;
    for (const name of this.schema.columns) {
      const existing = this._cols[name] ? this._cols[name].toArray() : [];
      existing.push(row[name] ?? null);
      this._cols[name] = Column.create(name, this.schema.defs[name].type, existing);
    }
    this._length = newLen;
  }

  filter(bitmap) {
    const indices = bitmap.toIndices();
    const next    = new ColumnarStore(this.schema);
    for (const name of this.schema.columns) {
      next._cols[name] = this._cols[name].gather(indices);
    }
    next._length = indices.length;
    return next;
  }

  project(colNames, aliases) {
    const resultSchema = this.schema.derive(colNames, aliases);
    const next         = new ColumnarStore(resultSchema);
    colNames.forEach((src, i) => {
      const dst        = aliases[i] || src;
      const srcCol     = this._cols[src];
      if (!srcCol) throw new Error(`Unknown column '${src}'`);
      next._cols[dst]  = Column.create(dst, this.schema.defs[src].type, srcCol.toArray());
    });
    next._length = this._length;
    return next;
  }

  toRows() {
    return Array.from({ length: this._length }, (_, i) => this.getRow(i));
  }

  stats() {
    return Object.fromEntries(
      Object.entries(this._cols).map(([name, col]) => [name, col.stats()])
    );
  }

  static fromRows(schema, rows) {
    const s = new ColumnarStore(schema);
    if (!rows.length) return s;
    for (const name of schema.columns) {
      const values   = rows.map(r => r[name] ?? null);
      s._cols[name]  = Column.create(name, schema.defs[name].type, values);
    }
    s._length = rows.length;
    return s;
  }
}
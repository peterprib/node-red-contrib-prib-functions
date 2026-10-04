import { ColumnarStore } from './ColumnarStore.js';
import { RowStore }      from './RowStore.js';
import { HybridStore }   from './HybridStore.js';
import { Schema }        from '../schema/Schema.js';

export class Table {
  constructor(schema, store) {
    this.schema = schema;
    this.store  = store;
  }

  // ── Core interface ────────────────────────────────────────────────────────

  get length()    { return this.store.length; }

  getColumn(name) { return this.store.getColumn(name); }
  getRow(i)       { return this.store.getRow(i); }
  toRows()        { return this.store.toRows(); }

  filter(bitmap) {
    const next = this.store.filter(bitmap);
    return new Table(next.schema ?? this.schema, next);
  }

  project(colNames, aliases = []) {
    const next = this.store.project(colNames, aliases);
    return new Table(next.schema ?? this.schema, next);
  }

  insert(row) {
    this.store.insert(this.schema.validate({ ...row }));
    return this;
  }

  // ── Aliases — backwards compat with old executor calls ────────────────────

  col(name)       { return this.getColumn(name); }
  row(i)          { return this.getRow(i); }
  get(i, name)    { return this.getRow(i)[name]; }

  // ── Stats ─────────────────────────────────────────────────────────────────

  stats() {
    const storeStats = this.store.stats ?? this.store._store?.stats;
    return {
      mode:    this.store.constructor.name,
      rows:    this.length,
      columns: typeof storeStats === 'function' ? storeStats() : (storeStats ?? {}),
    };
  }

  // ── Statics ───────────────────────────────────────────────────────────────

  static create(schema, mode = 'hybrid', rows = []) {
    let store;
    switch (mode) {
      case 'columnar':
        store = ColumnarStore.fromRows(schema, rows);
        break;
      case 'row':
        store = RowStore.fromRows(schema, rows);
        break;
      case 'hybrid':
        store = HybridStore.fromRows(schema, rows);
        break;
      default:
        throw new Error(`Unknown store mode: ${mode}`);
    }
    return new Table(schema, store);
  }

  // Build from plain result rows — infers schema, no constraints
  static fromResult(rows) {
    if (!rows?.length) return new Table(new Schema('result', {}), new RowStore(new Schema('result', {})));
    const schema = Schema.infer('result', rows);
    const store  = RowStore.fromRows(schema, rows);
    return new Table(schema, store);
  }

  // Build from Column objects — bridge for executor paths
  static fromColumns(schema, columns) {
    if (!columns?.length) return Table.fromResult([]);
    const rows = Array.from({ length: columns[0].length }, (_, i) =>
      Object.fromEntries(columns.map(c => [c.name, c.get(i)]))
    );
    return Table.create(schema, 'hybrid', rows);
  }

  // Legacy alias
  static fromRows(schema, rows, mode = 'hybrid') {
    return Table.create(schema, mode, rows);
  }
}
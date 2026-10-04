import { ITableStore }   from './ITableStore.js';
import { RowStore }      from './RowStore.js';
import { ColumnarStore } from './ColumnarStore.js';

const DEFAULT_THRESHOLD = 1000;

export class HybridStore extends ITableStore {
  constructor(schema, options = {}) {
    super();
    this.schema    = schema;
    this.threshold = options.threshold ?? HybridStore._computeThreshold(schema);
    this.mode      = 'row';
    this._store    = new RowStore(schema);
    this._stats    = { insertCount: 0, conversionCount: 0, lastConvertedAt: null };
  }

  get length() { return this._store.length; }

  getColumn(name) {
    this._maybeConvert();
    return this._store.getColumn(name);
  }

  getRow(i)  { return this._store.getRow(i); }

  insert(row) {
    this._store.insert(row);
    this._stats.insertCount++;
    this._maybeConvert();
  }

  filter(bitmap) {
    this._maybeConvert();
    const inner = this._store.filter(bitmap);
    return HybridStore._wrap(this.schema, inner, this.threshold);
  }

  project(colNames, aliases) {
    this._maybeConvert();
    const inner = this._store.project(colNames, aliases);
    return HybridStore._wrap(inner.schema, inner, this.threshold);
  }

  toRows() { return this._store.toRows(); }

  get stats() {
    return {
      ...this._stats,
      currentMode: this.mode,
      rowCount:    this._store.length,
      threshold:   this.threshold,
    };
  }

  _maybeConvert() {
    if (this.mode === 'row' && this._store.length >= this.threshold) {
      const rows     = this._store.toRows();
      this._store    = ColumnarStore.fromRows(this.schema, rows);
      this.mode      = 'columnar';
      this._stats.conversionCount++;
      this._stats.lastConvertedAt = this._store.length;
    }
  }

  static _computeThreshold(schema) {
    const rowBytes = Object.values(schema.defs).reduce((sum, def) => {
      switch (def.type) {
        case 'int32':   return sum + 4;
        case 'float64': return sum + 8;
        case 'boolean': return sum + 1;
        case 'string':  return sum + 32;
        default:        return sum + 8;
      }
    }, 0);
    return Math.max(100, Math.floor((256 * 1024) / rowBytes));
  }

  static _wrap(schema, innerStore, threshold) {
    const h        = Object.create(HybridStore.prototype);
    h.schema       = schema;
    h.threshold    = threshold;
    h._store       = innerStore;
    h.mode         = innerStore instanceof ColumnarStore ? 'columnar' : 'row';
    h._stats       = { insertCount: 0, conversionCount: 0, lastConvertedAt: null };
    return h;
  }

  static fromRows(schema, rows, options = {}) {
    const s = new HybridStore(schema, options);
    for (const row of rows) s._store.insert(schema.validate({ ...row }));
    s._maybeConvert();
    return s;
  }
}
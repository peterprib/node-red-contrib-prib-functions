import { ColumnDef } from './ColumnDef.js';

export class Schema {
  constructor(tableName, defs) {
    this.tableName  = tableName;
    this.defs       = defs;
    this.columns    = Object.keys(defs);
    this.primaryKey = this.columns.find(k => defs[k]?.isPrimary) ?? null;
  }

  validate(row) {
    const out    = {};
    const errors = [];

    for (const [name, def] of Object.entries(this.defs)) {
      let val = row[name];

      if (val === undefined) {
        val = typeof def.defaultVal === 'function' ? def.defaultVal() : def.defaultVal;
      }
      if (val == null && !def.nullable) {
        errors.push(`${name}: required, cannot be null`);
        continue;
      }
      if (val != null) {
        val = this._coerce(val, def.type);
        if (def.checkFn && !def.checkFn(val))
          errors.push(`${name}: check constraint failed on value ${val}`);
      }
      out[name] = val ?? null;
    }

    if (errors.length)
      throw new Error(`[${this.tableName}] schema violation:\n  ${errors.join('\n  ')}`);

    return out;
  }

  allocate(capacity) {
    return Object.fromEntries(
      Object.entries(this.defs).map(([name, def]) => [
        name,
        def.type === 'int32'   ? new Int32Array(capacity)
      : def.type === 'float64' ? new Float64Array(capacity)
      : new Array(capacity).fill(null)
      ])
    );
  }

  // Build a derived schema for projection results — sheds constraints
  derive(colNames, aliases = []) {
    const defs = {};
    colNames.forEach((src, i) => {
      const dst      = aliases[i] || src;
      const original = this.defs[src];
      if (!original) throw new Error(`Unknown column '${src}' in schema '${this.tableName}'`);
      const def      = new ColumnDef(original.type);
      def.nullable   = true;
      defs[dst]      = def;
    });
    return new Schema('result', defs);
  }

  // Infer a permissive schema from plain result rows
  static infer(name, rows) {
    if (!rows?.length) return new Schema(name, {});
    const defs = {};
    for (const [key, val] of Object.entries(rows[0])) {
      const def = new ColumnDef(
        typeof val === 'number'
          ? Number.isInteger(val) ? 'int32' : 'float64'
          : typeof val === 'boolean' ? 'boolean'
          : 'string'
      );
      def.nullable = true;
      defs[key]    = def;
    }
    return new Schema(name, defs);
  }

  _coerce(v, type) {
    switch (type) {
      case 'int32':   return Math.trunc(Number(v));
      case 'float64': return Number(v);
      case 'boolean': return Boolean(v);
      default:        return String(v);
    }
  }
}

export function schema(tableName, defs) {
  return new Schema(tableName, defs);
}
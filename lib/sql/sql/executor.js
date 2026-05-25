import { Bitmap }  from '../storage/Bitmap.js';
import { Table }   from '../storage/Table.js';
import { Schema }  from '../schema/Schema.js';

export class Executor {
  constructor(tables) {
    this.tables = tables;   // Map<string, Table>
  }

  // ── Entry point ───────────────────────────────────────────────────────────

  execute(query) {
    let table = this._resolveFrom(query.from);

    for (const join of query.joins)
      table = this._applyJoin(table, join);

    const bitmap = this._applyWhere(query.where, table);

    // Use group path when GROUP BY present OR when SELECT contains aggregates
    const hasAgg = query.select.children.some(c => c.children[0].type === 'AggFunc');
    if (query.groupBy || hasAgg)
      return this._applyGroupBy(table, bitmap, query);

    const filtered = table.filter(bitmap);
    const projected = this._project(filtered, query.select);
    return this._finalize(projected, query);
  }

  // ── FROM ──────────────────────────────────────────────────────────────────

  _resolveFrom(fromNode) {
    const t = this.tables.get(fromNode.value.table);
    if (!t) throw new Error(`Unknown table: '${fromNode.value.table}'`);
    return t;
  }

  // ── JOIN ──────────────────────────────────────────────────────────────────

  _applyJoin(left, joinNode) {
    const right  = this.tables.get(joinNode.value.table);
    if (!right) throw new Error(`Unknown table in JOIN: '${joinNode.value.table}'`);
    const onExpr = joinNode.children[0];
    const li = [], ri = [];

    for (let l = 0; l < left.length; l++) {
      for (let r = 0; r < right.length; r++) {
        const combined = { ...left.getRow(l), ...right.getRow(r) };
        if (!onExpr || this._evalExprOnRow(onExpr, combined)) {
          li.push(l);
          ri.push(r);
        }
      }
    }

    // Merge schemas
    const mergedDefs = { ...left.schema.defs, ...right.schema.defs };
    const mergedSchema = new Schema('joined', mergedDefs);

    const rows = li.map((l, idx) => ({
      ...left.getRow(l),
      ...right.getRow(ri[idx]),
    }));

    return Table.create(mergedSchema, 'hybrid', rows);
  }

  // ── WHERE ─────────────────────────────────────────────────────────────────

  _applyWhere(whereNode, table) {
    if (!table || table.length == null)
      throw new Error(`_applyWhere received invalid table`);
    const bitmap = new Bitmap(table.length);
    if (whereNode) this._evalPredicate(whereNode.children[0], table, bitmap);
    return bitmap;
  }

  _evalPredicate(expr, table, bitmap) {
    switch (expr.type) {
      case 'Binop': {
        if (expr.value === '&&') {
          this._evalPredicate(expr.children[0], table, bitmap);
          if (bitmap.count() > 0) this._evalPredicate(expr.children[1], table, bitmap);
          return;
        }
        if (expr.value === '||') {
          const b1 = new Bitmap(table.length, 0);
          const b2 = new Bitmap(table.length, 0);
          this._evalPredicate(expr.children[0], table, b1);
          this._evalPredicate(expr.children[1], table, b2);
          bitmap.and(b1.or(b2));
          return;
        }
        this._evalComparison(expr, table, bitmap);
        return;
      }

      case 'IsNull': {
        const col = table.getColumn(expr.children[0].value.col);
        for (let i = 0; i < table.length; i++) {
          if (!bitmap.bits[i]) continue;
          const isNull = col[i] == null;
          bitmap.bits[i] = (expr.value ? !isNull : isNull) ? 1 : 0;
        }
        return;
      }

      case 'In': {
        const col  = table.getColumn(expr.children[0].value.col);
        const vals = new Set(expr.children.slice(1).map(e => e.value));
        for (let i = 0; i < table.length; i++) {
          if (!bitmap.bits[i]) continue;
          bitmap.bits[i] = (vals.has(col[i]) !== Boolean(expr.value)) ? 1 : 0;
        }
        return;
      }

      case 'Between': {
        const col = table.getColumn(expr.children[0].value.col);
        const lo  = expr.children[1].value;
        const hi  = expr.children[2].value;
        for (let i = 0; i < table.length; i++) {
          if (!bitmap.bits[i]) continue;
          const inRange = col[i] >= lo && col[i] <= hi;
          bitmap.bits[i] = (inRange !== Boolean(expr.value)) ? 1 : 0;
        }
        return;
      }

      case 'Like': {
        const col = table.getColumn(expr.children[0].value.col);
        const rx  = new RegExp(
          '^' + expr.value.pattern
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            .replace(/%/g, '.*')
            .replace(/_/g, '.') + '$',
          'i'
        );
        for (let i = 0; i < table.length; i++) {
          if (!bitmap.bits[i]) continue;
          const matches = rx.test(col[i]);
          bitmap.bits[i] = (matches !== Boolean(expr.value.negated)) ? 1 : 0;
        }
        return;
      }

      case 'Unary': {
        if (expr.value === '!') {
          this._evalPredicate(expr.children[0], table, bitmap);
          bitmap.not();
        }
        return;
      }

      default:
        throw new Error(`Unhandled predicate node type: ${expr.type}`);
    }
  }

  _evalComparison(expr, table, bitmap) {
    const left  = this._operand(expr.children[0], table);
    const right = this._operand(expr.children[1], table);
    const op    = expr.value;

    // Check if operand is array-like (column) vs scalar (literal)
    const isCol = v => v !== null && v !== undefined && typeof v === 'object' && 'length' in v;
    const leftIsCol  = isCol(left);
    const rightIsCol = isCol(right);

    for (let i = 0; i < table.length; i++) {
      if (!bitmap.bits[i]) continue;
      const l = leftIsCol  ? left[i]  : left;
      const r = rightIsCol ? right[i] : right;
      bitmap.bits[i] = this._cmp(l, r, op) ? 1 : 0;
    }
  }

  _operand(expr, table) {
    if (expr.type === 'ColumnRef') {
      const col = table.getColumn(expr.value.col);
      if (!col) throw new Error(`Unknown column '${expr.value.col}'`);
      return col;
    }
    if (expr.type === 'Literal') return expr.value;
    throw new Error(`Cannot resolve operand of type ${expr.type}`);
  }

  _cmp(l, r, op) {
    switch (op) {
      case '===': return l === r;
      case '!==': return l !== r;
      case '<':   return l < r;
      case '>':   return l > r;
      case '<=':  return l <= r;
      case '>=':  return l >= r;
      default:    return false;
    }
  }

  // ── PROJECT ───────────────────────────────────────────────────────────────

  _project(table, selectNode) {
    const cols = selectNode.children;

    // SELECT * — return as-is
    if (cols.length === 1 && cols[0].children[0].type === 'Star') return table;

    // Materialise projected rows — safest path, works with all encodings
    const rows = Array.from({ length: table.length }, (_, i) => {
      const row = {};
      for (const colExpr of cols) {
        const inner   = colExpr.children[0];
        const srcName = inner.value?.col;
        const alias   = colExpr.value || srcName || 'col';
        if (!srcName) throw new Error(`Cannot project expression type '${inner.type}' without an alias`);
        row[alias] = table.getColumn(srcName)[i];
      }
      return row;
    });

    return Table.fromResult(rows);
  }

  // ── GROUP BY ──────────────────────────────────────────────────────────────

  _applyGroupBy(table, bitmap, query) {
    const passingIndices = bitmap.toIndices();

    let groups;
    if (query.groupBy) {
      const keyCols = query.groupBy.children.map(e => table.getColumn(e.value.col));
      groups = new Map();
      for (const i of passingIndices) {
        const key = keyCols.map(c => c[i]).join('\0');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(i);
      }
    } else {
      // No GROUP BY — whole result set is one group
      groups = new Map([['*', passingIndices]]);
    }

    const rows = [];
    for (const [, indices] of groups) {
      const row = {};
      for (const colExpr of query.select.children) {
        const inner = colExpr.children[0];
        const alias = colExpr.value
          || (inner.type === 'AggFunc'
              ? `${inner.value.fn.toLowerCase()}(${inner.children[0]?.value?.col ?? '*'})`
              : inner.value?.col)
          || 'col';
        row[alias] = this._aggregate(inner, table, indices);
      }
      rows.push(row);
    }

    let result = query.having
      ? rows.filter(row => this._evalExprOnRow(query.having.children[0], row))
      : rows;

    if (query.orderBy) {
      result.sort((a, b) => {
        for (const term of query.orderBy.children) {
          const k = term.children[0].value?.col;
          const d = term.value === 'DESC' ? -1 : 1;
          if (a[k] > b[k]) return d;
          if (a[k] < b[k]) return -d;
        }
        return 0;
      });
    }

    if (query.limit) {
      const { n, offset } = query.limit.value;
      result = result.slice(offset, offset + n);
    }

    return Table.fromResult(result);
  }

  _aggregate(expr, table, indices) {
    if (expr.type !== 'AggFunc') {
      // Plain column reference in GROUP BY select
      return indices.length ? table.getColumn(expr.value.col)[indices[0]] : null;
    }

    const { fn } = expr.value;

    if (fn === 'COUNT') return indices.length;

    const col  = table.getColumn(expr.children[0].value.col);
    const vals = indices.map(i => col[i]).filter(v => v != null);

    switch (fn) {
      case 'SUM': return vals.reduce((s, v) => s + v, 0);
      case 'AVG': return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
      case 'MIN': return vals.length ? Math.min(...vals) : null;
      case 'MAX': return vals.length ? Math.max(...vals) : null;
      default:    throw new Error(`Unknown aggregate function: ${fn}`);
    }
  }

  // ── ORDER BY / LIMIT ──────────────────────────────────────────────────────

  _finalize(table, query) {
    let t = table;
    if (query.orderBy) t = this._sort(t, query.orderBy);
    if (query.limit)   t = this._applyLimit(t, query.limit);
    return t;
  }

  _sort(table, orderByNode) {
    const rows = table.toRows();
    rows.sort((a, b) => {
      for (const term of orderByNode.children) {
        const k = term.children[0].value?.col;
        const d = term.value === 'DESC' ? -1 : 1;
        if (a[k] > b[k]) return d;
        if (a[k] < b[k]) return -d;
      }
      return 0;
    });
    return Table.fromResult(rows);
  }

  _applyLimit(table, limitNode) {
    const { n, offset } = limitNode.value;
    const rows = table.toRows().slice(offset, offset + n);
    return Table.fromResult(rows);
  }

  // ── Expression evaluation on plain row objects (for HAVING, JOIN ON) ──────

  _evalExprOnRow(expr, row) {
    switch (expr.type) {
      case 'Binop': {
        const l = this._evalExprOnRow(expr.children[0], row);
        const r = this._evalExprOnRow(expr.children[1], row);
        if (expr.value === '&&') return l && r;
        if (expr.value === '||') return l || r;
        return this._cmp(l, r, expr.value);
      }
      case 'Unary':
        if (expr.value === '!') return !this._evalExprOnRow(expr.children[0], row);
        if (expr.value === '-') return -this._evalExprOnRow(expr.children[0], row);
        break;
      case 'Literal':   return expr.value;
      case 'ColumnRef': return row[expr.value.col];
      case 'AggFunc':   return row[`${expr.value.fn.toLowerCase()}(${expr.children[0]?.value?.col ?? '*'})`]
                            ?? row[expr.value.fn.toLowerCase()];
      case 'IsNull':    return (row[expr.children[0].value.col] == null) !== Boolean(expr.value);
    }
    return null;
  }
}
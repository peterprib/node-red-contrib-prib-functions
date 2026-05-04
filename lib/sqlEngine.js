/**
 * SQL Engine for In-Memory Object Collections
 */

const storeRegistry = new Map();

export function registerStore(name, store) {
    storeRegistry.set(name.toLowerCase(), store);
}

export function getStore(name) {
    return storeRegistry.get(name.toLowerCase());
}

export const OPERATORS = {
    string: {
        '=': (a, b) => String(a).toLowerCase() === String(b).toLowerCase(),
        '!=': (a, b) => String(a).toLowerCase() !== String(b).toLowerCase(),
        '<>': (a, b) => String(a).toLowerCase() !== String(b).toLowerCase(),
        'contains': (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
        'starts with': (a, b) => String(a).toLowerCase().startsWith(String(b).toLowerCase()),
        'ends with': (a, b) => String(a).toLowerCase().endsWith(String(b).toLowerCase()),
    },
    number: {
        '=': (a, b) => a == b,
        '!=': (a, b) => a != b,
        '<>': (a, b) => a != b,
        '>': (a, b) => a > Number(b),
        '>=': (a, b) => a >= Number(b),
        '<': (a, b) => a < Number(b),
        '<=': (a, b) => a <= Number(b),
    },
};
OPERATORS.float = OPERATORS.number;
OPERATORS.int = OPERATORS.number;

export function prefixRecord(row, alias) {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
        out[`${alias}.${k}`] = v;
        out[k] = v;
    }
    return out;
}

export function parseSQL(sql) {
    const tokens = sql.trim().match(/'[^']*'|"[^"]*"|[<>!]=?|[(),.*]|[\w.]+|:[a-zA-Z0-9_$.]+/g) || [];
    const u = tokens.map(t => t.toUpperCase());
    const idxOf = kw => u.indexOf(kw);
    const fromIdx = idxOf('FROM');
    if (fromIdx < 0) throw new Error('Missing FROM clause');

    let i = fromIdx + 1;
    const from = tokens[i++];
    const joinKws = new Set(['INNER', 'LEFT', 'RIGHT', 'FULL', 'JOIN', 'WHERE', 'GROUP', 'ORDER', 'LIMIT', 'HAVING']);
    const fromAlias = (tokens[i] && !joinKws.has(u[i])) ? tokens[i++] : from;

    const joins = [];
    while (i < tokens.length) {
        let type = null;
        if      (u[i] === 'INNER' && u[i + 1] === 'JOIN') { type = 'INNER'; i += 2; }
        else if (u[i] === 'LEFT'  && u[i + 1] === 'JOIN') { type = 'LEFT';  i += 2; }
        else if (u[i] === 'RIGHT' && u[i + 1] === 'JOIN') { type = 'RIGHT'; i += 2; }
        else if (u[i] === 'FULL'  && u[i + 1] === 'OUTER' && u[i + 2] === 'JOIN') { type = 'FULL';  i += 3; }
        else if (u[i] === 'FULL'  && u[i + 1] === 'JOIN') { type = 'FULL';  i += 2; }
        else if (u[i] === 'JOIN') { type = 'INNER'; i++;  }
        else break;
        const table = tokens[i++];
        const tableAlias = (tokens[i] && !joinKws.has(u[i]) && u[i] !== 'ON') ? tokens[i++] : table;
        if (u[i] !== 'ON') throw new Error(`Expected ON after JOIN "${table}"`);
        i++;
        const onLeft = tokens[i++]; i++;
        const onRight = tokens[i++];
        joins.push({ type, table, tableAlias, onLeft, onRight });
    }

    const whereIdx = idxOf('WHERE');
    const groupIdx = idxOf('GROUP');
    const havingIdx = idxOf('HAVING');
    const orderIdx = idxOf('ORDER');
    const limitIdx = idxOf('LIMIT');
    const slice = (start, ...stops) => tokens.slice(start, Math.min(...stops.filter(s => s > start), tokens.length));
    const selectRaw = tokens.slice(1, fromIdx).join('').split(',').map(s => s.trim());

    return {
        select: selectRaw,
        selectStar: selectRaw.some(s => s === '*' || s.endsWith('.*')),
        hasAgg: selectRaw.some(s => /^(COUNT|SUM|AVG|MIN|MAX)\(/i.test(s.trim())),
        from, fromAlias, joins,
        where: whereIdx > -1 ? slice(whereIdx + 1, groupIdx, havingIdx, orderIdx, limitIdx).join(' ') : null,
        groupBy: groupIdx > -1 ? slice(groupIdx + 2, havingIdx, orderIdx, limitIdx).join('').split(',').map(s => s.trim()).filter(Boolean) : [],
        having: havingIdx > -1 ? slice(havingIdx + 1, orderIdx, limitIdx).join(' ') : null,
        orderBy: orderIdx > -1 ? slice(orderIdx + 2, limitIdx).join('').split(',').map(s => {
            const [f, d = 'ASC'] = s.trim().split(/\s+/);
            return { field: f, dir: d.toUpperCase() };
        }) : [],
        limit: limitIdx > -1 ? parseInt(tokens[limitIdx + 1]) : null
    };
}

export async function executeQuery(parsed, getTableRecords, parameters = {}) {
    const leftRecords = await getTableRecords(parsed.from);
    if (!leftRecords) throw new Error(`Table "${parsed.from}" not found.`);
    let rows = leftRecords.map(r => prefixRecord(r, parsed.fromAlias));
    for (const join of parsed.joins) {
        const rightRecords = await getTableRecords(join.table);
        if (!rightRecords) throw new Error(`Table "${join.table}" not found.`);
        rows = execJoin(rows, rightRecords, join);
    }
    if (parsed.where) rows = rows.filter(r => evalCondition(r, substituteParams(parsed.where, parameters)));
    if (parsed.groupBy.length || parsed.hasAgg) {
        rows = execGroupBy(rows, parsed);
        if (parsed.having) rows = rows.filter(r => evalCondition(r, substituteParams(parsed.having, parameters)));
    }
    if (parsed.orderBy.length) {
        rows.sort((a, b) => {
            for (const { field, dir } of parsed.orderBy) {
                const av = getField(a, field); const bv = getField(b, field);
                if (av < bv) return dir === 'ASC' ? -1 : 1;
                if (av > bv) return dir === 'ASC' ? 1 : -1;
            }
            return 0;
        });
    }
    if (parsed.limit !== null) rows = rows.slice(0, parsed.limit);
    return projectColumns(rows, parsed.select, parsed.selectStar, parameters);
}

function execJoin(leftRows, rightRows, join) {
    const { type, tableAlias: rAlias, onLeft, onRight } = join;
    const rightField = onRight.includes('.') ? onRight.split('.')[1] : onRight;
    const rightIdx = new Map();
    rightRows.forEach(r => {
        const pr = prefixRecord(r, rAlias);
        const k = String(r[rightField] ?? '');
        if (!rightIdx.has(k)) rightIdx.set(k, []);
        rightIdx.get(k).push(pr);
    });
    const nullRight = Object.fromEntries(Object.keys(rightRows[0] || {}).map(k => [`${rAlias}.${k}`, null]));
    const nullLeft = Object.fromEntries(Object.keys(leftRows[0] || {}).map(k => [k, null]));
    const result = [];
    if (type === 'INNER' || type === 'LEFT') {
        for (const l of leftRows) {
            const k = String(getField(l, onLeft) ?? '');
            const matches = rightIdx.get(k);
            if (matches) matches.forEach(pr => result.push({ ...l, ...pr }));
            else if (type === 'LEFT') result.push({ ...l, ...nullRight });
        }
    }
    if (type === 'RIGHT' || type === 'FULL') {
        const leftIdx = new Map();
        leftRows.forEach(l => { const k = String(getField(l, onLeft) ?? ''); if (!leftIdx.has(k)) leftIdx.set(k, []); leftIdx.get(k).push(l); });
        for (const [k, prs] of rightIdx) {
            const matches = leftIdx.get(k);
            if (matches) { if (type === 'RIGHT') prs.forEach(pr => matches.forEach(l => result.push({ ...l, ...pr }))); }
            else prs.forEach(pr => result.push({ ...nullLeft, ...pr }));
        }
    }
    return result;
}

function execGroupBy(rows, parsed) {
    const aggExprs = parsed.select.filter(s => /^(COUNT|SUM|AVG|MIN|MAX)\(/i.test(s.trim())).map(s => {
        const m = s.trim().match(/^(COUNT|SUM|AVG|MIN|MAX)\((\*|[\w.]+)\)(?:\s+(?:AS\s+)?(\w+))?$/i);
        return { fn: m[1].toUpperCase(), field: m[2] === '*' ? null : m[2], alias: m[3] ?? `${m[1].toLowerCase()}_${m[2] ?? 'all'}` };
    });
    const groups = new Map();
    rows.forEach(r => {
        const key = parsed.groupBy.map(f => String(getField(r, f) ?? '')).join('\x00') || '__all__';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(r);
    });
    return [...groups.values()].map(grp => {
        const out = {};
        parsed.groupBy.forEach(f => { out[f] = getField(grp[0], f); out[f.split('.').pop()] = out[f]; });
        aggExprs.forEach(({ fn, field, alias }) => {
            const vals = field ? grp.map(r => getField(r, field)).filter(v => v != null) : [];
            let res;
            switch (fn) {
                case 'COUNT': res = grp.length; break;
                case 'SUM': res = vals.reduce((a, b) => a + b, 0); break;
                case 'AVG': res = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0; break;
                case 'MIN': res = Math.min(...vals); break;
                case 'MAX': res = Math.max(...vals); break;
            }
            out[alias] = Math.round(res * 100) / 100;
        });
        return out;
    });
}

function projectColumns(rows, selectExprs, selectStar, parameters) {
    if (selectStar || !rows.length) return rows;
    return rows.map(r => {
        const out = {};
        selectExprs.forEach(expr => {
            const exprSub = substituteParams(expr, parameters);
            const asMatch = exprSub.match(/^(.+?)\s+(?:AS\s+)?(\w+)$/i);
            const raw = asMatch ? asMatch[1].trim() : exprSub.trim();
            const alias = asMatch ? asMatch[2] : (expr.includes('.') ? expr.split('.')[1] : expr.trim());
            if (/^(COUNT|SUM|AVG|MIN|MAX)\(/i.test(raw)) {
                const m = raw.match(/^(COUNT|SUM|AVG|MIN|MAX)\((\*|[\w.]+)\)$/i);
                const key = asMatch ? asMatch[2] : `${m[1].toLowerCase()}_${m[2] ?? 'all'}`;
                out[key] = r[key];
            } else out[alias] = getField(r, raw);
        });
        return out;
    });
}

function evalCondition(record, cond) {
    cond = cond.trim();
    const andParts = splitLogical(cond, 'AND');
    if (andParts.length > 1) return andParts.every(p => evalCondition(record, p));
    const orParts = splitLogical(cond, 'OR');
    if (orParts.length > 1) return orParts.some(p => evalCondition(record, p));

    if (cond.startsWith('(') && cond.endsWith(')')) return evalCondition(record, cond.slice(1, -1));

    // BETWEEN
    const bm = cond.match(/^([\w.]+)\s+(NOT\s+)?BETWEEN\s+(.+?)\s+AND\s+(.+)$/i);
    if (bm) {
        const v = getField(record, bm[1]);
        const res = v >= parseVal(bm[3]) && v <= parseVal(bm[4]);
        return bm[2] ? !res : res;
    }

    // IN
    const im = cond.match(/^([\w.]+)\s+(NOT\s+)?IN\s*\((.+)\)$/i);
    if (im) {
        const v = String(getField(record, im[1]) ?? '').toLowerCase();
        const vals = im[3].split(',').map(s => String(parseVal(s.trim())).toLowerCase());
        const res = vals.includes(v);
        return im[2] ? !res : res;
    }

    // LIKE
    const lm = cond.match(/^([\w.]+)\s+(NOT\s+)?LIKE\s+('[^']*'|"[^"]*"|\S+)$/i);
    if (lm) {
        const v = String(getField(record, lm[1]) ?? '').toLowerCase();
        const pat = lm[3].replace(/^['"]|['"]$/g, '').toLowerCase().replace(/%/g, '.*').replace(/_/g, '.');
        const res = new RegExp(`^${pat}$`).test(v);
        return lm[2] ? !res : res;
    }

    // IS NULL / IS NOT NULL
    const nm = cond.match(/^([\w.]+)\s+IS\s+(NOT\s+)?NULL$/i);
    if (nm) {
        const isNull = getField(record, nm[1]) == null;
        return nm[2] ? !isNull : isNull;
    }

    const cm = cond.match(/^([\w.]+)\s*(>=|<=|!=|<>|>|<|=)\s*(.+)$/);
    if (cm) {
        const a = getField(record, cm[1]);
        const b = parseVal(cm[3].trim());
        switch (cm[2]) {
            case '=': return typeof a === 'string' ? String(a).toLowerCase() === String(b).toLowerCase() : a == b;
            case '!=': case '<>': return a != b;
            case '>': return a > b; case '<': return a < b;
            case '>=': return a >= b; case '<=': return a <= b;
        }
    }
    return true;
}

function splitLogical(cond, op) {
    const parts = []; let depth = 0, cur = '', i = 0;
    while (i < cond.length) {
        if (cond[i] === '(') depth++; else if (cond[i] === ')') depth--;
        if (depth === 0) {
            const m = cond.slice(i).match(new RegExp(`^\\s+${op}\\s+`, 'i'));
            if (m) { parts.push(cur.trim()); cur = ''; i += m[0].length; continue; }
        }
        cur += cond[i++];
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
}

function getField(record, expr) {
    if (!expr || expr === '*') return undefined;
    if (expr.includes('.')) { const [alias, field] = expr.split('.'); return record[`${alias}.${field}`] ?? record[field]; }
    return record[expr];
}

function parseVal(v) {
    if (/^'.*'$/.test(v) || /^".*"$/.test(v)) return v.slice(1, -1);
    if (!isNaN(v) && v.trim() !== '') return Number(v);
    return v;
}

function substituteParams(sql, context = {}) {
    const getDeep = (obj, path) => {
        if (!obj || typeof path !== 'string') return undefined;
        return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
    };
    return sql.replace(/:(msg|flow|global)\.[a-zA-Z0-9_$.]+/g, (match) => {
        const ctxType = match.split('.')[0].slice(1);
        const path = match.slice(1 + ctxType.length + 1);
        const value = getDeep(context[ctxType], path);
        if (value === undefined) throw new Error(`Parameter '${match}' not provided`);
        return (typeof value === 'string') ? JSON.stringify(value) : String(value);
    });
}
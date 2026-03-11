const logger = new (require("node-red-contrib-logger"))("Columnar Store");
logger.sendInfo("Copyright 2025 Jaroslav Peter Prib");

// Implementation based on Apache Parquet specification concepts
// Uses columnar storage, compression, and metadata principles from the spec
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Simple columnar storage implementation inspired by Apache Parquet specification
class SimpleColumnarStore {
    static async writeRecords(records, filePath) {
        if (!records || records.length === 0) {
            throw new Error("No records to write");
        }

        // Extract schema from first record (following Parquet schema concepts)
        const schema = {};
        const firstRecord = records[0];
        for (const [key, value] of Object.entries(firstRecord)) {
            schema[key] = typeof value;
        }

        // Organize data by columns (columnar storage principle)
        const columns = {};
        for (const key of Object.keys(schema)) {
            columns[key] = records.map(record => record[key] || null);
        }

        // Create metadata (following Parquet metadata concepts)
        const metadata = {
            version: 1,
            schema: schema,
            numRows: records.length,
            numColumns: Object.keys(schema).length,
            created: new Date().toISOString(),
            compression: 'gzip'
        };

        // Serialize and compress data (following Parquet compression concepts)
        const data = {
            metadata: metadata,
            columns: columns
        };

        const jsonData = JSON.stringify(data);
        const compressed = zlib.gzipSync(jsonData);

        // Write to file with magic bytes (inspired by Parquet file format)
        const magic = Buffer.from('PARQ');
        const metadataSize = Buffer.alloc(4);
        metadataSize.writeUInt32LE(compressed.length, 0);

        const output = Buffer.concat([magic, metadataSize, compressed]);
        fs.writeFileSync(filePath, output);

        return {
            filePath: filePath,
            recordsWritten: records.length,
            schema: schema,
            compressedSize: output.length
        };
    }
    // improved writeRecords: uses true columnar binary buffers with individual compression
    // Now supports appending to existing files
    static async writeRecords(records, filePath, append = false) {
        if (!records || records.length === 0) {
            throw new Error("No records to write");
        }

        // If appending and file exists, read existing data and merge
        let existingRecords = [];
        let existingSchema = {};
        if (append && fs.existsSync(filePath)) {
            try {
                const existingData = await this.readRecords(filePath);
                existingRecords = existingData.records;
                existingSchema = existingData.schema;
            } catch (e) {
                // If we can't read the existing file, treat it as non-existent
                existingRecords = [];
                existingSchema = {};
            }
        }

        // Combine existing and new records
        const allRecords = [...existingRecords, ...records];

        // infer schema types from all records (merge schemas)
        const schema = {...existingSchema};
        for (const record of allRecords) {
            for (const [k, v] of Object.entries(record)) {
                if (!(k in schema)) {
                    schema[k] = typeof v;
                }
            }
        }

        // build column buffers (binary) rather than JSON
        const columnBuffers = [];
        const columnMeta = [];

        for (const [col, type] of Object.entries(schema)) {
            let buf;
            switch (type) {
                case 'number': {
                    const arr = new Float64Array(allRecords.length);
                    allRecords.forEach((r,i)=> arr[i] = r[col] == null ? NaN : r[col]);
                    buf = Buffer.from(arr.buffer);
                    break;
                }
                case 'boolean': {
                    const arr = Buffer.alloc(allRecords.length);
                    allRecords.forEach((r,i)=> arr[i] = r[col] ? 1 : 0);
                    buf = arr;
                    break;
                }
                case 'string': {
                    const parts = [];
                    allRecords.forEach(r=>{
                        const s = r[col] == null ? '' : String(r[col]);
                        const sb = Buffer.from(s,'utf8');
                        const len = Buffer.alloc(4);
                        len.writeUInt32LE(sb.length,0);
                        parts.push(len,sb);
                    });
                    buf = Buffer.concat(parts);
                    break;
                }
                default: {
                    const json = allRecords.map(r=>r[col]);
                    buf = Buffer.from(JSON.stringify(json),'utf8');
                }
            }
            const comp = zlib.gzipSync(buf);
            columnMeta.push({name: col, type: type, length: comp.length});
            columnBuffers.push(comp);
        }

        const metadata = {
            version: 1,
            schema: schema,
            numRows: allRecords.length,
            numColumns: columnMeta.length,
            created: new Date().toISOString(),
            compression: 'gzip',
            columns: columnMeta
        };

        const metaBuf = Buffer.from(JSON.stringify(metadata),'utf8');
        const metaSize = Buffer.alloc(4);
        metaSize.writeUInt32LE(metaBuf.length,0);

        const magic = Buffer.from('PARQ');

        const pieces = [magic, metaSize, metaBuf];
        for (const comp of columnBuffers) {
            const sizeBuf = Buffer.alloc(4);
            sizeBuf.writeUInt32LE(comp.length,0);
            pieces.push(sizeBuf, comp);
        }
        const output = Buffer.concat(pieces);
        fs.writeFileSync(filePath, output);
        return {
            filePath,
            recordsWritten: records.length,
            totalRecords: allRecords.length,
            schema,
            fileSize: output.length,
            appended: append && existingRecords.length > 0
        };
    }

    // Convenience method to append records to existing file
    static async appendRecords(records, filePath) {
        return this.writeRecords(records, filePath, true);
    }

    static async readRecords(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error("File does not exist: " + filePath);
        }

        const buffer = fs.readFileSync(filePath);

        // Check magic bytes
        const magic = buffer.slice(0, 4).toString();
        if (magic !== 'PARQ') {
            throw new Error("Invalid file format - not a columnar file");
        }

        // Read compressed data size
        const dataSize = buffer.readUInt32LE(4);
        const compressed = buffer.slice(8, 8 + dataSize);

        // Decompress and parse
        const jsonData = zlib.gunzipSync(compressed).toString();
        const data = JSON.parse(jsonData);

        // Reconstruct records from columnar data
        const records = [];
        const numRows = data.metadata.numRows;

        for (let i = 0; i < numRows; i++) {
            const record = {};
            for (const [columnName, columnData] of Object.entries(data.columns)) {
                record[columnName] = columnData[i];
            }
            records.push(record);
        }

        return {
            records: records,
            count: records.length,
            schema: data.metadata.schema,
            metadata: data.metadata,
            filePath: filePath
        };
    }
        static async readRecords(filePath) {
            if (!fs.existsSync(filePath)) {
                throw new Error("File does not exist: " + filePath);
            }

            const buffer = fs.readFileSync(filePath);

            // Check magic bytes
            const magic = buffer.slice(0,4).toString();
            if (magic !== 'PARQ') throw new Error('Invalid format');

            let offset = 4;
            const metaSize = buffer.readUInt32LE(offset); offset +=4;
            const metaBuf = buffer.slice(offset, offset+metaSize); offset += metaSize;
            const metadata = JSON.parse(metaBuf.toString('utf8'));

            const records = [];
            const numRows = metadata.numRows;

            // read each column sequentially according to metadata
            const columns = {};
            for (const colMeta of metadata.columns) {
                const colSize = buffer.readUInt32LE(offset); offset +=4;
                const comp = buffer.slice(offset, offset+colSize); offset += colSize;
                const raw = zlib.gunzipSync(comp);
                // decode according to type
                let arr;
                switch (colMeta.type) {
                    case 'number': arr = new Float64Array(raw.buffer, raw.byteOffset, numRows); break;
                    case 'boolean': arr = Uint8Array.from(raw); break;
                    case 'string': {
                        const vals = [];
                        let p = 0;
                        for (let i=0;i<numRows;i++) {
                            const len = raw.readUInt32LE(p); p+=4;
                            vals.push(raw.slice(p,p+len).toString('utf8')); p+=len;
                        }
                        arr = vals;
                        break;
                    }
                    default: arr = JSON.parse(raw.toString('utf8'));
                }
                columns[colMeta.name] = arr;
            }

            for (let i=0;i<numRows;i++) {
                const rec = {};
                for (const colName of Object.keys(columns)) {
                    const colArr = columns[colName];
                    rec[colName] = colArr[i];
                }
                records.push(rec);
            }

            return {records, count: records.length, schema: metadata.schema, metadata, filePath};
        }

        static async queryRecords(filePath, options = {}) {
        const { limit, filter, ridMap } = options;
        const data = await this.readRecords(filePath);

        let records = data.records;
        let totalScanned = records.length;

        // if a ridMap is provided we intersect the sets for each column
        if (ridMap) {
            let hits;
            for (const col in ridMap) {
                const rids = ridMap[col];
                if (!Array.isArray(rids) && !(rids instanceof Set))
                    throw Error('ridMap values must be array or set');
                const set = new Set(rids);
                if (hits == null) hits = set;
                else hits = new Set([...hits].filter(x => set.has(x)));
            }
            if (hits) {
                records = records.filter((_r, i) => hits.has(i));
            }
        } else if (filter) {
            if (typeof filter === 'function') {
                records = records.filter(filter);
            } else if (typeof filter === 'object') {
                // treat object as column->predicate map and intersect rids
                let ridSets = [];
                for (const [col, pred] of Object.entries(filter)) {
                    if (typeof pred !== 'function') continue;
                    const set = new Set();
                    const colArr = data.records.map(r => r[col]);
                    colArr.forEach((val, i) => {
                        try {
                            if (pred(val)) set.add(i);
                        } catch (e) {}
                    });
                    ridSets.push(set);
                }
                if (ridSets.length > 0) {
                    let common = ridSets.shift();
                    ridSets.forEach(s => {
                        common = new Set([...common].filter(x => s.has(x)));
                    });
                    records = [...common].sort((a, b) => a - b).map(i => data.records[i]);
                    totalScanned = data.records.length;
                }
            }
        }

        // Apply limit if provided
        if (limit && limit > 0) {
            records = records.slice(0, limit);
        }

        return {
            records: records,
            count: records.length,
            totalScanned: totalScanned,
            schema: data.schema,
            filePath: filePath,
            filtered: !!(filter || ridMap)
        };
    }

    // Full-featured SQL query engine with JOIN support. Supports:
    //   SELECT [col1,col2,…|*|COUNT(*)|SUM(col)|AVG(col)|etc] FROM ?
    //   [INNER|LEFT|RIGHT|FULL OUTER] JOIN filePath ON <join condition>
    //   [WHERE <expression>]
    //   [GROUP BY col1,col2,…]
    //   [HAVING <expression>]
    //   [ORDER BY col1 [ASC|DESC], …]
    //   [LIMIT n]
    // Parameters: Use $param or :param syntax (e.g., WHERE age > $age)
    // Expressions may use JavaScript syntax with record fields.
    static async sqlQuery(filePath, sql, parsedTokens = null, parameters = {}) {
        if (typeof sql !== 'string' || !sql.trim()) {
            throw new Error('sql must be a non-empty string');
        }

        const data = await this.readRecords(filePath);

        // Parse query components first (before parameter substitution)
        const tokens = parsedTokens || this._parseSql(sql);

        let records = [...data.records];

        // JOIN operations
        if (tokens.joins && tokens.joins.length > 0) {
            for (const join of tokens.joins) {
                const joinData = await this.readRecords(join.filePath);
                records = this._applyJoin(records, joinData.records, join);
            }
        }

        // WHERE clause - use prepared statement if available
        if (tokens.where) {
            let whereExpr = tokens.where;
            if (tokens.wherePrepared && tokens.whereParamLocations) {
                // Use prepared statement approach
                whereExpr = this._substituteParametersInPrepared(
                    tokens.wherePrepared,
                    tokens.whereParamLocations,
                    { msg: parameters.msg, flow: parameters.flow, global: parameters.global }
                );
            }
            records = this._applyWhere(records, whereExpr);
        }

        // GROUP BY or aggregates without GROUP BY
        if (tokens.groupBy && tokens.groupBy.length > 0) {
            records = this._applyGroupBy(records, tokens.groupBy, tokens.select);
        } else if (tokens.hasAggregates) {
            // Aggregates without GROUP BY
            records = this._applyGroupBy(records, [], tokens.select);
        }

        // HAVING clause (after grouping) - use prepared statement if available
        if (tokens.having) {
            let havingExpr = tokens.having;
            if (tokens.havingPrepared && tokens.havingParamLocations) {
                // Use prepared statement approach
                havingExpr = this._substituteParametersInPrepared(
                    tokens.havingPrepared,
                    tokens.havingParamLocations,
                    { msg: parameters.msg, flow: parameters.flow, global: parameters.global }
                );
            }
            records = this._applyWhere(records, havingExpr);
        }

        // ORDER BY
        if (tokens.orderBy && tokens.orderBy.length > 0) {
            records = this._applyOrderBy(records, tokens.orderBy);
        }

        // LIMIT
        if (tokens.limit) {
            records = records.slice(0, tokens.limit);
        }

        // Final projection (SELECT columns)
        // Always apply if not SELECT *, or if we have JOINs (to handle alias.column syntax)
        const hasJoins = tokens.joins && tokens.joins.length > 0;
        if (tokens.select && tokens.select !== '*' && (!tokens.hasAggregates || hasJoins)) {
            let selectExpr = tokens.select;
            // Substitute parameters in SELECT clause if prepared statement exists
            if (tokens.selectPrepared && tokens.selectParamLocations) {
                selectExpr = this._substituteParametersInPrepared(
                    tokens.selectPrepared,
                    tokens.selectParamLocations,
                    { msg: parameters.msg, flow: parameters.flow, global: parameters.global }
                );
            }
            records = this._projectColumns(records, selectExpr);
        }

        return records;
    }

    // Extract and prepare parameters from an expression (prepared statement approach)
    // Returns {expression: prepared_expr, paramLocations: [{marker, ctxType, path}]}
    static _extractAndPrepareParameters(expr) {
        const paramLocations = [];
        let paramIndex = 0;
        
        const preparedExpr = expr.replace(/:(msg|flow|global)\.[a-zA-Z0-9_$.]+/g, (match) => {
            // Extract context type and path from marker like ":msg.payload.minAge"
            const ctxType = match.split('.')[0].slice(1); // Get 'msg' from ":msg"
            const path = match.slice(1 + ctxType.length + 1); // Get "payload.minAge" after ":msg."
            paramLocations.push({ marker: match, ctxType, path, index: paramIndex });
            // Replace with a placeholder that won't interfere with JavaScript parsing
            paramIndex++;
            return `__PARAM_${paramLocations.length - 1}__`;
        });
        
        return { preparedExpr, paramLocations };
    }

    // Substitute prepared parameters with actual values at runtime
    static _substituteParametersInPrepared(preparedExpr, paramLocations, context = {}) {
        function getDeep(obj, path) {
            if (!obj || typeof path !== 'string') return undefined;
            return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
        }

        let resultExpr = preparedExpr;
        
        for (const param of paramLocations) {
            let value;
            if (param.ctxType === 'msg') {
                value = getDeep(context.msg, param.path);
            } else if (param.ctxType === 'flow') {
                value = getDeep(context.flow, param.path);
            } else if (param.ctxType === 'global') {
                value = getDeep(context.global, param.path);
            } else {
                throw new Error(`Invalid parameter context: ${param.ctxType}`);
            }
            
            if (value === undefined) {
                throw new Error(`Parameter '${param.marker}' not provided`);
            }
            
            // Safely convert value to JavaScript literal
            let safeValue;
            if (typeof value === 'string') {
                safeValue = JSON.stringify(value);
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                safeValue = String(value);
            } else {
                safeValue = JSON.stringify(value);
            }
            
            resultExpr = resultExpr.replace(`__PARAM_${param.index}__`, safeValue);
        }
        
        return resultExpr;
    }

    // Legacy function for backward compatibility (deprecated)
    static _substituteParameters(sql, context = {}) {
        // Only allow :msg.something, :flow.something, :global.something
        function getDeep(obj, path) {
            if (!obj || typeof path !== 'string') return undefined;
            return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
        }
        return sql.replace(/:(msg|flow|global)\.[a-zA-Z0-9_$.]+/g, (match) => {
            // Extract context type and path
            const [_, ctxType, ...pathParts] = match.split(/[:.]/);
            const path = match.slice(1 + ctxType.length + 1); // skip : and ctxType.
            let value;
            if (ctxType === 'msg') {
                value = getDeep(context.msg, path);
            } else if (ctxType === 'flow') {
                value = getDeep(context.flow, path);
            } else if (ctxType === 'global') {
                value = getDeep(context.global, path);
            } else {
                throw new Error(`Invalid parameter context: ${ctxType}`);
            }
            if (value === undefined) {
                throw new Error(`Parameter '${match}' not provided`);
            }
            // Only allow safe values
            if (typeof value === 'string') {
                return JSON.stringify(value);
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                return String(value);
            } else {
                return JSON.stringify(value);
            }
        });
    }
    static _parseSql(sql) {
        const result = {
            select: '*',
            hasAggregates: false,
            from: '?',
            joins: [],
            where: null,
            groupBy: [],
            having: null,
            orderBy: [],
            limit: null
        };

        // Case-insensitive regex matching
        const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i);
        if (!selectMatch) throw new Error('Invalid SQL: missing SELECT clause');
        result.select = selectMatch[1].trim();
        result.hasAggregates = /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(result.select);
        
        // Prepare parameters for SELECT clause
        const selectPrepared = this._extractAndPrepareParameters(result.select);
        result.selectPrepared = selectPrepared.preparedExpr;
        result.selectParamLocations = selectPrepared.paramLocations;

        // Parse JOINs (INNER, LEFT, RIGHT, FULL OUTER)
        // Handles optional table alias before JOIN: "FROM ? u INNER JOIN 'file' o ON u.id = o.uid"
        const joinRegex = /(?:FROM|JOIN)\s+[?'"]?\S+[?'"]?\s+\w+\s+(INNER\s+|LEFT\s+|RIGHT\s+|FULL\s+OUTER\s+)?JOIN\s+['"]([^'"]+)['"]\s+\w+\s+ON\s+(.+?)(?:(?:INNER|LEFT|RIGHT|FULL|WHERE|GROUP|HAVING|ORDER|LIMIT)\s|$)/gi;
        let joinMatch;
        while ((joinMatch = joinRegex.exec(sql)) !== null) {
            const joinType = (joinMatch[1] || 'INNER').trim().toUpperCase();
            const filePath = joinMatch[2];
            const onCondition = joinMatch[3].trim();
            result.joins.push({ joinType, filePath, onCondition });
        }

        const whereMatch = sql.match(/WHERE\s+(.+?)(?:GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|$)/i);
        if (whereMatch) {
            result.where = whereMatch[1].trim();
            // Prepare parameters for WHERE clause
            const prepared = this._extractAndPrepareParameters(result.where);
            result.wherePrepared = prepared.preparedExpr;
            result.whereParamLocations = prepared.paramLocations;
        }

        const groupMatch = sql.match(/GROUP\s+BY\s+(.+?)(?:HAVING|ORDER\s+BY|LIMIT|$)/i);
        if (groupMatch) {
            result.groupBy = groupMatch[1].trim().split(/\s*,\s*/).map(c => c.trim());
        }

        const havingMatch = sql.match(/HAVING\s+(.+?)(?:ORDER\s+BY|LIMIT|$)/i);
        if (havingMatch) {
            result.having = havingMatch[1].trim();
            // Prepare parameters for HAVING clause
            const prepared = this._extractAndPrepareParameters(result.having);
            result.havingPrepared = prepared.preparedExpr;
            result.havingParamLocations = prepared.paramLocations;
        }

        const orderMatch = sql.match(/ORDER\s+BY\s+(.+?)(?:LIMIT|$)/i);
        if (orderMatch) {
            const orderParts = orderMatch[1].trim().split(/\s*,\s*/);
            result.orderBy = orderParts.map(part => {
                const m = part.match(/(\S+)\s+(ASC|DESC)?/i);
                return {
                    column: m[1],
                    direction: (m[2] || 'ASC').toUpperCase()
                };
            });
        }

        const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
        if (limitMatch) result.limit = parseInt(limitMatch[1]);

        return result;
    }

    static _applyJoin(leftRecords, rightRecords, joinSpec) {
        const { joinType, onCondition } = joinSpec;
        const result = [];

        // Parse the ON condition: e.g., "l.id = r.id"
        const onMatch = onCondition.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/);
        if (!onMatch) throw new Error('Invalid JOIN condition syntax');
        const [, lAlias, lCol, rAlias, rCol] = onMatch;

        // Build a map for quick lookup
        const rightMap = {};
        rightRecords.forEach((r, idx) => {
            const key = String(r[rCol]);
            if (!rightMap[key]) rightMap[key] = [];
            rightMap[key].push({ record: r, index: idx });
        });

        const processedLeft = new Set();
        const processedRight = new Set();

        // INNER, LEFT, RIGHT, FULL OUTER
        if (joinType === 'INNER' || joinType === 'LEFT' || joinType === 'FULL OUTER') {
            leftRecords.forEach((l, lIdx) => {
                const key = String(l[lCol]);
                const matches = rightMap[key] || [];

                if (matches.length > 0) {
                    matches.forEach(({ record: r, index: rIdx }) => {
                        result.push(Object.assign({}, l, r));
                        processedRight.add(rIdx);
                    });
                } else if (joinType !== 'INNER') {
                    // LEFT or FULL OUTER: include unmatched left rows
                    result.push(l);
                }
                processedLeft.add(lIdx);
            });
        }

        if (joinType === 'RIGHT' || joinType === 'FULL OUTER') {
            rightRecords.forEach((r, rIdx) => {
                if (!processedRight.has(rIdx)) {
                    result.push(r);
                }
            });
        }

        return result;
    }

    static _applyWhere(records, whereExpr) {
        // Convert SQL comparison operators to JavaScript
        // Order matters: replace compound operators first, then single =
        let jsExpr = whereExpr
            .replace(/<>/g, '!==')  // SQL !=
            .replace(/!=/g, '!==')  // SQL != (alternative)
            .replace(/\bAND\b/gi, '&&')  // SQL AND
            .replace(/\bOR\b/gi, '||')   // SQL OR
            .replace(/\bNOT\b/gi, '!')   // SQL NOT
            .replace(/([^=!<>])=([^=])/g, '$1===$2'); // SQL = becomes === (not part of compound operators)

        let fn;
        try {
            fn = new Function('r', 'with(r){return ' + jsExpr + ';}');
        } catch (e) {
            throw new Error('Invalid WHERE expression: ' + e.message);
        }
        return records.filter(r => {
            try {
                return fn(r);
            } catch (_e) {
                return false;
            }
        });
    }

    static _applyGroupBy(records, groupCols, selectExpr) {
        const groups = {};

        // Check if SELECT has only aggregates (no group by columns)
        const hasOnlyAggregates = groupCols.length === 0 && /^\s*(COUNT|SUM|AVG|MIN|MAX|COUNT\s+DISTINCT)\s*\(/i.test(selectExpr);

        if (hasOnlyAggregates) {
            // Single aggregate over all records
            const row = {};
            const aggregates = this._extractAggregates(selectExpr, records);
            Object.assign(row, aggregates);
            return [row];
        }

        // Build groups
        records.forEach(r => {
            const key = groupCols.map(c => String(r[c])).join('|');
            if (!groups[key]) {
                groups[key] = {
                    records: [],
                    groupValues: {}
                };
                groupCols.forEach(c => {
                    groups[key].groupValues[c] = r[c];
                });
            }
            groups[key].records.push(r);
        });

        // Compute aggregates
        const result = [];
        for (const key in groups) {
            const group = groups[key];
            const row = { ...group.groupValues };

            // Parse aggregates from selectExpr
            const aggregates = this._extractAggregates(selectExpr, group.records);
            Object.assign(row, aggregates);

            result.push(row);
        }

        return result;
    }

    static _extractAggregates(selectExpr, records) {
        const result = {};
        const aggRegex = /(COUNT|SUM|AVG|MIN|MAX|COUNT\s+DISTINCT)\s*\(\s*([^)]+)\s*\)\s*(?:AS|as)?\s*(\w+)?/g;

        let match;
        while ((match = aggRegex.exec(selectExpr)) !== null) {
            const [, aggFunc, colExpr, alias] = match;
            const colName = alias || aggFunc.toUpperCase() + '_' + colExpr;

            const values = records.map(r => {
                try {
                    if (colExpr === '*') return 1;
                    const fn = new Function('r', 'with(r){return ' + colExpr + ';}');
                    return fn(r);
                } catch (_e) {
                    return null;
                }
            }).filter(v => v != null);

            if (aggFunc.toUpperCase() === 'COUNT') {
                result[colName] = records.length;
            } else if (aggFunc.toUpperCase() === 'COUNT DISTINCT') {
                result[colName] = new Set(values).size;
            } else if (aggFunc.toUpperCase() === 'SUM') {
                result[colName] = values.reduce((a, b) => a + b, 0);
            } else if (aggFunc.toUpperCase() === 'AVG') {
                result[colName] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            } else if (aggFunc.toUpperCase() === 'MIN') {
                result[colName] = Math.min(...values);
            } else if (aggFunc.toUpperCase() === 'MAX') {
                result[colName] = Math.max(...values);
            }
        }

        return result;
    }

    static _applyOrderBy(records, orderBy) {
        return records.sort((a, b) => {
            for (const { column, direction } of orderBy) {
                const valA = a[column];
                const valB = b[column];
                let cmp = 0;
                if (valA < valB) cmp = -1;
                else if (valA > valB) cmp = 1;
                if (cmp !== 0) return direction === 'DESC' ? -cmp : cmp;
            }
            return 0;
        });
    }

    static _projectColumns(records, selectExpr) {

        // Split selectExpr on commas, but ignore commas inside quotes
        function splitSelectColumns(expr) {
            const cols = [];
            let current = '';
            let inSingle = false, inDouble = false;
            for (let i = 0; i < expr.length; i++) {
                const ch = expr[i];
                if (ch === "'" && !inDouble) inSingle = !inSingle;
                else if (ch === '"' && !inSingle) inDouble = !inDouble;
                if (ch === ',' && !inSingle && !inDouble) {
                    cols.push(current.trim());
                    current = '';
                } else {
                    current += ch;
                }
            }
            if (current.trim()) cols.push(current.trim());
            return cols;
        }

        const cols = splitSelectColumns(selectExpr).map(c => {
            // Support quoted identifiers for output name
            // Match: expr [AS name] or expr [AS "name"]
            const m = c.match(/(.+?)(?:\s+(?:AS|as)\s+((?:"[^"]+")|(?:'[^']+')|\w+))?$/);
            const expr = m[1].trim();
            let outputName = m[2];
            if (outputName) {
                outputName = outputName.replace(/^['"]|['"]$/g, ''); // Remove quotes if present
            } else {
                outputName = expr;
            }
            return { expr, outputName };
        });

        return records.map(r => {
            const o = {};
            cols.forEach(c => {
                // Check if expr is a simple column reference or contains parameters/expressions
                if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(c.expr)) {
                    // Simple column reference (e.g., "id", "u.id")
                    let sourceCol = c.expr;
                    if (c.expr.includes('.')) {
                        sourceCol = c.expr.split('.')[1];  // Extract column name after alias
                    }
                    o[c.outputName] = r[sourceCol];
                } else {
                    // Computed expression - evaluate it (handles parameters and JS expressions)
                    try {
                        const fn = new Function('r', 'with(r){return ' + c.expr + ';}');
                        o[c.outputName] = fn(r);
                    } catch (e) {
                        o[c.outputName] = undefined;
                    }
                }
            });
            return o;
        });
    }

    static async getSchema(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error("File does not exist: " + filePath);
        }

        const buffer = fs.readFileSync(filePath);

        // Check magic bytes
        const magic = buffer.slice(0, 4).toString();
        if (magic !== 'PARQ') {
            throw new Error("Invalid file format");
        }

        // Read compressed data size
        const dataSize = buffer.readUInt32LE(4);
        const compressed = buffer.slice(8, 8 + dataSize);

        // Decompress and parse metadata only
        const jsonData = zlib.gunzipSync(compressed).toString();
        const data = JSON.parse(jsonData);

        return {
            schema: data.metadata.schema,
            fields: Object.keys(data.metadata.schema),
            metadata: data.metadata,
            filePath: filePath
        };
    }

    static async getMetadata(filePath) {
        const stats = fs.statSync(filePath);
        const schemaData = await this.getSchema(filePath);

        return {
            filePath: filePath,
            fileSize: stats.size,
            numRows: schemaData.metadata.numRows,
            numColumns: schemaData.metadata.numColumns,
            schema: schemaData.schema,
            created: schemaData.metadata.created,
            modified: stats.mtime,
            compression: schemaData.metadata.compression,
            version: schemaData.metadata.version
        };
    }
}

const actions = {
    // Helper function to safely extract properties from msg object
    getMsgProperty: (msg, path) => {
        if (!path || typeof path !== 'string') {
            return undefined;
        }
        
        const parts = path.split('.');
        let current = msg;
        
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return undefined;
            }
        }
        
        return current;
    },
    readFile: async (RED, node, msg) => {
        const filePath = msg.payload && msg.payload.filePath ? msg.payload.filePath : node.filePath;
        if (!filePath) {
            throw new Error("filePath must be provided in msg.payload or configured in node");
        }

        return await SimpleColumnarStore.readRecords(filePath);
    },

    writeFile: async (RED, node, msg) => {
        if (!msg.payload || !msg.payload.records || !Array.isArray(msg.payload.records)) {
            throw new Error("msg.payload must contain records array");
        }

        const filePath = msg.payload.filePath || node.filePath;
        if (!filePath) {
            throw new Error("filePath must be provided in msg.payload or configured in node");
        }

        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        return await SimpleColumnarStore.writeRecords(msg.payload.records, filePath);
    },

    appendFile: async (RED, node, msg) => {
        if (!msg.payload || !msg.payload.records || !Array.isArray(msg.payload.records)) {
            throw new Error("msg.payload must contain records array");
        }

        const filePath = msg.payload.filePath || node.filePath;
        if (!filePath) {
            throw new Error("filePath must be provided in msg.payload or configured in node");
        }

        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        return await SimpleColumnarStore.appendRecords(msg.payload.records, filePath);
    },

    queryFile: async (RED, node, msg) => {
        const filePath = msg.payload && msg.payload.filePath ? msg.payload.filePath : node.filePath;
        if (!filePath) {
            throw new Error("filePath must be provided in msg.payload or configured in node");
        }

        const options = {
            limit: msg.payload && msg.payload.limit,
            filter: msg.payload && msg.payload.filter
        };

        return await SimpleColumnarStore.queryRecords(filePath, options);
    },

    sqlQuery: async (RED, node, msg) => {
        const filePath = msg.payload && msg.payload.filePath ? msg.payload.filePath : node.filePath;
        if (!filePath) {
            throw new Error("filePath must be provided in msg.payload or configured in node");
        }
        const sql = (msg.payload && msg.payload.sql) || node.sqlQuery;
        if (!sql) {
            throw new Error("SQL query must be provided in msg.payload.sql or configured in node");
        }

        // Prepare context for parameter extraction
        const context = {
            msg,
            flow: (typeof node.context === 'function' && node.context().flow) ? node.context().flow : {},
            global: (typeof node.context === 'function' && node.context().global) ? node.context().global : {}
        };

        // Use cached tokens if SQL matches the cached query
        const useCachedTokens = !msg.payload?.sql && node.cachedSqlTokens && sql === node.cachedSql;

        return await SimpleColumnarStore.sqlQuery(filePath, sql, useCachedTokens ? node.cachedSqlTokens : null, context);
    },

    getSchema: async (RED, node, msg) => {
        const filePath = msg.payload && msg.payload.filePath ? msg.payload.filePath : node.filePath;
        if (!filePath) {
            throw new Error("filePath must be provided in msg.payload or configured in node");
        }

        return await SimpleColumnarStore.getSchema(filePath);
    },

    getMetadata: async (RED, node, msg) => {
        const filePath = msg.payload && msg.payload.filePath ? msg.payload.filePath : node.filePath;
        if (!filePath) {
            throw new Error("filePath must be provided in msg.payload or configured in node");
        }

        return await SimpleColumnarStore.getMetadata(filePath);
    }
};

module.exports = function (RED) {
    function ColumnarNode(config) {
        RED.nodes.createNode(this, config);
        const node = Object.assign(this, config, {
            filePath: config.filePath || ''
        });

        // Cache parsed SQL tokens for hardcoded queries to improve performance
        if (config.action === 'sqlQuery' && config.sqlQuery && config.sqlQuery.trim()) {
            try {
                node.cachedSqlTokens = SimpleColumnarStore._parseSql(config.sqlQuery);
                node.cachedSql = config.sqlQuery;
            } catch (error) {
                node.error("Failed to parse hardcoded SQL: " + error.message);
                node.status({ fill: "red", shape: "ring", text: "SQL parse error" });
                return;
            }
        }

        node.callFunction = actions[config.action];
        if (!node.callFunction) {
            node.error("Unknown action: " + config.action);
            node.status({ fill: "red", shape: "ring", text: "Unknown action: " + config.action });
            return;
        }

        node.status({ fill: "green", shape: "dot", text: "Ready" });

        node.on('input', async function (msg) {
            try {
                const result = await node.callFunction(RED, node, msg);
                const outputProperty = node.outputProperty || 'result';
                msg[outputProperty] = result;
                node.send(msg);
                node.status({ fill: "green", shape: "dot", text: "Success" });
            } catch (error) {
                node.error(error.message, msg);
                node.status({ fill: "red", shape: "ring", text: error.message.substring(0, 20) });
            }
        });
    }
    RED.nodes.registerType("columnar", ColumnarNode);
};

// export helper class for external use/testing
module.exports.SimpleColumnarStore = SimpleColumnarStore;
module.exports.actions = actions;
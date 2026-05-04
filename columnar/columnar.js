const logger = new (require("node-red-contrib-logger"))("Columnar Store");
logger.sendInfo("Copyright 2025 Jaroslav Peter Prib");

// Implementation based on Apache Parquet specification concepts
// Uses columnar storage, compression, and metadata principles from the spec
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Simple columnar storage implementation inspired by Apache Parquet specification
class SimpleColumnarStore {
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
        const schema = { ...existingSchema };
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
                    allRecords.forEach((r, i) => arr[i] = r[col] == null ? NaN : r[col]);
                    buf = Buffer.from(arr.buffer);
                    break;
                }
                case 'boolean': {
                    const arr = Buffer.alloc(allRecords.length);
                    allRecords.forEach((r, i) => arr[i] = r[col] ? 1 : 0);
                    buf = arr;
                    break;
                }
                case 'string': {
                    const parts = [];
                    allRecords.forEach(r => {
                        const s = r[col] == null ? '' : String(r[col]);
                        const sb = Buffer.from(s, 'utf8');
                        const len = Buffer.alloc(4);
                        len.writeUInt32LE(sb.length, 0);
                        parts.push(len, sb);
                    });
                    buf = Buffer.concat(parts);
                    break;
                }
                default: {
                    const json = allRecords.map(r => r[col]);
                    buf = Buffer.from(JSON.stringify(json), 'utf8');
                }
            }
            const comp = zlib.gzipSync(buf);
            columnMeta.push({ name: col, type: type, length: comp.length });
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

        const metaBuf = Buffer.from(JSON.stringify(metadata), 'utf8');
        const metaSize = Buffer.alloc(4);
        metaSize.writeUInt32LE(metaBuf.length, 0);

        const magic = Buffer.from('PARQ');

        const pieces = [magic, metaSize, metaBuf];
        for (const comp of columnBuffers) {
            const sizeBuf = Buffer.alloc(4);
            sizeBuf.writeUInt32LE(comp.length, 0);
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
        if (magic !== 'PARQ') throw new Error('Invalid format');

        let offset = 4;
        const metaSize = buffer.readUInt32LE(offset); offset += 4;
        const metaBuf = buffer.slice(offset, offset + metaSize); offset += metaSize;
        const metadata = JSON.parse(metaBuf.toString('utf8'));

        const records = [];
        const numRows = metadata.numRows;

        // read each column sequentially according to metadata
        const columns = {};
        for (const colMeta of metadata.columns) {
            const colSize = buffer.readUInt32LE(offset); offset += 4;
            const comp = buffer.slice(offset, offset + colSize); offset += colSize;
            const raw = zlib.gunzipSync(comp);
            // decode according to type
            let arr;
            switch (colMeta.type) {
                case 'number': arr = new Float64Array(raw.buffer, raw.byteOffset, numRows); break;
                case 'boolean': arr = Uint8Array.from(raw); break;
                case 'string': {
                    const vals = [];
                    let p = 0;
                    for (let i = 0; i < numRows; i++) {
                        const len = raw.readUInt32LE(p); p += 4;
                        vals.push(raw.slice(p, p + len).toString('utf8')); p += len;
                    }
                    arr = vals;
                    break;
                }
                default: arr = JSON.parse(raw.toString('utf8'));
            }
            columns[colMeta.name] = arr;
        }

        for (let i = 0; i < numRows; i++) {
            const rec = {};
            for (const colName of Object.keys(columns)) {
                const colArr = columns[colName];
                rec[colName] = colArr[i];
            }
            records.push(rec);
        }

        return { records, count: records.length, schema: metadata.schema, metadata, filePath };
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
                        } catch (e) { }
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

    static async sqlQuery(filePath, sql, parsedTokens = null, parameters = {}) {
        const loadEngine = await import('../lib/sqlEngine.js');
        const parsed = parsedTokens || loadEngine.parseSQL(sql);

        return await loadEngine.executeQuery(parsed, async (tableName) => {
            // If tableName looks like a file path or matches our current file
            const targetPath = (tableName === '?' || tableName.toLowerCase() === 'source') ? filePath : tableName;
            try {
                const data = await this.readRecords(targetPath);
                return data.records;
            } catch (e) {
                // Fallback to store registry for cross-store joins
                const store = loadEngine.getStore(tableName);
                return store ? store.records() : null;
            }
        }, parameters);
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

        // Cache parsed SQL tokens for hardcoded queries
        (async () => {
            if (config.action === 'sqlQuery' && config.sqlQuery && config.sqlQuery.trim()) {
                try {
                    const engine = await import('../lib/sqlEngine.js');
                    node.cachedSqlTokens = engine.parseSQL(config.sqlQuery);
                    node.cachedSql = config.sqlQuery;
                } catch (error) {
                    node.error("Failed to parse hardcoded SQL: " + error.message);
                    node.status({ fill: "red", shape: "ring", text: "SQL parse error" });
                }
            }
        })();

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
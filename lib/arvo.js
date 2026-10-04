const avro = require('avsc');
const { parse: csvParse } = require('csv-parse');
const { createReadStream, createWriteStream } = require('fs');
const { Readable } = require('stream');
const { parseSQL, executeQuery, registerStore, getStore, OPERATORS, prefixRecord, prepare } = require('./sqlEngine.js');

// ---------------------------------------------------------------------------
// AvroStore
// ---------------------------------------------------------------------------
class AvroStore {

  // -------------------------------------------------------------------------
  // Construction
  // -------------------------------------------------------------------------

  /**
   * @param {object} schema  - Avro schema object
   * @param {string} name    - Table name used in SQL FROM / JOIN clauses
   */
  constructor(schema, name) {
    if (!name) throw new Error('AvroStore requires a name (used as SQL table name)');
    this.type   = avro.Type.forSchema(schema);
    this.name   = name.toLowerCase();
    this.buffer = [];
    registerStore(this.name, this);
  }

  // -------------------------------------------------------------------------
  // Write
  // -------------------------------------------------------------------------

  /** Add a single record — validates against schema before storing. */
  add(record) {
    this.type.isValid(record, {
      errorHook: (path, val) => {
        throw new Error(`Invalid field "${path.join('.')}": ${JSON.stringify(val)}`);
      },
    });
    this.buffer.push(this.type.toBuffer(record));
    return this;
  }

  /** Add multiple records. */
  addMany(records) {
    records.forEach(r => this.add(r));
    return this;
  }

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  /** Decode all stored Avro buffers back to plain objects. */
  records() {
    return this.buffer.map(buf => this.type.fromBuffer(buf));
  }

  get size() {
    return this.buffer.length;
  }

  // -------------------------------------------------------------------------
  // Iteration helpers
  // -------------------------------------------------------------------------

  forEach(fn)           { this.records().forEach((r, i) => fn(r, i)); return this; }
  map(fn)               { return this.records().map(fn); }
  filter(fn)            { return this.records().filter(fn); }
  find(fn)              { return this.records().find(fn); }
  reduce(fn, initial)   { return this.records().reduce(fn, initial); }
  some(fn)              { return this.records().some(fn); }
  every(fn)             { return this.records().every(fn); }

  // -------------------------------------------------------------------------
  // JSON Query API  (programmatic, no SQL string required)
  // -------------------------------------------------------------------------

  /**
   * query({ where, logic, orderBy, limit })
   *
   * where:   [{ field, op, value }]   op matches OPERATORS keys above
   * logic:   'AND' | 'OR'            default 'AND'
   * orderBy: { field, direction }     direction 'asc' | 'desc'
   * limit:   number
   */
  query({ where = [], logic = 'AND', orderBy = null, limit = null } = {}) {
    let rows = this.records();

    if (where.length) {
      rows = rows.filter(record => {
        const checks = where.map(rule => {
          const fieldVal = record[rule.field];
          if (fieldVal === undefined) return false;
          const fieldDef = this.type.fields.find(f => f.name === rule.field);
          const typeName = fieldDef?.type?.typeName ?? 'string';
          const ops      = OPERATORS[typeName] ?? OPERATORS.string;
          const opFn     = ops[rule.op];
          if (!opFn) throw new Error(`Unknown operator "${rule.op}" for type "${typeName}"`);
          return opFn(fieldVal, rule.value);
        });
        return logic === 'OR' ? checks.some(Boolean) : checks.every(Boolean);
      });
    }

    if (orderBy) {
      const { field, direction = 'asc' } = orderBy;
      rows.sort((a, b) => {
        if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
        if (a[field] > b[field]) return direction === 'asc' ?  1 : -1;
        return 0;
      });
    }

    if (limit !== null) rows = rows.slice(0, limit);
    return rows;
  }

  // -------------------------------------------------------------------------
  // JOIN API  (programmatic)
  // -------------------------------------------------------------------------

  /**
   * join(otherStore, { on, type, prefix })
   *
   * on:     'fieldName'           same field name on both sides
   *         'leftField = rightField'  different names
   * type:   'INNER' | 'LEFT' | 'RIGHT' | 'FULL'   default 'INNER'
   * prefix: true (default) — columns namespaced as storeName.field
   *
   * Returns a plain array — chain .filter() / .map() etc. on it.
   */
  join(otherStore, { on, type = 'INNER', prefix = true } = {}) {
    const [leftKey, rightKey] = on.includes('=')
      ? on.split('=').map(s => s.trim())
      : [on, on];

    const leftRows  = this.records();
    const rightRows = otherStore.records();
    const lName     = this.name;
    const rName     = otherStore.name;

    const pLeft  = row => prefix ? prefixRecord(row, lName) : row;
    const pRight = row => prefix ? prefixRecord(row, rName) : row;

    const nullRight = Object.fromEntries(
      Object.keys(rightRows[0] || {}).map(k => [`${rName}.${k}`, null])
    );
    const nullLeft = Object.fromEntries(
      Object.keys(leftRows[0]  || {}).map(k => [`${lName}.${k}`, null])
    );

    // Hash-index right side for O(n+m) performance
    const rightIdx = new Map();
    rightRows.forEach(r => {
      const k = String(r[rightKey] ?? '');
      if (!rightIdx.has(k)) rightIdx.set(k, []);
      rightIdx.get(k).push(pRight(r));
    });

    const result = [];

    if (type === 'INNER' || type === 'LEFT') {
      for (const l of leftRows) {
        const pl      = pLeft(l);
        const matches = rightIdx.get(String(l[leftKey] ?? ''));
        if (matches) {
          matches.forEach(pr => result.push({ ...pl, ...pr }));
        } else if (type === 'LEFT') {
          result.push({ ...pl, ...nullRight });
        }
      }
    }

    if (type === 'RIGHT') {
      const leftIdx = new Map();
      leftRows.forEach(l => {
        const k = String(l[leftKey] ?? '');
        if (!leftIdx.has(k)) leftIdx.set(k, []);
        leftIdx.get(k).push(pLeft(l));
      });
      for (const pr of [...rightIdx.values()].flat()) {
        const k       = String(pr[`${rName}.${rightKey}`] ?? pr[rightKey] ?? '');
        const matches = leftIdx.get(k);
        if (matches) {
          matches.forEach(pl => result.push({ ...pl, ...pr }));
        } else {
          result.push({ ...nullLeft, ...pr });
        }
      }
    }

    if (type === 'FULL') {
      const matched = new Set();
      for (const l of leftRows) {
        const pl      = pLeft(l);
        const matches = rightIdx.get(String(l[leftKey] ?? ''));
        if (matches) {
          matches.forEach(pr => { matched.add(pr); result.push({ ...pl, ...pr }); });
        } else {
          result.push({ ...pl, ...nullRight });
        }
      }
      [...rightIdx.values()].flat()
        .filter(pr => !matched.has(pr))
        .forEach(pr => result.push({ ...nullLeft, ...pr }));
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // SQL API
  // -------------------------------------------------------------------------

  /**
   * sql(query)
   *
   * Supported:
   *   SELECT *  |  col  |  alias.col  |  AGG(col) AS alias
   *   FROM tableName [alias]
   *   [INNER|LEFT|RIGHT|FULL [OUTER]] JOIN tableName [alias] ON a.x = b.y
   *   WHERE ... (AND/OR, BETWEEN, IN, LIKE, IS NULL, comparison operators)
   *   GROUP BY ...
   *   HAVING ...
   */
  async sql(query, parameters = {}) {
    const parsed = parseSQL(query);
    return await executeQuery(parsed, (name) => {
      const store = getStore(name);
      return store ? store.records() : null;
    }, parameters);
  }

  /**
   * Prepare a SQL query for repeated execution with different parameters
   * Returns a PreparedStatement that can be executed multiple times efficiently
   * @param {string} query - SQL query string with optional :msg/:flow/:global parameter placeholders
   * @returns {PreparedStatement} Object with exec(parameters) method
   */
  prepareSql(query) {
    return prepare(query, (name) => {
      const store = getStore(name);
      return store ? store.records() : null;
    });
  }

  /**
   * Execute a prepared SQL statement with parameters
   * Shorthand for prepareSql(query).exec(parameters)
   * @param {string} query - SQL query string
   * @param {object} parameters - Parameter object with msg, flow, global properties
   * @returns {Promise<Array>} Query results
   */
  async execSql(query, parameters = {}) {
    const stmt = this.prepareSql(query);
    return await stmt.exec(parameters);
  }

  // -------------------------------------------------------------------------
  // Serialization
  // -------------------------------------------------------------------------

  /** Serialize entire store to a single Buffer (save to disk / send over network). */
  serialize() {
    return new Promise((resolve, reject) => {
      const chunks  = [];
      const encoder = new avro.streams.BlockEncoder(this.type);
      encoder.on('data',  chunk => chunks.push(chunk));
      encoder.on('end',   ()    => resolve(Buffer.concat(chunks)));
      encoder.on('error', reject);
      this.records().forEach(r => encoder.write(r));
      encoder.end();
    });
  }

  /** Rehydrate a store from a serialized Buffer. */
  static fromBuffer(schema, name, buffer) {
    const store   = new AvroStore(schema, name);
    const decoder = new avro.streams.BlockDecoder();
    decoder.on('data', record => store.buffer.push(store.type.toBuffer(record)));
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(decoder);
    return store;
  }

  /** Load from a CSV file — all values arrive as strings, cast as needed. */
  static async fromCSV(schema, name, csvPath) {
    const store   = new AvroStore(schema, name);
    const records = [];
    await new Promise((resolve, reject) => {
      createReadStream(csvPath)
        .pipe(csvParse({ columns: true, trim: true }))
        .on('data',  row => records.push(row))
        .on('end',   resolve)
        .on('error', reject);
    });
    store.addMany(records);
    return store;
  }

  /**
   * Load from a CSV file and automatically generate schema from headers.
   * Infers types from sample values (string, number, boolean)
   * @param {string} name - Table name
   * @param {string} csvPath - Path to CSV file
   * @returns {Promise<AvroStore>} Store with auto-generated schema
   */
  static async fromCSVWithSchema(name, csvPath) {
    const records = [];
    await new Promise((resolve, reject) => {
      createReadStream(csvPath)
        .pipe(csvParse({ columns: true, trim: true }))
        .on('data',  row => records.push(row))
        .on('end',   resolve)
        .on('error', reject);
    });

    if (records.length === 0) {
      throw new Error(`CSV file ${csvPath} is empty`);
    }

    // Infer schema from headers and first few rows
    const headers = Object.keys(records[0]);
    const inferredFields = headers.map(header => {
      const type = AvroStore.inferType(records, header);
      return { name: header, type };
    });

    const schema = {
      type: 'record',
      name: name,
      fields: inferredFields
    };

    // Convert CSV strings to inferred types
    const convertedRecords = records.map(record => {
      const converted = {};
      inferredFields.forEach(field => {
        const value = record[field.name];
        converted[field.name] = AvroStore.convertValue(value, field.type);
      });
      return converted;
    });

    const store = new AvroStore(schema, name);
    store.addMany(convertedRecords);
    return store;
  }

  /**
   * Infer Avro schema from a record or array of records
   * @static
   * @param {object|Array} payload - Single record or array of records
   * @param {string} tableName - Name for the generated schema
   * @returns {object} Generated Avro schema
   */
  static inferSchemaFromPayload(payload, tableName) {
    let sampleRecord;
    
    // If payload is an array, use the first record
    if (Array.isArray(payload)) {
      if (payload.length === 0) throw new Error('Cannot infer schema from empty array');
      sampleRecord = payload[0];
    } else {
      sampleRecord = payload;
    }
    
    if (typeof sampleRecord !== 'object' || sampleRecord === null) {
      throw new Error('Cannot infer schema from non-object values');
    }
    
    // Infer fields from record properties
    const fields = Object.entries(sampleRecord).map(([key, value]) => {
      const type = AvroStore.inferTypeFromValue(value);
      return { name: key, type };
    });
    
    if (fields.length === 0) {
      throw new Error('Cannot infer schema from empty object');
    }
    
    return {
      type: 'record',
      name: tableName,
      fields: fields
    };
  }

  /**
   * Infer Avro type from a single value
   * @static
   * @private
   */
  static inferTypeFromValue(value, fieldName = 'record') {
    if (value === null || value === undefined) return 'string';
    
    const type = typeof value;
    
    if (type === 'boolean') return 'boolean';
    if (type === 'number') {
      return Number.isInteger(value) ? 'long' : 'double';
    }
    if (type === 'string') return 'string';
    if (Array.isArray(value)) {
      // Infer array element type from first element
      if (value.length === 0) return { type: 'array', items: 'string' };
      const itemType = AvroStore.inferTypeFromValue(value[0], `${fieldName}_item`);
      return { type: 'array', items: itemType };
    }
    if (type === 'object') {
      // Nested record
      const fields = Object.entries(value).map(([k, v]) => ({
        name: k,
        type: AvroStore.inferTypeFromValue(v, k)
      }));
      return { type: 'record', name: `${fieldName}_type`, fields };
    }
    
    return 'string'; // Default fallback
  }

  /**
   * Convert a string value to the specified type
   * @private
   */
  static convertValue(value, type) {
    if (value === null || value === undefined || value === '') return null;

    switch (type) {
      case 'int':
      case 'long':
        return parseInt(value, 10);
      case 'float':
      case 'double':
        return parseFloat(value);
      case 'boolean':
        return value === 'true' || value === '1' || value === 'yes';
      case 'string':
      default:
        return String(value);
    }
  }

  /**
   * Infer Avro type from column data
   * Samples multiple values to determine the best type
   * @private
   */
  static inferType(records, fieldName) {
    const samples = records
      .slice(0, Math.min(100, records.length))
      .map(r => r[fieldName])
      .filter(v => v !== null && v !== undefined && v !== '');

    if (samples.length === 0) return 'string'; // Default to string for empty columns

    // Check if all samples are numbers
    if (samples.every(v => !isNaN(v) && v.toString().trim() !== '')) {
      const allIntegers = samples.every(v => Number.isInteger(Number(v)));
      return allIntegers ? 'long' : 'double';
    }

    // Check if all samples are booleans
    if (samples.every(v => v === 'true' || v === 'false' || v === '1' || v === '0' || v === 'yes' || v === 'no')) {
      return 'boolean';
    }

    // Default to string
    return 'string';
  }

}

module.exports = { AvroStore };
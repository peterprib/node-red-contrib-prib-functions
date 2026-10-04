import { ValidityBitmap } from './ValidityBitmap.js';

export const Encoding = Object.freeze({
  PLAIN:      'plain',
  DICTIONARY: 'dictionary',
  RLE:        'rle',
  BITPACKED:  'bitpacked',
});

export class Column {
  constructor(name, type, encoding, data, meta = {}) {
    this.name      = name;
    this.type      = type;
    this.encoding  = encoding;
    this._data     = data;
    this._meta     = meta;
    this._validity = null;
  }

  get length() {
    switch (this.encoding) {
      case Encoding.RLE:       return this._meta.length;
      case Encoding.BITPACKED: return this._meta.length;
      default:                 return this._data.length;
    }
  }

  // ── Random access ─────────────────────────────────────────────────────────

  get(i) {
    if (this._validity && !this._validity.isSet(i)) return null;
    switch (this.encoding) {
      case Encoding.PLAIN:      return this._data[i];
      case Encoding.DICTIONARY: return this._meta.dict[this._data[i]];
      case Encoding.RLE:        return this._rleGet(i);
      case Encoding.BITPACKED:  return this._bitGet(i);
    }
  }

  isNull(i) {
    return this._validity ? !this._validity.isSet(i) : false;
  }

  // ── Bulk access ───────────────────────────────────────────────────────────

  toArray() {
    return Array.from({ length: this.length }, (_, i) => this.get(i));
  }

  gather(indices) {
    const vals = indices.map(i => this.get(i));
    return Column.create(this.name, this.type, vals);
  }

  // ── Proxy — enables col[i] syntax in executor tight loops ─────────────────

  static asProxy(col) {
    return new Proxy(col, {
      get(target, prop) {
        if (typeof prop === 'string' && prop !== '' && !isNaN(prop))
          return target.get(Number(prop));
        return Reflect.get(target, prop);
      }
    });
  }

  // ── Stats — for query optimisation hints ──────────────────────────────────

  stats() {
    const s = {
      encoding:  this.encoding,
      length:    this.length,
      nullCount: this._validity ? this._validity.nullCount() : 0,
    };
    if (this.encoding === Encoding.DICTIONARY) {
      s.cardinality      = this._meta.dict.length;
      s.compressionRatio = (this.length / this._meta.dict.length).toFixed(1);
    }
    if (this.encoding === Encoding.RLE) {
      s.runCount         = this._meta.runLengths.length;
      s.compressionRatio = (this.length / this._meta.runLengths.length).toFixed(1);
    }
    if (this.encoding === Encoding.BITPACKED) {
      s.packedWords  = this._data.length;
      s.bitsPerValue = (this._data.length * 32 / this.length).toFixed(2);
    }
    return s;
  }

  // ── Main factory — picks encoding automatically ────────────────────────────

  static create(name, type, values) {
    if (!values || values.length === 0) {
      const data = type === 'int32'   ? new Int32Array(0)
                 : type === 'float64' ? new Float64Array(0)
                 : [];
      return new Column(name, type, Encoding.PLAIN, data);
    }

    const hasNulls = values.some(v => v == null);

    if (type === 'boolean') return Column._createBitpacked(name, values, hasNulls);
    if (type === 'string')  return Column._createDictionary(name, values, hasNulls);
    if (Column._rleWorthIt(values)) return Column._createRLE(name, type, values, hasNulls);

    const data = type === 'int32'
      ? new Int32Array(values.map(v => v ?? 0))
      : new Float64Array(values.map(v => v ?? 0));
    const c = new Column(name, type, Encoding.PLAIN, data);
    if (hasNulls) c._validity = ValidityBitmap.fromValues(values);
    return c;
  }

  // ── RLE ───────────────────────────────────────────────────────────────────

  static _rleWorthIt(values) {
    if (values.length < 64) return false;
    let runs = 1;
    for (let i = 1; i < values.length; i++) if (values[i] !== values[i-1]) runs++;
    return runs < values.length / 2;
  }

  static _createRLE(name, type, values, hasNulls) {
    const runValues  = [];
    const runLengths = [];
    let count = 1;
    for (let i = 1; i <= values.length; i++) {
      if (i < values.length && values[i] === values[i-1]) {
        count++;
      } else {
        runValues.push(values[i-1]);
        runLengths.push(count);
        count = 1;
      }
    }
    const data = type === 'int32'
      ? new Int32Array(runValues.map(v => v ?? 0))
      : new Float64Array(runValues.map(v => v ?? 0));
    const c = new Column(name, type, Encoding.RLE, data, {
      runLengths:  new Int32Array(runLengths),
      length:      values.length,
      prefixSums:  Column._buildPrefixSums(runLengths),
    });
    if (hasNulls) c._validity = ValidityBitmap.fromValues(values);
    return c;
  }

  _rleGet(i) {
    const sums = this._meta.prefixSums;
    let lo = 0, hi = sums.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sums[mid] <= i) lo = mid + 1; else hi = mid;
    }
    return this._data[lo];
  }

  static _buildPrefixSums(runLengths) {
    const sums = new Int32Array(runLengths.length);
    let acc = 0;
    for (let i = 0; i < runLengths.length; i++) {
      acc += runLengths[i];
      sums[i] = acc;
    }
    return sums;
  }

  // ── Dictionary encoding ───────────────────────────────────────────────────

  static _createDictionary(name, values, hasNulls) {
    const dict    = [];
    const dictMap = new Map();
    const indices = new Int32Array(values.length);

    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v == null) { indices[i] = -1; continue; }
      if (!dictMap.has(v)) { dictMap.set(v, dict.length); dict.push(v); }
      indices[i] = dictMap.get(v);
    }

    // Fall back to plain if cardinality is too high
    if (dict.length > values.length * 0.8) {
      const c = new Column(name, 'string', Encoding.PLAIN, Array.from(values));
      if (hasNulls) c._validity = ValidityBitmap.fromValues(values);
      return c;
    }

    const c = new Column(name, 'string', Encoding.DICTIONARY, indices, { dict });
    if (hasNulls) c._validity = ValidityBitmap.fromValues(values);
    return c;
  }

  // ── Bit packing ───────────────────────────────────────────────────────────

  static _createBitpacked(name, values, hasNulls) {
    const words = new Uint32Array(Math.ceil(values.length / 32));
    for (let i = 0; i < values.length; i++)
      if (values[i]) words[i >> 5] |= (1 << (i & 31));
    const c = new Column(name, 'boolean', Encoding.BITPACKED, words, { length: values.length });
    if (hasNulls) c._validity = ValidityBitmap.fromValues(values);
    return c;
  }

  _bitGet(i) {
    return !!(this._data[i >> 5] & (1 << (i & 31)));
  }
}
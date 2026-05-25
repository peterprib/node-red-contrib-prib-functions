export class ValidityBitmap {
  constructor(length) {
    this._length = length || 0;
    this._words  = new Uint32Array(Math.ceil(this._length / 32)).fill(0xFFFFFFFF);
    // Mask off trailing bits in the last word
    const rem = this._length % 32;
    if (rem && this._words.length > 0)
      this._words[this._words.length - 1] = (1 << rem) - 1;
  }

  isSet(i)  { return !!(this._words[i >> 5] & (1 << (i & 31))); }
  clear(i)  { this._words[i >> 5] &= ~(1 << (i & 31)); }
  set(i)    { this._words[i >> 5] |=  (1 << (i & 31)); }

  nullCount() {
    let n = 0;
    for (const w of this._words) {
      let v = w;
      v = v - ((v >> 1) & 0x55555555);
      v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
      n += (((v + (v >> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
    }
    return this._length - n;
  }

  and(other) {
    const result = new ValidityBitmap(this._length);
    for (let i = 0; i < this._words.length; i++)
      result._words[i] = this._words[i] & other._words[i];
    return result;
  }

  gather(indices) {
    const vb = new ValidityBitmap(indices.length);
    for (let i = 0; i < indices.length; i++)
      if (!this.isSet(indices[i])) vb.clear(i);
    return vb;
  }

  static fromValues(values) {
    const vb = new ValidityBitmap(values.length);
    for (let i = 0; i < values.length; i++)
      if (values[i] == null) vb.clear(i);
    return vb;
  }
}
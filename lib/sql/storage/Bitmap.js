export class Bitmap {
  constructor(length, fill = 1) {
    this.length = length || 0;
    this.bits   = new Uint8Array(this.length).fill(fill);
  }

  and(other)  { for (let i = 0; i < this.length; i++) this.bits[i] &= other.bits[i]; return this; }
  or(other)   { for (let i = 0; i < this.length; i++) this.bits[i] |= other.bits[i]; return this; }
  not()       { for (let i = 0; i < this.length; i++) this.bits[i] ^= 1;             return this; }
  count()     { return this.bits.reduce((n, b) => n + b, 0); }

  // Generator — use toIndices() for safety in most cases
  *indices() {
    for (let i = 0; i < this.length; i++) if (this.bits[i]) yield i;
  }

  // Returns a plain Array — safe to iterate, spread, pass to Array.from
  toIndices() {
    const out = [];
    for (let i = 0; i < this.length; i++) if (this.bits[i]) out.push(i);
    return out;
  }
}
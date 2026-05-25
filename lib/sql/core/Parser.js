import { T } from './Token.js';

// Manages the token stream only — no grammar knowledge here
export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos    = 0;
  }

  peek()        { return this.tokens[this.pos]; }
  peek2()       { return this.tokens[this.pos + 1]; }

  consume(type) {
    const tok = this.tokens[this.pos];
    if (type && tok.t !== type)
      throw new Error(`Expected ${type} at position ${this.pos}, got ${tok.t} '${tok.v}'`);
    this.pos++;
    return tok;
  }

  match(...types) { return types.includes(this.peek().t); }
  matchAny(set)   { return set.has(this.peek().t); }
  atEnd()         { return this.peek().t === T.EOF; }

  // Convenience: consume if matched, return whether consumed
  eat(...types) {
    if (this.match(...types)) { this.consume(); return true; }
    return false;
  }
}
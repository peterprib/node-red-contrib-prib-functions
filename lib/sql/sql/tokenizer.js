import { T, SQL_KEYWORDS } from '../core/Token.js';

export function tokenize(src) {
  const toks = [];
  let i = 0;

  while (i < src.length) {
    // Whitespace
    if (/\s/.test(src[i])) { i++; continue; }

    // -- line comment
    if (src[i] === '-' && src[i+1] === '-') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }

    // /* block comment */
    if (src[i] === '/' && src[i+1] === '*') {
      i += 2;
      while (i < src.length && !(src[i-1] === '*' && src[i] === '/')) i++;
      i++;
      continue;
    }

    // String literal
    if (src[i] === "'") {
      let s = ''; i++;
      while (i < src.length && src[i] !== "'") {
        if (src[i] === '\\') i++;
        s += src[i++];
      }
      i++;
      toks.push({ t: T.STR, v: s });
      continue;
    }

    // Number
    if (/\d/.test(src[i])) {
      let s = '';
      while (i < src.length && /[\d.]/.test(src[i])) s += src[i++];
      toks.push({ t: T.NUM, v: Number(s) });
      continue;
    }

    // Identifier or keyword
    if (/[a-zA-Z_]/.test(src[i])) {
      let s = '';
      while (i < src.length && /[\w]/.test(src[i])) s += src[i++];
      const up = s.toUpperCase();
      toks.push({ t: SQL_KEYWORDS.has(up) ? up : T.IDENT, v: s });
      continue;
    }

    // Two-char operators
    const two = src.slice(i, i + 2);
    if (['<>', '<=', '>=', '!='].includes(two)) {
      toks.push({ t: two, v: two });
      i += 2;
      continue;
    }

    // Single-char operators
    const map = {
      '=': T.EQ,  '<': T.LT,     '>': T.GT,
      '+': T.PLUS,'-': T.MINUS,  '*': T.STAR,  '/': T.SLASH,
      '(': T.LPAREN, ')': T.RPAREN,
      ',': T.COMMA,  ';': T.SEMI, '.': T.DOT,
    };
    if (map[src[i]]) {
      toks.push({ t: map[src[i]], v: src[i] });
      i++;
    } else {
      i++; // skip unknown
    }
  }

  toks.push({ t: T.EOF, v: '' });
  return toks;
}
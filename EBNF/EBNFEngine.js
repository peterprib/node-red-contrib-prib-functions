import {
  Diagram, Sequence, Choice, Optional, ZeroOrMore, Terminal, NonTerminal, Difference
} from './railroadDiagram.js';

// ─── 1. Token type constants ────────────────────────────────────────────────

const T = {
  IDENT:'IDENT', STR:'STR', PARAMETER:'PARAMETER', EQ:'=', SEMI:';', DOT:'.', BAR:'|',
  COMMA:',', LBRACE:'{', RBRACE:'}', LBRAK:'[', RBRAK:']',
  LPAREN:'(', RPAREN:')', STAR:'*', PLUS:'+', QUEST:'?', MINUS:'-', EOF:'EOF'
};


// ─── 2. Base node ────────────────────────────────────────────────────────────

class ASTNode {
  constructor(type, children = [], value = null) {
    this.type     = type;
    this.children = children;
    this.value    = value;
  }
  toString() {
    return this.type + (this.value != null ? `(${this.value})` : '');
  }
}


// ─── 3. Leaf nodes (no parse-time dependencies on siblings) ─────────────────

class TerminalNode extends ASTNode {
  constructor(v) { super('Terminal', [], v); }
  static parse(parser) {
    return new TerminalNode(parser.consume(T.STR).v);
  }
}

class IdentifierNode extends ASTNode {
  constructor(v) { super('Identifier', [], v); }
  static parse(parser) {
    return new IdentifierNode(parser.consume(T.IDENT).v);
  }
}

class ParameterNode extends ASTNode {
  constructor(v) { super('Parameter', [], v); }
  static parse(parser) {
    // The value includes the leading colon, e.g., ":minAge"
    return new ParameterNode(parser.consume(T.PARAMETER).v);
  }
}


// ─── 4. Wrapper nodes — each references only the Parser, not sibling nodes ──
//        The parser methods they call (parseAlternation etc.) are resolved
//        at call time, so forward references are fine.

class RepetitionNode extends ASTNode {
  constructor(expr) { super('Repetition', [expr]); }
  static parse(parser) {
    parser.consume(T.LBRACE);
    const expr = parser.parseAlternation();
    parser.consume(T.RBRACE);
    return new RepetitionNode(expr);
  }
}

class OptionNode extends ASTNode {
  constructor(expr) { super('Option', [expr]); }
  static parse(parser) {
    parser.consume(T.LBRAK);
    const expr = parser.parseAlternation();
    parser.consume(T.RBRAK);
    return new OptionNode(expr);
  }
}

class GroupNode extends ASTNode {
  constructor(expr) { super('Group', [expr]); }
  static parse(parser) {
    parser.consume(T.LPAREN);
    const expr = parser.parseAlternation();
    parser.consume(T.RPAREN);
    return new GroupNode(expr);
  }
}


// ─── 5. Composite nodes — reference each other, but only at call time ────────

// term = factor , [ "-" , exception ] ;  (ISO 14977: binds tighter than ",")
class DifferenceNode extends ASTNode {
  constructor(base, except) { super('Difference', [base, except]); }
  static parse(parser) {
    const base = parser.parseFactor();
    if (parser.match(T.MINUS)) {
      parser.consume();
      const except = parser.parseFactor();
      return new DifferenceNode(base, except);
    }
    return base;
  }
}

class ConcatenationNode extends ASTNode {
  constructor(terms) { super('Concatenation', terms); }
  static parse(parser) {
    const terms = [parser.parseDifference()];
    while (parser.match(T.COMMA)) {
      parser.consume();
      terms.push(parser.parseDifference());
    }
    return terms.length === 1 ? terms[0] : new ConcatenationNode(terms);
  }
}

class AlternationNode extends ASTNode {
  constructor(alts) { super('Alternation', alts); }
  static parse(parser) {
    const alts = [ConcatenationNode.parse(parser)];
    while (parser.match(T.BAR)) {
      parser.consume();
      alts.push(ConcatenationNode.parse(parser));
    }
    return alts.length === 1 ? alts[0] : new AlternationNode(alts);
  }
}


// ─── 6. Top-level nodes ───────────────────────────────────────────────────────

class RuleNode extends ASTNode {
  constructor(name, rhs) { super('Rule', [rhs], name); }
  static parse(parser) {
    const name = parser.consume(T.IDENT).v;
    parser.consume(T.EQ);
    const rhs = AlternationNode.parse(parser);
    if (parser.match(T.SEMI, T.DOT)) parser.consume();
    return new RuleNode(name, rhs);
  }
}

class GrammarNode extends ASTNode {
  constructor(rules) { super('Grammar', rules); }
  static parse(parser) {
    const rules = [];
    while (!parser.match(T.EOF)) rules.push(RuleNode.parse(parser));
    return new GrammarNode(rules);
  }
}


// ─── 7. Tokenizer ─────────────────────────────────────────────────────────────

function tokenize(src) {
  const toks = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '(' && src[i+1] === '*') {
      let j = i + 2;
      while (j < src.length && !(src[j-1] === '*' && src[j] === ')')) j++;
      i = j + 1; continue;
    }
    if (c === '"' || c === "'") {
      const q = c; let s = ''; i++;
      while (i < src.length && src[i] !== q) s += src[i++];
      i++; toks.push({ t: T.STR, v: s }); continue;
    }
    if (c === ':') {
      let s = c; i++;
      // Parameters can contain alphanumeric, underscore, dot, and dollar sign
      while (i < src.length && /[a-zA-Z0-9_$.]/.test(src[i])) {
        s += src[i];
        i++;
      }
      toks.push({ t: T.PARAMETER, v: s }); continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      // A hyphen directly between word characters is part of the name
      // (primary-expression); a spaced hyphen (a - b) is the exception operator.
      let s = '';
      while (i < src.length && src[i] !== '\n'
        && (/[\w\s]/.test(src[i]) || (src[i] === '-' && /\w/.test(src[i-1]) && /\w/.test(src[i+1] ?? '')))) {
        if (/[\w-]/.test(src[i])) s += src[i]; else if (s) s += ' ';
        i++;
      }
      toks.push({ t: T.IDENT, v: s.trim() }); continue;
    }
    const map = {
      '=':T.EQ, ';':T.SEMI, '.':T.DOT, '|':T.BAR, ',':T.COMMA,
      '{':T.LBRACE, '}':T.RBRACE, '[':T.LBRAK, ']':T.RBRAK,
      '(':T.LPAREN, ')':T.RPAREN, '*':T.STAR, '+':T.PLUS, '?':T.QUEST, '-':T.MINUS
    };
    if (map[c]) { toks.push({ t: map[c], v: c }); i++; } else i++;
  }
  toks.push({ t: T.EOF, v: '' });
  return toks;
}

// ─── 8. Parser — token stream manager + dispatch ─────────────────────────────
//        parseTerm lives here because it's a choice between node types,
//        not the responsibility of any single node.

class Parser {
  constructor(src) {
    this.toks = tokenize(src);
    this.pos  = 0;
  }

  peek()       { return this.toks[this.pos]; }
  consume(t)   {
    const tok = this.toks[this.pos];
    if (t && tok.t !== t) throw new Error(`Expected ${t}, got ${tok.t} '${tok.v}'`);
    this.pos++; return tok;
  }
  match(...ts) { return ts.includes(this.peek().t); }

  parse()              { return GrammarNode.parse(this); }
  parseAlternation()   { return AlternationNode.parse(this); }
  parseConcatenation() { return ConcatenationNode.parse(this); }
  parseDifference()    { return DifferenceNode.parse(this); }

  parseFactor() {
    let n = this.parseTerm();
    if (this.match(T.STAR))  { this.consume(); return new RepetitionNode(n); }
    if (this.match(T.PLUS))  { this.consume(); return new ConcatenationNode([n, new RepetitionNode(n)]); }
    if (this.match(T.QUEST)) { this.consume(); return new OptionNode(n); }
    return n;
  }

  parseTerm() {
    if (this.match(T.LBRACE))  return RepetitionNode.parse(this);
    if (this.match(T.LBRAK))   return OptionNode.parse(this);
    if (this.match(T.LPAREN))  return GroupNode.parse(this);
    if (this.match(T.STR))     return TerminalNode.parse(this);
    if (this.match(T.PARAMETER)) return ParameterNode.parse(this);
    if (this.match(T.IDENT))   return IdentifierNode.parse(this);
    throw new Error(`Unexpected token: ${this.peek().t} '${this.peek().v}'`);
  }
}

const parseEBNF = (src) => new Parser(src).parse();

// A rule action waiting to run. Actions are only applied once the whole input
// has matched, so alternatives and exception checks that are tried and then
// discarded never run actions (or mutate context).
class PendingAction {
  constructor(fn, value) { this.fn = fn; this.value = value; }
}

function resolveActions(value, context) {
  if (value instanceof PendingAction) return value.fn(resolveActions(value.value, context), context);
  if (Array.isArray(value)) return value.map(v => resolveActions(v, context));
  return value;
}


// ─── 9. AST → railroad diagram mapping ───────────────────────────────────────

function astToRailroad(node) {
  switch (node.type) {
    case 'Terminal':      return new Terminal(node.value);
    case 'Identifier':    return new NonTerminal(node.value);
    case 'Parameter':     return new NonTerminal(node.value);
    case 'Group':         return astToRailroad(node.children[0]);
    case 'Option':        return new Optional(astToRailroad(node.children[0]));
    case 'Repetition':    return new ZeroOrMore(astToRailroad(node.children[0]));
    case 'Concatenation': return new Sequence(...node.children.map(astToRailroad));
    case 'Alternation':   return new Choice(null, ...node.children.map(astToRailroad));
    case 'Difference':    return new Difference(astToRailroad(node.children[0]), astToRailroad(node.children[1]));
    case 'Rule':          return astToRailroad(node.children[0]);
    default: throw new Error(`Cannot map AST node type '${node.type}' to a railroad component`);
  }
}


// ─── 10. Grammar engine — compile a grammar, then execute it against input ───
//         and/or generate railroad diagrams from the same AST.

class EBNF {
  constructor(source) {
    this.grammar = typeof source === 'string' ? parseEBNF(source) : source;
    this.rules = {};
    for (const rule of this.grammar.children) this.rules[rule.value] = rule.children[0];
    this.actions = {};
  }

  assignAction(ruleName, fn) {
    this.actions[ruleName] = fn;
    return this;
  }

  compile(ruleName) {
    return (input, context = {}) => this.execute(ruleName, input, context);
  }

  execute(ruleName, input, context = {}) {
    const result = this.matchRule(ruleName, input, context);
    if (result.matched && result.remaining.trim() === '') return resolveActions(result.value, context);
    const at = result.matched ? ` at '${result.remaining.trim().slice(0, 40)}'` : '';
    throw new Error(`Syntax error: input failed to match rule '${ruleName}'${at}`);
  }

  matchRule(ruleName, text, context) {
    const rhs = this.rules[ruleName];
    if (!rhs) throw new Error(`Undefined rule: ${ruleName}`);
    const result = this.match(rhs, text, context);
    if (result.matched && this.actions[ruleName]) {
      result.value = new PendingAction(this.actions[ruleName], result.value);
    }
    return result;
  }

  match(node, text, context) {
    text = text.trimStart();
    switch (node.type) {
      case 'Terminal':
        return text.startsWith(node.value)
          ? { matched: true, value: node.value, remaining: text.slice(node.value.length) }
          : { matched: false };
      case 'Parameter': {
        // Matches the literal parameter text (e.g. ":minAge"); the value is
        // substituted from context when a binding exists.
        if (!text.startsWith(node.value)) return { matched: false };
        const name = node.value.slice(1);
        const value = context && name in context ? context[name] : node.value;
        return { matched: true, value, remaining: text.slice(node.value.length) };
      }
      case 'Identifier':
        return this.matchRule(node.value, text, context);
      case 'Group':
        return this.match(node.children[0], text, context);
      case 'Option': {
        const r = this.match(node.children[0], text, context);
        return r.matched ? r : { matched: true, value: null, remaining: text };
      }
      case 'Repetition': {
        let remaining = text;
        const values = [];
        for (;;) {
          const r = this.match(node.children[0], remaining, context);
          if (!r.matched || r.remaining.trimStart() === remaining.trimStart()) break;
          values.push(r.value);
          remaining = r.remaining;
        }
        return { matched: true, value: values, remaining };
      }
      case 'Concatenation': {
        let remaining = text;
        const values = [];
        for (const term of node.children) {
          const r = this.match(term, remaining, context);
          if (!r.matched) return { matched: false };
          values.push(r.value);
          remaining = r.remaining;
        }
        return { matched: true, value: values, remaining };
      }
      case 'Alternation': {
        for (const alt of node.children) {
          const r = this.match(alt, text, context);
          if (r.matched) return r;
        }
        return { matched: false };
      }
      case 'Difference': {
        const r = this.match(node.children[0], text, context);
        if (!r.matched) return r;
        const consumed = text.slice(0, text.length - r.remaining.length);
        const ex = this.match(node.children[1], consumed, context);
        if (ex.matched && ex.remaining.trim() === '') return { matched: false };
        return r;
      }
      default:
        return { matched: false };
    }
  }

  ruleNames() {
    return Object.keys(this.rules);
  }

  diagram(ruleName) {
    const rhs = this.rules[ruleName];
    if (!rhs) throw new Error(`Undefined rule: ${ruleName}`);
    return new Diagram(astToRailroad(rhs));
  }

  diagrams() {
    return Object.fromEntries(this.ruleNames().map(name => [name, this.diagram(name)]));
  }
}


export {
  T, ASTNode, TerminalNode, IdentifierNode, ParameterNode,
  RepetitionNode, OptionNode, GroupNode,
  DifferenceNode, ConcatenationNode, AlternationNode,
  RuleNode, GrammarNode,
  tokenize, Parser, parseEBNF, astToRailroad, EBNF
};
export default EBNF;

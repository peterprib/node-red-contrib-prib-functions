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

class ConcatenationNode extends ASTNode {
  constructor(terms) { super('Concatenation', terms); }
  static parse(parser) {
    const terms = [parser.parseFactor()];
    while (parser.match(T.COMMA)) {
      parser.consume();
      terms.push(parser.parseFactor());
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
      let s = '';
      while (i < src.length && /[\w\s]/.test(src[i]) && src[i] !== '\n') {
        if (/\w/.test(src[i])) s += src[i]; else if (s) s += ' ';
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


// ─── 9. Entry point ───────────────────────────────────────────────────────────

const ast = new Parser(`
  digit = "0" | "1" | "2" | "3" ;
  word  = letter, { letter } ;
  letter = "a" | "b" | "c" ;
`).parse();

console.log(ast);
/**
 * Parses a basic EBNF grammar string into a JSON structure.
 * Supports: definition (=), alternation (|), optionals ([]), 
 * repetition ({}), and grouping (()).
 *
const parseTokenLines=input=>input
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const match = line.match(/^(.+?)\s*:=\s*(.*?)\s*;$/);
      return match ? [match[1].trim(), match[2].trim()] : null;
    })
    .filter(Boolean);
const rules={}

const regex = /[bf]/g;

const findCharRegexFrom(str, regex, startPos = 0) {
  regex.lastIndex = startPos; // Set the starting position
  const match = regex.exec(str);
  return match ? match.index : -1;
}
class Terminal{
    constructor(string,cursor) {
        this.startPosition=cursor
        const delimiter = string[cursor],l=string.length
        for (let i = cursor+1; i < l; i++){
            if (string  [i] !== delimiter) continue
            this.value=string
            this.endString=i+1
            return
        }
        throw Error("no delimiter found")
    }
}





class Sequence{
    constructor(string,cursor) {
        this.startPosition=cursor
        this.elements = [];
        let node;
        for (let i = cursor; i < string.length; i++){
            switch (char) {
                case '[':
                    node = new Optional(string,cursor)
                    break
                case '{':
                    node = new Repetition(string,cursor)
                    break
                case '(':
                    node = new Sequence(string,cursor)
                    break
                case '|':
                    node = new Choice(string,cursor,node.pop())
                    break
                case "'":
                case '"':
                    node = new Terminal(string,cursor)
                    break
                default:
                    const startPosition=cursor
                    const EndPosition=findCharRegexFromfor(cursoe,string,regex)
                    const ruleName=string.substring(startPosition,EndPosition)
                    if(rules.hasOwnProperty(ruleName)))
                    node = rules[]
            
            }
            this.elements.push(node)
            i=node.endString
        }
    }
}

const parseRuleName(astring,cursor)=>{
    const start=cursor
    while (cursor < astring.length && '|)];,'.indexOf(astring[cursor])<0) cursor++
    const ruleName =astring.substring(start,cursor)
    if(rules.hasOwnProperty(ruleName)) return rules[ruleName]
    throw Error(`rule {ruleName} not found`)
}

const parseToken=input=>{
  const match = input.match(/^(\w+)/);
  return match ? match[1] : null;
}
const parseChoice=input=>{
    if(!input.startsWith("|")) return
}

class EBNFNew{
     constructor(stringRules) {
        this.rules = parseEBNF(grammar);
        this.actions = {};
        this.rules={}
    }

    parse(stringRules){
        const ebnf=this
        parseTokenLines(stringRules).array.forEach(element => {
            ebnf.addRule(...element)     
        });
    }
    addRule(token,definition){
        this.rules[token]=this.parseDefinition(definition)
    }
    parseDefinition(definition){
        const token=parseToken(definition)
        if(token){
            if(!(token in this.rules)) throw Error("rule not found")
            
        }
    }
}

class Rule{
    constructor(name, content, action,EBNF){
        this.name = name;
        this.content = content;
        this.action=action
        this.EBNF=EBNF
        this.elements=[]
        this.cursor=0
    }
}
class Optional{
     constructor(string,cursor) {
        this.type = 'Optional';
        this.content = content;
    }
    match(text, context) {
        const result = this.content.match(text, context);
        return result.matched ? result : { matched: true, value: null, remaining: text };
    }
}
class Repetition{
    constructor(content) {
        this.type = 'Repetition';
        this.content = content;
    }
}
class Choice{
    constructor(astring,cusor) {
        this.startPosition=cursor
        this.options = [];
        for (let i = cursor+1; i < l; i++){
            if (astring[i] === "|"){
                this.options
            }}
            this.endString=i+1
            return
        }
    }
}
class Sequence{
    constructor(astring,cusor) {
        this.startPosition=cursor
    }
}
class Terminal{
    constructor(astring,cusor) {
        this.startPosition=cursor
        const delimiter = astring[cursor],l=astring.length
        for (let i = cursor+1; i < l; i++){
            if (astring[i] !== delimiter) continue
            this.value=substring(cursor+1,i-1)
            this.endString=i+1
            return
        }
        throw Error("no delimiter found")
    }
}

class NonTerminal{
    constructor(astring,cusor) {
        this.startPosition=cursor
    }
    execute(input, context){
        if (text.startsWith(node.value)) {
            return { matched: true, value: node.value, remaining: text.slice(node.value.length) };
        }
        return { matched: false };
    }
}
function parseEBNF(grammar) {
    let tokens = grammar.match(/'[^']*'|"[^"]*"|[a-zA-Z_][a-zA-Z0-9_-]*|[\[\]{}()=|;,]|\s+/g)
        .filter(t => !/^\s+$/.test(t)); // Tokenize and remove whitespace

    let cursor = 0;

    function parseExpression() {
        let list = [parseTerm()];
        while (tokens[cursor] === '|') {
            cursor++;
            list.push(parseTerm());
        }
        return list.length === 1 ? list[0] : { type: 'Choice', options: list };
    }

    function parseTerm() {
        let elements = [];
        while (cursor < tokens.length && !'|)];'.includes(tokens[cursor])) {
            elements.push(parseFactor());
            if (tokens[cursor] === ',') cursor++; // Skip optional comma concatenation
        }
        return elements.length === 1 ? elements[0] : { type: 'Sequence', elements };
    }

    function parseFactor() {
        let token = tokens[cursor++];
        if (token === '[') {
            let node = { type: 'Optional', content: parseExpression() };
            cursor++; // skip ']'
            return node;
        } else if (token === '{') {
            let node = { type: 'Repetition', content: parseExpression() };
            cursor++; // skip '}'
            return node;
        } else if (token === '(') {
            let node = parseExpression();
            cursor++; // skip ')'
            return node;
        } else if (token.startsWith("'") || token.startsWith('"')) {
            return { type: 'Terminal', value: token.slice(1, -1) };
        } else {
            return { type: 'NonTerminal', name: token };
        }
    }

    const rules = {};
    while (cursor < tokens.length) {
        let name = tokens[cursor++];
        if (tokens[cursor++] !== '=') throw new Error("Expected '=' after identifier");
        rules[name] = parseExpression();
        if (tokens[cursor] === ';' || tokens[cursor] === ',') cursor++; 
    }

    return rules;
}

// Example usage based on Wikipedia's digit/number example:
const base = `
    digit := "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
    number := digit , { digit} ;
	character = ? any character ? ;
	letter = ? any letter ? ;
	identifier = letter , { letter | digit } ;	
	primary-expression = identifier | number | "(" expression ")" ;
	expression = primary-expression , { operator , primary-expression } ;
	operator = "+" | "-" | "*" | "/" ;
	function-call = identifier , "(" , [ expression , { "," , expression } ] , ")" ;
	average = "average" , "(" , expression , ")" ;
	sum = "sum" , "(" , expression , ")" ;
	min = "min" , "(" , expression , ")" ;
	max = "max" , "(" , expression , ")" ;
	count = "count" , "(" , expression , ")" ;
	statement = function-call | expression ;
	operator-expression = expression , operator , expression ;
	boolean-expression = expression , ( ">" | "<" | "==" | "!=" ) , expression ; 
	sql-expression = identifier | string | number | sql-expression , operator , sql-expression | "(" sql-expression ")" ;
	sql-predicate = boolean-expression , ( "AND" | "OR" ) , boolean-expression | "(" sql-predicate ")" ;
	sql-join = table , "JOIN" , table , [ "ON" , sql-predicate ] ;
	sql-where = "WHERE" , sql-predicate ] ] ;
	sql-statement = "SELECT" , expression , "FROM" , identifier , [ "WHERE" , expression ] ;
	sql-query = sql-statement , ";" ;
	sql-query-list = sql-query , { sql-query } ;
	sql-query-file = sql-query-list ;
	sql-query-set = sql-query , { "," , sql-query } ;
	sql-query-set-list = sql-query-set , { ";" , sql-query-set } ;
	sql-query-file-set = sql-query-set ;
	sql-query-file-set-list = sql-query-file-set , { ";" , sql-query-file-set } ;
	sql-with-query = sql-query | sql-query-set | sql-query-file | sql-query-set-list | sql-query-file-set | sql-query-file-set-list 
	join = expression , "JOIN" , expression , [ "ON" , expression ] ] ;
	with-query = sql-query | join ;
	with-query-list = with-query , { "," , with-query } ;
	with-query-file = with-query-list ;
`;

import { exec } from 'node:child_process';
// Note: This requires the railroad-diagrams.js and .css files in your project
import { 
  Diagram, Sequence, Choice, Optional, ZeroOrMore, Terminal, NonTerminal 
} from './railroadDiagram.js';
import { match } from 'node:assert';
import { parse } from 'node:path';
import { callbackify, diff } from 'node:util';
import { start } from 'node:repl';

/**
 * EBNF Grammar Engine with execution support.
 *
export class EBNF {
    constructor(grammar) {
        this.rules = parseEBNF(grammar);
        this.actions = {};
    }


    assignAction(ruleName, fn) {
        this.actions[ruleName] = fn;
    }


    compile(ruleName) {
        return (input, context) => this.execute(ruleName, input, context);
    }

    execute(ruleName, input, context = {}) {
        const rules = this.rules;
        const actions = this.actions;

        const match = (node, text) => {
            text = text.trimStart();
            switch (node.type) {
                case 'Terminal':
                    if (text.startsWith(node.value)) {
                        return { matched: true, value: node.value, remaining: text.slice(node.value.length) };
                    }
                    return { matched: false };
                case 'NonTerminal':
                    const rule = rules[node.name];
                    if (!rule) throw new Error("Undefined rule: " + node.name);
                    const res = match(rule, text);
                    if (res.matched && actions[node.name]) {
                        res.value = actions[node.name](res.value, context);
                    }
                    return res;
                case 'Sequence':
                    let seqText = text;
                    let seqValues = [];
                    for (const el of node.elements) {
                        const r = match(el, seqText);
                        if (!r.matched) return { matched: false };
                        seqText = r.remaining;
                        seqValues.push(r.value);
                    }
                    return { matched: true, value: seqValues, remaining: seqText };
                case 'Choice':
                    for (const opt of node.options) {
                        const r = match(opt, text);
                        if (r.matched) return r;
                    }
                    return { matched: false };
                case 'Optional':
                    const rOpt = match(node.content, text);
                    if (rOpt.matched) return rOpt;
                    return { matched: true, value: null, remaining: text };
                case 'Repetition':
                    let repText = text;
                    let repValues = [];
                    while (true) {
                        const r = match(node.content, repText);
                        if (!r.matched || r.remaining === repText) break;
                        repText = r.remaining;
                        repValues.push(r.value);
                    }
                    return { matched: true, value: repValues, remaining: repText };
                default: return { matched: false };
            }
        };

        const result = match({ type: 'NonTerminal', name: ruleName }, input);
        if (result.matched && result.remaining.trim() === '') return result.value;
        throw new Error(`Syntax error: Input failed to match rule '${ruleName}'`);
    }
}

export { parseEBNF, renderRule };


function createRailroadNode(node) {
    if (typeof node === 'string') {
        return new NonTerminal(node);
    }

    switch (node.type) {
        case 'Terminal':
            return new Terminal(node.value);
        
        case 'NonTerminal':
            return new NonTerminal(node.name);

        case 'Sequence':
            // Maps [A, B, C] into a horizontal sequence
            return new Sequence(...node.elements.map(createRailroadNode));

        case 'Choice':
            // Maps [A | B | C] into a vertical stack of options
            return new Choice(0, ...node.options.map(createRailroadNode));

        case 'Optional':
            // Maps [ A ] into a bypass path
            return new Optional(createRailroadNode(node.content));

        case 'Repetition':
            // Maps { A } into a loop-back path
            return new ZeroOrMore(createRailroadNode(node.content));

        default:
            return new Terminal("Unknown");
    }
}


function renderRule(ruleName, parsedGrammar) {
    const rootNode = parsedGrammar[ruleName];
    if (!rootNode) return null;

    const diagram = new Diagram(createRailroadNode(rootNode));
    
    // In a browser, this returns an SVG element
    return diagram.toSVG();
}

// --- Usage Example ---
// Assuming 'ast' is the output from the parseEBNF function:
// const ast = parseEBNF('number = digit , { digit };');
// const svg = renderRule('number', ast);
// document.body.appendChild(svg);
*/
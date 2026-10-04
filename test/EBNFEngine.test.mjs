import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EBNF, Parser, parseEBNF, astToRailroad } from '../EBNF/EBNFEngine.js';
import { Diagram, Choice, Difference, Terminal } from '../EBNF/railroadDiagram.js';

const arithmeticGrammar = `
  digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
  number = digit , { digit } ;
  operator = "+" | "-" | "*" | "/" ;
  expression = number , { operator , number } ;
`;

test('parseEBNF produces a Grammar AST with one Rule per definition', () => {
  const ast = parseEBNF(arithmeticGrammar);
  assert.equal(ast.type, 'Grammar');
  assert.equal(ast.children.length, 4);
  assert.deepEqual(ast.children.map(r => r.value), ['digit', 'number', 'operator', 'expression']);
  assert.equal(ast.children[0].children[0].type, 'Alternation');
});

test('parser handles optionals, groups, repetition suffixes and comments', () => {
  const ast = parseEBNF(`
    (* a comment *)
    value = [ "-" ] , digit , ( "." | "," ) , digit* ;
  `);
  const rhs = ast.children[0].children[0];
  assert.equal(rhs.type, 'Concatenation');
  assert.equal(rhs.children[0].type, 'Option');
  assert.equal(rhs.children[2].type, 'Group');
  assert.equal(rhs.children[3].type, 'Repetition');
});

test('parser reports unexpected tokens', () => {
  assert.throws(() => new Parser('rule = ;').parse(), /Unexpected token/);
});

test('EBNF.execute matches input against a rule', () => {
  const ebnf = new EBNF(arithmeticGrammar);
  assert.equal(ebnf.execute('digit', '7'), '7');
  assert.deepEqual(ebnf.execute('number', '42'), ['4', ['2']]);
  assert.throws(() => ebnf.execute('digit', 'x'), /Syntax error/);
  assert.throws(() => ebnf.execute('digit', '7x'), /Syntax error/);
});

test('EBNF actions transform matched values per rule', () => {
  const ebnf = new EBNF(arithmeticGrammar);
  ebnf.assignAction('digit', v => Number(v));
  ebnf.assignAction('number', v => Number([v[0], ...v[1]].join('')));
  assert.equal(ebnf.execute('number', '123'), 123);
});

test('EBNF.compile returns a reusable matcher', () => {
  const ebnf = new EBNF(arithmeticGrammar);
  ebnf.assignAction('digit', v => Number(v));
  const matchDigit = ebnf.compile('digit');
  assert.equal(matchDigit('5'), 5);
  assert.equal(matchDigit('9'), 9);
});

test('optionals and repetitions execute correctly', () => {
  const ebnf = new EBNF(`
    sign = "-" | "+" ;
    integer = [ sign ] , digit , { digit } ;
    digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
  `);
  assert.deepEqual(ebnf.execute('integer', '-12'), ['-', '1', ['2']]);
  assert.deepEqual(ebnf.execute('integer', '3'), [null, '3', []]);
});

test('difference (A - B) rejects the excluded match', () => {
  const ebnf = new EBNF(`
    letter = "a" | "b" | "c" ;
    consonant = letter - "a" ;
  `);
  assert.equal(ebnf.execute('consonant', 'b'), 'b');
  assert.throws(() => ebnf.execute('consonant', 'a'), /Syntax error/);
});

test('parameters match literally and substitute from context', () => {
  const ebnf = new EBNF(`
    predicate = "age" , ">" , :minAge ;
  `);
  assert.deepEqual(ebnf.execute('predicate', 'age > :minAge', { minAge: 21 }), ['age', '>', 21]);
  assert.deepEqual(ebnf.execute('predicate', 'age > :minAge'), ['age', '>', ':minAge']);
});

test('whitespace between tokens of the input is ignored', () => {
  const ebnf = new EBNF(`
    select = "SELECT" , column , "FROM" , table ;
    column = "name" | "age" ;
    table = "people" ;
  `);
  assert.deepEqual(ebnf.execute('select', 'SELECT  name FROM people'), ['SELECT', 'name', 'FROM', 'people']);
});

test('diagram() builds a railroad Diagram from a rule', () => {
  const ebnf = new EBNF(arithmeticGrammar);
  const diagram = ebnf.diagram('expression');
  assert.ok(diagram instanceof Diagram);
  assert.ok(diagram.width > 0 && diagram.height > 0);
});

test('diagram toSVG() in Node returns a standalone SVG string', () => {
  const ebnf = new EBNF(arithmeticGrammar);
  const svg = ebnf.diagram('number').toSVG();
  assert.equal(typeof svg, 'string');
  assert.match(svg, /^<svg /);
  assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /digit/);
});

test('diagrams() returns a Diagram for every rule', () => {
  const ebnf = new EBNF(arithmeticGrammar);
  const all = ebnf.diagrams();
  assert.deepEqual(Object.keys(all), ['digit', 'number', 'operator', 'expression']);
  for (const d of Object.values(all)) assert.ok(d instanceof Diagram);
});

test('astToRailroad maps every AST node type', () => {
  const ast = parseEBNF(`rule = ( "a" | name ) , [ "b" ] , { "c" } , "d" - "e" , :p ;`);
  const component = astToRailroad(ast.children[0]);
  assert.ok(component.width > 0);
  const svg = new Diagram(component).toSVG();
  assert.match(svg, /name/);
  assert.match(svg, /:p/);
});

test('undefined rule references are reported', () => {
  const ebnf = new EBNF(`start = missing ;`);
  assert.throws(() => ebnf.execute('start', 'x'), /Undefined rule: missing/);
  assert.throws(() => ebnf.diagram('nope'), /Undefined rule: nope/);
});

test('difference binds tighter than concatenation', () => {
  const rhs = parseEBNF(`r = "a" - "b" , "c" ;`).children[0].children[0];
  assert.equal(rhs.type, 'Concatenation');
  assert.equal(rhs.children[0].type, 'Difference');
  assert.equal(rhs.children[1].value, 'c');
});

test('hyphens inside names are identifiers, spaced hyphens are differences', () => {
  const ebnf = new EBNF(`
    primary-expression = "a" | "b" ;
    use = primary-expression ;
    not-a = primary-expression - "a" ;
  `);
  assert.deepEqual(ebnf.ruleNames(), ['primary-expression', 'use', 'not-a']);
  assert.equal(ebnf.rules.use.type, 'Identifier');
  assert.equal(ebnf.rules['not-a'].type, 'Difference');
  assert.equal(ebnf.execute('not-a', 'b'), 'b');
  assert.throws(() => ebnf.execute('not-a', 'a'), /Syntax error/);
});

test('repetition of an optional does not add a value for skipped whitespace', () => {
  const ebnf = new EBNF(`r = { [ "a" ] } , "b" ;`);
  assert.deepEqual(ebnf.execute('r', ' b'), [[], 'b']);
  assert.deepEqual(ebnf.execute('r', 'a a b'), [['a', 'a'], 'b']);
});

test('actions only run for the successful parse', () => {
  const ebnf = new EBNF(`
    start = x , "!" | x , "?" ;
    x = "a" ;
    letter = "a" | "b" ;
    notA = letter - x ;
  `);
  const calls = [];
  ebnf.assignAction('x', (v, ctx) => { calls.push(v); ctx.count = (ctx.count || 0) + 1; return v.toUpperCase(); });
  const ctx = {};
  assert.deepEqual(ebnf.execute('start', 'a?', ctx), ['A', '?']);
  assert.equal(ctx.count, 1);
  calls.length = 0;
  assert.equal(ebnf.execute('notA', 'b'), 'b');
  assert.deepEqual(calls, []);
});

test('alternation diagram puts the first option on the main line with no bypass', () => {
  const a = new Terminal('a'), b = new Terminal('b');
  const choice = new EBNF(`r = "a" | "b" ;`).diagram('r').root;
  assert.ok(choice instanceof Choice);
  assert.equal(choice.defaultOption, null);
  assert.equal(choice.yOffsets[0], 0);
  assert.ok(choice.yOffsets[1] > 0);
  const svg = new Diagram(new Choice(null, a, b)).toSVG();
  assert.doesNotMatch(svg, new RegExp(`M 20 [\\d.]+ h ${new Choice(null, a, b).width}`));
});

test('difference main line spans its full width when the exception is wider', () => {
  const diff = new Difference(new Terminal('a'), new Terminal('a much longer exception'));
  assert.ok(diff.width > diff.base.width + 20);
  const d = diff.draw(0, 0).toString();
  const end = 10 + diff.base.width;
  assert.match(d, new RegExp(`M ${end} 0 h ${diff.width - end}`));
});

/**
 * Parses a basic EBNF grammar string into a JSON structure.
 * Supports: definition (=), alternation (|), optionals ([]), 
 * repetition ({}), and grouping (()).
 */
function parseEBNF(grammar) {
    let tokens = grammar.match(/'[^']*'|"[^"]*"|[a-zA-Z_][a-zA-Z0-9_]*|[\[\]{}()=|;,]|\s+/g)
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
    digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
    number = digit , { digit } ;
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

const ast = parseEBNF(ebnfGrammar);
console.log(JSON.stringify(ast, null, 2));

// Note: This requires the railroad-diagrams.js and .css files in your project
import { 
  Diagram, Sequence, Choice, Optional, ZeroOrMore, Terminal, NonTerminal 
} from './railroadDiagrams.js';

/**
 * Converts a custom EBNF AST node into a Railroad Diagram component.
 */
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

/**
 * Renders a specific rule from the parsed grammar into an SVG.
 */
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
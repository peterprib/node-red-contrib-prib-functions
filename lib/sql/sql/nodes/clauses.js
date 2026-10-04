import { ASTNode }                          from '../../core/ASTNode.js';
import { ExprNode, ColumnRefNode, StarNode } from './expressions.js';

export class SelectNode extends ASTNode {
  constructor(cols, distinct) { super('Select', cols, distinct); }
  static parse(p) {
    p.consume('SELECT');
    const distinct = p.eat('DISTINCT');
    const cols = [ColumnExprNode.parse(p)];
    while (p.eat('COMMA')) cols.push(ColumnExprNode.parse(p));
    return new SelectNode(cols, distinct);
  }
}

export class ColumnExprNode extends ASTNode {
  constructor(expr, alias) { super('ColumnExpr', [expr], alias); }
  static parse(p) {
    if (p.match('STAR')) { p.consume(); return new ColumnExprNode(new StarNode(), null); }
    const expr  = ExprNode.parse(p);
    const alias = p.eat('AS') ? p.consume('IDENT').v : null;
    return new ColumnExprNode(expr, alias);
  }
}

export class FromNode extends ASTNode {
  constructor(table, alias) { super('From', [], { table, alias }); }
  static parse(p) {
    p.consume('FROM');
    const table = p.consume('IDENT').v;
    const alias = p.eat('AS') ? p.consume('IDENT').v
                : p.match('IDENT') ? p.consume().v : null;
    return new FromNode(table, alias);
  }
}

export class JoinNode extends ASTNode {
  constructor(kind, table, alias, on) { super('Join', on ? [on] : [], { kind, table, alias }); }
  static parse(p) {
    let kind = 'INNER';
    if (p.match('LEFT', 'RIGHT', 'INNER', 'CROSS', 'OUTER')) kind = p.consume().t;
    p.consume('JOIN');
    const table = p.consume('IDENT').v;
    const alias = p.eat('AS') ? p.consume('IDENT').v
                : p.match('IDENT') ? p.consume().v : null;
    const on    = p.eat('ON') ? ExprNode.parse(p) : null;
    return new JoinNode(kind, table, alias, on);
  }
}

export class WhereNode extends ASTNode {
  constructor(expr) { super('Where', [expr]); }
  static parse(p) { p.consume('WHERE'); return new WhereNode(ExprNode.parse(p)); }
}

export class GroupByNode extends ASTNode {
  constructor(cols) { super('GroupBy', cols); }
  static parse(p) {
    p.consume('GROUP');
    p.consume('BY');
    const cols = [ExprNode.parse(p)];
    while (p.eat('COMMA')) cols.push(ExprNode.parse(p));
    return new GroupByNode(cols);
  }
}

export class HavingNode extends ASTNode {
  constructor(expr) { super('Having', [expr]); }
  static parse(p) { p.consume('HAVING'); return new HavingNode(ExprNode.parse(p)); }
}

export class OrderByNode extends ASTNode {
  constructor(terms) { super('OrderBy', terms); }
  static parse(p) {
    p.consume('ORDER');
    p.consume('BY');
    const terms = [OrderTermNode.parse(p)];
    while (p.eat('COMMA')) terms.push(OrderTermNode.parse(p));
    return new OrderByNode(terms);
  }
}

export class OrderTermNode extends ASTNode {
  constructor(expr, dir) { super('OrderTerm', [expr], dir); }
  static parse(p) {
    const expr = ExprNode.parse(p);
    const dir  = p.eat('DESC') ? 'DESC' : (p.eat('ASC'), 'ASC');
    return new OrderTermNode(expr, dir);
  }
}

export class LimitNode extends ASTNode {
  constructor(n, offset) { super('Limit', [], { n, offset }); }
  static parse(p) {
    p.consume('LIMIT');
    const n      = p.consume('NUM').v;
    const offset = p.eat('OFFSET') ? p.consume('NUM').v : 0;
    return new LimitNode(n, offset);
  }
}
import { ASTNode } from '../../core/ASTNode.js';

export class BinopNode     extends ASTNode { constructor(op, l, r)       { super('Binop',     [l, r],   op); } }
export class UnaryNode     extends ASTNode { constructor(op, e)          { super('Unary',     [e],      op); } }
export class LiteralNode   extends ASTNode { constructor(v)              { super('Literal',   [],       v);  } }
export class ColumnRefNode extends ASTNode { constructor(table, col)     { super('ColumnRef', [], { table, col }); } }
export class StarNode      extends ASTNode { constructor()               { super('Star'); } }
export class AggFuncNode   extends ASTNode { constructor(fn, expr, dist) { super('AggFunc',   expr ? [expr] : [], { fn, distinct: dist }); } }
export class InNode        extends ASTNode { constructor(e, list, neg)   { super('In',        [e, ...list], neg); } }
export class BetweenNode   extends ASTNode { constructor(e, lo, hi, neg) { super('Between',   [e, lo, hi], neg); } }
export class IsNullNode    extends ASTNode { constructor(e, neg)         { super('IsNull',    [e], neg); } }
export class LikeNode      extends ASTNode { constructor(e, pat, neg)    { super('Like',      [e], { pattern: pat, negated: neg }); } }

export class ExprNode {
  static parse(p)      { return ExprNode.parseOr(p); }

  static parseOr(p) {
    let l = ExprNode.parseAnd(p);
    while (p.match('OR'))  { p.consume(); l = new BinopNode('||', l, ExprNode.parseAnd(p)); }
    return l;
  }

  static parseAnd(p) {
    let l = ExprNode.parseNot(p);
    while (p.match('AND')) { p.consume(); l = new BinopNode('&&', l, ExprNode.parseNot(p)); }
    return l;
  }

  static parseNot(p) {
    if (p.match('NOT')) { p.consume(); return new UnaryNode('!', ExprNode.parseNot(p)); }
    return ExprNode.parseCompare(p);
  }

  static parseCompare(p) {
    let l = ExprNode.parseAdd(p);

    if (p.match('IS')) {
      p.consume();
      const neg = p.eat('NOT');
      p.consume('NULL');
      return new IsNullNode(l, neg);
    }

    const neg = p.eat('NOT');

    if (p.match('BETWEEN')) {
      p.consume();
      const lo = ExprNode.parseAdd(p);
      p.consume('AND');
      return new BetweenNode(l, lo, ExprNode.parseAdd(p), neg);
    }

    if (p.match('IN')) {
      p.consume();
      p.consume('LPAREN');
      const list = [ExprNode.parse(p)];
      while (p.eat('COMMA')) list.push(ExprNode.parse(p));
      p.consume('RPAREN');
      return new InNode(l, list, neg);
    }

    if (p.match('LIKE')) {
      p.consume();
      return new LikeNode(l, p.consume('STR').v, neg);
    }

    const ops = { EQ:'===', LT:'<', GT:'>', '<=':'<=', '>=':'>=', '<>':'!==', '!=':'!==' };
    if (p.match(...Object.keys(ops))) {
      const op = ops[p.consume().t];
      return new BinopNode(op, l, ExprNode.parseAdd(p));
    }

    return l;
  }

  static parseAdd(p) {
    let l = ExprNode.parseMul(p);
    while (p.match('PLUS', 'MINUS')) {
      const op = p.consume().t === 'PLUS' ? '+' : '-';
      l = new BinopNode(op, l, ExprNode.parseMul(p));
    }
    return l;
  }

  static parseMul(p) {
    let l = ExprNode.parseUnary(p);
    while (p.match('STAR', 'SLASH')) {
      const op = p.consume().t === 'STAR' ? '*' : '/';
      l = new BinopNode(op, l, ExprNode.parseUnary(p));
    }
    return l;
  }

  static parseUnary(p) {
    if (p.match('MINUS')) { p.consume(); return new UnaryNode('-', ExprNode.parsePrimary(p)); }
    return ExprNode.parsePrimary(p);
  }

  static parsePrimary(p) {
    if (p.match('COUNT', 'SUM', 'AVG', 'MIN', 'MAX')) {
      const fn = p.consume().t;
      p.consume('LPAREN');
      const distinct = p.eat('DISTINCT');
      if (fn === 'COUNT' && p.match('STAR')) {
        p.consume();
        p.consume('RPAREN');
        return new AggFuncNode(fn, null, false);
      }
      const expr = ExprNode.parse(p);
      p.consume('RPAREN');
      return new AggFuncNode(fn, expr, distinct);
    }

    if (p.eat('LPAREN')) {
      const e = ExprNode.parse(p);
      p.consume('RPAREN');
      return e;
    }

    if (p.match('NUM'))   return new LiteralNode(p.consume().v);
    if (p.match('STR'))   return new LiteralNode(p.consume().v);
    if (p.eat('NULL'))    return new LiteralNode(null);

    if (p.match('IDENT')) {
      const name = p.consume().v;
      if (p.eat('DOT'))   return new ColumnRefNode(name, p.consume('IDENT').v);
      return new ColumnRefNode(null, name);
    }

    throw new Error(`Unexpected expression token: ${p.peek().t} '${p.peek().v}'`);
  }
}
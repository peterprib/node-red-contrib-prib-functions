import { ASTNode }     from '../../core/ASTNode.js';
import { SelectNode, FromNode, JoinNode, WhereNode,
         GroupByNode, HavingNode, OrderByNode, LimitNode } from './clauses.js';

export class SelectQueryNode extends ASTNode {
  constructor(parts) { super('SelectQuery', parts); }

  // Typed accessors — executor never pokes at children by index
  get select()  { return this.children.find(n => n.type === 'Select');  }
  get from()    { return this.children.find(n => n.type === 'From');    }
  get joins()   { return this.children.filter(n => n.type === 'Join');  }
  get where()   { return this.children.find(n => n.type === 'Where');   }
  get groupBy() { return this.children.find(n => n.type === 'GroupBy'); }
  get having()  { return this.children.find(n => n.type === 'Having');  }
  get orderBy() { return this.children.find(n => n.type === 'OrderBy'); }
  get limit()   { return this.children.find(n => n.type === 'Limit');   }

  static parse(p) {
    const parts = [];
    parts.push(SelectNode.parse(p));
    parts.push(FromNode.parse(p));
    while (p.match('LEFT', 'RIGHT', 'INNER', 'CROSS', 'OUTER', 'JOIN'))
      parts.push(JoinNode.parse(p));
    if (p.match('WHERE'))  parts.push(WhereNode.parse(p));
    if (p.match('GROUP'))  parts.push(GroupByNode.parse(p));
    if (p.match('HAVING')) parts.push(HavingNode.parse(p));
    if (p.match('ORDER'))  parts.push(OrderByNode.parse(p));
    if (p.match('LIMIT'))  parts.push(LimitNode.parse(p));
    p.eat('SEMI');
    return new SelectQueryNode(parts);
  }
}
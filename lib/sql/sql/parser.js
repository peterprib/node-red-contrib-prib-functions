import { tokenize }        from './tokenizer.js';
import { Parser }          from '../core/Parser.js';
import { SelectQueryNode } from './nodes/query.js';

export function parse(sql) {
  const tokens = tokenize(sql);
  const parser = new Parser(tokens);
  return SelectQueryNode.parse(parser);
}
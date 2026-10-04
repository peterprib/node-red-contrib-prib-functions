export class ASTNode {
  constructor(type, children = [], value = null) {
    this.type     = type;
    this.children = children;
    this.value    = value;
  }

  walk(fn) {
    fn(this);
    for (const child of this.children) child?.walk?.(fn);
  }

  toString() {
    return this.type + (this.value != null ? `(${JSON.stringify(this.value)})` : '');
  }
}
export class ColumnDef {
  constructor(type) {
    this.type       = type;     // 'int32' | 'float64' | 'string' | 'boolean'
    this.nullable   = true;
    this.defaultVal = undefined;
    this.isPrimary  = false;
    this.isUnique   = false;
    this.fkTable    = null;
    this.fkCol      = null;
    this.checkFn    = null;
  }

  notNull()              { this.nullable   = false;               return this; }
  default(v)             { this.defaultVal = v;                   return this; }
  primaryKey()           { this.isPrimary  = true;
                           this.nullable   = false;               return this; }
  unique()               { this.isUnique   = true;                return this; }
  foreignKey(table, col) { this.fkTable    = table;
                           this.fkCol      = col;                 return this; }
  check(fn)              { this.checkFn    = fn;                  return this; }
}

export const col = {
  int32:   () => new ColumnDef('int32'),
  float64: () => new ColumnDef('float64'),
  string:  () => new ColumnDef('string'),
  boolean: () => new ColumnDef('boolean'),
};
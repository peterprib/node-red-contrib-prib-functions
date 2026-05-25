export class ITableStore {
  get length()                { throw new Error('not implemented'); }
  getColumn(name)             { throw new Error('not implemented'); }
  getRow(i)                   { throw new Error('not implemented'); }
  insert(validatedRow)        { throw new Error('not implemented'); }
  filter(bitmap)              { throw new Error('not implemented'); }
  project(colNames, aliases)  { throw new Error('not implemented'); }
  toRows()                    { throw new Error('not implemented'); }
}
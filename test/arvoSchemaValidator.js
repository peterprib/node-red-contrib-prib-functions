const { AvroSchemaValidator, ValidationResult } = require('../arvoStore/arvoSchemaValidator.js');
const avro = require('avsc');

// =============================================================================
// Colour helpers (no dependency — plain ANSI)
// =============================================================================
const c = {
  reset:  s => `\x1b[0m${s}\x1b[0m`,
  green:  s => `\x1b[32m${s}\x1b[0m`,
  red:    s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
};

// =============================================================================
// avsc round-trip test
// Tries to compile the schema with avsc and do a buffer encode/decode cycle.
// This catches things the structural validator might miss.
// =============================================================================
function avscRoundTrip(schema, sampleRecord) {
  const results = [];

  // 1. Can avsc parse the schema?
  let type;
  try {
    type = avro.Type.forSchema(schema);
    results.push({ ok: true,  label: 'avsc.Type.forSchema()' });
  } catch (e) {
    results.push({ ok: false, label: 'avsc.Type.forSchema()', detail: e.message });
    return results; // nothing more to test
  }

  if (!sampleRecord) return results;

  // 2. Can avsc validate the sample record?
  const errors = [];
  const valid  = type.isValid(sampleRecord, { errorHook: (path, val) => errors.push({ path, val }) });
  results.push({
    ok:     valid,
    label:  'isValid(sampleRecord)',
    detail: valid ? null : `Validation errors: ${errors.map(e => `${e.path}: ${JSON.stringify(e.val)}`).join(', ')}`
  });

  if (!valid) return results;

  // 3. Can avsc encode the sample record?
  let buf;
  try {
    buf = type.toBuffer(sampleRecord);
    results.push({ ok: true,  label: 'toBuffer(sampleRecord)' });
  } catch (e) {
    results.push({ ok: false, label: 'toBuffer(sampleRecord)', detail: e.message });
    return results;
  }

  // 4. Can avsc decode the buffer back?
  try {
    const decoded = type.fromBuffer(buf);
    results.push({ ok: true,  label: 'fromBuffer()' });
  } catch (e) {
    results.push({ ok: false, label: 'fromBuffer()', detail: e.message });
  }

  return results;
}

// =============================================================================
// Print a test report
// =============================================================================
function printReport(label, schema, sampleRecord) {
  console.log(c.bold(`\n${label}`));
  console.log(c.dim('  ' + '─'.repeat(50)));

  // --- Structural validation ---
  const validator = new AvroSchemaValidator();
  const result    = validator.validate(schema);

  console.log(c.bold('\n  Structural validation'));
  console.log(c.dim('  ' + '─'.repeat(40)));

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log(`  ${c.green('✔')} No structural issues`);
  }

  result.errors.forEach(err => {
    console.log(`  ${c.red('✖')} ${err.path}: ${err.message}`);
  });

  result.warnings.forEach(warn => {
    console.log(`  ${c.yellow('⚠')} ${warn.path}: ${warn.message}`);
  });

  // --- avsc round-trip test ---
  const rtResults = avscRoundTrip(schema, sampleRecord);

  console.log(c.bold('\n  avsc round-trip test'));
  console.log(c.dim('  ' + '─'.repeat(40)));

  rtResults.forEach(r => {
    const icon = r.ok ? c.green('✔') : c.red('✖');
    console.log(`  ${icon} ${r.label}`);
    if (r.detail) console.log(`    ${c.dim(r.detail)}`);
  });

  // --- Summary ---
  const structuralOk = result.errors.length === 0;
  const rtOk         = rtResults.every(r => r.ok);
  const overall      = structuralOk && rtOk;

  console.log(c.bold('\n  Summary'));
  console.log(c.dim('  ' + '─'.repeat(40)));
  console.log(`  Structural errors:   ${result.errors.length === 0 ? c.green(0) : c.red(result.errors.length)}`);
  console.log(`  Structural warnings: ${result.warnings.length === 0 ? c.green(0) : c.yellow(result.warnings.length)}`);
  console.log(`  Round-trip checks:   ${rtResults.filter(r=>r.ok).length}/${rtResults.length} passed`);
  console.log(`  ${overall ? c.green('✔ PASS') : c.red('✖ FAIL')}\n`);

  return overall;
}

// =============================================================================
// ─── TEST CASES ──────────────────────────────────────────────────────────────
// =============================================================================
// ─── 1. Valid schema ─────────────────────────────────────────────────────────
const VALID_SCHEMA = {
  type: 'record',
  name: 'Stock',
  fields: [
    { name: 'code',  type: 'string' },
    { name: 'price', type: 'double' },
  ],
};

const VALID_SAMPLE = { code: 'BHP', price: 45.20 };

// ─── 2. Schema with errors ───────────────────────────────────────────────────
const BROKEN_SCHEMA = {
  type: 'record',
  name: 'BrokenStock',
  // name missing
  fields: [
    { name: 'code' },                              // missing type
    { name: 'price',  type: 'decimal' },           // unknown type
    { name: 'price',  type: 'string'  },           // duplicate field name
    { name: '1bad',   type: 'string'  },           // invalid identifier
    {
      name: 'status',
      type: {
        type:    'enum',
        name:    'Status',
        symbols: ['OK', 'OK', 'bad symbol!'],      // duplicate + invalid symbol
      },
    },
    {
      name: 'tags',
      type: ['string', 'null'],                    // null not first in union
      default: null,                               // default null but first type is string — mismatch
    },
    {
      name: 'nested_union',
      type: [['null', 'string']],                  // nested union — forbidden
    },
    {
      name: 'size',
      type: { type: 'fixed', name: 'Hash', size: -1 },  // negative fixed size
    },
  ],
};

// ─── 3. Schema with warnings only ────────────────────────────────────────────
const WARN_SCHEMA = {
  type: 'record',
  name: 'Dividend',
  fields: [
    { name: 'code',      type: { type: 'string' } },  // verbose — should be 'string'
    { name: 'yield_pct', type: 'float'            },
    { name: 'frequency', type: 'string'           },
  ],
};

const WARN_SAMPLE = { code: 'CBA', yield_pct: 4.2, frequency: 'Semi-annual' };

// ─── 4. Nested records ───────────────────────────────────────────────────────
const NESTED_SCHEMA = {
  type: 'record',
  name: 'Trade',
  fields: [
    { name: 'tradeId', type: 'string' },
    {
      name: 'stock',
      type: {
        type: 'record',
        name: 'StockRef',
        fields: [
          { name: 'code',  type: 'string' },
          { name: 'price', type: 'double' },
        ],
      },
    },
    {
      name: 'exchange',
      type: {
        type: 'record',
        name: 'Exchange',
        fields: [
          { name: 'code',    type: 'string' },
          { name: 'country', type: 'string' },
        ],
      },
    },
  ],
};

const NESTED_SAMPLE = {
  tradeId:  'TRD-001',
  stock:    { code: 'BHP', price: 45.20 },
  exchange: { code: 'ASX', country: 'Australia' },
};

// =============================================================================
// Run all tests
// =============================================================================
let allPassed = true;

allPassed &= printReport('Valid schema (Stock)',            VALID_SCHEMA,  VALID_SAMPLE);
allPassed &= printReport('Broken schema (errors)',         BROKEN_SCHEMA, null);
allPassed &= printReport('Warning-only schema (Dividend)', WARN_SCHEMA,   WARN_SAMPLE);
allPassed &= printReport('Nested records (Trade)',         NESTED_SCHEMA, NESTED_SAMPLE);

console.log(c.bold(c.cyan('━'.repeat(60))));
console.log(allPassed
  ? c.bold(c.green('  ALL SCHEMAS PASSED'))
  : c.bold(c.red('  SOME SCHEMAS FAILED')));
console.log(c.bold(c.cyan('━'.repeat(60))) + '\n');
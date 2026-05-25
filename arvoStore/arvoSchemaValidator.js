/**
 * avro-schema-validator.js
 *
 * Validates that an Avro schema definition is structurally correct before
 * you use it in production. Catches problems like:
 *   - Unknown / misspelled types
 *   - Missing required fields (name, type, fields for records)
 *   - Duplicate field names
 *   - Invalid default values (must match the first type in a union)
 *   - Circular references
 *   - Invalid enum symbols
 *   - Invalid fixed sizes
 *   - Malformed unions
 *   - Namespace issues
 *
 * Deps: npm install avsc
 */

const avro = require('avsc');

// =============================================================================
// Colour helpers (no dependency â€” plain ANSI)
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
// Primitive types recognised by Avro
// =============================================================================
const PRIMITIVES = new Set([
  'null', 'boolean', 'int', 'long', 'float', 'double', 'bytes', 'string',
]);

const COMPLEX_TYPES = new Set([
  'record', 'enum', 'array', 'map', 'union', 'fixed',
]);

// =============================================================================
// Result collector
// =============================================================================
class ValidationResult {
  constructor() {
    this.errors   = [];
    this.warnings = [];
    this.infos    = [];
  }

  error(path, message)   { this.errors.push({ path, message }); }
  warn(path, message)    { this.warnings.push({ path, message }); }
  info(path, message)    { this.infos.push({ path, message }); }

  get ok() { return this.errors.length === 0; }
}

// =============================================================================
// Core schema validator
// =============================================================================
class AvroSchemaValidator {

  constructor() {
    this.result     = new ValidationResult();
    this.namedTypes = new Map();   // name â†’ definition (for reference resolution)
    this.visiting   = new Set();   // circular reference detection
  }

  validate(schema) {
    this.#validateNode(schema, '$');
    return this.result;
  }

  // ---------------------------------------------------------------------------
  // Dispatch by type
  // ---------------------------------------------------------------------------
  #validateNode(node, path) {
    if (node === null || node === undefined) {
      this.result.error(path, 'Schema node is null or undefined');
      return;
    }

    // String shorthand e.g. "string", "int", or a named type reference
    if (typeof node === 'string') {
      this.#validateTypeReference(node, path);
      return;
    }

    // Union â€” array of types
    if (Array.isArray(node)) {
      this.#validateUnion(node, path);
      return;
    }

    // Complex type object
    if (typeof node === 'object') {
      const type = node.type;
      if (!type) {
        this.result.error(path, 'Missing "type" property');
        return;
      }

      if (typeof type === 'string') {
        switch (type) {
          case 'record': return this.#validateRecord(node, path);
          case 'enum':   return this.#validateEnum(node, path);
          case 'array':  return this.#validateArray(node, path);
          case 'map':    return this.#validateMap(node, path);
          case 'fixed':  return this.#validateFixed(node, path);
          default:
            if (PRIMITIVES.has(type)) {
              // e.g. { type: 'string' } is valid but redundant â€” warn
              this.result.warn(path, `Wrapping primitive "${type}" in an object is valid but verbose â€” use the string shorthand`);
            } else {
              this.result.error(path, `Unknown type "${type}"`);
            }
        }
      } else if (Array.isArray(type)) {
        // type itself is a union array e.g. { type: ['null', 'string'] }
        this.#validateUnion(type, path + '.type');
      } else if (typeof type === 'object') {
        // Inline nested type
        this.#validateNode(type, path + '.type');
      } else {
        this.result.error(path, `"type" must be a string, array, or object â€” got ${typeof type}`);
      }
      return;
    }

    this.result.error(path, `Unexpected schema node type: ${typeof node}`);
  }

  // ---------------------------------------------------------------------------
  // Primitive / named type reference
  // ---------------------------------------------------------------------------
  #validateTypeReference(name, path) {
    if (PRIMITIVES.has(name)) return; // fine

    // Named type reference â€” must have been defined earlier
    if (!this.namedTypes.has(name)) {
      // Could still be valid if it's defined later in the file â€” warn, not error
      this.result.warn(path, `Named type "${name}" referenced before definition (or never defined)`);
    }
  }

  // ---------------------------------------------------------------------------
  // record
  // ---------------------------------------------------------------------------
  #validateRecord(node, path) {
    // Required: name
    if (!node.name || typeof node.name !== 'string') {
      this.result.error(path, 'Record is missing a "name" (must be a string)');
    } else {
      this.#validateIdentifier(node.name, `${path}.name`);
      const fullName = node.namespace ? `${node.namespace}.${node.name}` : node.name;

      // Duplicate type name
      if (this.namedTypes.has(fullName)) {
        this.result.error(path, `Duplicate type name "${fullName}"`);
      } else {
        this.namedTypes.set(fullName, node);
        // Also register without namespace so short-name refs work
        if (!this.namedTypes.has(node.name)) {
          this.namedTypes.set(node.name, node);
        }
      }

      // Circular reference detection
      if (this.visiting.has(fullName)) {
        this.result.error(path, `Circular reference detected for type "${fullName}"`);
        return;
      }
      this.visiting.add(fullName);
    }

    // Namespace â€” optional but must be a string if present
    if (node.namespace !== undefined && typeof node.namespace !== 'string') {
      this.result.error(`${path}.namespace`, '"namespace" must be a string');
    }

    // Doc â€” optional but warn if very long
    if (node.doc !== undefined) {
      if (typeof node.doc !== 'string') {
        this.result.warn(`${path}.doc`, '"doc" should be a string');
      } else if (node.doc.length > 500) {
        this.result.warn(`${path}.doc`, 'Doc string is very long (>500 chars) â€” consider shortening');
      }
    }

    // Required: fields array
    if (!Array.isArray(node.fields)) {
      this.result.error(path, 'Record must have a "fields" array');
      if (node.name) this.visiting.delete(node.name);
      return;
    }

    if (node.fields.length === 0) {
      this.result.warn(path, 'Record has zero fields');
    }

    // Validate each field â€” check for duplicates
    const seen = new Set();
    node.fields.forEach((field, i) => {
      const fp = `${path}.fields[${i}]`;
      this.#validateField(field, fp, seen);
    });

    if (node.name) this.visiting.delete(node.name);
  }

  // ---------------------------------------------------------------------------
  // Record field
  // ---------------------------------------------------------------------------
  #validateField(field, path, seenNames) {
    if (!field || typeof field !== 'object') {
      this.result.error(path, 'Field must be an object');
      return;
    }

    // name
    if (!field.name || typeof field.name !== 'string') {
      this.result.error(path, 'Field is missing a "name"');
    } else {
      this.#validateIdentifier(field.name, `${path}.name`);
      if (seenNames.has(field.name)) {
        this.result.error(path, `Duplicate field name "${field.name}"`);
      } else {
        seenNames.add(field.name);
      }
    }

    // type
    if (field.type === undefined) {
      this.result.error(path, `Field "${field.name}" is missing a "type"`);
    } else {
      this.#validateNode(field.type, `${path}.type`);
    }

    // default â€” must be compatible with the first branch of a union, or the type itself
    if (field.default !== undefined) {
      this.#validateDefault(field.default, field.type, `${path}.default`);
    }

    // order â€” optional but must be one of three values
    if (field.order !== undefined) {
      if (!['ascending', 'descending', 'ignore'].includes(field.order)) {
        this.result.error(`${path}.order`, `"order" must be "ascending", "descending", or "ignore" â€” got "${field.order}"`);
      }
    }

    // aliases â€” optional array of strings
    if (field.aliases !== undefined) {
      if (!Array.isArray(field.aliases) || !field.aliases.every(a => typeof a === 'string')) {
        this.result.warn(`${path}.aliases`, '"aliases" should be an array of strings');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // enum
  // ---------------------------------------------------------------------------
  #validateEnum(node, path) {
    if (!node.name || typeof node.name !== 'string') {
      this.result.error(path, 'Enum is missing a "name"');
    } else {
      this.#validateIdentifier(node.name, `${path}.name`);
      if (this.namedTypes.has(node.name)) {
        this.result.error(path, `Duplicate type name "${node.name}"`);
      } else {
        this.namedTypes.set(node.name, node);
      }
    }

    if (!Array.isArray(node.symbols) || node.symbols.length === 0) {
      this.result.error(path, 'Enum must have a non-empty "symbols" array');
      return;
    }

    const seen = new Set();
    node.symbols.forEach((sym, i) => {
      if (typeof sym !== 'string') {
        this.result.error(`${path}.symbols[${i}]`, `Symbol must be a string â€” got ${typeof sym}`);
      } else if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(sym)) {
        this.result.error(`${path}.symbols[${i}]`, `Invalid enum symbol "${sym}" â€” must match [A-Za-z_][A-Za-z0-9_]*`);
      } else if (seen.has(sym)) {
        this.result.error(`${path}.symbols[${i}]`, `Duplicate enum symbol "${sym}"`);
      } else {
        seen.add(sym);
      }
    });

    // default must be one of the symbols
    if (node.default !== undefined) {
      if (!node.symbols.includes(node.default)) {
        this.result.error(`${path}.default`, `Default "${node.default}" is not in symbols [${node.symbols.join(', ')}]`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // array
  // ---------------------------------------------------------------------------
  #validateArray(node, path) {
    if (node.items === undefined) {
      this.result.error(path, 'Array type is missing "items"');
    } else {
      this.#validateNode(node.items, `${path}.items`);
    }
  }

  // ---------------------------------------------------------------------------
  // map
  // ---------------------------------------------------------------------------
  #validateMap(node, path) {
    if (node.values === undefined) {
      this.result.error(path, 'Map type is missing "values"');
    } else {
      this.#validateNode(node.values, `${path}.values`);
    }
    // Avro maps always have string keys â€” warn if someone added a keys field
    if (node.keys !== undefined) {
      this.result.warn(path, 'Avro maps always use string keys â€” the "keys" field is ignored');
    }
  }

  // ---------------------------------------------------------------------------
  // fixed
  // ---------------------------------------------------------------------------
  #validateFixed(node, path) {
    if (!node.name || typeof node.name !== 'string') {
      this.result.error(path, 'Fixed type is missing a "name"');
    } else {
      this.namedTypes.set(node.name, node);
    }

    if (typeof node.size !== 'number' || !Number.isInteger(node.size) || node.size <= 0) {
      this.result.error(path, `Fixed "size" must be a positive integer â€” got ${JSON.stringify(node.size)}`);
    }
  }

  // ---------------------------------------------------------------------------
  // union  (array of types)
  // ---------------------------------------------------------------------------
  #validateUnion(arr, path) {
    if (arr.length === 0) {
      this.result.error(path, 'Union must have at least one type');
      return;
    }

    // Avro rule: no duplicate types in a union
    const seen = new Set();
    arr.forEach((branch, i) => {
      const bp = `${path}[${i}]`;

      // Get branch type name for duplicate checking
      const typeName = typeof branch === 'string'
        ? branch
        : Array.isArray(branch)
          ? 'union'                      // nested unions are forbidden
          : branch?.type ?? 'unknown';

      if (typeName === 'union') {
        this.result.error(bp, 'Nested unions are not allowed in Avro');
      } else if (seen.has(typeName)) {
        this.result.error(bp, `Duplicate type "${typeName}" in union`);
      } else {
        seen.add(typeName);
        this.#validateNode(branch, bp);
      }
    });

    // Warn if null is not first â€” default values must match the first branch
    if (arr.includes('null') && arr[0] !== 'null') {
      this.result.warn(path, '"null" is not the first type in this union â€” if you want a null default, null must be first');
    }
  }

  // ---------------------------------------------------------------------------
  // Default value compatibility check
  // ---------------------------------------------------------------------------
  #validateDefault(defaultVal, type, path) {
    // Resolve the expected type â€” for unions, it's the FIRST branch
    const expectedType = Array.isArray(type) ? type[0] : type;
    const typeName = typeof expectedType === 'string' ? expectedType : expectedType?.type;

    if (!typeName) return; // can't determine â€” skip

    const checks = {
      'null':    v => v === null,
      'boolean': v => typeof v === 'boolean',
      'int':     v => typeof v === 'number' && Number.isInteger(v),
      'long':    v => typeof v === 'number' && Number.isInteger(v),
      'float':   v => typeof v === 'number',
      'double':  v => typeof v === 'number',
      'string':  v => typeof v === 'string',
      'bytes':   v => typeof v === 'string',
      'array':   v => Array.isArray(v),
      'map':     v => typeof v === 'object' && v !== null && !Array.isArray(v),
      'record':  v => typeof v === 'object' && v !== null && !Array.isArray(v),
    };

    const check = checks[typeName];
    if (check && !check(defaultVal)) {
      this.result.error(
        path,
        `Default value ${JSON.stringify(defaultVal)} is incompatible with type "${typeName}"`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Identifier validation  (record/field/enum names)
  // ---------------------------------------------------------------------------
  #validateIdentifier(name, path) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      this.result.error(path, `"${name}" is not a valid Avro identifier — must match [A-Za-z_][A-Za-z0-9_]*`);
    }
  }
}

module.exports = { AvroSchemaValidator, ValidationResult };

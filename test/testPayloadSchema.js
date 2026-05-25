const { AvroStore } = require('../lib/arvo.js');

async function testSchemaInference() {
  console.log('Testing Schema Inference from Payload...\n');

  // Test 1: Single object
  console.log('Test 1: Infer schema from single object');
  const payload1 = { id: 1, name: 'John', age: 30, active: true, salary: 50000.50 };
  const schema1 = AvroStore.inferSchemaFromPayload(payload1, 'users');
  console.log('✓ Schema inferred successfully');
  console.log('Fields:');
  schema1.fields.forEach(f => console.log(`  - ${f.name}: ${f.type}`));

  const store1 = new AvroStore(schema1, 'users');
  store1.add(payload1);
  console.log(`✓ Record added, store size: ${store1.size}\n`);

  // Test 2: Array of objects
  console.log('Test 2: Infer schema from array of objects');
  const payload2 = [
    { id: 1, name: 'Alice', age: 25, active: true },
    { id: 2, name: 'Bob', age: 30, active: false },
    { id: 3, name: 'Charlie', age: 35, active: true }
  ];
  const schema2 = AvroStore.inferSchemaFromPayload(payload2, 'employees');
  console.log('✓ Schema inferred from first record');
  console.log('Fields:');
  schema2.fields.forEach(f => console.log(`  - ${f.name}: ${f.type}`));

  const store2 = new AvroStore(schema2, 'employees');
  store2.addMany(payload2);
  console.log(`✓ Records added, store size: ${store2.size}\n`);

  // Test 3: Mixed types
  console.log('Test 3: Infer schema with mixed types');
  const payload3 = { 
    user_id: 123, 
    email: 'user@example.com', 
    premium: true, 
    balance: 1234.56,
    tags: ['vip', 'verified'],
    profile: { city: 'New York', country: 'USA' }
  };
  const schema3 = AvroStore.inferSchemaFromPayload(payload3, 'accounts');
  console.log('✓ Schema inferred with complex types');
  console.log('Fields:');
  schema3.fields.forEach(f => {
    const typeStr = typeof f.type === 'string' ? f.type : JSON.stringify(f.type);
    console.log(`  - ${f.name}: ${typeStr}`);
  });

  const store3 = new AvroStore(schema3, 'accounts');
  store3.add(payload3);
  console.log(`✓ Complex record added, store size: ${store3.size}\n`);

  console.log('✓ All schema inference tests passed!');
}

testSchemaInference().catch(err => {
  console.error('✗ Test failed:', err.message);
  process.exit(1);
});

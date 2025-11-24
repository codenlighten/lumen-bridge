/**
 * Practical Examples of SchemaGenerator Usage
 * Demonstrates real-world scenarios
 */

import SchemaAgent from './agents/SchemaGenerator.js';
import { SchemaRegistry } from './utilities/SchemaRegistry.js';

console.log('\n' + '='.repeat(70));
console.log('💼 PRACTICAL SCHEMA GENERATOR EXAMPLES');
console.log('='.repeat(70) + '\n');

const schemaAgent = new SchemaAgent();
const registry = new SchemaRegistry();

// Example 1: API Endpoint Schema
console.log('📡 Example 1: REST API Endpoint Schema\n');
const apiEndpoint = await schemaAgent.generateSchema({
  userPrompt: `Design a schema for a user authentication endpoint that accepts:
  - username or email
  - password
  - optional remember_me boolean
  - optional device_info object with browser and OS`,
  extraConstraints: {
    securityLevel: 'high',
    requireStrongPassword: true
  }
});

console.log(`✅ ${apiEndpoint.schemaName}`);
console.log(`   ${apiEndpoint.schemaDescription}\n`);
console.log('   Generated Schema:');
console.log(JSON.stringify(apiEndpoint.generatedSchema, null, 2));
console.log('\n   Design Rationale:', apiEndpoint.designRationale);

// Example 2: Database Model Schema
console.log('\n' + '='.repeat(70));
console.log('💾 Example 2: Database Model Schema\n');
const dbModel = await schemaAgent.generateSchema({
  userPrompt: `Create a MongoDB schema for a blog post collection with:
  - _id (ObjectId)
  - title (required, max 200 chars)
  - slug (unique URL-friendly identifier)
  - content (markdown text)
  - author reference (ObjectId)
  - status (draft, published, archived)
  - publishedAt (optional date)
  - tags (array of strings)
  - metadata (views, likes, comments count)
  - timestamps (createdAt, updatedAt)`,
  extraConstraints: {
    database: 'MongoDB',
    useTimestamps: true,
    allowNull: false
  }
});

console.log(`✅ ${dbModel.schemaName}`);
console.log(`   ${dbModel.schemaDescription}\n`);
console.log('   Key Properties:', Object.keys(dbModel.generatedSchema.properties).join(', '));

// Register it
await registry.registerSchema({
  schemaName: dbModel.schemaName,
  schema: dbModel.generatedSchema,
  description: dbModel.schemaDescription,
  metadata: { use_case: 'database_model', database: 'MongoDB' }
});
console.log('   ✅ Registered in SchemaRegistry');

// Example 3: Form Validation Schema
console.log('\n' + '='.repeat(70));
console.log('📝 Example 3: Form Validation Schema\n');
const formSchema = await schemaAgent.generateSchema({
  userPrompt: `Create a schema for validating a registration form with:
  - Full name (2-100 chars)
  - Email (valid format)
  - Password (min 8 chars, must have uppercase, lowercase, number, special char)
  - Confirm password (must match password)
  - Date of birth (must be 13+ years old)
  - Country (from predefined list)
  - Terms accepted (boolean, required to be true)`,
  extraConstraints: {
    purpose: 'frontend_validation',
    errorMessages: true
  }
});

console.log(`✅ ${formSchema.schemaName}`);
console.log(`   ${formSchema.schemaDescription}\n`);

// Example 4: Event/Message Schema
console.log('\n' + '='.repeat(70));
console.log('📨 Example 4: Event/Message Bus Schema\n');
const eventSchema = await schemaAgent.generateSchema({
  userPrompt: `Design a schema for events in a message bus system:
  - event_id (UUID)
  - event_type (enum: user.created, order.placed, payment.completed, etc.)
  - timestamp (ISO 8601)
  - source (service name that generated the event)
  - payload (flexible object based on event type)
  - metadata (correlation_id, user_id, session_id)
  - version (semantic versioning)`,
  extraConstraints: {
    system: 'event-driven-architecture',
    requireVersioning: true
  }
});

console.log(`✅ ${eventSchema.schemaName}`);
console.log(`   ${eventSchema.schemaDescription}`);

// Example 5: Configuration File Schema
console.log('\n' + '='.repeat(70));
console.log('⚙️  Example 5: Application Configuration Schema\n');
const configSchema = await schemaAgent.generateSchema({
  userPrompt: `Create a schema for an application config file with:
  - app section: name, version, environment (dev/staging/prod)
  - server section: host, port, ssl settings
  - database section: connection string, pool settings, retry options
  - logging section: level, file path, rotation settings
  - features section: object of feature flags (boolean values)
  - external_services: array of service configs with name, url, timeout, api_key`,
  extraConstraints: {
    format: 'JSON',
    allowEnvironmentVariables: true
  }
});

console.log(`✅ ${configSchema.schemaName}`);
console.log(`   ${configSchema.schemaDescription}`);
console.log('\n   Top-level sections:', Object.keys(configSchema.generatedSchema.properties).join(', '));

// Example 6: Testing - Generate Schema from Existing Data
console.log('\n' + '='.repeat(70));
console.log('🧪 Example 6: Schema from Sample Data\n');

const sampleData = {
  transaction_id: "tx_123456",
  amount: 99.99,
  currency: "USD",
  customer: {
    id: "cust_789",
    email: "user@example.com"
  },
  items: [
    { sku: "ITEM-001", quantity: 2, price: 49.99 }
  ],
  status: "completed",
  created_at: "2025-11-24T10:00:00Z"
};

const inferredSchema = await schemaAgent.generateSchema({
  userPrompt: `Based on this sample transaction data, create a comprehensive schema that would validate this structure:

${JSON.stringify(sampleData, null, 2)}

Include proper types, required fields, and any obvious constraints.`
});

console.log(`✅ ${inferredSchema.schemaName}`);
console.log(`   ${inferredSchema.schemaDescription}`);
console.log('\n   Inferred from sample data ✅');

// Example 7: Nested Complex Schema
console.log('\n' + '='.repeat(70));
console.log('🏗️  Example 7: Complex Nested Schema\n');
const complexSchema = await schemaAgent.generateSchema({
  userPrompt: `Create a schema for a cloud infrastructure deployment manifest:
  - metadata: name, version, author, description
  - resources: array of resource definitions
    - each resource: type (vm, database, storage, network), name, region
    - each resource has type-specific configuration object
  - dependencies: array showing which resources depend on others
  - environment_variables: object of key-value pairs
  - deployment_strategy: rolling, blue-green, or canary
  - rollback_policy: automatic or manual, with conditions
  - monitoring: health checks, alerts, logging configuration`,
  extraConstraints: {
    validation: 'strict',
    documentation: 'include_examples'
  }
});

console.log(`✅ ${complexSchema.schemaName}`);
console.log(`   ${complexSchema.schemaDescription}`);

// Summary
console.log('\n' + '='.repeat(70));
console.log('📊 SUMMARY OF EXAMPLES');
console.log('='.repeat(70) + '\n');

const allSchemas = [
  apiEndpoint,
  dbModel,
  formSchema,
  eventSchema,
  configSchema,
  inferredSchema,
  complexSchema
];

console.log(`✅ Generated ${allSchemas.length} practical schemas:\n`);
allSchemas.forEach((schema, index) => {
  console.log(`${index + 1}. ${schema.schemaName}`);
  console.log(`   Use case: ${schema.schemaDescription.substring(0, 80)}...`);
});

console.log('\n💡 Key Takeaways:');
console.log('   • SchemaAgent generates production-ready JSON schemas');
console.log('   • Works with natural language descriptions');
console.log('   • Handles complex nested structures');
console.log('   • Includes design rationale and context');
console.log('   • Perfect for API design, validation, documentation');
console.log('   • Cryptographically signed for integrity');
console.log('\n✅ SchemaGenerator is ready for production use!\n');

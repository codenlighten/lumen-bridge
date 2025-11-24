/**
 * Test SchemaGenerator functionality
 */

import SchemaAgent from './agents/SchemaGenerator.js';

console.log('\n' + '='.repeat(70));
console.log('🧪 TESTING SCHEMA GENERATOR');
console.log('='.repeat(70) + '\n');

// Initialize the schema agent
const schemaAgent = new SchemaAgent({
  model: 'gpt-4o-mini',
  temperature: 0.1
});

// Test 1: Generate a simple user schema
console.log('📋 Test 1: Generate User Profile Schema\n');
try {
  const userSchemaResult = await schemaAgent.generateSchema({
    userPrompt: 'Create a schema for a user profile with name, email, age, and preferences',
    extraConstraints: {
      requireEmail: true,
      ageMinimum: 13
    }
  });

  console.log('✅ Schema Generated Successfully!\n');
  console.log('Schema Name:', userSchemaResult.schemaName);
  console.log('Description:', userSchemaResult.schemaDescription);
  console.log('\nDesign Rationale:', userSchemaResult.designRationale);
  console.log('\nGenerated Schema:');
  console.log(JSON.stringify(userSchemaResult.generatedSchema, null, 2));
  
  if (userSchemaResult.missingContext && userSchemaResult.missingContext.length > 0) {
    console.log('\n⚠️  Missing Context:');
    userSchemaResult.missingContext.forEach(item => console.log(`  - ${item}`));
  }
  
  console.log('\n📝 Full Response (without schema):');
  console.log('Response:', userSchemaResult.response);
  
  // Check if it has signature
  if (userSchemaResult._signature) {
    console.log('\n🔐 Cryptographic Signature:');
    console.log('  Algorithm:', userSchemaResult._signature.algorithm);
    console.log('  Address:', userSchemaResult._signature.address);
    console.log('  Timestamp:', userSchemaResult._signature.timestamp);
  }
  
} catch (error) {
  console.error('❌ Test 1 Failed:', error.message);
  console.error(error.stack);
}

// Test 2: Generate a more complex schema
console.log('\n' + '='.repeat(70));
console.log('📋 Test 2: Generate API Response Schema\n');
try {
  const apiSchemaResult = await schemaAgent.generateSchema({
    userPrompt: `Create a schema for a REST API response that includes:
    - success boolean
    - data object with user information
    - error object (nullable) with code and message
    - metadata with timestamp and request ID`,
    context: null
  });

  console.log('✅ Schema Generated Successfully!\n');
  console.log('Schema Name:', apiSchemaResult.schemaName);
  console.log('Description:', apiSchemaResult.schemaDescription);
  console.log('\nGenerated Schema:');
  console.log(JSON.stringify(apiSchemaResult.generatedSchema, null, 2));
  
} catch (error) {
  console.error('❌ Test 2 Failed:', error.message);
}

// Test 3: Generate schema with conversation context
console.log('\n' + '='.repeat(70));
console.log('📋 Test 3: Generate Schema with Context Array\n');
try {
  const contextArray = [
    { role: 'user', content: 'I need a schema for blog posts' },
    { role: 'assistant', content: 'What fields should the blog post have?' },
    { role: 'user', content: 'Title, content, author, tags, and published date' }
  ];
  
  const blogSchemaResult = await schemaAgent.generateSchema({
    userPrompt: 'Create the blog post schema based on our conversation',
    context: contextArray
  });

  console.log('✅ Schema Generated Successfully!\n');
  console.log('Schema Name:', blogSchemaResult.schemaName);
  console.log('\nGenerated Schema:');
  console.log(JSON.stringify(blogSchemaResult.generatedSchema, null, 2));
  
} catch (error) {
  console.error('❌ Test 3 Failed:', error.message);
}

// Test 4: Error handling - missing userPrompt
console.log('\n' + '='.repeat(70));
console.log('📋 Test 4: Error Handling Test\n');
try {
  await schemaAgent.generateSchema({
    // Missing userPrompt
    context: {}
  });
  console.log('❌ Should have thrown an error!');
} catch (error) {
  console.log('✅ Correctly threw error:', error.message);
}

console.log('\n' + '='.repeat(70));
console.log('✅ ALL TESTS COMPLETE');
console.log('='.repeat(70) + '\n');

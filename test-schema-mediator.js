/**
 * Test Suite for SchemaMediatorAgent
 * Demonstrates all features including error handling, caching, validation, and context retry
 */

import { SchemaMediatorAgent } from './agents/SchemaMediatorAgent.js';

// Test schemas
const salesforceContactSchema = {
  type: "object",
  properties: {
    FirstName: { type: "string" },
    LastName: { type: "string" },
    Email: { type: "string" },
    Phone: { type: "string" },
    Status__c: { type: "string", enum: ["Active", "Inactive", "Pending"] },
    AccountId: { type: "string" }
  },
  required: ["FirstName", "LastName", "Email"]
};

const internalUserSchema = {
  type: "object",
  properties: {
    fullName: { type: "string" },
    email: { type: "string" },
    phoneNumber: { type: "string" },
    status: { type: "string", enum: ["A", "I", "P"] },
    companyId: { type: "string" }
  },
  required: ["fullName", "email", "status"]
};

const salesforceData = {
  FirstName: "Jane",
  LastName: "Smith",
  Email: "jane.smith@example.com",
  Phone: "+1-555-0123",
  Status__c: "Active",
  AccountId: "ACC-12345"
};

async function runTests() {
  console.log('🧪 Testing SchemaMediatorAgent\n');
  console.log('='.repeat(80));
  
  const mediator = new SchemaMediatorAgent({
    cacheMaxSize: 50,
    cacheTTL: 3600000 // 1 hour
  });

  try {
    // Test 1: Basic Translation
    console.log('\n\n📋 TEST 1: Basic Schema Translation');
    console.log('='.repeat(80));
    const result1 = await mediator.translate({
      data: salesforceData,
      sourceSchema: salesforceContactSchema,
      targetSchema: internalUserSchema,
      sourceSchemaName: 'SalesforceContact',
      targetSchemaName: 'InternalUser',
      context: {
        mappingHints: {
          "Status__c to status": "Map Active→A, Inactive→I, Pending→P"
        }
      }
    });

    console.log('\n✅ Translation Result:');
    console.log(JSON.stringify(result1.transformedData, null, 2));
    console.log('\n📊 Validation:', result1.validation.valid ? '✓ VALID' : '✗ INVALID');
    if (result1.validation.errors?.length > 0) {
      console.log('   Errors:', result1.validation.errors);
    }
    console.log('🔐 Signed:', !!result1._signature);

    // Test 2: Cache Hit
    console.log('\n\n📋 TEST 2: Translation with Cache Hit');
    console.log('='.repeat(80));
    const result2 = await mediator.translate({
      data: {
        FirstName: "John",
        LastName: "Doe",
        Email: "john.doe@example.com",
        Phone: "+1-555-9999",
        Status__c: "Inactive",
        AccountId: "ACC-67890"
      },
      sourceSchema: salesforceContactSchema,
      targetSchema: internalUserSchema,
      sourceSchemaName: 'SalesforceContact',
      targetSchemaName: 'InternalUser'
    });

    console.log('\n✅ Second Translation (should use cache):');
    console.log(JSON.stringify(result2.transformedData, null, 2));
    console.log('\n📊 Cache Hit:', result2._metadata.cacheHit ? '✓ YES' : '✗ NO');

    // Test 3: Statistics
    console.log('\n\n📋 TEST 3: Translation Statistics');
    console.log('='.repeat(80));
    const stats = mediator.getStats();
    console.log(JSON.stringify(stats, null, 2));

    // Test 4: Schema Inference
    console.log('\n\n📋 TEST 4: Schema Inference');
    console.log('='.repeat(80));
    const sampleData = {
      id: 123,
      name: "Product A",
      price: 29.99,
      inStock: true,
      tags: ["electronics", "sale"]
    };
    
    const inferredSchema = await mediator.inferSchema(sampleData, 'ProductSchema');
    console.log('\n✅ Inferred Schema:');
    console.log(JSON.stringify(inferredSchema.schema, null, 2));
    console.log('\n📊 Confidence:', (inferredSchema.confidence * 100).toFixed(1) + '%');

    // Test 5: Bidirectional Mapping
    console.log('\n\n📋 TEST 5: Bidirectional Mapping');
    console.log('='.repeat(80));
    const biMapping = await mediator.createBidirectionalMapping(
      salesforceContactSchema,
      internalUserSchema,
      'SalesforceContact',
      'InternalUser'
    );
    console.log('✅ Created bidirectional mappings');
    console.log('   Forward fields:', biMapping.forward.fieldMappings?.length || 0);
    console.log('   Reverse fields:', biMapping.reverse.fieldMappings?.length || 0);

    // Test 6: Validation Enforcement
    console.log('\n\n📋 TEST 6: Validation Enforcement');
    console.log('='.repeat(80));
    const invalidData = {
      FirstName: "Bob"
      // Missing required LastName and Email
    };

    try {
      const result6 = await mediator.translate({
        data: invalidData,
        sourceSchema: salesforceContactSchema,
        targetSchema: internalUserSchema,
        sourceSchemaName: 'SalesforceContact',
        targetSchemaName: 'InternalUser',
        enforceValidation: true // This should throw if validation fails
      });
      
      if (!result6.success) {
        console.log('❌ Translation failed (expected):', result6.error);
      } else {
        console.log('⚠️  Translation succeeded despite validation (check validation logic)');
      }
    } catch (error) {
      console.log('✅ Validation enforcement working:', error.message);
    }

    // Test 7: Retry with Context
    console.log('\n\n📋 TEST 7: Retry with Additional Context');
    console.log('='.repeat(80));
    const firstAttempt = await mediator.translate({
      data: salesforceData,
      sourceSchema: salesforceContactSchema,
      targetSchema: internalUserSchema,
      sourceSchemaName: 'SF_Contact_V2',
      targetSchemaName: 'Internal_User_V2'
    });

    if (firstAttempt.missingContext?.length > 0) {
      console.log('ℹ️  Missing context identified:', firstAttempt.missingContext);
      
      const retryResult = await mediator.retryWithContext({
        data: salesforceData,
        sourceSchema: salesforceContactSchema,
        targetSchema: internalUserSchema,
        sourceSchemaName: 'SF_Contact_V2',
        targetSchemaName: 'Internal_User_V2',
        previousMissingContext: firstAttempt.missingContext,
        additionalContext: {
          statusMapping: "Active→A, Inactive→I, Pending→P",
          nameFormat: "Combine FirstName and LastName with space"
        }
      });

      console.log('✅ Retry with context completed');
      console.log('   Original missing context items:', firstAttempt.missingContext.length);
      console.log('   New missing context items:', retryResult.missingContext?.length || 0);
    } else {
      console.log('✅ No missing context in first attempt');
    }

    // Test 8: Cache Management
    console.log('\n\n📋 TEST 8: Cache Management');
    console.log('='.repeat(80));
    console.log('Cache size before clear:', mediator.getStats().cacheSize);
    mediator.clearCache();
    console.log('Cache size after clear:', mediator.getStats().cacheSize);

    // Final Statistics
    console.log('\n\n📊 FINAL STATISTICS');
    console.log('='.repeat(80));
    const finalStats = mediator.getStats();
    console.log(JSON.stringify(finalStats, null, 2));

    console.log('\n\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('\n\n❌ Test suite failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error);

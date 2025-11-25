/**
 * Test Schema Mediator API Endpoints
 * Demonstrates how to use the Schema Mediator via REST API
 */

const API_BASE = 'http://localhost:3000';

// Test schemas
const salesforceContactSchema = {
  type: "object",
  properties: {
    FirstName: { type: "string" },
    LastName: { type: "string" },
    Email: { type: "string" },
    Phone: { type: "string" },
    Status__c: { type: "string", enum: ["Active", "Inactive", "Pending"] }
  },
  required: ["FirstName", "LastName", "Email"]
};

const internalUserSchema = {
  type: "object",
  properties: {
    fullName: { type: "string" },
    email: { type: "string" },
    phoneNumber: { type: "string" },
    status: { type: "string", enum: ["A", "I", "P"] }
  },
  required: ["fullName", "email", "status"]
};

const salesforceData = {
  FirstName: "Alice",
  LastName: "Johnson",
  Email: "alice.johnson@example.com",
  Phone: "+1-555-1234",
  Status__c: "Active"
};

async function testAPI() {
  console.log('🧪 Testing Schema Mediator API Endpoints\n');
  console.log('='.repeat(80));

  try {
    // Test 1: Translation
    console.log('\n\n📋 TEST 1: Schema Translation via API');
    console.log('='.repeat(80));
    
    const translateResponse = await fetch(`${API_BASE}/api/schema/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      })
    });

    const translateResult = await translateResponse.json();
    console.log('\n✅ Translation Result:');
    console.log(JSON.stringify(translateResult.transformedData, null, 2));
    console.log('\n📊 Success:', translateResult.success);
    console.log('📊 Valid:', translateResult.validation?.valid);

    // Test 2: Schema Inference
    console.log('\n\n📋 TEST 2: Schema Inference via API');
    console.log('='.repeat(80));

    const sampleData = {
      orderId: 12345,
      customer: "John Doe",
      total: 199.99,
      isPaid: true,
      items: ["Widget A", "Widget B"]
    };

    const inferResponse = await fetch(`${API_BASE}/api/schema/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: sampleData,
        schemaName: 'OrderSchema'
      })
    });

    const inferResult = await inferResponse.json();
    console.log('\n✅ Inferred Schema:');
    console.log(JSON.stringify(inferResult.schema, null, 2));
    console.log('\n📊 Confidence:', (inferResult.confidence * 100).toFixed(1) + '%');

    // Test 3: Bidirectional Mapping
    console.log('\n\n📋 TEST 3: Bidirectional Mapping via API');
    console.log('='.repeat(80));

    const biMappingResponse = await fetch(`${API_BASE}/api/schema/mapping/bidirectional`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schemaA: salesforceContactSchema,
        schemaB: internalUserSchema,
        schemaNameA: 'SalesforceContact',
        schemaNameB: 'InternalUser'
      })
    });

    const biMappingResult = await biMappingResponse.json();
    console.log('\n✅ Bidirectional Mapping Created');
    console.log('   Forward mappings:', biMappingResult.forward?.fieldMappings?.length || 0);
    console.log('   Reverse mappings:', biMappingResult.reverse?.fieldMappings?.length || 0);

    // Test 4: Get Statistics
    console.log('\n\n📋 TEST 4: Schema Mediator Statistics via API');
    console.log('='.repeat(80));

    const statsResponse = await fetch(`${API_BASE}/api/schema/mediator/stats`);
    const statsResult = await statsResponse.json();
    
    console.log('\n📊 Statistics:');
    console.log(JSON.stringify(statsResult.stats, null, 2));

    // Test 5: Second Translation (Cache Hit)
    console.log('\n\n📋 TEST 5: Second Translation (Should Use Cache)');
    console.log('='.repeat(80));

    const translateResponse2 = await fetch(`${API_BASE}/api/schema/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          FirstName: "Bob",
          LastName: "Williams",
          Email: "bob@example.com",
          Phone: "+1-555-9999",
          Status__c: "Inactive"
        },
        sourceSchema: salesforceContactSchema,
        targetSchema: internalUserSchema,
        sourceSchemaName: 'SalesforceContact',
        targetSchemaName: 'InternalUser'
      })
    });

    const translateResult2 = await translateResponse2.json();
    console.log('\n✅ Translation Result:');
    console.log(JSON.stringify(translateResult2.transformedData, null, 2));
    console.log('\n📊 Cache Hit:', translateResult2._metadata?.cacheHit);

    // Test 6: Final Statistics
    console.log('\n\n📋 TEST 6: Final Statistics');
    console.log('='.repeat(80));

    const finalStatsResponse = await fetch(`${API_BASE}/api/schema/mediator/stats`);
    const finalStatsResult = await finalStatsResponse.json();
    
    console.log('\n📊 Final Statistics:');
    console.log(JSON.stringify(finalStatsResult.stats, null, 2));

    console.log('\n\n✅ All API tests completed successfully!');
    console.log('\n💡 Schema Mediator API is fully operational at:');
    console.log('   POST /api/schema/translate');
    console.log('   POST /api/schema/infer');
    console.log('   POST /api/schema/mapping/bidirectional');
    console.log('   POST /api/schema/translate/retry');
    console.log('   GET  /api/schema/mediator/stats');
    console.log('   POST /api/schema/mediator/cache/clear');

  } catch (error) {
    console.error('\n\n❌ API test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
testAPI().catch(console.error);

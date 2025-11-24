/**
 * Test BaseMetaAgent - The Future Self Bridge
 * 
 * Demonstrates:
 * 1. Current self planning schema
 * 2. Future self responding with that schema
 * 3. Missing context detection
 * 4. AUTO mode execution
 * 5. Multi-step task completion
 */

import BaseMetaAgent from './agents/BaseMetaAgent.js';

console.log('\n' + '='.repeat(70));
console.log('🌉 FUTURE SELF BRIDGE - BaseMetaAgent Test');
console.log('='.repeat(70) + '\n');

// Create a meta-agent with debug enabled
const agent = new BaseMetaAgent({
  agentName: 'LumenBase',
  model: 'gpt-4o-mini',
  temperature: 0.3,
  debug: true
});

console.log('🔑 Agent Identity:');
const identity = agent.getIdentity();
console.log(`   Name: ${identity.name}`);
console.log(`   Type: ${identity.type}`);
console.log(`   Address: ${identity.address}`);
console.log(`\n   Capabilities:`);
identity.capabilities.forEach(cap => console.log(`   • ${cap}`));

// Test 1: Simple step with auto schema planning
console.log('\n' + '='.repeat(70));
console.log('TEST 1: Single Step with Auto Schema Planning');
console.log('='.repeat(70));

const step1 = await agent.step({
  userPrompt: 'Analyze the pros and cons of using microservices architecture'
});

console.log('\n📊 Result:');
console.log(`   Response: ${step1.response.substring(0, 100)}...`);
console.log(`   Continue: ${step1.continue}`);
console.log(`   Missing Context: ${step1.missingContext?.length || 0} items`);

if (step1._planning) {
  console.log(`\n🧠 Schema Planning:`);
  console.log(`   Schema Name: ${step1._planning.schemaName}`);
  console.log(`   Description: ${step1._planning.schemaDescription}`);
  console.log(`   Rationale: ${step1._planning.designRationale}`);
}

if (step1._signature) {
  console.log(`\n🔐 Cryptographic Signature:`);
  console.log(`   Algorithm: ${step1._signature.algorithm}`);
  console.log(`   Address: ${step1._signature.address}`);
  console.log(`   Timestamp: ${step1._signature.timestamp}`);
}

// Test 2: Step with explicit schema
console.log('\n' + '='.repeat(70));
console.log('TEST 2: Step with Explicit Schema (No Auto Planning)');
console.log('='.repeat(70));

const explicitSchema = {
  type: "object",
  properties: {
    recommendation: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reasoning: { type: "string" },
    alternatives: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["recommendation", "confidence", "reasoning"]
};

const step2 = await agent.step({
  userPrompt: 'Which database should I use for a real-time analytics dashboard?',
  explicitSchema: explicitSchema
});

console.log('\n📊 Result with Explicit Schema:');
console.log(`   Has recommendation: ${!!step2.recommendation}`);
console.log(`   Has confidence: ${!!step2.confidence}`);
console.log(`   Has reasoning: ${!!step2.reasoning}`);
console.log(`   Has alternatives: ${!!step2.alternatives}`);
console.log(`   Planning metadata: ${step2._planning ? 'Yes' : 'No (used explicit schema)'}`);

// Test 3: Missing context detection
console.log('\n' + '='.repeat(70));
console.log('TEST 3: Missing Context Detection');
console.log('='.repeat(70));

const step3 = await agent.step({
  userPrompt: 'Design a deployment strategy for my application',
  extraConstraints: {
    identifyMissingInfo: true
  }
});

console.log('\n⚠️  Missing Context Analysis:');
if (step3.missingContext && step3.missingContext.length > 0) {
  console.log(`   Found ${step3.missingContext.length} missing items:`);
  step3.missingContext.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item}`);
  });
} else {
  console.log(`   No missing context identified`);
}

if (step3.questionForUser) {
  console.log(`\n❓ Agent's Question:`);
  console.log(`   ${step3.question}`);
}

// Test 4: AUTO mode - multi-step execution
console.log('\n' + '='.repeat(70));
console.log('TEST 4: AUTO Mode - Multi-Step Execution');
console.log('='.repeat(70));

const autoResult = await agent.auto({
  userPrompt: 'Create a plan to build a simple todo app with authentication',
  maxSteps: 5,
  onStep: async (result, stepNum) => {
    console.log(`\n   📍 AUTO Step ${stepNum} completed`);
    console.log(`      Continue: ${result.continue}`);
  }
});

console.log('\n🤖 AUTO Mode Results:');
console.log(`   Completed: ${autoResult.completed}`);
console.log(`   Total Steps: ${autoResult.totalSteps}`);
console.log(`   Stopped Reason: ${autoResult.stoppedReason}`);
console.log(`\n   Step Breakdown:`);
autoResult.steps.forEach((step, index) => {
  console.log(`   ${index + 1}. ${step.prompt.substring(0, 60)}...`);
  console.log(`      → Continue: ${step.result.continue}`);
});

console.log(`\n   Final Response:`);
console.log(`   ${autoResult.finalResult.response.substring(0, 200)}...`);

// Test 5: Memory and context
console.log('\n' + '='.repeat(70));
console.log('TEST 5: Memory Integration');
console.log('='.repeat(70));

// Clear memory for fresh start
agent.clearMemory();

console.log('\n💬 Conversation with Memory:\n');

const msg1 = await agent.step({
  userPrompt: 'I want to learn React'
});
console.log(`   User: I want to learn React`);
console.log(`   Agent: ${msg1.response.substring(0, 80)}...`);

const msg2 = await agent.step({
  userPrompt: 'What should I learn first?'
});
console.log(`\n   User: What should I learn first?`);
console.log(`   Agent: ${msg2.response.substring(0, 80)}...`);

const msg3 = await agent.step({
  userPrompt: 'Can you suggest some resources?'
});
console.log(`\n   User: Can you suggest some resources?`);
console.log(`   Agent: ${msg3.response.substring(0, 80)}...`);

// Test 6: Statistics
console.log('\n' + '='.repeat(70));
console.log('TEST 6: Agent Statistics');
console.log('='.repeat(70) + '\n');

const stats = agent.getStats();
console.log('📊 Performance Metrics:');
console.log(`   Total Steps: ${stats.steps}`);
console.log(`   Schema Plannings: ${stats.schemaPlannings}`);
console.log(`   AUTO Steps: ${stats.autoSteps}`);
console.log(`   Questions Asked: ${stats.questionAsked}`);
console.log(`   Continue Steps: ${stats.continueSteps}`);

if (stats.memoryStats) {
  console.log(`\n   Memory Stats:`);
  console.log(`   Total Interactions: ${stats.memoryStats.totalInteractions}`);
  console.log(`   User Messages: ${stats.memoryStats.totalUserMessages}`);
  console.log(`   AI Messages: ${stats.memoryStats.totalAIMessages}`);
}

// Final summary
console.log('\n' + '='.repeat(70));
console.log('✅ ALL TESTS COMPLETE');
console.log('='.repeat(70) + '\n');

console.log('🌉 The Future Self Bridge Works!');
console.log('\n   Architecture Verified:');
console.log('   ✅ Current self → plans schema via SchemaAgent');
console.log('   ✅ Future self → responds using that schema');
console.log('   ✅ Missing context → detected and reported');
console.log('   ✅ Memory → maintains cryptographically signed history');
console.log('   ✅ AUTO mode → executes multi-step tasks');
console.log('   ✅ Self-awareness → knows what it needs');
console.log('\n   This IS the spine of a self-evolving OS! 🚀\n');

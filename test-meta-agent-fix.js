/**
 * Test Meta-Agent Phase 1 with nestUserSchema fix
 */
import { MetaAgent } from './agents/MetaAgent.js';

async function testMetaAgent() {
  console.log('🧪 Testing Meta-Agent Phase 1 with nestUserSchema fix...\n');

  const metaAgent = new MetaAgent({
    model: 'gpt-4o-mini-2024-07-18',
    temperature: 0.3
  });

  try {
    // Test Phase 1: Extract agent specification
    const userPrompt = "I need an agent that creates BSV wallets";
    console.log(`📝 User Prompt: "${userPrompt}"\n`);
    
    console.log('⏳ Running Phase 1 (Trigger)...\n');
    const agentSpec = await metaAgent._phase1_trigger(userPrompt);
    
    console.log('✅ Phase 1 completed successfully!\n');
    console.log('📊 Agent Specification:');
    console.log(JSON.stringify(agentSpec, null, 2));
    
    // Validate the structure
    if (agentSpec.name && agentSpec.purpose && agentSpec.inputs && agentSpec.outputs) {
      console.log('\n✅ All required fields present!');
      console.log(`   - Name: ${agentSpec.name}`);
      console.log(`   - Purpose: ${agentSpec.purpose}`);
      console.log(`   - Inputs: ${agentSpec.inputs.join(', ')}`);
      console.log(`   - Outputs: ${agentSpec.outputs.join(', ')}`);
      console.log('\n🎉 Test PASSED! nestUserSchema fix is working correctly.');
    } else {
      console.error('\n❌ Test FAILED: Missing required fields');
      console.error('Expected: name, purpose, inputs, outputs');
      console.error('Got:', Object.keys(agentSpec));
    }
    
  } catch (error) {
    console.error('\n❌ Test FAILED with error:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

testMetaAgent();

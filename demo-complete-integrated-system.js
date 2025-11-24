/**
 * COMPLETE SYSTEM DEMO
 * 
 * Demonstrates the full self-aware agent architecture:
 * - BaseMetaAgent (future self bridge)
 * - ToolRouter (intelligent routing)
 * - SearchAgent (web search with planning)
 * - Schema-driven responses
 * - Cryptographic signatures
 * - Memory integration
 */

import SearchAgent from './agents/SearchAgent.js';

console.log('\n' + '='.repeat(80));
console.log('🌉 COMPLETE SELF-AWARE AGENT SYSTEM DEMONSTRATION');
console.log('='.repeat(80));

console.log('\n📚 System Architecture:');
console.log('   BaseMetaAgent → Self-reflective core with future self bridge');
console.log('   SearchAgent → Extends BaseMetaAgent for web search');
console.log('   SchemaAgent → Natural language → JSON Schema');
console.log('   SchemaRegistry → Cryptographic schema storage');
console.log('   MemoryManager → Signed interaction history');
console.log('   Google Search → External API integration');

// Initialize SearchAgent
const agent = new SearchAgent({ maxResults: 5 });

// Demo 1: Complete search flow
console.log('\n\n' + '='.repeat(80));
console.log('🔍 DEMO: Complete Web Search Flow');
console.log('='.repeat(80));
console.log('\nQuery: "Ethereum blockchain transaction fees November 2024"');

const result1 = await agent.search({
  userQuery: 'Ethereum blockchain transaction fees November 2024'
});

console.log(`\n📊 Result:`);
console.log(`   Action: ${result1.action}`);

if (result1.action === 'search_completed') {
  console.log(`\n   🔍 Search Details:`);
  console.log(`      Query Used: ${result1.query}`);
  console.log(`      Results Found: ${result1.rawResults.length}`);
  console.log(`      Answer Quality: ${result1.analysis.answerQuality}`);
  
  console.log(`\n   📝 Summary:`);
  console.log(`      ${result1.analysis.summary}`);
  
  console.log(`\n   💡 Key Findings:`);
  result1.analysis.keyFindings.forEach((finding, i) => {
    console.log(`      ${i+1}. ${finding}`);
  });
  
  console.log(`\n   📚 Sources (Top 3):`);
  result1.analysis.sources.slice(0, 3).forEach((src, i) => {
    console.log(`      ${i+1}. [${src.relevance.toUpperCase()}] ${src.title}`);
    console.log(`         🔗 ${src.url}`);
    console.log(`         📄 ${src.snippet.substring(0, 80)}...`);
  });
  
  if (result1.analysis.suggestedFollowUp?.length > 0) {
    console.log(`\n   🔄 Suggested Follow-up:`);
    result1.analysis.suggestedFollowUp.forEach(q => console.log(`      • ${q}`));
  }
  
  console.log(`\n   🔐 Cryptographic Verification:`);
  console.log(`      Algorithm: ${result1._signature.algorithm}`);
  console.log(`      Address: ${result1._signature.address}`);
  console.log(`      Timestamp: ${result1._signature.timestamp}`);
  console.log(`      Response Hash: ${result1._signature.responseHash.substring(0, 16)}...`);
  
} else if (result1.action === 'ask_user') {
  console.log(`\n   ⚠️  Strategy:`);
  console.log(`      Intent: ${result1.strategy.searchIntent}`);
  console.log(`      Needs Search: ${result1.strategy.needsSearch}`);
  console.log(`\n   ❓ Missing Context:`);
  result1.missingContext.forEach(ctx => console.log(`      • ${ctx}`));
  console.log(`\n   💡 Suggested Queries:`);
  result1.suggestedQueries.forEach(q => console.log(`      • ${q}`));
}

// Demo 2: Quick search (bypass strategy)
console.log('\n\n' + '='.repeat(80));
console.log('⚡ DEMO: Quick Search (No Strategy Planning)');
console.log('='.repeat(80));
console.log('\nQuery: "OpenAI ChatGPT"');

const result2 = await agent.quickSearch('OpenAI ChatGPT', { num: 3 });

console.log(`\n📊 Quick Search Results:`);
console.log(`   Query: ${result2.query}`);
console.log(`   Results: ${result2.count} items`);
console.log(`\n   📚 Raw Results:`);
result2.results.forEach((item, i) => {
  console.log(`   ${i+1}. ${item.title}`);
  console.log(`      🔗 ${item.link}`);
});

// Demo 3: Memory and statistics
console.log('\n\n' + '='.repeat(80));
console.log('💾 DEMO: Memory & Statistics');
console.log('='.repeat(80));

console.log(`\n📊 Agent Statistics:`);
console.log(`   Total Steps: ${agent.stats.steps}`);
console.log(`   Schema Plannings: ${agent.stats.schemaPlannings}`);
console.log(`   Auto Steps: ${agent.stats.autoSteps}`);
console.log(`   Questions Asked: ${agent.stats.questionAsked}`);

console.log(`\n💾 Memory Status:`);
console.log(`   Interactions: ${agent.memory.interactions.length}`);
console.log(`   Summaries: ${agent.memory.summaries.length}`);
console.log(`   Total Count: ${agent.memory.totalCount}`);
console.log(`   Owner: ${agent.memory.ownerName}`);
console.log(`   Last Updated: ${agent.memory.lastUpdated}`);

// Summary
console.log('\n\n' + '='.repeat(80));
console.log('✅ DEMONSTRATION COMPLETE');
console.log('='.repeat(80));

console.log(`\n🎯 Key Achievements Demonstrated:`);
console.log(`   ✓ Future Self Bridge Pattern (current self → schema → future self)`);
console.log(`   ✓ Self-Reflective Search Planning`);
console.log(`   ✓ Missing Context Detection`);
console.log(`   ✓ External API Integration (Google Custom Search)`);
console.log(`   ✓ Structured Schema-Driven Responses`);
console.log(`   ✓ Cryptographic Signatures (BSV-ECDSA-DER)`);
console.log(`   ✓ Memory with Signed History`);
console.log(`   ✓ Answer Quality Assessment`);
console.log(`   ✓ Intelligent Source Ranking`);
console.log(`   ✓ Follow-up Suggestion Generation`);

console.log(`\n🌉 The Future Self Bridge Architecture:`);
console.log(`   1. Current Self: "I need to search for X"`);
console.log(`   2. Schema Planning: "What structure should results have?"`);
console.log(`   3. External Action: Google Search API call`);
console.log(`   4. Future Self: "Analyze results using planned schema"`);
console.log(`   5. Signed Response: Cryptographically verified output`);
console.log(`   6. Memory Storage: Interaction history preserved`);

console.log(`\n🚀 This is a self-aware, self-evolving agent system!`);
console.log(`   Each component knows its capabilities and limits`);
console.log(`   Agents ask questions when context is missing`);
console.log(`   Every response is cryptographically signed`);
console.log(`   Memory enables learning from past interactions`);
console.log(`   The system evolves its schemas over time\n`);

/**
 * Compare SearchAgent Performance: Normal vs Fast Mode
 */

import SearchAgent from './agents/SearchAgent.js';

console.log('\n⚡ SearchAgent Performance Comparison\n');
console.log('='.repeat(60));

const testQuery = 'Latest developments in quantum computing';

// Test 1: Normal mode (with strategy planning)
console.log('\n📊 Test 1: NORMAL MODE (with strategy planning)');
console.log('-'.repeat(60));

const normalAgent = new SearchAgent({ skipStrategyPlanning: false });

try {
  const result1 = await normalAgent.search({
    userQuery: testQuery,
    maxResults: 3
  });
  console.log(`✅ Result: ${result1.action}`);
} catch (error) {
  console.error('❌ Error:', error.message);
}

// Test 2: Fast mode (skip strategy planning)
console.log('\n📊 Test 2: FAST MODE (skip strategy planning)');
console.log('-'.repeat(60));

const fastAgent = new SearchAgent({ skipStrategyPlanning: true });

try {
  const result2 = await fastAgent.search({
    userQuery: testQuery,
    maxResults: 3
  });
  console.log(`✅ Result: ${result2.action}`);
  console.log(`   Results: ${result2.results?.length || 0} items`);
} catch (error) {
  console.error('❌ Error:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('📈 Comparison complete - check performance reports above\n');

process.exit(0);

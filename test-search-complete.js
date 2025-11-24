/**
 * Complete SearchAgent Test - Full Search Flow
 */

import SearchAgent from './agents/SearchAgent.js';

async function testCompleteSearch() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 COMPLETE SEARCH AGENT TEST');
  console.log('='.repeat(70));
  
  const agent = new SearchAgent();
  
  // Test 1: Specific query that should trigger actual search
  console.log('\n📝 TEST 1: Specific technical query');
  console.log('Query: "Bitcoin blockchain latest block height"');
  
  try {
    const result1 = await agent.search({
      userQuery: 'Bitcoin blockchain latest block height',
      maxResults: 5
    });
    
    console.log(`\n✅ Result: ${result1.action}`);
    console.log(`   Search Intent: ${result1.strategy?.searchIntent}`);
    console.log(`   Needs Search: ${result1.strategy?.needsSearch}`);
    
    if (result1.action === 'search_completed') {
      console.log(`   Query Executed: "${result1.query}"`);
      console.log(`   Raw Results: ${result1.rawResults.length} items`);
      console.log(`   Summary: ${result1.analysis.summary.substring(0, 150)}...`);
      console.log(`   Answer Quality: ${result1.analysis.answerQuality}`);
      console.log(`   Key Findings: ${result1.analysis.keyFindings.length} findings`);
      
      console.log('\n   📚 Top 3 Sources:');
      result1.analysis.sources.slice(0, 3).forEach((src, i) => {
        console.log(`   ${i+1}. [${src.relevance}] ${src.title}`);
        console.log(`      🔗 ${src.url}`);
        console.log(`      📄 ${src.snippet.substring(0, 80)}...`);
      });
      
      if (result1.analysis.suggestedFollowUp?.length > 0) {
        console.log('\n   💡 Suggested Follow-up Searches:');
        result1.analysis.suggestedFollowUp.forEach(q => console.log(`      - ${q}`));
      }
    } else if (result1.action === 'ask_user') {
      console.log(`   ⚠️  Missing Context Detected:`);
      result1.missingContext.forEach(ctx => console.log(`      - ${ctx}`));
      console.log(`\n   💡 Suggested Queries:`);
      result1.suggestedQueries.forEach(q => console.log(`      - ${q}`));
    }
    
  } catch (error) {
    console.error('\n❌ Test 1 Failed:', error.message);
  }
  
  // Test 2: Quick search (bypass strategy)
  console.log('\n\n' + '='.repeat(70));
  console.log('📝 TEST 2: Quick search (no strategy planning)');
  console.log('Query: "Ethereum price"');
  
  try {
    const result2 = await agent.quickSearch('Ethereum price', { num: 3 });
    
    console.log(`\n✅ Quick Search Results:`);
    console.log(`   Query: ${result2.query}`);
    console.log(`   Results: ${result2.count} items`);
    
    if (result2.results.length > 0) {
      console.log('\n   📚 Raw Results:');
      result2.results.forEach((item, i) => {
        console.log(`   ${i+1}. ${item.title}`);
        console.log(`      🔗 ${item.link}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Test 2 Failed:', error.message);
  }
  
  // Test 3: Ambiguous query (should ask for clarification)
  console.log('\n\n' + '='.repeat(70));
  console.log('📝 TEST 3: Ambiguous query (should request clarification)');
  console.log('Query: "best programming language"');
  
  try {
    const result3 = await agent.search({
      userQuery: 'best programming language',
      maxResults: 5
    });
    
    console.log(`\n✅ Result: ${result3.action}`);
    
    if (result3.action === 'ask_user') {
      console.log(`   ✓ Correctly identified ambiguity!`);
      console.log(`\n   ⚠️  Missing Context:`);
      result3.missingContext.forEach(ctx => console.log(`      - ${ctx}`));
      console.log(`\n   💡 Suggested Queries:`);
      result3.suggestedQueries.forEach(q => console.log(`      - ${q}`));
    }
    
  } catch (error) {
    console.error('\n❌ Test 3 Failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✨ All tests completed!');
  console.log('='.repeat(70) + '\n');
}

testCompleteSearch();

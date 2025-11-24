/**
 * Simple SearchAgent Test
 */

import SearchAgent from './agents/SearchAgent.js';

async function simpleTest() {
  console.log('\n🧪 Testing SearchAgent - Simple Query\n');
  
  const agent = new SearchAgent();
  
  try {
    const result = await agent.search({
      userQuery: 'Bitcoin price today',
      maxResults: 3
    });
    
    console.log('\n✅ Search completed!');
    console.log(`   Action: ${result.action}`);
    
    if (result.action === 'search_completed') {
      console.log(`   Query: ${result.query}`);
      console.log(`   Results: ${result.rawResults.length} items`);
      console.log(`   Summary: ${result.analysis.summary.substring(0, 100)}...`);
      console.log(`   Quality: ${result.analysis.answerQuality}`);
      
      console.log('\n   First 2 sources:');
      result.analysis.sources.slice(0, 2).forEach((source, i) => {
        console.log(`   ${i+1}. ${source.title}`);
        console.log(`      ${source.url}`);
        console.log(`      Relevance: ${source.relevance}`);
      });
    } else if (result.action === 'ask_user') {
      console.log('   Missing context:', result.missingContext);
      console.log('   Suggested queries:', result.suggestedQueries);
    }
    
    console.log('\n✨ Test completed successfully\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

simpleTest();

/**
 * Force a real search with a very specific current-data query
 */

import SearchAgent from './agents/SearchAgent.js';

console.log('\n🔍 Testing with specific current-data query...\n');

const agent = new SearchAgent({ maxResults: 3 });

// Use a very specific query that forces search
const result = await agent.search({
  userQuery: 'latest Bitcoin block height today',
  refinedQuery: 'Bitcoin latest block height'  // Skip strategy planning, force search
});

console.log('\n📊 Search Result:');
console.log(`   Action: ${result.action}`);

if (result.action === 'search_completed') {
  console.log(`\n✅ SEARCH EXECUTED SUCCESSFULLY!`);
  console.log(`   Query: ${result.query}`);
  console.log(`   Results: ${result.rawResults.length} items`);
  console.log(`   Quality: ${result.analysis.answerQuality}`);
  
  console.log(`\n   📝 Summary:`);
  console.log(`   ${result.analysis.summary}`);
  
  console.log(`\n   💡 Key Findings:`);
  result.analysis.keyFindings.forEach((f, i) => {
    console.log(`   ${i+1}. ${f}`);
  });
  
  console.log(`\n   📚 Top Sources:`);
  result.analysis.sources.slice(0, 3).forEach((src, i) => {
    console.log(`   ${i+1}. [${src.relevance}] ${src.title.substring(0, 60)}...`);
    console.log(`      ${src.url}`);
  });
  
  console.log(`\n   🔐 Signature:`);
  console.log(`   Address: ${result._signature.address}`);
  console.log(`   Hash: ${result._signature.responseHash.substring(0, 32)}...`);
  
  console.log(`\n✨ Complete search flow working perfectly!\n`);
} else {
  console.log(`   Unexpected action: ${result.action}`);
  if (result.missingContext) {
    console.log(`   Missing: ${result.missingContext.join(', ')}`);
  }
}

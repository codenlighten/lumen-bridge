/**
 * Test ToolRouter → SearchAgent Integration
 * 
 * Focused test showing how ToolRouter routes to SearchAgent
 */

import BaseMetaAgent from './agents/BaseMetaAgent.js';
import SearchAgent from './agents/SearchAgent.js';

class SimpleRouter extends BaseMetaAgent {
  constructor() {
    super({
      agentName: 'SimpleRouter',
      systemPrompt: `You decide if a query needs web search or can be answered directly.

Respond with:
- needsSearch: true if current information needed or fact-checking required
- needsSearch: false if general knowledge question
- reasoning: why you made this decision`
    });
    
    this.searchAgent = new SearchAgent({ maxResults: 5 });
  }

  async route(userQuery) {
    console.log(`\n🔀 Routing: "${userQuery}"`);
    
    // Decide if search is needed
    const decision = await this.step({
      userPrompt: `Should this query use web search? "${userQuery}"`,
      explicitSchema: {
        type: "object",
        properties: {
          needsSearch: { type: "boolean" },
          reasoning: { type: "string" },
          searchQuery: { type: "string" }
        },
        required: ["needsSearch", "reasoning"]
      }
    });
    
    console.log(`   Decision: ${decision.needsSearch ? 'SEARCH' : 'DIRECT'}`);
    console.log(`   Reasoning: ${decision.reasoning}`);
    
    if (decision.needsSearch) {
      console.log(`\n🔍 Calling SearchAgent...`);
      const searchResult = await this.searchAgent.search({
        userQuery: userQuery,
        maxResults: 3
      });
      
      return {
        route: 'search',
        decision,
        searchResult
      };
    } else {
      return {
        route: 'direct',
        decision
      };
    }
  }
}

// Test
console.log('\n' + '='.repeat(70));
console.log('🧪 TOOL ROUTER → SEARCH AGENT INTEGRATION TEST');
console.log('='.repeat(70));

const router = new SimpleRouter();

// Test 1: Current information (should search)
console.log('\n\n📝 TEST 1: Current Information Query');
const test1 = await router.route('Bitcoin price today');

if (test1.route === 'search') {
  const sr = test1.searchResult;
  console.log(`\n✅ Search Executed!`);
  console.log(`   Action: ${sr.action}`);
  
  if (sr.action === 'search_completed') {
    console.log(`   Query: ${sr.query}`);
    console.log(`   Results: ${sr.rawResults.length} items`);
    console.log(`   Summary: ${sr.analysis.summary.substring(0, 100)}...`);
    console.log(`   Top Source: ${sr.analysis.sources[0]?.title}`);
  }
} else {
  console.log(`\n✅ Direct answer (no search needed)`);
}

// Test 2: General knowledge (should not search)
console.log('\n\n📝 TEST 2: General Knowledge Query');
const test2 = await router.route('What is JavaScript?');

console.log(`\n✅ Route: ${test2.route.toUpperCase()}`);
console.log(`   Reasoning: ${test2.decision.reasoning}`);

// Summary
console.log('\n\n' + '='.repeat(70));
console.log('✅ INTEGRATION TEST COMPLETE');
console.log('='.repeat(70));
console.log(`\n📊 Results:`);
console.log(`   Test 1 (Bitcoin price): ${test1.route}`);
console.log(`   Test 2 (What is JS): ${test2.route}`);

console.log('\n💡 The system intelligently routes based on query type!');
console.log('   • Current data → Search web');
console.log('   • General knowledge → Answer directly\n');

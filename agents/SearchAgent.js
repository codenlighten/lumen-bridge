/**
 * SearchAgent - Web Search with Schema-Aware Results
 * 
 * Extends BaseMetaAgent to provide:
 * - Self-reflective search query planning
 * - Structured result schemas
 * - Missing context detection
 * - Cryptographic signing
 * - Memory integration
 */

import BaseMetaAgent from './BaseMetaAgent.js';
import googleSearchService from '../utilities/google-apis.js';
export class SearchAgent extends BaseMetaAgent {
  constructor(options = {}) {
    super({
      agentName: 'SearchAgent',
      ...options,
      systemPrompt: options.systemPrompt || `You are a SearchAgent that helps users find information on the web.

Your responsibilities:
1. Refine search queries for better results
2. Identify missing context that would improve searches
3. Structure search results into meaningful insights
4. Determine if search is needed or if you can answer directly
5. Suggest follow-up searches when appropriate

When given a user request:
- Extract the core search intent
- Identify ambiguities or missing specifications
- Generate optimized search queries
- Structure results for maximum usefulness

Be specific about what additional context would help narrow the search.`
    });
    
    this.searchService = googleSearchService;
    this.maxResults = options.maxResults || 10;
  }

  /**
   * Search with schema-aware results
   */
  async search({
    userQuery,
    refinedQuery = null,
    maxResults = this.maxResults,
    location = null
  }) {
    console.log(`\n🔍 [SearchAgent] Processing: "${userQuery.substring(0, 60)}..."`);

    // Step 1: Plan the search strategy (current self)
    const strategy = await this.step({
      userPrompt: `Analyze this search request and create a search strategy:

User Query: "${userQuery}"

Tasks:
1. Identify what the user is really looking for
2. List any missing context that would improve results
3. Generate 1-3 optimized search queries
4. Decide if search is needed or if you can answer directly`,
      explicitSchema: {
        type: "object",
        properties: {
          searchIntent: { type: "string" },
          missingContext: {
            type: "array",
            items: { type: "string" }
          },
          searchQueries: {
            type: "array",
            items: { type: "string" },
            maxItems: 3
          },
          needsSearch: { type: "boolean" },
          reasoning: { type: "string" },
          suggestedFilters: {
            type: "object",
            properties: {
              timeRange: { type: "string" },
              language: { type: "string" },
              safeSearch: { type: "boolean" }
            }
          }
        },
        required: ["searchIntent", "missingContext", "searchQueries", "needsSearch", "reasoning"]
      }
    });

    // If no search needed, return early
    if (!strategy.needsSearch) {
      return {
        action: 'answer_directly',
        answer: strategy.response,
        strategy
      };
    }

    // If missing context, ask user
    if (strategy.missingContext && strategy.missingContext.length > 0) {
      return {
        action: 'ask_user',
        missingContext: strategy.missingContext,
        suggestedQueries: strategy.searchQueries,
        strategy
      };
    }

    // Step 2: Execute searches
    const searchQuery = refinedQuery || strategy.searchQueries[0];
    console.log(`   🔎 Searching for: "${searchQuery}"`);

    const rawResults = location
      ? await this.searchService.searchWithLocation(searchQuery, location, { num: maxResults })
      : await this.searchService.search(searchQuery, { num: maxResults });

    if (rawResults.length === 0) {
      return {
        action: 'no_results',
        query: searchQuery,
        strategy
      };
    }

    // Step 3: Analyze and structure results (future self)
    const analysis = await this.step({
      userPrompt: `Analyze these search results for the query: "${userQuery}"

Search Results:
${JSON.stringify(rawResults.slice(0, 5), null, 2)}

Task: Create a structured analysis of these results.`,
      explicitSchema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          keyFindings: {
            type: "array",
            items: { type: "string" }
          },
          sources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                url: { type: "string" },
                snippet: { type: "string" },
                relevance: {
                  type: "string",
                  enum: ["high", "medium", "low"]
                }
              }
            }
          },
          answerQuality: {
            type: "string",
            enum: ["complete", "partial", "insufficient"]
          },
          suggestedFollowUp: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["summary", "keyFindings", "sources", "answerQuality"]
      }
    });

    return {
      action: 'search_completed',
      query: searchQuery,
      rawResults: rawResults,
      analysis: analysis,
      strategy: strategy,
      _signature: analysis._signature
    };
  }

  /**
   * Quick search (bypass strategy planning)
   */
  async quickSearch(query, options = {}) {
    const results = await this.searchService.search(query, options);
    return {
      query,
      results,
      count: results.length
    };
  }
}

export default SearchAgent;

// Self-test when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\n🧪 Testing SearchAgent...\n');
  
  const agent = new SearchAgent();
  
  try {
    const result = await agent.search({
      userQuery: 'Latest developments in quantum computing 2024',
      maxResults: 5
    });
    
    console.log('\n✅ Search Result:');
    console.log(`   Action: ${result.action}`);
    
    if (result.strategy) {
      console.log(`\n   Strategy Decision:`);
      console.log(`   - Search Intent: ${result.strategy.searchIntent}`);
      console.log(`   - Needs Search: ${result.strategy.needsSearch}`);
      console.log(`   - Reasoning: ${result.strategy.reasoning}`);
    }
    
    if (result.action === 'search_completed') {
      console.log(`   Query Used: ${result.query}`);
      console.log(`   Raw Results: ${result.rawResults.length} items`);
      console.log(`   Summary: ${result.analysis.summary}`);
      console.log(`   Key Findings: ${result.analysis.keyFindings.length} findings`);
      console.log(`   Answer Quality: ${result.analysis.answerQuality}`);
      
      console.log('\n   Top Sources:');
      result.analysis.sources.slice(0, 3).forEach((source, i) => {
        console.log(`   ${i+1}. [${source.relevance}] ${source.title}`);
        console.log(`      ${source.url}`);
      });
      
      if (result.analysis.suggestedFollowUp?.length > 0) {
        console.log('\n   Suggested Follow-up:');
        result.analysis.suggestedFollowUp.forEach(q => console.log(`   - ${q}`));
      }
    } else if (result.action === 'ask_user') {
      console.log('   Missing Context:', result.missingContext);
      console.log('   Suggested Queries:', result.suggestedQueries);
    } else if (result.action === 'answer_directly') {
      console.log(`   Direct Answer: ${result.answer?.summary || result.answer?.response || JSON.stringify(result.answer, null, 2)}`);
    }
    
    console.log('\n✨ Test completed!\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   API Response:', error.response.status, error.response.statusText);
    }
  }
}

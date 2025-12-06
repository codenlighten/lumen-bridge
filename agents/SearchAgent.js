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
import { PerformanceMonitor } from '../utilities/PerformanceMonitor.js';

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
    this.skipStrategyPlanning = options.skipStrategyPlanning || false; // Performance optimization flag
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
    const perf = new PerformanceMonitor(`SearchAgent.search${this.skipStrategyPlanning ? ' (FAST)' : ''}`);
    console.log(`\n🔍 [SearchAgent] Processing: "${userQuery.substring(0, 60)}..."`);

    // FAST PATH: Skip strategy planning if flag is set
    if (this.skipStrategyPlanning) {
      perf.checkpoint('start');
      
      // Use query directly
      const searchQuery = refinedQuery || userQuery;
      console.log(`   ⚡ Fast mode: Searching directly for: "${searchQuery}"`);
      
      perf.checkpoint('pre-google-search');
      const rawResults = location
        ? await this.searchService.searchWithLocation(searchQuery, location, { num: maxResults })
        : await this.searchService.search(searchQuery, { num: maxResults });
      perf.checkpoint('google-search', { resultCount: rawResults.length });

      if (rawResults.length === 0) {
        perf.print();
        return {
          action: 'no_results',
          query: searchQuery,
          results: [],
          answer: `No results found for: ${searchQuery}`,
          finalAnswer: `No results found for: ${searchQuery}`,
          missingContext: []
        };
      }

      // Simple analysis without strategy planning
      const analysis = await this.step({
        userPrompt: `Analyze these search results for the query: "${userQuery}"

Results:
${JSON.stringify(rawResults.slice(0, 5), null, 2)}

Provide a comprehensive summary.`,
        explicitSchema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            keyFindings: { type: "array", items: { type: "string" } },
            sources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  url: { type: "string" },
                  relevance: { type: "string", enum: ["high", "medium", "low"] }
                }
              }
            },
            answerQuality: { type: "string", enum: ["complete", "partial", "insufficient"] }
          },
          required: ["summary", "keyFindings", "sources", "answerQuality"]
        }
      });
      perf.checkpoint('result-analysis', { tokens: analysis._llm?.usage?.totalTokens });

      perf.print();
      return {
        action: 'search_completed',
        query: searchQuery,
        results: rawResults,
        answer: analysis.summary,
        finalAnswer: analysis.summary,
        missingContext: [],
        analysis: analysis,
        _signature: analysis._signature
      };
    }

    // NORMAL PATH: Full strategy planning
    perf.checkpoint('start');
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
    perf.checkpoint('strategy-planning', { tokens: strategy._llm?.usage?.totalTokens });

    // If no search needed, return early
    if (!strategy.needsSearch) {
      perf.print();
      return {
        action: 'answer_directly',
        answer: strategy.response,
        finalAnswer: strategy.response,
        results: [],
        query: userQuery,
        missingContext: [],
        strategy
      };
    }

    // If missing context, ask user
    if (strategy.missingContext && strategy.missingContext.length > 0) {
      perf.print();
      const questionText = `I need more information to search effectively: ${strategy.missingContext.join('; ')}`;
      return {
        action: 'ask_user',
        question: questionText,
        missingContext: strategy.missingContext,
        suggestedQueries: strategy.searchQueries,
        answer: null,
        finalAnswer: null,
        results: [],
        query: userQuery,
        strategy
      };
    }

    // Step 2: Execute searches
    const searchQuery = refinedQuery || strategy.searchQueries[0];
    console.log(`   🔎 Searching for: "${searchQuery}"`);

    perf.checkpoint('pre-google-search');
    const rawResults = location
      ? await this.searchService.searchWithLocation(searchQuery, location, { num: maxResults })
      : await this.searchService.search(searchQuery, { num: maxResults });
    perf.checkpoint('google-search', { resultCount: rawResults.length });

    if (rawResults.length === 0) {
      return {
        action: 'no_results',
        query: searchQuery,
        answer: null,
        finalAnswer: `No search results found for "${searchQuery}". Try refining your query or providing more context.`,
        results: [],
        missingContext: [],
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
    perf.checkpoint('result-analysis', { tokens: analysis._llm?.usage?.totalTokens });

    perf.print();
    return {
      action: 'search_completed',
      query: searchQuery,
      results: rawResults,
      rawResults: rawResults,
      answer: analysis.summary,
      finalAnswer: analysis.finalAnswer || analysis.summary,
      missingContext: [],
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

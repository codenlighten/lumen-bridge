/**
 * ToolRouterAgent - Decides: Ask User vs Search vs Call Tool
 * 
 * Uses BaseMetaAgent's missingContext to make intelligent routing decisions:
 * - If missing context → ask user or search
 * - If needs terminal → route to TerminalAgent
 * - If needs code → route to CodeGenerator
 * - If needs research → route to research tool
 * 
 * This demonstrates the "decision layer" of the self-aware agent system.
 */

import BaseMetaAgent from './agents/BaseMetaAgent.js';
import TerminalAgent from './agents/TerminalAgent.js';
import CodeGenerator from './agents/CodeGenerator.js';
import SearchAgent from './agents/SearchAgent.js';

export class ToolRouterAgent extends BaseMetaAgent {
  constructor(options = {}) {
    super({
      agentName: 'ToolRouter',
      ...options,
      systemPrompt: options.systemPrompt || `You are a ToolRouter agent.

Your job is to analyze user requests and decide:
1. What information is missing (use missingContext)
2. Whether to ask the user directly (set questionForUser = true)
3. Whether to call a tool (terminal, code generator, search, etc.)
4. Whether you have enough to answer directly

When analyzing, populate:
- missingContext: list specific information gaps
- suggestedAction: one of ["ask_user", "call_terminal", "call_code_generator", "call_search", "answer_directly"]
- reasoning: explain your decision
- toolParameters: if calling a tool, what parameters to use

Be decisive but cautious - prefer asking the user when truly ambiguous.`
    });

    // Initialize specialized agents
    this.terminalAgent = new TerminalAgent('ToolRouter-Terminal');
    this.codeGenerator = new CodeGenerator('ToolRouter-Code');
    this.searchAgent = new SearchAgent({ maxResults: 5 });
  }

  /**
   * Analyze and route a request
   */
  async route(userPrompt) {
    console.log(`\n🔀 [ToolRouter] Analyzing: "${userPrompt.substring(0, 60)}..."`);

    // Schema for routing decision
    const routingSchema = {
      type: "object",
      properties: {
        analysis: { type: "string" },
        missingContext: {
          type: "array",
          items: { type: "string" }
        },
        suggestedAction: {
          type: "string",
          enum: ["ask_user", "call_terminal", "call_code_generator", "call_search", "answer_directly"]
        },
        reasoning: { type: "string" },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1
        },
        toolParameters: {
          type: "object",
          properties: {
            tool: { type: "string" },
            query: { type: "string" },
            context: { type: "object" }
          }
        }
      },
      required: ["analysis", "missingContext", "suggestedAction", "reasoning"]
    };

    const decision = await this.step({
      userPrompt: `Analyze this user request and decide how to handle it:

"${userPrompt}"

Consider:
- What information is missing?
- Can you answer directly, or do you need tools?
- If tools are needed, which one?
- If information is missing, should you ask the user or search?`,
      explicitSchema: routingSchema
    });

    console.log(`\n📊 Routing Decision:`);
    console.log(`   Action: ${decision.suggestedAction}`);
    console.log(`   Confidence: ${(decision.confidence * 100).toFixed(0)}%`);
    console.log(`   Reasoning: ${decision.reasoning}`);
    
    if (decision.missingContext && decision.missingContext.length > 0) {
      console.log(`   Missing: ${decision.missingContext.join(', ')}`);
    }

    // Execute the routing decision
    let result = null;

    switch (decision.suggestedAction) {
      case 'ask_user':
        result = {
          action: 'ask_user',
          question: this.generateQuestion(decision.missingContext),
          decision
        };
        break;

      case 'call_terminal':
        console.log(`\n🖥️  Calling TerminalAgent...`);
        result = await this.callTerminalAgent(decision.toolParameters);
        break;

      case 'call_code_generator':
        console.log(`\n💻 Calling CodeGenerator...`);
        result = await this.callCodeGenerator(decision.toolParameters);
        break;

      case 'call_search':
        console.log(`\n🔍 Calling SearchAgent...`);
        result = await this.callSearchAgent(decision.toolParameters);
        break;

      case 'answer_directly':
        console.log(`\n✅ Answering directly...`);
        const answer = await this.step({
          userPrompt: userPrompt
        });
        result = {
          action: 'answer_directly',
          answer,
          decision
        };
        break;
    }

    return result;
  }

  /**
   * Generate a question for the user based on missing context
   */
  generateQuestion(missingContext) {
    if (!missingContext || missingContext.length === 0) {
      return "Could you provide more details?";
    }

    if (missingContext.length === 1) {
      return `To help you better, could you please provide: ${missingContext[0]}?`;
    }

    return `To help you better, I need to know:
${missingContext.map((item, i) => `${i + 1}. ${item}`).join('\n')}`;
  }

  /**
   * Call TerminalAgent
   */
  async callTerminalAgent(params) {
    const result = await this.terminalAgent.generate(
      params?.query || params?.command || '',
      params?.context || {}
    );

    return {
      action: 'terminal_executed',
      command: result.terminalCommand,
      result
    };
  }

  /**
   * Call CodeGenerator
   */
  async callCodeGenerator(params) {
    const result = await this.codeGenerator.generate(
      params?.query || '',
      params?.context || {}
    );

    return {
      action: 'code_generated',
      result
    };
  }

  /**
   * Call SearchAgent
   */
  async callSearchAgent(params) {
    const result = await this.searchAgent.search({
      userQuery: params?.query || params?.searchQuery || '',
      maxResults: params?.maxResults || 5
    });

    return {
      action: 'search_completed',
      searchResult: result,
      decision: result.decision
    };
  }
}

// Demo
console.log('\n' + '='.repeat(70));
console.log('🔀 TOOL ROUTER AGENT - Missing Context → Tool Selection');
console.log('='.repeat(70));

const router = new ToolRouterAgent({ debug: true });

// Test 1: Clear terminal command
console.log('\n\n' + '='.repeat(70));
console.log('TEST 1: Clear Terminal Command Request');
console.log('='.repeat(70));

const test1 = await router.route('List all JavaScript files in the current directory');
console.log(`\n✅ Routed to: ${test1.action}`);
if (test1.command) {
  console.log(`   Command: ${test1.command}`);
}

// Test 2: Ambiguous request (should ask user)
console.log('\n\n' + '='.repeat(70));
console.log('TEST 2: Ambiguous Request (Missing Context)');
console.log('='.repeat(70));

const test2 = await router.route('Deploy my application');
console.log(`\n✅ Routed to: ${test2.action}`);
if (test2.question) {
  console.log(`\n❓ Question for User:\n${test2.question}`);
}

// Test 3: Code generation request
console.log('\n\n' + '='.repeat(70));
console.log('TEST 3: Code Generation Request');
console.log('='.repeat(70));

const test3 = await router.route('Generate a React component for a login form');
console.log(`\n✅ Routed to: ${test3.action}`);
if (test3.result?.code) {
  console.log(`\n💻 Code Generated:`);
  console.log(test3.result.code.substring(0, 200) + '...');
}

// Test 4: Direct answer
console.log('\n\n' + '='.repeat(70));
console.log('TEST 4: Direct Answer Request');
console.log('='.repeat(70));

const test4 = await router.route('What is React?');
console.log(`\n✅ Routed to: ${test4.action}`);
if (test4.answer) {
  console.log(`\n📝 Answer: ${test4.answer.response.substring(0, 150)}...`);
}

// Test 5: Search request
console.log('\n\n' + '='.repeat(70));
console.log('TEST 5: Search/Research Request');
console.log('='.repeat(70));

const test5 = await router.route('What are the latest features in Node.js 22?');
console.log(`\n✅ Routed to: ${test5.action}`);
if (test5.searchResult) {
  const sr = test5.searchResult;
  if (sr.action === 'search_completed') {
    console.log(`   Search Query: ${sr.query}`);
    console.log(`   Results Found: ${sr.rawResults.length}`);
    console.log(`   Summary: ${sr.analysis.summary.substring(0, 120)}...`);
    console.log(`   Answer Quality: ${sr.analysis.answerQuality}`);
    console.log(`\n   Top 2 Sources:`);
    sr.analysis.sources.slice(0, 2).forEach((src, i) => {
      console.log(`   ${i+1}. [${src.relevance}] ${src.title.substring(0, 60)}...`);
    });
  } else if (sr.action === 'ask_user') {
    console.log(`   Missing Context: ${sr.missingContext.join('; ')}`);
  }
}

// Summary
console.log('\n\n' + '='.repeat(70));
console.log('✅ TOOL ROUTER AGENT COMPLETE');
console.log('='.repeat(70));

console.log('\n📊 Routing Summary:');
console.log(`   Test 1: ${test1.action}`);
console.log(`   Test 2: ${test2.action}`);
console.log(`   Test 3: ${test3.action}`);
console.log(`   Test 4: ${test4.action}`);
console.log(`   Test 5: ${test5.action}`);

console.log('\n💡 Key Insights:');
console.log('   • missingContext drives routing decisions');
console.log('   • Agent knows when to ask vs when to act');
console.log('   • Each tool gets appropriate parameters');
console.log('   • Confidence scoring helps with ambiguity');
console.log('   • Self-aware system that knows its limits');

console.log('\n🌉 The Future Self Bridge enables intelligent tool routing!');
console.log('   Current self → analyzes what\'s needed');
console.log('   Future self → executes the right tool');
console.log('   Memory → learns from routing patterns\n');

export default ToolRouterAgent;

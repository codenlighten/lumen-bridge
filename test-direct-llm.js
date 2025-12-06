/**
 * Direct LLM Test - Minimal overhead baseline
 * 
 * Tests raw LLM performance without:
 * - Strategy planning
 * - Schema generation
 * - Memory operations
 * - Signature verification
 */

import { getProvider } from './llm-providers/index.js';
import { createAgentKeys } from './tools/signature.js';
import crypto from 'crypto';

const llmProvider = getProvider('openai');
const agentKey = createAgentKeys('DirectTest');

// Minimal base schema (response + missingContext)
const baseSchema = {
  type: "object",
  properties: {
    response: { 
      type: "string",
      description: "The agent's response to the user query"
    },
    missingContext: {
      type: "array",
      items: { type: "string" },
      description: "List of missing information. Empty array if complete."
    }
  },
  required: ["response", "missingContext"]
};

/**
 * Direct LLM call - no middleware, no planning, just query → response
 */
async function directLLMCall(query, customSchema = null, context = []) {
  console.log(`\n🔬 Direct LLM Call: "${query.substring(0, 60)}..."`);
  
  const startTime = Date.now();
  const schema = customSchema || baseSchema;
  
  // Build messages
  const messages = [
    {
      role: 'system',
      content: `You are a helpful AI assistant. Respond with valid JSON matching the provided schema.

Schema:
${JSON.stringify(schema, null, 2)}

Always include "response" and "missingContext" fields.`
    },
    ...context,
    {
      role: 'user',
      content: query
    }
  ];
  
  // Checkpoint: Pre-LLM
  const preLLM = Date.now();
  console.log(`   ⏱️  Pre-LLM setup: ${preLLM - startTime}ms`);
  
  // Direct LLM call
  const result = await llmProvider.complete(messages, {
    model: 'gpt-5-nano',
    temperature: 1.0,
    responseFormat: { type: 'json_object' }
  });
  
  // Checkpoint: Post-LLM
  const postLLM = Date.now();
  console.log(`   ⏱️  LLM call time: ${result.elapsed}ms`);
  console.log(`   ⏱️  Post-LLM processing: ${postLLM - preLLM - result.elapsed}ms`);
  
  const totalTime = postLLM - startTime;
  console.log(`   ⏱️  Total time: ${totalTime}ms`);
  
  console.log(`   📊 Model: ${result.model}`);
  console.log(`   📊 Tokens: ${result.usage.totalTokens} (${result.usage.promptTokens}+${result.usage.completionTokens})`);
  
  return {
    ...result.content,
    _timing: {
      setup: preLLM - startTime,
      llmCall: result.elapsed,
      postProcess: postLLM - preLLM - result.elapsed,
      total: totalTime
    },
    _llm: {
      provider: result.provider,
      model: result.model,
      elapsed: result.elapsed,
      usage: result.usage
    }
  };
}

// Run tests
console.log('\n🧪 Testing Direct LLM Performance\n');
console.log('='.repeat(60));

try {
  // Test 1: Simple query
  console.log('\n📝 Test 1: Simple Question');
  const test1 = await directLLMCall('What is 2+2?');
  console.log(`   Response: ${test1.response.substring(0, 100)}`);
  console.log(`   Missing Context: ${test1.missingContext.length} items`);
  
  // Test 2: Code generation
  console.log('\n💻 Test 2: Code Generation');
  const codeSchema = {
    type: "object",
    properties: {
      code: { type: "string", description: "Generated code" },
      language: { type: "string", description: "Programming language" },
      response: { type: "string", description: "Explanation" },
      missingContext: { type: "array", items: { type: "string" } }
    },
    required: ["code", "language", "response", "missingContext"]
  };
  
  const test2 = await directLLMCall(
    'Create a function that adds two numbers in JavaScript',
    codeSchema
  );
  console.log(`   Language: ${test2.language}`);
  console.log(`   Code length: ${test2.code?.length || 0} chars`);
  
  // Test 3: Search query
  console.log('\n🔍 Test 3: Information Query');
  const test3 = await directLLMCall('What are the latest developments in AI?');
  console.log(`   Response length: ${test3.response.length} chars`);
  console.log(`   Missing Context: ${test3.missingContext.length} items`);
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Performance Summary:\n');
  console.log(`   Test 1 (Simple):  ${test1._timing.total}ms (LLM: ${test1._timing.llmCall}ms)`);
  console.log(`   Test 2 (Code):    ${test2._timing.total}ms (LLM: ${test2._timing.llmCall}ms)`);
  console.log(`   Test 3 (Search):  ${test3._timing.total}ms (LLM: ${test3._timing.llmCall}ms)`);
  console.log(`\n   Average Total: ${Math.round((test1._timing.total + test2._timing.total + test3._timing.total) / 3)}ms`);
  console.log(`   Average LLM:   ${Math.round((test1._timing.llmCall + test2._timing.llmCall + test3._timing.llmCall) / 3)}ms`);
  console.log(`   Overhead:      ${Math.round(((test1._timing.total - test1._timing.llmCall) + (test2._timing.total - test2._timing.llmCall) + (test3._timing.total - test3._timing.llmCall)) / 3)}ms avg`);
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
}

console.log('\n✅ Test complete\n');
process.exit(0);

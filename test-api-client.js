/**
 * Test Client for Lumen Bridge API
 * 
 * Demonstrates all endpoints and use cases
 */

const BASE_URL = 'http://localhost:3005';

async function apiCall(endpoint, data = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method: data ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  return await response.json();
}

console.log('\n' + '='.repeat(80));
console.log('🧪 LUMEN BRIDGE API - CLIENT TEST');
console.log('='.repeat(80));

// Test 1: Get API info
console.log('\n📡 TEST 1: API Information');
const info = await apiCall('/');
console.log(`   Name: ${info.name}`);
console.log(`   Version: ${info.version}`);
console.log(`   Architecture: ${info.architecture}`);
console.log(`   Features: ${info.features.length} features`);

// Test 2: List available agents
console.log('\n📡 TEST 2: Available Agents');
const agents = await apiCall('/api/agents');
console.log(`   Total Agents: ${agents.agents.length}`);
agents.agents.forEach(agent => {
  console.log(`   • ${agent.name}: ${agent.description}`);
});

// Test 3: SearchAgent - Web search
console.log('\n📡 TEST 3: SearchAgent - Web Search');
const searchResult = await apiCall('/api/agents/search', {
  userQuery: 'TypeScript latest features 2024',
  maxResults: 3
});

if (searchResult.success) {
  const result = searchResult.result;
  console.log(`   ✅ Search completed`);
  console.log(`   Action: ${result.action}`);
  
  if (result.action === 'search_completed') {
    console.log(`   Query: ${result.query}`);
    console.log(`   Results: ${result.rawResults.length} items`);
    console.log(`   Quality: ${result.analysis.answerQuality}`);
    console.log(`   Summary: ${result.analysis.summary.substring(0, 100)}...`);
    console.log(`   Sources: ${result.analysis.sources.length}`);
  } else if (result.action === 'ask_user') {
    console.log(`   Missing Context: ${result.missingContext.join(', ')}`);
  }
}

// Test 4: TerminalAgent - Command generation
console.log('\n📡 TEST 4: TerminalAgent - Command Generation');
const terminalResult = await apiCall('/api/agents/terminal', {
  task: 'Find all package.json files',
  context: {}
});

if (terminalResult.success) {
  console.log(`   ✅ Command generated`);
  console.log(`   Command: ${terminalResult.result.terminalCommand}`);
  console.log(`   Shell: ${terminalResult.result.shell}`);
  console.log(`   Risk: ${terminalResult.result.riskLevel}`);
  console.log(`   Destructive: ${terminalResult.result.isDestructive}`);
}

// Test 5: CodeGenerator - Code creation
console.log('\n📡 TEST 5: CodeGenerator - Code Creation');
const codeResult = await apiCall('/api/agents/code', {
  prompt: 'Create a function to validate email addresses',
  context: { language: 'javascript' }
});

if (codeResult.success) {
  console.log(`   ✅ Code generated`);
  console.log(`   Has Code: ${codeResult.result.includesCode}`);
  if (codeResult.result.code) {
    console.log(`   Code Length: ${codeResult.result.code.length} characters`);
    console.log(`   Preview:\n${codeResult.result.code.substring(0, 150)}...`);
  }
}

// Test 6: SchemaAgent - Schema generation
console.log('\n📡 TEST 6: SchemaAgent - Schema Generation');
const schemaResult = await apiCall('/api/agents/schema', {
  userPrompt: 'Schema for a blog post with title, content, author, and tags'
});

if (schemaResult.success) {
  console.log(`   ✅ Schema generated`);
  console.log(`   Schema Name: ${schemaResult.result.schemaName}`);
  console.log(`   Description: ${schemaResult.result.schemaDescription}`);
  console.log(`   Properties: ${Object.keys(schemaResult.result.generatedSchema.properties || {}).join(', ')}`);
}

// Test 7: Intelligent Router - Auto-routing
console.log('\n📡 TEST 7: Intelligent Router - Auto Selection');
const routerResult = await apiCall('/api/router', {
  userPrompt: 'What is the capital of France?'
});

if (routerResult.success) {
  console.log(`   ✅ Request routed`);
  console.log(`   Selected Agent: ${routerResult.routing.selectedAgent}`);
  console.log(`   Confidence: ${(routerResult.routing.confidence * 100).toFixed(0)}%`);
  console.log(`   Reasoning: ${routerResult.routing.reasoning.substring(0, 80)}...`);
}

// Test 8: Custom Agent Creation
console.log('\n📡 TEST 8: Custom Agent Creation');
const customResult = await apiCall('/api/custom-agent', {
  agentName: 'PoetryAssistant',
  systemPrompt: 'You are a poetry assistant that creates beautiful poems',
  userPrompt: 'Write a haiku about coding',
  schema: {
    type: 'object',
    properties: {
      haiku: { type: 'string' },
      syllableCount: {
        type: 'object',
        properties: {
          line1: { type: 'number' },
          line2: { type: 'number' },
          line3: { type: 'number' }
        }
      },
      theme: { type: 'string' }
    }
  }
});

if (customResult.success) {
  console.log(`   ✅ Custom agent executed`);
  console.log(`   Agent: ${customResult.agent}`);
  if (customResult.result.haiku) {
    console.log(`   Haiku:\n   ${customResult.result.haiku.replace(/\n/g, '\n   ')}`);
  }
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('✅ ALL API TESTS COMPLETED');
console.log('='.repeat(80));

console.log('\n🎯 What You Can Build:');
console.log('   1. AI Chat App - Use /api/router for intelligent conversations');
console.log('   2. Research Tool - Use /api/agents/search for web research');
console.log('   3. Dev Assistant - Use /api/agents/code for code generation');
console.log('   4. System Admin Tool - Use /api/agents/terminal for commands');
console.log('   5. Data Design Tool - Use /api/agents/schema for schemas');
console.log('   6. Custom Bots - Use /api/custom-agent for specialized agents');

console.log('\n🌉 The Future Self Bridge is ready to power your AI applications!\n');

// Exit
process.exit(0);

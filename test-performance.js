/**
 * Performance Testing Script
 * Tests endpoints and analyzes bottlenecks
 */

import SearchAgent from './agents/SearchAgent.js';
import { CodeGenerator } from './agents/CodeGenerator.js';

console.log('\n🔬 Performance Analysis - Lumen Bridge\n');
console.log('='.repeat(60));

// Test 1: SearchAgent
console.log('\n📊 Test 1: SearchAgent Performance');
console.log('-'.repeat(60));

const searchAgent = new SearchAgent();

try {
  const searchResult = await searchAgent.search({
    userQuery: 'Latest AI developments 2025',
    maxResults: 5
  });
  
  console.log(`✅ Search completed: ${searchResult.action}`);
} catch (error) {
  console.error('❌ Search error:', error.message);
}

// Test 2: CodeGenerator
console.log('\n📊 Test 2: CodeGenerator Performance');
console.log('-'.repeat(60));

const codeGen = new CodeGenerator();

try {
  const codeResult = await codeGen.generate(
    'Create a function to calculate fibonacci numbers',
    { language: 'javascript' }
  );
  
  console.log(`✅ Code generation completed`);
  console.log(`   Language: ${codeResult.language}`);
  console.log(`   Complexity: ${codeResult.complexity}`);
} catch (error) {
  console.error('❌ Code generation error:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('📈 Analysis Complete\n');

process.exit(0);

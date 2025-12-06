/**
 * Simple Performance Test - Code Generator Only
 */

import { CodeGenerator } from './agents/CodeGenerator.js';

console.log('\n🔬 Testing CodeGenerator Performance\n');

const codeGen = new CodeGenerator();

const startTime = Date.now();

try {
  const result = await codeGen.generate(
    'Create a simple function that adds two numbers',
    { language: 'javascript' }
  );
  
  const totalTime = Date.now() - startTime;
  
  console.log(`\n✅ Total Time: ${totalTime}ms`);
  console.log(`   Language: ${result.language}`);
  console.log(`   Complexity: ${result.complexity}`);
  console.log(`   Model: ${result._llm?.model}`);
  console.log(`   LLM Time: ${result._llm?.elapsed}ms`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

process.exit(0);

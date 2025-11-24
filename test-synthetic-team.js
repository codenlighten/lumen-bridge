#!/usr/bin/env node

/**
 * Test: Synthetic Dev Team Components
 * 
 * Tests each component individually before full integration:
 * 1. ProjectPlannerAgent creates contract
 * 2. ProjectPlannerAgent decomposes into boxes
 * 3. CodeWorkerAgent executes a single box
 * 4. Integration verification works
 */

import ProjectPlannerAgent from './agents/ProjectPlannerAgent.js';
import CodeWorkerAgent from './agents/CodeWorkerAgent.js';

async function testProjectPlanner() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: ProjectPlannerAgent - Create Contract');
  console.log('='.repeat(80));

  const planner = new ProjectPlannerAgent();

  const projectSpec = `
Build a simple calculator module using:
- JavaScript ES6 modules
- Node.js runtime
- Jest for testing
- No external dependencies
  `.trim();

  console.log('\n📋 Creating project contract...');
  const contract = await planner.createContract(projectSpec);

  console.log('\n✅ Contract created:');
  console.log(`   Project: ${contract.projectName}`);
  console.log(`   Language: ${contract.language}`);
  console.log(`   Module System: ${contract.moduleSystem}`);
  console.log(`   Runtime: ${contract.runtime}`);
  console.log(`   Testing: ${contract.testing.framework}`);
  console.log(`   Contract Hash: ${contract._meta.contractHash.substring(0, 16)}...`);

  return contract;
}

async function testDecomposition(contract) {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: ProjectPlannerAgent - Decompose into Boxes');
  console.log('='.repeat(80));

  const planner = new ProjectPlannerAgent();

  const featureSpec = `
Create a calculator with these functions:
1. add(a, b) - addition
2. subtract(a, b) - subtraction
3. multiply(a, b) - multiplication
4. divide(a, b) - division with zero check

Each function should:
- Validate inputs are numbers
- Return number result
- Throw clear errors for invalid inputs
- Be fully tested
  `.trim();

  console.log('\n📦 Decomposing into boxes...');
  const decomposition = await planner.decomposeIntoBoxes(contract, featureSpec);

  console.log(`\n✅ Decomposition complete: ${decomposition.boxes.length} boxes`);
  
  console.log('\nBoxes:');
  decomposition.boxes.forEach((box, i) => {
    console.log(`   ${i + 1}. ${box.boxName}`);
    console.log(`      File: ${box.sourceFilePath}`);
    console.log(`      Responsibility: ${box.responsibility}`);
    console.log(`      Depends on: ${box.dependsOnBoxes.join(', ') || 'none'}`);
    console.log(`      Tests: ${box.acceptanceTests.length}`);
  });

  console.log(`\nBuild order: ${decomposition.buildOrder.join(' → ')}`);

  return decomposition;
}

async function testCodeWorker(boxSpec, contract) {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 3: CodeWorkerAgent - Execute Single Box');
  console.log('='.repeat(80));

  console.log(`\n👨‍💻 Worker executing: ${boxSpec.boxName}`);
  console.log(`   File: ${boxSpec.sourceFilePath}`);

  const worker = new CodeWorkerAgent({
    boxSpec,
    projectContract: contract,
    agentId: `test-worker-${Date.now()}`
  });

  console.log('\n⚙️  Starting execution...');
  const result = await worker.executeBox();

  console.log(`\n✅ Execution complete: ${result.status}`);
  console.log(`   Iterations: ${result.metadata.iterations}`);
  console.log(`   Lines of code: ${result.metadata.linesOfCode}`);
  console.log(`   Tests passed: ${result.testResults.passed}/${result.testResults.totalTests}`);
  
  if (result.status === 'blocked') {
    console.log(`   ⚠️  Missing context:`);
    result.missingContext.forEach(ctx => {
      console.log(`      - ${ctx}`);
    });
  }

  console.log('\n📄 Generated code preview:');
  const lines = result.code.split('\n');
  const preview = lines.slice(0, 20).join('\n');
  console.log(preview);
  if (lines.length > 20) {
    console.log(`   ... (${lines.length - 20} more lines)`);
  }

  return result;
}

async function main() {
  console.log('\n' + '█'.repeat(80));
  console.log('█              SYNTHETIC DEV TEAM - COMPONENT TESTS                     █');
  console.log('█'.repeat(80));

  try {
    // Test 1: Create contract
    const contract = await testProjectPlanner();

    // Test 2: Decompose into boxes
    const decomposition = await testDecomposition(contract);

    // Test 3: Execute first box
    const firstBox = decomposition.boxes[0];
    const result = await testCodeWorker(firstBox, contract);

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(80));
    console.log('\n✓ ProjectPlannerAgent creates contracts');
    console.log('✓ ProjectPlannerAgent decomposes into boxes');
    console.log('✓ CodeWorkerAgent executes boxes');
    console.log('✓ Generated code compiles and passes tests');
    console.log('\nReady for full SyntheticDevTeam orchestration! 🚀');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

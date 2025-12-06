#!/usr/bin/env node

/**
 * Quick test of Builder Workflow components
 */

import { VisionAgent } from './agents/VisionAgent.js';
import { TaskPlannerAgent } from './agents/TaskPlannerAgent.js';
import { BuilderAgent } from './agents/BuilderAgent.js';

async function testVisionAgent() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: VisionAgent');
  console.log('='.repeat(60));

  const agent = new VisionAgent();
  const vision = await agent.createVision(
    'Build a simple blog API with posts and comments',
    { language: 'javascript', runtime: 'Node.js' }
  );

  const visionData = vision.data || vision;
  console.log(`\n✅ Vision created:`);
  console.log(`   Modules: ${visionData.modules?.length}`);
  visionData.modules?.forEach(m => {
    console.log(`   - ${m.id}: ${m.files?.length} files`);
  });

  return visionData;
}

async function testTaskPlanner(vision) {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: TaskPlannerAgent');
  console.log('='.repeat(60));

  const agent = new TaskPlannerAgent();
  const taskGraph = await agent.planTasks(vision);

  console.log(`\n✅ Task graph created:`);
  console.log(`   Total tasks: ${taskGraph.tasks?.length}`);
  console.log(`   Runnable: ${taskGraph.runnableTasks?.length}`);
  console.log(`   Build order (first 5): ${taskGraph.buildOrder?.slice(0, 5).join(' → ')}`);

  return taskGraph;
}

async function testBuilderAgent(taskGraph) {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: BuilderAgent (single task)');
  console.log('='.repeat(60));

  if (!taskGraph.tasks || taskGraph.tasks.length === 0) {
    console.log('⚠️  No tasks to test');
    return;
  }

  const agent = new BuilderAgent();
  const task = taskGraph.tasks[0];

  console.log(`\nTesting with task: ${task.id}`);
  
  // Run just 2 iterations for quick test
  const primitive1 = await agent.step({ task, context: {} });
  console.log(`\n   Step 1: mode=${primitive1.mode}, continue=${primitive1.continue}`);

  if (primitive1.continue) {
    const primitive2 = await agent.step({ 
      task, 
      context: {}, 
      previousResult: primitive1 
    });
    console.log(`   Step 2: mode=${primitive2.mode}, continue=${primitive2.continue}`);
  }

  console.log(`\n✅ BuilderAgent test complete`);
}

async function main() {
  console.log('\n🧪 BUILDER WORKFLOW - COMPONENT TESTS\n');

  try {
    const vision = await testVisionAgent();
    const taskGraph = await testTaskPlanner(vision);
    await testBuilderAgent(taskGraph);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch(console.error);

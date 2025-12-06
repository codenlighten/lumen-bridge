#!/usr/bin/env node

/**
 * Demo: Self-Iterating Builder Workflow
 * 
 * Demonstrates the three-layer architecture:
 * 1. Vision → structured final-state specification
 * 2. Task Graph → dependency-aware DAG
 * 3. Execution → self-iterating reason/code loop with scheduling
 */

import { BuilderOrchestrator } from './utilities/BuilderOrchestrator.js';

async function main() {
  console.log('\n' + '█'.repeat(80));
  console.log('█              SELF-ITERATING BUILDER WORKFLOW DEMO                      █');
  console.log('█'.repeat(80));
  console.log('\nThis demo shows the complete builder architecture:\n');
  console.log('  🔭 Layer 1: VisionAgent creates structured final-state spec');
  console.log('  📊 Layer 2: TaskPlannerAgent builds dependency DAG');
  console.log('  🔨 Layer 3: BuilderAgent executes with reason ↔ code loop');
  console.log('  🎯 Orchestrator: Schedules tasks, handles dependencies, runs parallel');

  // Example: Build a simple API
  const projectDescription = `
Build a RESTful API for a task management system with:
- User authentication (signup/login)
- Task CRUD operations
- Task categories/tags
- Due dates and priorities
- Search and filtering

Technical requirements:
- Node.js with Express
- ES6 modules (import/export)
- JSON file storage (no database)
- JWT authentication
- Input validation
- Jest for testing
- Clean architecture (models, services, controllers, routes)
  `.trim();

  const userConstraints = {
    language: 'javascript',
    moduleSystem: 'ESM',
    runtime: 'Node.js',
    framework: 'Express',
    testing: 'Jest',
    storage: 'JSON files'
  };

  // Create orchestrator
  const orchestrator = new BuilderOrchestrator({
    maxParallelTasks: 2,  // Run 2 tasks in parallel
    maxIterationsPerTask: 10,  // Max 10 iterations per task
    maxTotalIterations: 50  // Max 50 total iterations
  });

  try {
    // Run the build
    const result = await orchestrator.build(projectDescription, userConstraints);

    // Show final results
    console.log('\n' + '='.repeat(80));
    console.log('🎯 FINAL RESULTS');
    console.log('='.repeat(80));

    if (result.execution.success) {
      console.log('\n✅ Project built successfully!');
      console.log(`\n📦 Deliverables:`);
      
      const visionData = result.vision.data || result.vision;
      console.log(`\n   Project: ${visionData.projectName}`);
      console.log(`   Modules: ${visionData.modules?.length || 0}`);
      visionData.modules?.forEach(m => {
        console.log(`   - ${m.id}: ${m.summary}`);
      });

      console.log(`\n   Tasks completed: ${result.state.tasksCompleted.length}`);
      console.log(`   Total iterations: ${result.state.iteration}`);
    } else {
      console.log('\n⚠️  Build incomplete or failed');
      console.log(`   Reason: ${result.execution.reason}`);
      console.log(`   Tasks completed: ${result.state.tasksCompleted.length}`);
      console.log(`   Tasks failed: ${result.state.tasksFailed.length}`);
    }

  } catch (error) {
    console.error('\n❌ Error during build:', error);
    console.error(error.stack);
  }
}

// Run demo
main().catch(console.error);

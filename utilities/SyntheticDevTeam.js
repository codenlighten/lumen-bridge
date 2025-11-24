/**
 * SyntheticDevTeam Orchestrator
 * 
 * Coordinates the entire synthetic dev team:
 * 1. ProjectPlannerAgent creates contract + boxes
 * 2. Spawns CodeWorkerAgents in parallel
 * 3. Monitors progress and collects black boxes
 * 4. Runs integration verification
 * 5. Assembles final deliverable
 * 
 * This is the "CTO" that manages the whole operation.
 */

import ProjectPlannerAgent from '../agents/ProjectPlannerAgent.js';
import CodeWorkerAgent from '../agents/CodeWorkerAgent.js';
import BaseMetaAgent from '../agents/BaseMetaAgent.js';

export class SyntheticDevTeam {
  constructor(options = {}) {
    this.planner = new ProjectPlannerAgent(options.plannerOptions);
    this.integrator = new BaseMetaAgent({
      agentName: 'IntegrationAgent',
      systemPrompt: `You are an IntegrationAgent. You verify that all boxes fit together:
      
1. Check input/output schemas align
2. Verify dependency contracts are satisfied
3. Generate glue code if needed
4. Run integration tests
5. Create assembly instructions`
    });
    
    this.options = options;
    this.activeWorkers = [];
    this.completedBoxes = [];
    this.blockedBoxes = [];
  }

  /**
   * Main entry point: spec → plan → execute → integrate
   */
  async buildProject({ projectSpec, featureSpec }) {
    console.log('\n' + '='.repeat(80));
    console.log('🏗️  SYNTHETIC DEV TEAM - MORNING STANDUP');
    console.log('='.repeat(80));
    console.log(`\n📋 Product Owner: "${projectSpec.substring(0, 60)}..."`);
    console.log(`📝 Feature Request: "${featureSpec.substring(0, 60)}..."`);

    // Step 1: Planning phase (the architect)
    console.log('\n' + '='.repeat(80));
    console.log('📋 PHASE 1: PLANNING');
    console.log('='.repeat(80));
    
    const plan = await this.planner.planProject(projectSpec, featureSpec);
    
    const { contract, decomposition } = plan;
    const { boxes, buildOrder } = decomposition;

    // Step 2: Parallel execution phase (the dev team)
    console.log('\n' + '='.repeat(80));
    console.log('⚙️  PHASE 2: PARALLEL EXECUTION');
    console.log('='.repeat(80));
    console.log(`\n🚀 Spawning ${boxes.length} CodeWorkerAgents...`);

    const results = await this.executeBoxesInParallel(boxes, contract, buildOrder);

    // Step 3: Integration phase (the tech lead)
    console.log('\n' + '='.repeat(80));
    console.log('🔗 PHASE 3: INTEGRATION');
    console.log('='.repeat(80));

    const integration = await this.integrateBoxes(results, contract);

    // Step 4: Final assembly
    console.log('\n' + '='.repeat(80));
    console.log('📦 PHASE 4: ASSEMBLY');
    console.log('='.repeat(80));

    const deliverable = this.assembleDeliverable(plan, results, integration);

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ SYNTHETIC DEV TEAM - END OF DAY REPORT');
    console.log('='.repeat(80));
    
    this.printSummary(deliverable);

    return deliverable;
  }

  /**
   * Execute boxes in parallel (respecting dependencies)
   */
  async executeBoxesInParallel(boxes, contract, buildOrder) {
    const results = {
      completed: [],
      blocked: [],
      failed: []
    };

    // Group boxes by dependency level
    const levels = this.organizeBuildLevels(boxes, buildOrder);

    console.log(`\n📊 Build Strategy: ${levels.length} parallel stages`);
    levels.forEach((level, i) => {
      console.log(`   Stage ${i + 1}: ${level.map(b => b.boxName).join(', ')}`);
    });

    // Execute level by level
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      console.log(`\n⚡ Executing Stage ${i + 1}/${levels.length} (${level.length} boxes in parallel)...`);

      // Run all boxes in this level in parallel
      const levelResults = await Promise.all(
        level.map(box => this.executeBox(box, contract))
      );

      // Categorize results
      levelResults.forEach(result => {
        if (result.status === 'completed') {
          results.completed.push(result);
          this.completedBoxes.push(result);
        } else if (result.status === 'blocked') {
          results.blocked.push(result);
          this.blockedBoxes.push(result);
        } else {
          results.failed.push(result);
        }
      });

      console.log(`   ✅ Stage ${i + 1} complete: ${levelResults.filter(r => r.status === 'completed').length}/${level.length} succeeded`);

      // Stop if too many failures
      if (results.blocked.length + results.failed.length > boxes.length / 2) {
        console.log(`\n   ⚠️  Too many failures/blocks. Stopping execution.`);
        break;
      }
    }

    return results;
  }

  /**
   * Execute a single box (worker agent)
   */
  async executeBox(boxSpec, contract) {
    const worker = new CodeWorkerAgent({
      boxSpec,
      projectContract: contract,
      agentId: `worker-${boxSpec.boxName}-${Date.now()}`
    });

    this.activeWorkers.push(worker);

    try {
      const result = await worker.executeBox();
      return result;
    } catch (error) {
      return {
        status: 'failed',
        boxName: boxSpec.boxName,
        error: error.message,
        workLog: worker.workLog
      };
    }
  }

  /**
   * Organize boxes into build levels (topological sort)
   */
  organizeBuildLevels(boxes, buildOrder) {
    const levels = [];
    const boxMap = new Map(boxes.map(b => [b.boxName, b]));
    const processed = new Set();

    // Simple level assignment based on dependency depth
    while (processed.size < boxes.length) {
      const currentLevel = [];

      for (const box of boxes) {
        if (processed.has(box.boxName)) continue;

        // Can build if all dependencies are processed
        const canBuild = box.dependsOnBoxes.every(dep => processed.has(dep));

        if (canBuild) {
          currentLevel.push(box);
          processed.add(box.boxName);
        }
      }

      if (currentLevel.length === 0) {
        // Circular dependency or error
        console.warn('⚠️  Warning: Circular dependencies detected or unreachable boxes');
        break;
      }

      levels.push(currentLevel);
    }

    return levels;
  }

  /**
   * Integration verification
   */
  async integrateBoxes(results, contract) {
    console.log(`\n🔍 Verifying integration of ${results.completed.length} boxes...`);

    const integrationReport = await this.integrator.step({
      userPrompt: `Verify integration of these completed boxes:

PROJECT: ${contract.projectName}

COMPLETED BOXES:
${results.completed.map(b => `- ${b.boxName}: ${b.sourceFilePath}`).join('\n')}

BLOCKED BOXES:
${results.blocked.map(b => `- ${b.boxName}: ${b.missingContext.join('; ')}`).join('\n')}

Verify:
1. Do input/output schemas align between dependent boxes?
2. Are all dependency contracts satisfied?
3. Is any glue code needed to connect boxes?
4. What integration tests should be run?`,
      explicitSchema: {
        type: 'object',
        properties: {
          schemasAlign: { type: 'boolean' },
          contractsSatisfied: { type: 'boolean' },
          issues: {
            type: 'array',
            items: { type: 'string' }
          },
          glueCode: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                purpose: { type: 'string' },
                code: { type: 'string' }
              }
            }
          },
          integrationTests: {
            type: 'array',
            items: { type: 'string' }
          },
          readyForDeployment: { type: 'boolean' }
        }
      }
    });

    console.log(`   Schemas align: ${integrationReport.schemasAlign ? '✅' : '❌'}`);
    console.log(`   Contracts satisfied: ${integrationReport.contractsSatisfied ? '✅' : '❌'}`);
    
    if (integrationReport.issues.length > 0) {
      console.log(`   ⚠️  Issues found: ${integrationReport.issues.length}`);
      integrationReport.issues.forEach(issue => {
        console.log(`      - ${issue}`);
      });
    }

    if (integrationReport.glueCode.length > 0) {
      console.log(`   🔧 Glue code needed: ${integrationReport.glueCode.length} pieces`);
    }

    return integrationReport;
  }

  /**
   * Assemble final deliverable
   */
  assembleDeliverable(plan, results, integration) {
    return {
      project: {
        name: plan.contract.projectName,
        description: plan.contract.description,
        contractHash: plan.contract._meta.contractHash
      },
      deliverables: {
        completedBoxes: results.completed.map(box => ({
          name: box.boxName,
          file: box.sourceFilePath,
          linesOfCode: box.metadata.linesOfCode,
          tests: box.testResults.totalTests,
          iterations: box.metadata.iterations
        })),
        blockedBoxes: results.blocked.map(box => ({
          name: box.boxName,
          missingContext: box.missingContext
        })),
        failedBoxes: results.failed.map(box => ({
          name: box.boxName,
          error: box.error
        }))
      },
      integration: {
        status: integration.readyForDeployment ? 'ready' : 'issues',
        schemasAlign: integration.schemasAlign,
        contractsSatisfied: integration.contractsSatisfied,
        issues: integration.issues,
        glueCodeNeeded: integration.glueCode.length
      },
      statistics: {
        totalBoxes: plan.decomposition.boxes.length,
        completed: results.completed.length,
        blocked: results.blocked.length,
        failed: results.failed.length,
        successRate: (results.completed.length / plan.decomposition.boxes.length * 100).toFixed(1) + '%',
        totalLinesOfCode: results.completed.reduce((sum, box) => sum + box.metadata.linesOfCode, 0),
        totalIterations: results.completed.reduce((sum, box) => sum + box.metadata.iterations, 0)
      },
      files: results.completed.map(box => ({
        path: box.sourceFilePath,
        content: box.code,
        boxName: box.boxName
      })),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Print summary report
   */
  printSummary(deliverable) {
    console.log(`\n📊 Project: ${deliverable.project.name}`);
    console.log(`   Contract Hash: ${deliverable.project.contractHash.substring(0, 16)}...`);
    
    console.log(`\n📈 Statistics:`);
    console.log(`   Total Boxes: ${deliverable.statistics.totalBoxes}`);
    console.log(`   ✅ Completed: ${deliverable.statistics.completed}`);
    console.log(`   ⏸️  Blocked: ${deliverable.statistics.blocked}`);
    console.log(`   ❌ Failed: ${deliverable.statistics.failed}`);
    console.log(`   Success Rate: ${deliverable.statistics.successRate}`);
    console.log(`   Total Lines: ${deliverable.statistics.totalLinesOfCode}`);
    console.log(`   Total Iterations: ${deliverable.statistics.totalIterations}`);

    console.log(`\n🔗 Integration:`);
    console.log(`   Status: ${deliverable.integration.status}`);
    console.log(`   Schemas Align: ${deliverable.integration.schemasAlign ? '✅' : '❌'}`);
    console.log(`   Contracts Satisfied: ${deliverable.integration.contractsSatisfied ? '✅' : '❌'}`);

    if (deliverable.deliverables.blockedBoxes.length > 0) {
      console.log(`\n⚠️  Blocked Boxes (need user input):`);
      deliverable.deliverables.blockedBoxes.forEach(box => {
        console.log(`   - ${box.name}: ${box.missingContext.join('; ')}`);
      });
    }

    console.log(`\n📦 Deliverables: ${deliverable.files.length} files ready`);
    deliverable.files.forEach(file => {
      console.log(`   ✓ ${file.path} (${file.boxName})`);
    });
  }
}

export default SyntheticDevTeam;

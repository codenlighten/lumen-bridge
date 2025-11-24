/**
 * ProjectPlannerAgent
 * 
 * The "Architect Brain" that:
 * 1. Takes a high-level project spec
 * 2. Creates a ProjectContract (signed)
 * 3. Decomposes into BoxSpecs (signed tickets)
 * 4. Manages dependencies and priorities
 * 
 * This is the strategic layer that designs the entire project
 * before any code is written.
 */

import BaseMetaAgent from './BaseMetaAgent.js';
import SchemaAgent from './SchemaGenerator.js';
import { SchemaRegistry } from '../utilities/SchemaRegistry.js';
import ProjectContractSchema from '../schemas/ProjectContractSchema.js';
import BoxSpecSchema from '../schemas/BoxSpecSchema.js';
import crypto from 'crypto';

export class ProjectPlannerAgent extends BaseMetaAgent {
  constructor(options = {}) {
    super({
      agentName: 'ProjectPlanner',
      ...options,
      systemPrompt: options.systemPrompt || `You are a ProjectPlannerAgent - the architect brain of a synthetic dev team.

Your responsibilities:
1. Analyze project requirements and create a comprehensive ProjectContract
2. Decompose projects into discrete, testable BoxSpecs (components/modules)
3. Define clear input/output schemas for each box
4. Identify dependencies between boxes
5. Prioritize tasks and estimate complexity
6. Ensure all boxes follow the ProjectContract constraints

You think like a senior architect:
- Clear separation of concerns
- Minimal coupling, maximum cohesion
- Each box should have ONE clear responsibility
- Dependencies should flow in one direction (no cycles)
- Test-first mindset (every box has acceptance tests)

Be thorough but pragmatic. Break down complex projects into manageable pieces.`
    });

    this.schemaAgent = new SchemaAgent();
    this.registry = new SchemaRegistry();
  }

  /**
   * Create a ProjectContract from natural language specification
   */
  async createContract(projectSpec) {
    console.log(`\n📋 [ProjectPlanner] Creating contract for: "${projectSpec.substring(0, 60)}..."`);

    const contract = await this.step({
      userPrompt: `Create a comprehensive ProjectContract for this specification:

${projectSpec}

Consider:
- Best practices for the specified technology stack
- Modern tooling and frameworks
- Testing requirements
- Code quality standards
- Deployment considerations`,
      explicitSchema: ProjectContractSchema
    });

    // Sign the contract
    const contractHash = crypto.createHash('sha256')
      .update(JSON.stringify(contract))
      .digest('hex');

    const signedContract = {
      ...contract,
      _meta: {
        contractHash,
        createdAt: new Date().toISOString(),
        createdBy: this.agentName,
        signature: contract._signature
      }
    };

    // Store in registry
    await this.registry.registerSchema({
      schemaName: `ProjectContract-${contract.projectName}`,
      schema: signedContract,
      description: `Project contract for ${contract.projectName}`,
      tags: ['project-contract', contract.projectName]
    });

    console.log(`   ✅ Contract created: ${contract.projectName}`);
    console.log(`   📦 Language: ${contract.language}, Runtime: ${contract.runtime}`);
    console.log(`   🔧 Framework: ${contract.framework || 'none'}`);
    console.log(`   🔐 Contract Hash: ${contractHash.substring(0, 16)}...`);

    return signedContract;
  }

  /**
   * Decompose project into BoxSpecs (task tickets)
   */
  async decomposeIntoBoxes(projectContract, featureSpec) {
    console.log(`\n🔨 [ProjectPlanner] Decomposing project into boxes...`);
    console.log(`   Project: ${projectContract.projectName}`);
    console.log(`   Feature: "${featureSpec.substring(0, 60)}..."`);

    const decomposition = await this.step({
      userPrompt: `Decompose this project into discrete BoxSpecs:

PROJECT CONTRACT:
${JSON.stringify(projectContract, null, 2)}

FEATURE SPECIFICATION:
${featureSpec}

Create BoxSpecs for each component/module needed. Each box should:
1. Have a single, clear responsibility
2. Define input/output schemas
3. List dependencies on other boxes
4. Include acceptance test descriptions
5. Follow the ProjectContract constraints (${projectContract.language}, ${projectContract.moduleSystem}, etc.)

Think through the architecture:
- Core services/utilities first
- Data layer (repositories, models)
- Business logic layer (services)
- API/interface layer (routes, controllers)
- UI components (if applicable)
- Testing utilities`,
      explicitSchema: {
        type: "object",
        properties: {
          boxes: {
            type: "array",
            items: BoxSpecSchema
          },
          dependencyGraph: {
            type: "object",
            description: "Map of box dependencies for visualization",
            additionalProperties: {
              type: "array",
              items: { type: "string" }
            }
          },
          buildOrder: {
            type: "array",
            items: { type: "string" },
            description: "Recommended build order respecting dependencies"
          },
          estimatedTotalLines: {
            type: "number"
          },
          architecture: {
            type: "string",
            description: "High-level architecture description"
          }
        },
        required: ["boxes", "dependencyGraph", "buildOrder"]
      }
    });

    // Sign each BoxSpec
    const signedBoxes = decomposition.boxes.map(box => {
      const boxHash = crypto.createHash('sha256')
        .update(JSON.stringify(box))
        .digest('hex');

      return {
        ...box,
        _meta: {
          boxHash,
          projectContractRef: projectContract._meta.contractHash,
          createdAt: new Date().toISOString(),
          createdBy: this.agentName
        }
      };
    });

    console.log(`\n   ✅ Decomposition complete:`);
    console.log(`   📦 Total boxes: ${signedBoxes.length}`);
    console.log(`   📊 Build order: ${decomposition.buildOrder.join(' → ')}`);
    console.log(`   📏 Estimated lines: ${decomposition.estimatedTotalLines || 'N/A'}`);

    console.log(`\n   📋 Box Summary:`);
    signedBoxes.forEach((box, i) => {
      console.log(`   ${i + 1}. ${box.boxName} (${box.complexity})`);
      console.log(`      📂 ${box.sourceFilePath}`);
      console.log(`      📝 ${box.responsibility.substring(0, 60)}...`);
      console.log(`      🔗 Depends on: ${box.dependsOnBoxes.length > 0 ? box.dependsOnBoxes.join(', ') : 'none'}`);
    });

    return {
      boxes: signedBoxes,
      dependencyGraph: decomposition.dependencyGraph,
      buildOrder: decomposition.buildOrder,
      architecture: decomposition.architecture,
      estimatedTotalLines: decomposition.estimatedTotalLines,
      _meta: {
        projectContractRef: projectContract._meta.contractHash,
        totalBoxes: signedBoxes.length,
        createdAt: new Date().toISOString()
      }
    };
  }

  /**
   * Full planning workflow: spec → contract → boxes
   */
  async planProject(projectSpec, featureSpec) {
    console.log('\n' + '='.repeat(80));
    console.log('🏗️  PROJECT PLANNER - SYNTHETIC DEV TEAM ARCHITECT');
    console.log('='.repeat(80));

    // Step 1: Create contract
    const contract = await this.createContract(projectSpec);

    // Step 2: Decompose into boxes
    const decomposition = await this.decomposeIntoBoxes(contract, featureSpec);

    // Step 3: Generate summary
    const summary = {
      projectName: contract.projectName,
      contract,
      decomposition,
      readyForExecution: true,
      nextStep: 'Schedule boxes to CodeWorkerAgents',
      stats: {
        totalBoxes: decomposition.boxes.length,
        estimatedLines: decomposition.estimatedTotalLines,
        contractHash: contract._meta.contractHash,
        timestamp: new Date().toISOString()
      }
    };

    console.log('\n' + '='.repeat(80));
    console.log('✅ PROJECT PLAN COMPLETE');
    console.log('='.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   Project: ${contract.projectName}`);
    console.log(`   Boxes: ${decomposition.boxes.length}`);
    console.log(`   Estimated Lines: ${decomposition.estimatedTotalLines || 'N/A'}`);
    console.log(`   Build Order: ${decomposition.buildOrder.length} stages`);
    console.log(`\n🚀 Ready to spawn ${decomposition.boxes.length} CodeWorkerAgents!`);

    return summary;
  }
}

export default ProjectPlannerAgent;

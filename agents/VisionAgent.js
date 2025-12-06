/**
 * VisionAgent - Creates structured "final state" specification
 * 
 * Takes user's project description and produces:
 * - Structured module breakdown
 * - Technical constraints
 * - Feature list
 * - High-level architecture
 * 
 * This is Layer 1 of the builder workflow.
 */

import BaseMetaAgent from './BaseMetaAgent.js';
import { VisionSpecSchema } from '../schemas/BuilderWorkflowSchemas.js';
import { signedStructuredResponse } from '../structured-json.js';

export class VisionAgent extends BaseMetaAgent {
  constructor(options = {}) {
    super({
      agentName: 'VisionAgent',
      systemPrompt: `You are a VisionAgent - a software architect that creates structured final-state specifications.

Your job is to take a user's project description and produce a complete VisionSpec that defines:
1. Logical modules (with dependencies between them)
2. Technical constraints (language, runtime, framework, testing, etc.)
3. Key features the system must have
4. Public APIs each module exposes

Think like an architect creating blueprints: be precise about what must exist, how modules relate, and what constraints bind the system.

IMPORTANT RULES:
- Identify 3-8 logical modules (not too granular, not too coarse)
- Make module dependencies explicit and minimal
- Define clear public APIs for each module
- Respect the technical constraints given by the user
- Be realistic about what can be built`,
      ...options
    });
  }

  /**
   * Generate vision specification from user's project description
   */
  async createVision(projectDescription, userConstraints = {}) {
    console.log(`\n🔭 [VisionAgent] Creating vision for project...`);
    
    const prompt = `Create a complete VisionSpec for this project:

${projectDescription}

User Constraints:
${JSON.stringify(userConstraints, null, 2)}

Analyze the requirements and produce a structured specification with:
1. Clear module breakdown (identify 3-8 logical modules)
2. Dependencies between modules (keep minimal)
3. Public APIs each module exposes
4. Technical constraints (language, runtime, framework, testing)
5. Key features list

Think step by step:
- What are the core domain concepts? (these become modules)
- What are the infrastructure concerns? (auth, storage, API layer, etc.)
- What depends on what? (build a clean dependency graph)
- What are the public contracts between modules?`;

    const result = await signedStructuredResponse({
      query: prompt,
      schema: VisionSpecSchema,
      context: {
        projectDescription,
        userConstraints,
        agentRole: 'architect'
      },
      temperature: 1.0,
      agentKey: this.keys,
      systemPrompt: this.systemPrompt
    });

    // Validate the vision
    const validation = this._validateVision(result.data || result);
    
    if (!validation.valid) {
      console.log(`\n⚠️  Vision validation warnings:`);
      validation.warnings.forEach(w => console.log(`   - ${w}`));
    }

    console.log(`\n✅ Vision created:`);
    console.log(`   📦 Project: ${result.data?.projectName || result.projectName}`);
    console.log(`   🧩 Modules: ${result.data?.modules?.length || result.modules?.length}`);
    console.log(`   ⚙️  Language: ${result.data?.constraints?.language || result.constraints?.language}`);

    return result;
  }

  /**
   * Validate vision for common issues
   */
  _validateVision(vision) {
    const warnings = [];
    const modules = vision.modules || [];
    
    // Check for circular dependencies
    const circularDeps = this._detectCircularDeps(modules);
    if (circularDeps.length > 0) {
      warnings.push(`Circular dependencies detected: ${circularDeps.join(', ')}`);
    }

    // Check for orphaned modules (no dependents and no dependees)
    const moduleIds = new Set(modules.map(m => m.id));
    const referenced = new Set();
    modules.forEach(m => {
      m.dependsOnModules.forEach(dep => referenced.add(dep));
    });

    modules.forEach(m => {
      const hasIncoming = referenced.has(m.id);
      const hasOutgoing = m.dependsOnModules.length > 0;
      if (!hasIncoming && !hasOutgoing && modules.length > 1) {
        warnings.push(`Module "${m.id}" appears isolated (no dependencies in/out)`);
      }
    });

    // Check for too many modules
    if (modules.length > 12) {
      warnings.push(`${modules.length} modules might be too granular - consider grouping`);
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Detect circular dependencies in module graph
   */
  _detectCircularDeps(modules) {
    const graph = new Map();
    modules.forEach(m => {
      graph.set(m.id, m.dependsOnModules || []);
    });

    const visited = new Set();
    const recStack = new Set();
    const cycles = [];

    const dfs = (node, path = []) => {
      if (recStack.has(node)) {
        const cycleStart = path.indexOf(node);
        cycles.push(path.slice(cycleStart).join(' → ') + ' → ' + node);
        return;
      }
      if (visited.has(node)) return;

      visited.add(node);
      recStack.add(node);

      const deps = graph.get(node) || [];
      deps.forEach(dep => {
        if (graph.has(dep)) {
          dfs(dep, [...path, node]);
        }
      });

      recStack.delete(node);
    };

    graph.forEach((_, node) => dfs(node));
    return cycles;
  }

  /**
   * Refine an existing vision based on feedback
   */
  async refineVision(existingVision, feedback) {
    console.log(`\n🔧 [VisionAgent] Refining vision based on feedback...`);

    const prompt = `Refine this VisionSpec based on the following feedback:

EXISTING VISION:
${JSON.stringify(existingVision, null, 2)}

FEEDBACK:
${feedback}

Produce an updated VisionSpec that addresses the feedback while maintaining consistency.`;

    const result = await signedStructuredResponse({
      query: prompt,
      schema: VisionSpecSchema,
      context: {
        existingVision,
        feedback,
        agentRole: 'architect'
      },
      temperature: 1.0,
      agentKey: this.keys,
      systemPrompt: this.systemPrompt
    });

    console.log(`\n✅ Vision refined`);
    return result;
  }
}

export default VisionAgent;

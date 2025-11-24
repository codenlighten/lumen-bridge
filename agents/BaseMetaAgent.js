/**
 * BaseMetaAgent - Self-Reflective Schema-Aware Agent
 * 
 * A meta-agent that:
 * 1. Reflects on what structure it needs for the next response
 * 2. Uses SchemaAgent to generate that schema
 * 3. Calls its "future self" with that schema via signedStructuredResponse
 * 4. Uses missingContext to know when to pause/ask/continue
 * 
 * This is the DNA of a self-bootstrapping, schema-aware agent system.
 * 
 * Architecture:
 * - Current self → plans ideal schema (via SchemaAgent)
 * - Future self → responds using that schema (via signedStructuredResponse)
 * - Memory → cryptographically signed interaction history
 * - Self-awareness → knows what it's missing via missingContext
 * 
 * Key Features:
 * 1. Schema planning - decides what structure it needs
 * 2. Future self communication - talks to its future instance
 * 3. Missing context detection - knows when to ask for help
 * 4. Cryptographic signatures - verifiable response provenance
 * 5. Memory integration - maintains conversation context
 * 6. AUTO mode compatible - can loop until task complete
 */

import { signedStructuredResponse } from "../structured-json.js";
import SchemaAgent from "./SchemaGenerator.js";
import { MemoryManager } from "../utilities/MemoryManager.js";
import { createAgentKeys } from "../tools/signature.js";
import crypto from "crypto";

export class BaseMetaAgent {
  constructor({
    agentName = "BaseMetaAgent",
    agentKey = null,
    model = "gpt-4o-mini",
    temperature = 0.2,
    systemPrompt = null,
    memoryOptions = null,
    autoSchemaPlanning = true,
    debug = false
  } = {}) {
    this.agentName = agentName;
    this.agentKey = agentKey || createAgentKeys(agentName, { role: 'Meta Agent' });
    this.model = model;
    this.temperature = temperature;
    this.autoSchemaPlanning = autoSchemaPlanning;
    this.debug = debug;

    this.systemPrompt =
      systemPrompt ||
      `You are ${agentName}, a self-reflective, schema-aware AI agent.

Your core principles:
- Think about the ideal structure of your next answer
- Use JSON Schema to precisely describe that structure
- Respect the provided JSON schema EXACTLY
- Use the "missingContext" array to list anything you still need
- Set "continue" = true if you believe you have more steps to complete
- Set "questionForUser" = true and populate "question" when the user should provide additional information

You are part of a cryptographically signed agent system where:
- Every response is signed with your private key
- Every interaction is stored in memory with signatures
- Other agents can verify your responses
- You can reflect on past interactions and learn

When you identify missing context:
- Be specific about what information would help
- Explain why that information is needed
- Suggest how the user or system might provide it

When you need to continue:
- Break complex tasks into steps
- Signal continuation clearly
- Maintain state across steps via memory`.trim();

    // Schema planning agent
    this.schemaAgent = new SchemaAgent({
      agentKey: this.agentKey,
      model,
      temperature: 0.1 // Low temperature for deterministic schema generation
    });

    // Per-agent memory
    this.memory = new MemoryManager({
      maxInteractions: 42,
      maxSummaries: 5,
      ownerName: agentName,
      ...(memoryOptions || {})
    });

    // Statistics
    this.stats = {
      steps: 0,
      schemaPlannings: 0,
      autoSteps: 0,
      questionAsked: 0,
      continueSteps: 0
    };
  }

  /**
   * Plan the next schema using SchemaAgent
   * 
   * This is where the "current self" decides what structure
   * the "future self" should use for its response.
   */
  async planNextSchema({ 
    userPrompt, 
    extraConstraints = null, 
    externalContext = null 
  }) {
    if (this.debug) {
      console.log(`\n🧠 [${this.agentName}] Planning schema for: "${userPrompt.substring(0, 60)}..."`);
    }

    const schemaPrompt = [
      `You are helping the "${this.agentName}" agent design the ideal JSON Schema`,
      `for its next response to the following user request:`,
      "",
      userPrompt,
      "",
      "The schema should describe the structure of the data needed to move the task",
      "forward as effectively as possible.",
      "",
      "Consider:",
      "- What specific data fields would best answer this request?",
      "- What structure makes the response most useful?",
      "- What optional fields might provide additional value?",
      "- What constraints ensure data quality?"
    ];

    if (extraConstraints) {
      schemaPrompt.push(
        "",
        "Additional constraints or hints (JSON):",
        JSON.stringify(extraConstraints, null, 2)
      );
    }

    const res = await this.schemaAgent.generateSchema({
      userPrompt: schemaPrompt.join("\n"),
      context: externalContext
    });

    this.stats.schemaPlannings++;

    if (this.debug) {
      console.log(`   ✅ Schema planned: ${res.schemaName}`);
      console.log(`   📋 ${res.schemaDescription}`);
    }

    return res;
  }

  /**
   * Execute one step of the meta-agent loop
   * 
   * This is the bridge between current self and future self:
   * 1. Current self plans the schema (what structure to use)
   * 2. Future self responds using that schema
   * 3. Memory records both interactions
   * 4. Caller inspects missingContext/continue to decide next action
   * 
   * @returns {Object} Signed response with _planning metadata
   */
  async step({
    userPrompt,
    explicitSchema = null,      // Skip planning and use this schema
    extraConstraints = null,    // Hints for schema planner
    externalContext = null,     // Additional context objects
  } = {}) {
    if (!userPrompt) {
      throw new Error(`${this.agentName}.step requires a userPrompt string.`);
    }

    this.stats.steps++;

    if (this.debug) {
      console.log(`\n🚀 [${this.agentName}] Step ${this.stats.steps}`);
      console.log(`   Query: "${userPrompt.substring(0, 80)}${userPrompt.length > 80 ? '...' : ''}"`);
    }

    // 1. Gather context from memory
    const contextMessages = this.memory.getContext();
    
    if (this.debug && contextMessages.length > 0) {
      console.log(`   📚 Memory context: ${contextMessages.length} messages`);
    }

    // 2. Optionally plan the next schema
    let plannedSchema = explicitSchema;
    let schemaPlanningMeta = null;

    if (!explicitSchema && this.autoSchemaPlanning) {
      schemaPlanningMeta = await this.planNextSchema({
        userPrompt,
        extraConstraints,
        externalContext
      });

      plannedSchema = schemaPlanningMeta.generatedSchema;

      // Attach schema metadata for tracing
      if (schemaPlanningMeta.schemaName) {
        plannedSchema.title = schemaPlanningMeta.schemaName;
      }
      if (schemaPlanningMeta.schemaDescription) {
        plannedSchema.description = schemaPlanningMeta.schemaDescription;
      }
    }

    // 3. Build query for the "future self"
    const futureSelfQueryParts = [
      `You are "${this.agentName}", responding to the user's request.`,
      ""
    ];

    if (plannedSchema) {
      futureSelfQueryParts.push(
        "User request:",
        userPrompt,
        "",
        "You have been given this JSON Schema describing the ideal structure of your answer:",
        JSON.stringify(plannedSchema, null, 2),
        "",
        "Respond with a JSON object that STRICTLY conforms to that schema,",
        "plus the standard envelope fields (response, includesCode, code, continue, questionForUser, question, missingContext)."
      );
    } else {
      futureSelfQueryParts.push(
        "User request:",
        userPrompt
      );
    }

    const futureSelfQuery = futureSelfQueryParts.join("\n");

    // 4. Call signedStructuredResponse as the "future self"
    if (this.debug) {
      console.log(`   🔮 Calling future self with ${plannedSchema ? 'planned' : 'default'} schema...`);
    }

    const res = await signedStructuredResponse({
      query: futureSelfQuery,
      schema: plannedSchema,
      context: contextMessages,
      model: this.model,
      temperature: this.temperature,
      systemPrompt: this.systemPrompt,
      agentKey: this.agentKey
    });

    // 5. Record user + AI interactions in memory (with signatures)
    const userHash = crypto.createHash("sha256").update(userPrompt).digest("hex");
    await this.memory.addInteraction(
      "user",
      userPrompt,
      null,
      null,
      userHash
    );

    const aiResponseText = JSON.stringify(res);
    const aiSignature = res._signature?.signature || null;
    const aiPublicKey = res._signature?.publicKey || null;
    const aiHash = res._signature?.responseHash ||
      crypto.createHash("sha256").update(aiResponseText).digest("hex");

    await this.memory.addInteraction(
      "ai",
      aiResponseText,
      aiSignature,
      aiPublicKey,
      aiHash
    );

    // Update stats
    if (res.questionForUser) {
      this.stats.questionAsked++;
    }
    if (res.continue) {
      this.stats.continueSteps++;
    }

    if (this.debug) {
      console.log(`   ✅ Response generated`);
      if (res.missingContext && res.missingContext.length > 0) {
        console.log(`   ⚠️  Missing context: ${res.missingContext.length} items`);
      }
      if (res.continue) {
        console.log(`   🔄 Continue = true`);
      }
      if (res.questionForUser) {
        console.log(`   ❓ Question for user: ${res.question}`);
      }
    }

    // 6. Attach planning metadata so orchestrator can see how schema was chosen
    return {
      ...res,
      _planning: schemaPlanningMeta
        ? {
            schemaName: schemaPlanningMeta.schemaName,
            schemaDescription: schemaPlanningMeta.schemaDescription,
            designRationale: schemaPlanningMeta.designRationale,
          }
        : null,
      _step: this.stats.steps,
      _agentName: this.agentName
    };
  }

  /**
   * AUTO mode - keep stepping until complete or max steps reached
   * 
   * This implements the autonomous loop:
   * - Keeps calling step() while continue === true
   * - Stops if missingContext requires user input
   * - Respects maxSteps to prevent infinite loops
   * 
   * @returns {Object} Final result with all steps tracked
   */
  async auto({
    userPrompt,
    maxSteps = 10,
    extraConstraints = null,
    externalContext = null,
    onStep = null // Callback for each step
  } = {}) {
    if (!userPrompt) {
      throw new Error(`${this.agentName}.auto requires a userPrompt string.`);
    }

    if (this.debug) {
      console.log(`\n🤖 [${this.agentName}] AUTO mode started`);
      console.log(`   Max steps: ${maxSteps}`);
    }

    const steps = [];
    let currentPrompt = userPrompt;
    let result = null;
    let stepCount = 0;

    while (stepCount < maxSteps) {
      stepCount++;
      this.stats.autoSteps++;

      // Execute one step
      result = await this.step({
        userPrompt: currentPrompt,
        extraConstraints,
        externalContext
      });

      steps.push({
        stepNumber: stepCount,
        prompt: currentPrompt,
        result: result
      });

      // Callback for monitoring
      if (onStep) {
        await onStep(result, stepCount);
      }

      // Check stopping conditions
      if (result.questionForUser) {
        if (this.debug) {
          console.log(`   ⏸️  AUTO paused: question for user`);
        }
        break;
      }

      if (result.missingContext && result.missingContext.length > 0) {
        if (this.debug) {
          console.log(`   ⏸️  AUTO paused: missing context`);
        }
        break;
      }

      if (!result.continue) {
        if (this.debug) {
          console.log(`   ✅ AUTO complete: continue = false`);
        }
        break;
      }

      // Prepare next iteration
      currentPrompt = `Continue from previous step. Previous response: ${result.response}`;
    }

    if (stepCount >= maxSteps && result.continue) {
      if (this.debug) {
        console.log(`   ⚠️  AUTO stopped: max steps reached`);
      }
    }

    return {
      completed: !result.continue && !result.questionForUser,
      steps: steps,
      finalResult: result,
      totalSteps: stepCount,
      stoppedReason: result.questionForUser 
        ? 'question_for_user'
        : result.missingContext?.length > 0
          ? 'missing_context'
          : result.continue
            ? 'max_steps_reached'
            : 'complete'
    };
  }

  /**
   * Get agent statistics
   */
  getStats() {
    return {
      ...this.stats,
      memoryStats: this.memory.getStats()
    };
  }

  /**
   * Get agent identity and capabilities
   */
  getIdentity() {
    return {
      name: this.agentName,
      type: 'BaseMetaAgent',
      publicKey: this.agentKey.publicKey,
      address: this.agentKey.address,
      capabilities: [
        'Self-reflective schema planning',
        'Future self communication',
        'Missing context detection',
        'Cryptographic signing',
        'Memory-backed conversations',
        'AUTO mode execution',
        'Multi-step task completion'
      ],
      stats: this.getStats()
    };
  }

  /**
   * Clear memory (useful for testing or reset)
   */
  clearMemory() {
    this.memory = new MemoryManager({
      maxInteractions: 42,
      maxSummaries: 5,
      ownerName: this.agentName
    });
  }
}

export default BaseMetaAgent;

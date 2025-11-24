import { signedStructuredResponse } from '../structured-json.js';
import { MemoryManager } from './MemoryManager.js';
import { SchemaRegistry, schemaRegistry } from './SchemaRegistry.js';
import SchemaAgent from '../agents/SchemaGenerator.js';
import { MultiGeniusAgent } from './MultiGeniusAgents.js';
import { BaseAgent } from '../agents/BaseAgent.js';

/**
 * 🌟 LumenOrchestrator - The AI Operating System Kernel
 * 
 * Coordinates between agents, manages memory, enforces safety, and orchestrates
 * multi-agent workflows. This is the "being" that decides which agents to call
 * and how to combine their outputs.
 * 
 * Architecture:
 * - Receives user queries
 * - Plans execution strategy
 * - Routes to appropriate agents
 * - Manages memory and context
 * - Enforces approval workflows
 * - Returns signed, structured responses
 */
export class LumenOrchestrator {
  constructor({
    userId = 'default',
    memoryConfig = { maxInteractions: 21, maxSummaries: 3 },
    requireApprovalForTerminal = true,
    approvalCallback = null,
    agentKey = null,
    debug = false
  } = {}) {
    this.userId = userId;
    this.requireApprovalForTerminal = requireApprovalForTerminal;
    this.approvalCallback = approvalCallback || this._defaultApprovalCallback;
    this.agentKey = agentKey;
    this.debug = debug;
    
    // Initialize core components
    this.memory = new MemoryManager({
      ...memoryConfig,
      ownerName: userId
    });
    
    this.registry = schemaRegistry;
    
    // Initialize foundational agents
    this.schemaAgent = new SchemaAgent({ agentKey });
    this.multiGeniusAgent = new MultiGeniusAgent();
    
    // Agent registry
    this.agents = new Map();
    this._registerFoundationalAgents();
    
    // Statistics
    this.stats = {
      totalQueries: 0,
      agentCalls: {},
      schemasGenerated: 0,
      deliberations: 0,
      approvalRequests: 0,
      approvalsGranted: 0,
      approvalsDenied: 0
    };
    
    this.log('LumenOrchestrator initialized', { userId, memoryConfig });
  }

  /**
   * Main entry point - process a user query
   */
  async process(userQuery, options = {}) {
    this.stats.totalQueries++;
    this.log('Processing query', { query: userQuery.substring(0, 100) });
    
    try {
      // 1. Get context from memory
      const context = this.memory.getContext();
      
      // 2. Analyze what's needed
      const plan = await this._planExecution(userQuery, context, options);
      this.log('Execution plan', plan);
      
      // 3. Execute the plan
      const result = await this._executePlan(plan, userQuery, context, options);
      
      // 4. Store in memory
      await this._storeInMemory(userQuery, result);
      
      // 5. Return result
      return result;
      
    } catch (error) {
      this.log('Error processing query', { error: error.message });
      throw error;
    }
  }

  /**
   * Plan execution strategy based on user query
   */
  async _planExecution(userQuery, context, options) {
    const planningPrompt = `
Analyze this user query and determine what's needed:

User Query: "${userQuery}"

Available Capabilities:
1. SchemaAgent - Generate new JSON schemas
2. MultiGeniusAgent - Multi-perspective deliberation for complex decisions
3. BaseAgent - Standard single-agent response
4. TerminalAgent - Execute system commands (requires approval)

Determine:
- complexity: simple | moderate | complex | very-complex
- needsNewSchema: boolean (does this require defining a new data structure?)
- needsDeliberation: boolean (would multi-perspective reasoning help?)
- needsExecution: boolean (does this require running commands?)
- suggestedAgent: which agent to use
- reasoning: why this approach

Consider:
- Simple questions → BaseAgent
- Complex decisions with tradeoffs → MultiGeniusAgent
- Creating data structures → SchemaAgent
- System operations → TerminalAgent
`;

    const planResponse = await signedStructuredResponse({
      query: planningPrompt,
      schema: {
        type: 'object',
        properties: {
          complexity: {
            type: 'string',
            enum: ['simple', 'moderate', 'complex', 'very-complex']
          },
          needsNewSchema: { type: 'boolean' },
          needsDeliberation: { type: 'boolean' },
          needsExecution: { type: 'boolean' },
          suggestedAgent: {
            type: 'string',
            enum: ['base', 'schema', 'multigenius', 'terminal', 'custom']
          },
          reasoning: { type: 'string' },
          estimatedSteps: { type: 'integer', minimum: 1, maximum: 10 }
        },
        required: ['complexity', 'needsNewSchema', 'needsDeliberation', 
                   'needsExecution', 'suggestedAgent', 'reasoning']
      },
      context,
      agentKey: this.agentKey
    });

    return planResponse;
  }

  /**
   * Execute the planned strategy
   */
  async _executePlan(plan, userQuery, context, options) {
    const results = {
      plan,
      steps: [],
      finalAnswer: null,
      metadata: {
        userId: this.userId,
        timestamp: new Date().toISOString(),
        agentsUsed: []
      }
    };

    // Step 1: Generate schema if needed
    if (plan.needsNewSchema && !options.skipSchemaGeneration) {
      this.log('Generating new schema');
      const schemaResult = await this.schemaAgent.generateSchema({
        userPrompt: userQuery,
        context
      });
      
      // Register the schema
      await this.registry.registerSchema({
        schemaName: schemaResult.schemaName,
        schema: schemaResult.generatedSchema,
        description: schemaResult.schemaDescription,
        metadata: {
          generatedFor: userQuery.substring(0, 100),
          userId: this.userId
        }
      });
      
      this.stats.schemasGenerated++;
      results.steps.push({
        agent: 'SchemaAgent',
        result: schemaResult,
        schemaName: schemaResult.schemaName
      });
      results.metadata.agentsUsed.push('SchemaAgent');
      this.log('Schema generated and registered', { name: schemaResult.schemaName });
    }

    // Step 2: Use MultiGeniusAgent for deliberation if needed
    if (plan.needsDeliberation && !options.skipDeliberation) {
      this.log('Starting multi-genius deliberation');
      const deliberation = await this.multiGeniusAgent.deliberate(userQuery, context);
      
      this.stats.deliberations++;
      results.steps.push({
        agent: 'MultiGeniusAgent',
        result: deliberation,
        participants: deliberation.participants.length,
        steps: deliberation.deliberationSteps.length,
        confidence: deliberation.synthesis.confidence
      });
      results.metadata.agentsUsed.push('MultiGeniusAgent');
      
      // Use synthesis as the answer
      results.finalAnswer = deliberation.synthesis.finalAnswer;
      results.reasoning = deliberation.synthesis.reasoningSummary;
      results.confidence = deliberation.synthesis.confidence;
      results.deliberation = deliberation;
      
      this.log('Deliberation complete', {
        confidence: deliberation.synthesis.confidence,
        shouldIterate: deliberation.control.shouldIterate
      });
      
      // Check if we should iterate
      if (deliberation.control.shouldIterate && options.allowIteration) {
        this.log('Deliberation suggests iteration');
        // Could recursively call with refined query
        // For now, just note it
        results.metadata.iterationSuggested = true;
        results.metadata.nextIterationFocus = deliberation.control.suggestedNextIterationFocus;
      }
    }

    // Step 3: Execute terminal commands if needed
    if (plan.needsExecution && !options.skipExecution) {
      this.log('Terminal execution requested');
      
      // Check if approval is required
      if (this.requireApprovalForTerminal) {
        const approved = await this._requestApproval({
          type: 'terminal',
          query: userQuery,
          plan
        });
        
        if (!approved) {
          results.finalAnswer = 'Terminal execution denied by approval workflow.';
          results.metadata.approvalDenied = true;
          return results;
        }
      }
      
      // Execute would go here
      // For now, just note that it would happen
      results.steps.push({
        agent: 'TerminalAgent',
        result: { status: 'would-execute', note: 'Terminal execution not yet implemented' }
      });
      results.metadata.agentsUsed.push('TerminalAgent');
    }

    // Step 4: If no specific agent was used, use base response
    if (results.steps.length === 0 || !results.finalAnswer) {
      this.log('Using base response');
      const baseResponse = await signedStructuredResponse({
        query: userQuery,
        context,
        agentKey: this.agentKey
      });
      
      results.finalAnswer = baseResponse.response;
      results.steps.push({
        agent: 'BaseAgent',
        result: baseResponse
      });
      results.metadata.agentsUsed.push('BaseAgent');
    }

    // Update agent call statistics
    results.metadata.agentsUsed.forEach(agent => {
      this.stats.agentCalls[agent] = (this.stats.agentCalls[agent] || 0) + 1;
    });

    return results;
  }

  /**
   * Request approval for sensitive operations
   */
  async _requestApproval(operation) {
    this.stats.approvalRequests++;
    this.log('Requesting approval', operation);
    
    const approved = await this.approvalCallback(operation);
    
    if (approved) {
      this.stats.approvalsGranted++;
      this.log('Approval granted');
    } else {
      this.stats.approvalsDenied++;
      this.log('Approval denied');
    }
    
    return approved;
  }

  /**
   * Default approval callback (always denies)
   */
  async _defaultApprovalCallback(operation) {
    console.warn('⚠️  Approval requested but no callback configured. Denying by default.');
    console.warn('Operation:', operation);
    return false;
  }

  /**
   * Store query and result in memory
   */
  async _storeInMemory(userQuery, result) {
    // Store user query
    await this.memory.addInteraction(
      'user',
      userQuery,
      null, // signature - could sign user messages
      null,
      null
    );

    // Store AI response
    const responseText = typeof result.finalAnswer === 'string' 
      ? result.finalAnswer 
      : JSON.stringify(result.finalAnswer);
      
    await this.memory.addInteraction(
      'ai',
      responseText,
      result.steps[result.steps.length - 1]?.result?._signature?.signature,
      result.steps[result.steps.length - 1]?.result?._signature?.publicKey,
      result.steps[result.steps.length - 1]?.result?._signature?.responseHash
    );

    this.log('Stored in memory');
  }

  /**
   * Register foundational agents
   */
  _registerFoundationalAgents() {
    this.registerAgent('schema', this.schemaAgent, {
      description: 'Generates JSON schemas from natural language',
      capabilities: ['schema-generation', 'contract-design']
    });

    this.registerAgent('multigenius', this.multiGeniusAgent, {
      description: 'Multi-perspective deliberation for complex decisions',
      capabilities: ['deliberation', 'consensus-building', 'multi-agent-reasoning']
    });
  }

  /**
   * Register a custom agent
   */
  registerAgent(name, agent, metadata = {}) {
    this.agents.set(name, {
      agent,
      metadata,
      registeredAt: new Date().toISOString()
    });
    this.log('Agent registered', { name, ...metadata });
  }

  /**
   * Get registered agent
   */
  getAgent(name) {
    return this.agents.get(name);
  }

  /**
   * List all registered agents
   */
  listAgents() {
    return Array.from(this.agents.entries()).map(([name, data]) => ({
      name,
      ...data.metadata,
      registeredAt: data.registeredAt
    }));
  }

  /**
   * Get memory context
   */
  getContext() {
    return this.memory.getContext();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      memoryStats: this.memory.getStats(),
      registeredAgents: this.agents.size,
      registeredSchemas: this.registry.getStats().totalSchemas
    };
  }

  /**
   * Clear memory
   */
  clearMemory() {
    this.memory.clear();
    this.log('Memory cleared');
  }

  /**
   * Export session data
   */
  exportSession() {
    return {
      userId: this.userId,
      stats: this.getStats(),
      memory: this.memory.export(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Logging helper
   */
  log(message, data = {}) {
    if (this.debug) {
      console.log(`[LumenOrchestrator] ${message}`, data);
    }
  }
}

export default LumenOrchestrator;

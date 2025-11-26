/**
 * PrimitiveKernel.ts
 * 
 * The 12 foundational primitives that ALL agents inherit.
 * This is the "instruction set" of the LumenBridge cognitive OS.
 * 
 * COPIED FROM MAIN SYSTEM FOR META-AGENT EXPERIMENT
 */

export interface PrimitiveKernelOptions {
  llmProvider?: any;
  memoryManager?: any;
  agentRegistry?: any;
  toolExecutor?: any;
  role?: string;
}

export class PrimitiveKernel {
  protected llmProvider: any;
  protected memoryManager: any;
  protected agentRegistry: any;
  protected toolExecutor: any;
  protected role: string;
  protected publicKey?: string;
  protected privateKey?: string;

  constructor(opts: PrimitiveKernelOptions = {}) {
    this.llmProvider = opts.llmProvider;
    this.memoryManager = opts.memoryManager;
    this.agentRegistry = opts.agentRegistry;
    this.toolExecutor = opts.toolExecutor;
    this.role = opts.role || "BaseAgent";
  }

  /**
   * Primitive 1: QUERY
   * Send a prompt to LLM with optional schema enforcement
   */
  async query(prompt: string, schema?: any, context?: any): Promise<any> {
    if (!this.llmProvider) {
      throw new Error("LLM provider not configured");
    }

    const messages = [
      {
        role: "system",
        content: schema 
          ? `You are a precise agent. Respond ONLY with valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`
          : "You are a helpful AI assistant."
      },
      {
        role: "user",
        content: context 
          ? `${prompt}\n\nContext: ${JSON.stringify(context)}`
          : prompt
      }
    ];

    const response = await this.llmProvider.chat(messages);
    
    // If schema provided, attempt to parse as JSON
    if (schema) {
      try {
        return JSON.parse(response);
      } catch (e) {
        console.warn('[PrimitiveKernel] Failed to parse response as JSON, returning raw');
        return response;
      }
    }

    return response;
  }

  /**
   * Primitive 2: REASON
   * Multi-step reasoning with chain-of-thought
   */
  async reason(problem: string, steps?: number): Promise<any> {
    const numSteps = steps || 3;
    const reasoning = [];

    for (let i = 0; i < numSteps; i++) {
      const stepPrompt = i === 0
        ? `Step 1: Analyze this problem: ${problem}`
        : `Step ${i + 1}: Based on previous reasoning, continue: ${JSON.stringify(reasoning[i - 1])}`;

      const stepResult = await this.query(stepPrompt);
      reasoning.push(stepResult);
    }

    return {
      problem,
      steps: reasoning,
      conclusion: reasoning[reasoning.length - 1]
    };
  }

  /**
   * Primitive 3: PLAN_SCHEMA
   * Design a JSON schema for a given purpose
   */
  async planSchema(purpose: string): Promise<any> {
    const prompt = `Design a JSON Schema for: ${purpose}
    
Return ONLY valid JSON Schema (draft-07 format).`;

    return await this.query(prompt, {
      type: "object",
      properties: {
        $schema: { type: "string" },
        type: { type: "string" },
        properties: { type: "object" },
        required: { type: "array" }
      },
      required: ["type", "properties"]
    });
  }

  /**
   * Primitive 4: VALIDATE_OUTPUT
   * Validate data against a schema
   */
  async validateOutput(data: any, schema: any): Promise<boolean> {
    // Simple validation - in production, use AJV or similar
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          console.error(`[PrimitiveKernel] Validation failed: missing field ${field}`);
          return false;
        }
      }
    }

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          const expectedType = (propSchema as any).type;
          const actualType = typeof data[key];
          
          if (expectedType === 'array' && !Array.isArray(data[key])) {
            console.error(`[PrimitiveKernel] Validation failed: ${key} should be array`);
            return false;
          }
          
          if (expectedType !== 'array' && expectedType !== actualType) {
            console.error(`[PrimitiveKernel] Validation failed: ${key} should be ${expectedType}, got ${actualType}`);
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Primitive 5: EXECUTE_COMMAND
   * Run a shell command or tool
   */
  async executeCommand(command: string, args?: any): Promise<any> {
    if (!this.toolExecutor) {
      console.warn('[PrimitiveKernel] No toolExecutor configured, returning mock');
      return { success: true, output: `Mock execution: ${command}` };
    }

    return await this.toolExecutor.execute(command, args);
  }

  /**
   * Primitive 6: GENERATE_CODE
   * Generate code in a specific language
   */
  async generateCode(spec: any, language: string = "typescript"): Promise<string> {
    const prompt = `Generate ${language} code for this specification:
${JSON.stringify(spec, null, 2)}

Return ONLY the code, no explanations.`;

    return await this.query(prompt);
  }

  /**
   * Primitive 7: CAPTURE_REASONING
   * Store reasoning trace in memory
   */
  async captureReasoning(reasoning: any): Promise<void> {
    if (!this.memoryManager) {
      console.warn('[PrimitiveKernel] No memoryManager configured');
      return;
    }

    await this.memoryManager.store({
      timestamp: new Date().toISOString(),
      agent: this.role,
      type: 'reasoning',
      data: reasoning
    });
  }

  /**
   * Primitive 8: SHARE_CONTEXT
   * Share context with another agent
   */
  async shareContext(targetAgent: string, context: any): Promise<void> {
    if (!this.memoryManager) {
      console.warn('[PrimitiveKernel] No memoryManager configured');
      return;
    }

    await this.memoryManager.store({
      timestamp: new Date().toISOString(),
      from: this.role,
      to: targetAgent,
      type: 'shared_context',
      data: context
    });
  }

  /**
   * Primitive 9: DETECT_MISSING_CONTEXT
   * Identify gaps in available information
   */
  async detectMissingContext(task: string, availableContext: any): Promise<string[]> {
    const prompt = `Task: ${task}
Available context: ${JSON.stringify(availableContext)}

What information is missing to complete this task? Return ONLY a JSON array of missing items.`;

    const response = await this.query(prompt);
    
    try {
      return JSON.parse(response);
    } catch (e) {
      return [];
    }
  }

  /**
   * Primitive 10: COMPOSE_OPERATIONS
   * Chain multiple operations together
   */
  async composeOperations(operations: Array<{ name: string, args: any }>): Promise<any> {
    let result = null;

    for (const op of operations) {
      // Pass previous result as context to next operation
      result = await this.query(
        `Execute operation: ${op.name}`,
        null,
        { ...op.args, previousResult: result }
      );
    }

    return result;
  }

  /**
   * Primitive 11: SIGN_DATA
   * Cryptographically sign data
   */
  async signData(data: any): Promise<string> {
    if (!this.privateKey) {
      console.warn('[PrimitiveKernel] No private key available, returning mock signature');
      return `MOCK_SIGNATURE_${Date.now()}`;
    }

    // In production, use actual BSV signing
    const dataString = JSON.stringify(data);
    return `SIGNED:${this.role}:${dataString.length}:${Date.now()}`;
  }

  /**
   * Primitive 12: SPAWN_AGENT
   * Create and register a new agent
   */
  async spawnAgent(agentName: string, config: any): Promise<any> {
    if (!this.agentRegistry) {
      console.warn('[PrimitiveKernel] No agentRegistry configured');
      return {
        name: agentName,
        publicKey: `MOCK_KEY_${Date.now()}`,
        privateKey: `MOCK_PRIVATE_${Date.now()}`
      };
    }

    // Generate keys (mock implementation)
    const keys = {
      publicKey: `PUB_${agentName}_${Date.now()}`,
      privateKey: `PRIV_${agentName}_${Date.now()}`
    };

    // Register in registry
    await this.agentRegistry.register({
      name: agentName,
      publicKey: keys.publicKey,
      capabilities: config.capabilities || [],
      inputSchema: config.inputSchema,
      outputSchema: config.outputSchema,
      createdBy: this.role,
      createdAt: new Date().toISOString()
    });

    return keys;
  }
}

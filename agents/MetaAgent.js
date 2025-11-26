/**
 * MetaAgent - Production Agent Factory
 * 
 * Creates new agents on-demand using the 6-phase lifecycle:
 * 1. Trigger - Define intent, create AgentSpecification
 * 2. Interface - Design input/output schemas
 * 3. Implementation - Generate agent code
 * 4. Body - Create infrastructure (optional)
 * 5. Soul - Generate identity (keys), register agent
 * 6. Handshake - Verify it works, integrate into system
 * 
 * Uses only the core primitives from BaseMetaAgent:
 * - signedStructuredResponse (query with schema)
 * - SchemaAgent (planSchema)
 * - Memory (captureReasoning)
 * - Signatures (signData)
 * 
 * This moves LumenBridge from Static Intelligence (using pre-built tools)
 * to Generative Intelligence (building tools as needed).
 */

import { BaseMetaAgent } from "./BaseMetaAgent.js";
import { signedStructuredResponse } from "../structured-json.js";
import { createAgentKeys } from "../tools/signature.js";
import { signData, verifySignature } from "../tools/der-signature.js";
import crypto from "crypto";

export class MetaAgent extends BaseMetaAgent {
  constructor(options = {}) {
    super({
      agentName: "MetaAgent",
      systemPrompt: `You are MetaAgent, an AI that creates other AI agents.

Your mission: When given a capability request, you design and create a new agent that fulfills that capability.

You work through 6 phases:
1. TRIGGER - Understand the request and create an agent specification
2. INTERFACE - Design precise input/output schemas
3. IMPLEMENTATION - Generate working agent code
4. BODY - Plan infrastructure needs (optional)
5. SOUL - The system will generate identity and register
6. HANDSHAKE - Verify the agent works

Be precise, thorough, and ensure all generated artifacts conform to schemas.`,
      ...options
    });

    this.role = "MetaAgent";
  }

  /**
   * Main entry point: Create a new agent from user intent
   */
  async createNewAgent(userPrompt, options = {}) {
    const {
      withInfrastructure = false,
      autoTest = true,
      returnCode = true
    } = options;

    console.log(`\n🏗️  Meta-Agent: Creating new agent from prompt: "${userPrompt}"\n`);

    const creationRecord = {
      timestamp: new Date().toISOString(),
      userPrompt,
      phases: {}
    };

    try {
      // PHASE 1: TRIGGER (Intent Definition)
      console.log("📋 Phase 1: Trigger - Defining agent specification...");
      const agentSpec = await this._phase1_trigger(userPrompt);
      creationRecord.phases.trigger = agentSpec;
      console.log(`✅ Agent spec: ${agentSpec.name}`);
      console.log(`   Purpose: ${agentSpec.purpose}\n`);

      // PHASE 2: INTERFACE (Schema Design)
      console.log("📐 Phase 2: Interface - Designing schemas...");
      const schemas = await this._phase2_interface(agentSpec);
      creationRecord.phases.interface = schemas;
      console.log(`✅ Schemas created\n`);

      // PHASE 3: IMPLEMENTATION (Code Genesis)
      console.log("💻 Phase 3: Implementation - Generating code...");
      const code = await this._phase3_implementation(agentSpec, schemas);
      creationRecord.phases.implementation = { 
        codeLength: code.length,
        code: returnCode ? code : "[code generated but not returned]"
      };
      console.log(`✅ Agent code generated (${code.length} chars)\n`);

      // PHASE 4: BODY (Infrastructure) - Optional
      let infra = null;
      if (withInfrastructure) {
        console.log("🐳 Phase 4: Body - Creating infrastructure...");
        infra = await this._phase4_body(agentSpec);
        creationRecord.phases.body = infra;
        console.log(`✅ Infrastructure created\n`);
      }

      // PHASE 5: SOUL (Identity & Registration)
      console.log("🔐 Phase 5: Soul - Generating identity and registering...");
      const keys = await this._phase5_soul(agentSpec, schemas);
      creationRecord.phases.soul = {
        publicKey: keys.publicKey,
        address: keys.address
      };
      console.log(`✅ Identity granted`);
      console.log(`   Public Key: ${keys.publicKey.substring(0, 40)}...`);
      console.log(`   Address: ${keys.address}\n`);

      // PHASE 6: HANDSHAKE (Verification) - Optional
      let testResult = null;
      if (autoTest) {
        console.log("🤝 Phase 6: Handshake - Verifying agent...");
        testResult = await this._phase6_handshake(agentSpec, schemas);
        creationRecord.phases.handshake = testResult;
        console.log(`✅ Handshake complete\n`);
      }

      // Sign the entire creation record
      const signature = signData(
        JSON.stringify(creationRecord),
        this.agentKey.privateKey
      );

      const result = {
        success: true,
        agentSpec,
        schemas,
        code: returnCode ? code : null,
        infra,
        keys,
        testResult,
        creationRecord,
        _signature: signature,
        _creator: this.agentName,
        _timestamp: creationRecord.timestamp
      };

      console.log(`🎉 Agent creation complete: ${agentSpec.name}`);
      console.log(`   Signature: ${signature.substring(0, 60)}...\n`);

      // Store in memory
      await this.memory.remember({
        type: 'agent_creation',
        agentName: agentSpec.name,
        result,
        signature
      });

      return result;

    } catch (error) {
      console.error(`❌ Agent creation failed:`, error.message);
      
      const errorResult = {
        success: false,
        error: error.message,
        phase: this._getCurrentPhase(creationRecord),
        creationRecord,
        _timestamp: new Date().toISOString()
      };

      return errorResult;
    }
  }

  /**
   * PHASE 1: Define AgentSpecification from user prompt
   */
  async _phase1_trigger(userPrompt) {
    const specSchema = {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Agent name in PascalCase, ending with 'Agent'",
          pattern: "^[A-Z][a-zA-Z0-9]*Agent$"
        },
        purpose: {
          type: "string",
          description: "Clear description of what this agent does"
        },
        inputs: {
          type: "array",
          items: { type: "string" },
          description: "Array of input field names"
        },
        outputs: {
          type: "array",
          items: { type: "string" },
          description: "Array of output field names"
        },
        constraints: {
          type: "array",
          items: { type: "string" },
          description: "Optional constraints or requirements"
        },
        libraries: {
          type: "array",
          items: { type: "string" },
          description: "Required npm libraries"
        }
      },
      required: ["name", "purpose", "inputs", "outputs"]
    };

    const prompt = `Based on this user request, create a detailed AgentSpecification:

User Request: "${userPrompt}"

Extract:
- A clear agent name (PascalCase, ending in "Agent")
- The purpose/mission (be specific)
- Required input fields (what data does it need?)
- Expected output fields (what does it return?)
- Any constraints or requirements mentioned
- Any libraries that would be needed

Return ONLY the JSON matching the schema.`;

    const response = await signedStructuredResponse({
      query: prompt,
      schema: specSchema,
      agentKey: this.agentKey,
      model: this.model,
      temperature: 0.3,
      nestUserSchema: true // Use nested data structure
    });

    // Handle different response structures
    const data = response.data || response;
    
    if (!data || !data.name) {
      console.error('[MetaAgent] Invalid response from Phase 1:', JSON.stringify(response, null, 2));
      throw new Error(`Phase 1 failed: Unable to extract agent specification. Response: ${JSON.stringify(response)}`);
    }

    return data;
  }

  /**
   * PHASE 2: Design input and output schemas
   */
  async _phase2_interface(agentSpec) {
    // Use SchemaAgent to design both schemas
    const inputSchemaPrompt = `Design a JSON Schema for the INPUT to ${agentSpec.name}.

Purpose: ${agentSpec.purpose}
Required input fields: ${agentSpec.inputs.join(", ")}

Create a proper JSON Schema (draft-07) that validates the input data structure.`;

    const outputSchemaPrompt = `Design a JSON Schema for the OUTPUT from ${agentSpec.name}.

Purpose: ${agentSpec.purpose}
Expected output fields: ${agentSpec.outputs.join(", ")}

Create a proper JSON Schema (draft-07) that validates the output data structure.`;

    const inputSchema = await this.schemaAgent.generateSchema({ userPrompt: inputSchemaPrompt });
    const outputSchema = await this.schemaAgent.generateSchema({ userPrompt: outputSchemaPrompt });

    return {
      inputSchema: inputSchema.data?.generatedSchema || inputSchema.generatedSchema || inputSchema,
      outputSchema: outputSchema.data?.generatedSchema || outputSchema.generatedSchema || outputSchema
    };
  }

  /**
   * PHASE 3: Generate agent code
   */
  async _phase3_implementation(agentSpec, schemas) {
    const codeSchema = {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Complete JavaScript/Node.js code for the agent"
        },
        explanation: {
          type: "string",
          description: "Brief explanation of the implementation"
        }
      },
      required: ["code"]
    };

    const prompt = `Generate complete JavaScript code for ${agentSpec.name}.

SPECIFICATION:
${JSON.stringify(agentSpec, null, 2)}

INPUT SCHEMA:
${JSON.stringify(schemas.inputSchema, null, 2)}

OUTPUT SCHEMA:
${JSON.stringify(schemas.outputSchema, null, 2)}

REQUIREMENTS:
1. Extend BaseMetaAgent class
2. Implement a 'process(input)' method that:
   - Validates input against input schema
   - Performs the agent's core logic
   - Returns output matching output schema
3. Use signedStructuredResponse for any LLM calls
4. Include error handling
5. Add JSDoc comments
6. Use ES6 modules (import/export)

Example structure:
\`\`\`javascript
import { BaseMetaAgent } from "./BaseMetaAgent.js";
import { signedStructuredResponse } from "../structured-json.js";

export class ${agentSpec.name} extends BaseMetaAgent {
  constructor(options = {}) {
    super({
      agentName: "${agentSpec.name}",
      systemPrompt: "...",
      ...options
    });
  }

  async process(input) {
    // Validate input
    // Perform logic
    // Return output
  }
}
\`\`\`

Generate the complete, production-ready code.`;

    const response = await signedStructuredResponse({
      query: prompt,
      schema: codeSchema,
      agentKey: this.agentKey,
      model: this.model,
      temperature: 0.4,
      nestUserSchema: true
    });

    const data = response.data || response;
    if (!data || !data.code) {
      console.error('[MetaAgent] Phase 3 response validation failed:', {
        hasResponse: !!response,
        hasData: !!response?.data,
        dataKeys: data ? Object.keys(data) : [],
        fullResponse: JSON.stringify(response, null, 2)
      });
      throw new Error('Phase 3: Invalid response structure - missing code field');
    }

    return data.code;
  }

  /**
   * PHASE 4: Generate infrastructure (Dockerfile + deployment spec)
   */
  async _phase4_body(agentSpec) {
    const infraSchema = {
      type: "object",
      properties: {
        dockerfile: {
          type: "string",
          description: "Complete Dockerfile content"
        },
        nodeSpec: {
          type: "object",
          description: "Deployment specification"
        }
      },
      required: ["dockerfile", "nodeSpec"]
    };

    const prompt = `Create infrastructure for ${agentSpec.name}.

SPECIFICATION:
${JSON.stringify(agentSpec, null, 2)}

Generate:
1. A secure Dockerfile:
   - Base: node:20-alpine
   - Non-root user
   - Minimal dependencies
   - Security best practices
   
2. A deployment node spec:
   - Resource limits (memory, cpu)
   - Environment variables
   - Health checks
   - Replica count

Return both as JSON.`;

    const response = await signedStructuredResponse({
      query: prompt,
      schema: infraSchema,
      agentKey: this.agentKey,
      model: this.model,
      temperature: 0.2,
      nestUserSchema: true
    });

    const data = response.data || response;
    if (!data || !data.dockerfile || !data.nodeSpec) {
      console.error('[MetaAgent] Phase 4 response validation failed:', {
        hasResponse: !!response,
        hasData: !!response?.data,
        dataKeys: data ? Object.keys(data) : [],
        fullResponse: JSON.stringify(response, null, 2)
      });
      throw new Error('Phase 4: Invalid response structure - missing dockerfile or nodeSpec');
    }

    return data;
  }

  /**
   * PHASE 5: Grant identity and register agent
   */
  async _phase5_soul(agentSpec, schemas) {
    // Generate BSV keys for the new agent
    const keys = createAgentKeys(agentSpec.name, {
      role: 'Generated Agent',
      purpose: agentSpec.purpose
    });

    // Sign the agent specification with Meta-Agent's key
    const specSignature = signData(
      JSON.stringify({
        agentSpec,
        schemas,
        timestamp: new Date().toISOString()
      }),
      this.agentKey.privateKey
    );

    // Store registration in memory
    await this.memory.remember({
      type: 'agent_registration',
      agentName: agentSpec.name,
      publicKey: keys.publicKey,
      address: keys.address,
      capabilities: agentSpec.outputs,
      signature: specSignature
    });

    return keys;
  }

  /**
   * PHASE 6: Verify agent works with test handshake
   */
  async _phase6_handshake(agentSpec, schemas) {
    const testSchema = {
      type: "object",
      properties: {
        testInput: {
          type: "object",
          description: "Sample input data"
        },
        expectedOutput: {
          type: "object",
          description: "Expected output structure"
        },
        validationSteps: {
          type: "array",
          items: { type: "string" },
          description: "Steps to validate the agent"
        }
      },
      required: ["testInput", "expectedOutput"]
    };

    const prompt = `Create a test case for ${agentSpec.name}.

INPUT SCHEMA:
${JSON.stringify(schemas.inputSchema, null, 2)}

OUTPUT SCHEMA:
${JSON.stringify(schemas.outputSchema, null, 2)}

Generate:
1. A realistic test input that matches the input schema
2. The expected output structure
3. Validation steps to verify correctness`;

    const response = await signedStructuredResponse({
      query: prompt,
      schema: testSchema,
      agentKey: this.agentKey,
      model: this.model,
      temperature: 0.3,
      nestUserSchema: true
    });

    const data = response.data || response;
    if (!data || !data.testInput || !data.expectedOutput) {
      console.error('[MetaAgent] Phase 6 response validation failed:', {
        hasResponse: !!response,
        hasData: !!response?.data,
        dataKeys: data ? Object.keys(data) : [],
        fullResponse: JSON.stringify(response, null, 2)
      });
      throw new Error('Phase 6: Invalid response structure - missing testInput or expectedOutput');
    }

    return {
      success: true,
      testCase: data,
      validated: true,
      _signature: response.signature
    };
  }

  /**
   * Detect capability gaps and suggest agent creation
   */
  async handleCapabilityGap(task, availableContext) {
    const gapSchema = {
      type: "object",
      properties: {
        hasGap: {
          type: "boolean",
          description: "Whether a capability gap exists"
        },
        missingCapabilities: {
          type: "array",
          items: { type: "string" },
          description: "List of missing capabilities"
        },
        suggestedAgentName: {
          type: "string",
          description: "Suggested name for new agent"
        },
        suggestedPurpose: {
          type: "string",
          description: "Purpose of the suggested agent"
        }
      },
      required: ["hasGap", "missingCapabilities"]
    };

    const prompt = `Analyze this task for capability gaps.

TASK: "${task}"

AVAILABLE CONTEXT:
${JSON.stringify(availableContext, null, 2)}

Determine:
1. Can this task be completed with available capabilities?
2. If not, what capabilities are missing?
3. What agent would fill this gap?`;

    const response = await signedStructuredResponse({
      query: prompt,
      schema: gapSchema,
      agentKey: this.agentKey,
      model: this.model,
      temperature: 0.2,
      nestUserSchema: true
    });

    const analysis = response.data || response;
    if (!analysis || typeof analysis.hasGap !== 'boolean') {
      console.error('[MetaAgent] handleCapabilityGap response validation failed:', {
        hasResponse: !!response,
        hasData: !!response?.data,
        dataKeys: analysis ? Object.keys(analysis) : [],
        fullResponse: JSON.stringify(response, null, 2)
      });
      throw new Error('handleCapabilityGap: Invalid response structure - missing hasGap field');
    }

    if (analysis.hasGap && analysis.suggestedAgentName) {
      console.log(`\n⚠️  Capability gap detected: ${analysis.missingCapabilities.join(", ")}`);
      console.log(`💡 Suggested solution: Create ${analysis.suggestedAgentName}\n`);

      return {
        hasGap: true,
        analysis,
        createAgentPrompt: analysis.suggestedPurpose || 
          `Create an agent that handles: ${analysis.missingCapabilities.join(", ")}`
      };
    }

    return {
      hasGap: false,
      analysis
    };
  }

  /**
   * Helper to determine current phase from creation record
   */
  _getCurrentPhase(creationRecord) {
    const phases = Object.keys(creationRecord.phases || {});
    if (phases.length === 0) return 'trigger';
    return phases[phases.length - 1];
  }
}

export default MetaAgent;

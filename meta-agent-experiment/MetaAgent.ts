/**
 * MetaAgent.ts
 * 
 * The Agent Factory - creates new agents on-demand using only the 12 primitives.
 * 
 * This is the boundary between Static Intelligence (using pre-built tools)
 * and Generative Intelligence (building tools as needed).
 * 
 * The 6-Phase Lifecycle:
 * 1. Trigger - Define intent, create AgentSpecification
 * 2. Interface - Design input/output schemas
 * 3. Implementation - Generate agent code
 * 4. Body - Create infrastructure (Dockerfile, node-spec)
 * 5. Soul - Generate identity (keys), register agent
 * 6. Handshake - Verify it works, integrate into routing mesh
 */

import { PrimitiveKernel, PrimitiveKernelOptions } from "./PrimitiveKernel.js";

export interface AgentSpecification {
  name: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  constraints?: string[];
  libraries?: string[];
  maxLatency?: number;
}

export interface AgentCreationResult {
  agentSpec: AgentSpecification;
  schemas: {
    inputSchema: any;
    outputSchema: any;
  };
  code: string;
  infra: {
    dockerfile: string;
    nodeSpec: any;
  };
  keys: {
    publicKey: string;
    privateKey: string;
  };
  testResult: any;
  _signature: string;
}

export class MetaAgent extends PrimitiveKernel {
  constructor(opts: PrimitiveKernelOptions) {
    super(opts);
    this.role = "MetaAgent";
  }

  /**
   * Main entry point: Create a new agent from user intent
   * 
   * This orchestrates all 6 phases using ONLY the 12 primitives.
   */
  async createNewAgent(userPrompt: string): Promise<AgentCreationResult> {
    console.log(`\n🏗️  Meta-Agent: Creating new agent from prompt: "${userPrompt}"\n`);

    //
    // PHASE 1: TRIGGER (Intent Definition)
    //
    console.log("📋 Phase 1: Trigger - Defining agent specification...");
    
    const agentSpec = await this._defineAgentSpecification(userPrompt);
    console.log(`✅ Agent spec created: ${agentSpec.name}`);
    console.log(`   Purpose: ${agentSpec.purpose}`);
    console.log(`   Inputs: ${agentSpec.inputs.join(", ")}`);
    console.log(`   Outputs: ${agentSpec.outputs.join(", ")}\n`);

    await this.captureReasoning({
      phase: "trigger",
      userPrompt,
      agentSpec
    });

    //
    // PHASE 2: INTERFACE (Schema Design)
    //
    console.log("📐 Phase 2: Interface - Designing schemas...");
    
    const { inputSchema, outputSchema } = await this._designSchemas(agentSpec);
    console.log(`✅ Schemas created`);
    console.log(`   Input schema properties: ${Object.keys(inputSchema.properties || {}).join(", ")}`);
    console.log(`   Output schema properties: ${Object.keys(outputSchema.properties || {}).join(", ")}\n`);

    await this.captureReasoning({
      phase: "interface",
      agentSpec,
      inputSchema,
      outputSchema
    });

    //
    // PHASE 3: IMPLEMENTATION (Code Genesis)
    //
    console.log("💻 Phase 3: Implementation - Generating code...");
    
    const agentCode = await this._generateAgentCode(agentSpec, inputSchema, outputSchema);
    console.log(`✅ Agent code generated (${agentCode.length} chars)`);
    console.log(`   Class: ${agentSpec.name}\n`);

    await this.captureReasoning({
      phase: "implementation",
      agentSpec,
      codeLength: agentCode.length
    });

    //
    // PHASE 4: BODY (Infrastructure)
    //
    console.log("🐳 Phase 4: Body - Creating infrastructure...");
    
    const infra = await this._generateInfrastructure(agentSpec);
    console.log(`✅ Infrastructure created`);
    console.log(`   Dockerfile: ${infra.dockerfile.split('\n').length} lines`);
    console.log(`   Node spec: ${infra.nodeSpec.name}\n`);

    await this.captureReasoning({
      phase: "body",
      agentSpec,
      infra: {
        dockerfileLines: infra.dockerfile.split('\n').length,
        nodeSpec: infra.nodeSpec
      }
    });

    //
    // PHASE 5: SOUL (Identity & Registration)
    //
    console.log("🔐 Phase 5: Soul - Generating identity and registering...");
    
    const keys = await this._grantIdentity(agentSpec, inputSchema, outputSchema);
    console.log(`✅ Identity granted`);
    console.log(`   Public key: ${keys.publicKey.substring(0, 32)}...`);
    console.log(`   Registered in Agent Registry\n`);

    await this.captureReasoning({
      phase: "soul",
      agentSpec,
      publicKey: keys.publicKey
    });

    //
    // PHASE 6: HANDSHAKE (Verification)
    //
    console.log("🤝 Phase 6: Handshake - Verifying agent works...");
    
    const testResult = await this._verifyAgent(agentSpec, outputSchema);
    console.log(`✅ Handshake complete`);
    console.log(`   Test passed: ${testResult.success}`);
    console.log(`   Response validated against output schema\n`);

    // Sign the entire creation artifact
    const signature = await this.signData({
      agentSpec,
      inputSchema,
      outputSchema,
      keys,
      testResult,
      timestamp: new Date().toISOString(),
      creator: this.role
    });

    await this.captureReasoning({
      phase: "handshake",
      agentSpec,
      testResult,
      signature
    });

    console.log(`🎉 Agent creation complete: ${agentSpec.name}`);
    console.log(`   Signature: ${signature}\n`);

    // Return the complete artifact
    return {
      agentSpec,
      schemas: { inputSchema, outputSchema },
      code: agentCode,
      infra,
      keys,
      testResult,
      _signature: signature
    };
  }

  /**
   * PHASE 1: Define AgentSpecification from user prompt
   * Uses: planSchema, query, captureReasoning
   */
  private async _defineAgentSpecification(userPrompt: string): Promise<AgentSpecification> {
    // First, plan the schema for AgentSpecification
    const specSchema = await this.planSchema(
      "An AgentSpecification that describes: name, purpose, inputs array, outputs array, optional constraints array, optional libraries array, optional maxLatency number"
    );

    // Then use that schema to extract structured spec from user prompt
    const spec = await this.query(
      `Based on this user request, create an AgentSpecification:
"${userPrompt}"

Extract:
- A clear agent name (PascalCase, ending in "Agent")
- The purpose/mission
- Required input fields
- Expected output fields
- Any constraints or requirements mentioned

Return ONLY valid JSON matching the schema.`,
      specSchema,
      { originalPrompt: userPrompt }
    );

    return spec as AgentSpecification;
  }

  /**
   * PHASE 2: Design input and output schemas
   * Uses: planSchema, query, validateOutput
   */
  private async _designSchemas(agentSpec: AgentSpecification): Promise<{
    inputSchema: any;
    outputSchema: any;
  }> {
    // Design input schema
    const inputSchema = await this.planSchema(
      `Input schema for ${agentSpec.name}: accepts ${agentSpec.inputs.join(", ")}`
    );

    // Design output schema
    const outputSchema = await this.planSchema(
      `Output schema for ${agentSpec.name}: returns ${agentSpec.outputs.join(", ")}`
    );

    // Validate schemas are well-formed
    const inputValid = await this.validateOutput(inputSchema, {
      type: "object",
      properties: {
        type: { type: "string" },
        properties: { type: "object" }
      },
      required: ["type", "properties"]
    });

    const outputValid = await this.validateOutput(outputSchema, {
      type: "object",
      properties: {
        type: { type: "string" },
        properties: { type: "object" }
      },
      required: ["type", "properties"]
    });

    if (!inputValid || !outputValid) {
      throw new Error("Generated schemas are invalid");
    }

    return { inputSchema, outputSchema };
  }

  /**
   * PHASE 3: Generate agent code
   * Uses: generateCode, validateOutput
   */
  private async _generateAgentCode(
    agentSpec: AgentSpecification,
    inputSchema: any,
    outputSchema: any
  ): Promise<string> {
    const codeSpec = {
      className: agentSpec.name,
      baseClass: "PrimitiveKernel",
      purpose: agentSpec.purpose,
      inputSchema,
      outputSchema,
      constraints: agentSpec.constraints || [],
      libraries: agentSpec.libraries || [],
      methods: [
        {
          name: "process",
          async: true,
          params: ["input"],
          returnType: "Promise<any>",
          purpose: "Main processing method that implements agent logic"
        }
      ]
    };

    const code = await this.generateCode(codeSpec, "typescript");

    // Basic validation: check if code contains the class name
    if (!code.includes(agentSpec.name)) {
      throw new Error(`Generated code doesn't contain class ${agentSpec.name}`);
    }

    return code;
  }

  /**
   * PHASE 4: Generate infrastructure (Dockerfile + node spec)
   * Uses: generateCode, reason, executeCommand
   */
  private async _generateInfrastructure(agentSpec: AgentSpecification): Promise<{
    dockerfile: string;
    nodeSpec: any;
  }> {
    // Reason about infrastructure requirements
    const infraPlan = await this.reason(
      `What infrastructure does ${agentSpec.name} need? 
Libraries: ${(agentSpec.libraries || []).join(", ")}
Constraints: ${(agentSpec.constraints || []).join(", ")}`,
      2
    );

    // Generate Dockerfile
    const dockerfileSpec = {
      kind: "dockerfile",
      baseImage: "node:20-alpine",
      workdir: "/app",
      dependencies: agentSpec.libraries || [],
      security: {
        nonRoot: true,
        readOnlyRootFs: true
      },
      entrypoint: `node ${agentSpec.name}.js`
    };

    const dockerfile = await this.generateCode(dockerfileSpec, "docker");

    // Generate node spec (deployment manifest)
    const nodeSpec = {
      name: agentSpec.name.toLowerCase().replace(/agent$/, '-agent'),
      image: `lumenbridge/${agentSpec.name.toLowerCase()}:latest`,
      resources: {
        memory: "512Mi",
        cpu: "0.5"
      },
      env: [],
      capabilities: agentSpec.outputs
    };

    return { dockerfile, nodeSpec };
  }

  /**
   * PHASE 5: Grant identity and register agent
   * Uses: spawnAgent, signData, shareContext
   */
  private async _grantIdentity(
    agentSpec: AgentSpecification,
    inputSchema: any,
    outputSchema: any
  ): Promise<{ publicKey: string; privateKey: string }> {
    // Spawn the agent (generates keys and registers)
    const keys = await this.spawnAgent(agentSpec.name, {
      capabilities: agentSpec.outputs,
      inputSchema,
      outputSchema
    });

    // Sign the agent specification
    const specSignature = await this.signData({
      type: "agent_specification",
      spec: agentSpec,
      schemas: { inputSchema, outputSchema }
    });

    // Share registration event with other system components
    await this.shareContext("ToolRouter", {
      event: "agent_registered",
      agentName: agentSpec.name,
      publicKey: keys.publicKey,
      capabilities: agentSpec.outputs,
      signature: specSignature
    });

    return keys;
  }

  /**
   * PHASE 6: Verify agent works with test handshake
   * Uses: query, validateOutput, signData
   */
  private async _verifyAgent(
    agentSpec: AgentSpecification,
    outputSchema: any
  ): Promise<any> {
    // Generate a realistic test input
    const testInput = await this.query(
      `Generate a realistic test input for ${agentSpec.name}.
Purpose: ${agentSpec.purpose}
Required inputs: ${agentSpec.inputs.join(", ")}

Return ONLY valid JSON.`
    );

    // Simulate calling the new agent
    // In production, this would actually invoke the deployed agent
    const testOutput = await this.query(
      `You are ${agentSpec.name}. Process this input and return output matching the schema.
Input: ${JSON.stringify(testInput)}
Purpose: ${agentSpec.purpose}

Return ONLY valid JSON matching the output schema.`,
      outputSchema
    );

    // Validate output matches schema
    const isValid = await this.validateOutput(testOutput, outputSchema);

    if (!isValid) {
      throw new Error(`Agent ${agentSpec.name} failed validation test`);
    }

    return {
      success: true,
      testInput,
      testOutput,
      validated: true
    };
  }

  /**
   * High-level workflow: Detect gap → Create agent → Integrate
   */
  async handleCapabilityGap(task: string, availableContext: any): Promise<AgentCreationResult | null> {
    // Use detectMissingContext to identify what's needed
    const missingCapabilities = await this.detectMissingContext(task, availableContext);

    if (missingCapabilities.length === 0) {
      console.log("No missing capabilities detected");
      return null;
    }

    console.log(`\n⚠️  Detected missing capabilities: ${missingCapabilities.join(", ")}`);
    console.log(`🏗️  Creating new agent to handle this...\n`);

    // Convert missing capabilities into an agent creation prompt
    const creationPrompt = `Create an agent that can handle: ${missingCapabilities.join(", ")} for the task: ${task}`;

    // Create the agent
    return await this.createNewAgent(creationPrompt);
  }
}

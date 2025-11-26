/**
 * example-contract-analyzer.ts
 * 
 * Demo: Using Meta-Agent to create a PDF contract analyzer
 */

import { MetaAgent } from '../MetaAgent.js';

async function main() {
  console.log("=".repeat(80));
  console.log("Meta-Agent Example: PDF Contract Analyzer");
  console.log("=".repeat(80));
  console.log();

  // Initialize Meta-Agent (with mock providers for demo)
  const metaAgent = new MetaAgent({
    llmProvider: mockLLMProvider(),
    memoryManager: mockMemoryManager(),
    agentRegistry: mockAgentRegistry(),
    toolExecutor: mockToolExecutor()
  });

  // User request
  const userRequest = "I need an agent that analyzes PDF contracts and flags liability clauses with risk scores";

  console.log(`📝 User Request: "${userRequest}"\n`);

  // Create the agent
  const result = await metaAgent.createNewAgent(userRequest);

  // Display results
  console.log("\n" + "=".repeat(80));
  console.log("Creation Complete!");
  console.log("=".repeat(80));
  console.log();

  console.log("📋 Agent Specification:");
  console.log(JSON.stringify(result.agentSpec, null, 2));
  console.log();

  console.log("📐 Input Schema:");
  console.log(JSON.stringify(result.schemas.inputSchema, null, 2));
  console.log();

  console.log("📤 Output Schema:");
  console.log(JSON.stringify(result.schemas.outputSchema, null, 2));
  console.log();

  console.log("💻 Generated Code (first 500 chars):");
  console.log(result.code.substring(0, 500) + "...");
  console.log();

  console.log("🐳 Dockerfile (first 300 chars):");
  console.log(result.infra.dockerfile.substring(0, 300) + "...");
  console.log();

  console.log("🔐 Identity:");
  console.log(`   Public Key: ${result.keys.publicKey}`);
  console.log(`   Private Key: ${result.keys.privateKey.substring(0, 32)}...`);
  console.log();

  console.log("🤝 Test Result:");
  console.log(JSON.stringify(result.testResult, null, 2));
  console.log();

  console.log("✍️  Signature:");
  console.log(`   ${result._signature}`);
  console.log();

  console.log("=".repeat(80));
  console.log("✅ Agent is now registered and ready to use!");
  console.log("=".repeat(80));
}

// Mock implementations for demo

function mockLLMProvider() {
  return {
    chat: async (messages: any[]) => {
      const lastMessage = messages[messages.length - 1].content;
      
      // Simple pattern matching for demo responses
      if (lastMessage.includes("AgentSpecification")) {
        return JSON.stringify({
          name: "ContractAnalyzerAgent",
          purpose: "Analyze PDF contracts to identify and assess liability clauses",
          inputs: ["base64_pdf", "analysis_depth"],
          outputs: ["risk_score", "clauses_array", "recommendations"],
          constraints: ["Must use pdf-parse library", "Max latency 5s"],
          libraries: ["pdf-parse", "natural"]
        });
      }
      
      if (lastMessage.includes("Input schema")) {
        return JSON.stringify({
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            base64_pdf: { type: "string" },
            analysis_depth: { type: "string", enum: ["quick", "standard", "deep"] }
          },
          required: ["base64_pdf"]
        });
      }
      
      if (lastMessage.includes("Output schema")) {
        return JSON.stringify({
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            risk_score: { type: "number", minimum: 0, maximum: 100 },
            clauses_array: { 
              type: "array",
              items: {
                type: "object",
                properties: {
                  clause: { type: "string" },
                  risk: { type: "string", enum: ["low", "medium", "high"] },
                  page: { type: "number" }
                }
              }
            },
            recommendations: { type: "array", items: { type: "string" } }
          },
          required: ["risk_score", "clauses_array"]
        });
      }
      
      if (lastMessage.includes("Generate typescript code")) {
        return `import { PrimitiveKernel } from "./PrimitiveKernel.js";

export class ContractAnalyzerAgent extends PrimitiveKernel {
  constructor(opts) {
    super(opts);
    this.role = "ContractAnalyzerAgent";
  }

  async process(input) {
    const { base64_pdf, analysis_depth = "standard" } = input;
    
    // Parse PDF
    const text = await this.parsePDF(base64_pdf);
    
    // Analyze clauses
    const clauses = await this.analyzeClauses(text, analysis_depth);
    
    // Calculate risk score
    const risk_score = this.calculateRiskScore(clauses);
    
    // Generate recommendations
    const recommendations = await this.generateRecommendations(clauses);
    
    return {
      risk_score,
      clauses_array: clauses,
      recommendations
    };
  }
  
  private async parsePDF(base64: string) {
    // Use pdf-parse library
    return "parsed pdf text...";
  }
  
  private async analyzeClauses(text: string, depth: string) {
    // NLP analysis
    return [];
  }
  
  private calculateRiskScore(clauses: any[]) {
    return 42;
  }
  
  private async generateRecommendations(clauses: any[]) {
    return [];
  }
}`;
      }
      
      if (lastMessage.includes("dockerfile")) {
        return `FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY . .

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 8080

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "ContractAnalyzerAgent.js"]`;
      }
      
      if (lastMessage.includes("test input")) {
        return JSON.stringify({
          base64_pdf: "JVBERi0xLjQK...",
          analysis_depth: "standard"
        });
      }
      
      if (lastMessage.includes("You are ContractAnalyzerAgent")) {
        return JSON.stringify({
          risk_score: 67,
          clauses_array: [
            { clause: "Indemnification clause", risk: "high", page: 5 },
            { clause: "Limitation of liability", risk: "medium", page: 8 }
          ],
          recommendations: [
            "Review indemnification scope",
            "Consider liability cap negotiation"
          ]
        });
      }
      
      if (lastMessage.includes("missing")) {
        return JSON.stringify([]);
      }
      
      return "Mock response";
    }
  };
}

function mockMemoryManager() {
  return {
    store: async (data: any) => {
      console.log(`   [Memory] Stored: ${data.type || data.phase}`);
    }
  };
}

function mockAgentRegistry() {
  return {
    register: async (agent: any) => {
      console.log(`   [Registry] Registered: ${agent.name}`);
    }
  };
}

function mockToolExecutor() {
  return {
    execute: async (command: string, args: any) => {
      console.log(`   [Tool] Executed: ${command}`);
      return { success: true, output: "mock output" };
    }
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

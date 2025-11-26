/**
 * example-capability-gap.ts
 * 
 * Demo: Meta-Agent detecting a capability gap and creating an agent to fill it
 */

import { MetaAgent } from '../MetaAgent.js';

async function main() {
  console.log("=".repeat(80));
  console.log("Meta-Agent Example: Capability Gap Detection & Resolution");
  console.log("=".repeat(80));
  console.log();

  // Initialize Meta-Agent
  const metaAgent = new MetaAgent({
    llmProvider: mockLLMProvider(),
    memoryManager: mockMemoryManager(),
    agentRegistry: mockAgentRegistry(),
    toolExecutor: mockToolExecutor()
  });

  // System is asked to do something it can't handle
  const task = "Extract text from scanned PDF images and translate to Spanish";
  const availableContext = {
    availableAgents: [
      "CodeGenerator",
      "SchemaGenerator",
      "SummaryAgent"
    ],
    availableTools: [
      "query",
      "reason",
      "executeCommand"
    ]
  };

  console.log(`📋 Task: "${task}"\n`);
  console.log("🔍 Checking available capabilities...\n");
  console.log("Available Agents:", availableContext.availableAgents.join(", "));
  console.log("Available Tools:", availableContext.availableTools.join(", "));
  console.log();

  // Meta-Agent detects gap and creates solution
  const result = await metaAgent.handleCapabilityGap(task, availableContext);

  if (result) {
    console.log("\n" + "=".repeat(80));
    console.log("✅ Gap Filled! New Agent Created:");
    console.log("=".repeat(80));
    console.log();
    console.log(`Agent Name: ${result.agentSpec.name}`);
    console.log(`Purpose: ${result.agentSpec.purpose}`);
    console.log(`Capabilities: ${result.agentSpec.outputs.join(", ")}`);
    console.log();
    console.log("This agent is now available for future tasks!");
  } else {
    console.log("\n✅ No capability gap detected - system can handle this task!");
  }
}

// Mock implementations
function mockLLMProvider() {
  return {
    chat: async (messages: any[]) => {
      const lastMessage = messages[messages.length - 1].content;
      
      if (lastMessage.includes("What information is missing")) {
        return JSON.stringify([
          "OCR capability for scanned PDFs",
          "Spanish translation service"
        ]);
      }
      
      if (lastMessage.includes("AgentSpecification")) {
        return JSON.stringify({
          name: "OCRTranslationAgent",
          purpose: "Extract text from scanned PDF images using OCR and translate to Spanish",
          inputs: ["scanned_pdf", "target_language"],
          outputs: ["extracted_text", "translated_text", "confidence"],
          constraints: ["Must handle image-based PDFs", "Support multiple languages"],
          libraries: ["tesseract.js", "@google-cloud/translate"]
        });
      }
      
      if (lastMessage.includes("Input schema")) {
        return JSON.stringify({
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            scanned_pdf: { type: "string", description: "Base64-encoded PDF" },
            target_language: { type: "string", default: "es" }
          },
          required: ["scanned_pdf"]
        });
      }
      
      if (lastMessage.includes("Output schema")) {
        return JSON.stringify({
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            extracted_text: { type: "string" },
            translated_text: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 }
          },
          required: ["extracted_text", "translated_text", "confidence"]
        });
      }
      
      if (lastMessage.includes("Generate typescript code")) {
        return `import { PrimitiveKernel } from "./PrimitiveKernel.js";

export class OCRTranslationAgent extends PrimitiveKernel {
  async process(input) {
    const { scanned_pdf, target_language = "es" } = input;
    const extracted_text = await this.performOCR(scanned_pdf);
    const translated_text = await this.translate(extracted_text, target_language);
    return { extracted_text, translated_text, confidence: 0.95 };
  }
}`;
      }
      
      if (lastMessage.includes("dockerfile")) {
        return `FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nCMD ["node", "OCRTranslationAgent.js"]`;
      }
      
      if (lastMessage.includes("test input")) {
        return JSON.stringify({ scanned_pdf: "base64...", target_language: "es" });
      }
      
      if (lastMessage.includes("You are OCRTranslationAgent")) {
        return JSON.stringify({
          extracted_text: "This is the contract text",
          translated_text: "Este es el texto del contrato",
          confidence: 0.95
        });
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
    execute: async (command: string) => {
      console.log(`   [Tool] Executed: ${command}`);
      return { success: true };
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

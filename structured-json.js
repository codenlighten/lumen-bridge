import dotenv from "dotenv";
import { signData, verifySignature, getPublicKeyFromPrivateKey, getAddressFromPrivateKey } from "./tools/der-signature.js";
import { platformAddress, platformPublicKey, createAgentKeys, platformKeys } from "./tools/signature.js";
import { MemoryManager } from "./utilities/MemoryManager.js";
import { complete as llmComplete, LLMConfig } from "./llm-providers/index.js";
import crypto from "crypto";

dotenv.config();

// Legacy constants for backward compatibility
const OPENAI_MODEL = "gpt-4o-mini";

/* ======================================================
 * Cryptographically Signed Response Helper with Agent Identity
 * ====================================================== */
export async function signedStructuredResponse({
  query,
  schema,
  context,
  model = OPENAI_MODEL,
  temperature = 0.2,
  systemPrompt = "You are an AI that outputs ONLY valid JSON strictly conforming to the provided schema. Include a 'missingContext' array describing any missing information needed for perfection. If nothing is missing, return an empty array.",
  agentKey = null, // New parameter for agent-specific signing
  provider = null // LLM provider override (openai|llama|auto)
} = {}) {

  // Default envelope schema with cryptographic fields and conversation control
  const baseSchema = {
    type: "object",
    properties: {
      response: { type: "string" },
      includesCode: { type: "boolean" },
      code: { type: "string" },
      continue: { 
        type: "boolean", 
        description: "Whether this agent has more work to do and should be called again automatically" 
      },
      questionForUser: { 
        type: "boolean", 
        description: "Whether this agent has a follow-up question for the user" 
      },
      question: { 
        type: "string", 
        description: "The follow-up question for the user (only if questionForUser is true)" 
      },
      missingContext: {
        type: "array",
        description: "List of strings indicating what information is missing for an ideal response",
        items: { type: "string" }
      }
    },
    required: ["response", "includesCode", "code", "continue", "questionForUser", "missingContext"]
  };

  // Merge user-provided schema (if any) with the base envelope
  const mergedSchema = schema
    ? {
        type: "object",
        properties: {
          ...schema.properties,
          ...baseSchema.properties
        },
        required: Array.from(new Set([
          ...(schema.required || []),
          ...baseSchema.required
        ]))
      }
    : baseSchema;

  const schemaPrompt = `You must respond with a JSON object that follows this JSON schema exactly: ${JSON.stringify(
    mergedSchema
  )}. Do not include any additional commentary or explanations.`;

  const messages = [
    { role: "system", content: `${systemPrompt}\n${schemaPrompt}` }
  ];

  // If context is an array of messages (from memory), append them
  // Otherwise treat it as additional context data
  if (context) {
    if (Array.isArray(context)) {
      messages.push(...context);
    } else {
      messages.push({
        role: "system",
        content: `Additional context for your reasoning:\n${JSON.stringify(context, null, 2)}`
      });
    }
  }

  if (query) {
    messages.push({ role: "user", content: query });
  }
  
  // Use provider system instead of direct OpenAI client
  const llmResponse = await llmComplete(messages, {
    model,
    temperature,
    provider: provider || LLMConfig.defaultProvider
  });

  try {
    // Extract content from normalized provider response
    const aiResponse = llmResponse.content;
    
    // Log provider info if debug enabled
    if (LLMConfig.debug) {
      console.log(`[LLM] Provider: ${llmResponse.provider}, Model: ${llmResponse.model}, Elapsed: ${llmResponse.elapsed}ms`);
    }
    
    // Create cryptographic signature for the response (BEFORE adding metadata)
    const responseText = JSON.stringify(aiResponse);
    const responseHash = crypto.createHash('sha256').update(responseText).digest('hex');
    
    // Use agent-specific key if provided, otherwise use platform key
    let signature, signingAddress, publicKey;
    if (agentKey && agentKey.privateKey) {
      signature = await signData(responseHash, agentKey.privateKey);
      signingAddress = getAddressFromPrivateKey(agentKey.privateKey);
      publicKey = getPublicKeyFromPrivateKey(agentKey.privateKey);
    } else {
      // IMPORTANT: no shadowing; use the imported platformKeys
      signature = await signData(responseHash, platformKeys.privateKey);
      signingAddress = platformKeys.address;
      publicKey = platformKeys.publicKey;
    }
    
    // Return signed response with cryptographic proof
    return {
      ...aiResponse,
      _signature: {
        signature,
        responseHash,
        address: signingAddress,
        publicKey: publicKey,
        timestamp: new Date().toISOString(),
        algorithm: "BSV-ECDSA-DER",
        encoding: "hex",
        agentIdentity: agentKey ? agentKey.agentName : "Platform"
      },
      _llm: {
        provider: llmResponse.provider,
        model: llmResponse.model,
        elapsed: llmResponse.elapsed,
        usage: llmResponse.usage
      }
    };
  } catch (err) {
    console.error("❌ JSON parse error:", err);
    return {
      response: "Error parsing model output.",
      includesCode: false,
      code: "",
      error: llmResponse.rawContent || err.message,
      _signature: null,
      _llm: {
        provider: llmResponse?.provider,
        error: err.message
      }
    };
  }
}

/* ======================================================
 * Signature Verification Helper
 * ====================================================== */
export async function verifyResponseSignature(signedResponse) {
  if (!signedResponse._signature) {
    return { verified: false, error: "No signature found" };
  }

  const { signature, responseHash, publicKey, timestamp, algorithm } = signedResponse._signature;
  
  try {
    // Recreate response without signature AND metadata for verification
    const responseWithoutMeta = { ...signedResponse };
    delete responseWithoutMeta._signature;
    delete responseWithoutMeta._llm; // Also exclude LLM metadata
    const responseText = JSON.stringify(responseWithoutMeta);
    const computedHash = crypto.createHash('sha256').update(responseText).digest('hex');
    
    // Verify hash matches
    if (computedHash !== responseHash) {
      return { 
        verified: false, 
        error: "Response hash mismatch",
        expected: responseHash,
        computed: computedHash
      };
    }
    
    // Verify signature
    const isValid = await verifySignature(responseHash, signature, publicKey);
    
    return {
      verified: isValid,
      publicKey,
      timestamp,
      algorithm,
      responseHash,
      error: isValid ? null : "Signature verification failed"
    };
  } catch (error) {
    return {
      verified: false,
      error: `Verification error: ${error.message}`
    };
  }
}
/* ======================================================
 * Chatbot Conversation Loop (demo) with Signatures
 * ====================================================== */
// Per-user memory managers
const userMemories = new Map();

function getUserMemory(userId = 'default') {
  if (!userMemories.has(userId)) {
    userMemories.set(userId, new MemoryManager({ 
      maxInteractions: 21, 
      maxSummaries: 3,
      ownerName: userId
    }));
  }
  return userMemories.get(userId);
}

export async function chatWithMemory(userMessage, schema = null, context = null, systemPrompt = null, userId = 'default') {
  // Get user-specific memory
  const memory = getUserMemory(userId);
  
  // Sign the user message
  const messageHash = crypto.createHash('sha256').update(userMessage).digest('hex');
  const userSignature = await signData(messageHash, platformKeys.privateKey);
  
  await memory.addInteraction("user", userMessage, userSignature, platformPublicKey, messageHash);
  const contextMessages = memory.getContext();

  const schemaToUse = schema || {
    type: "object",
    properties: {
      response: { type: "string" },
      includesCode: { type: "boolean" },
      code: { type: "string" }
    },
    required: ["response", "includesCode", "code"]
  };

  const res = await signedStructuredResponse({
    query: userMessage,
    schema: schemaToUse,
    context: contextMessages,
    systemPrompt: systemPrompt, // Pass through the systemPrompt if provided
    model: OPENAI_MODEL,
    temperature: 0.4
  });

  // Extract signature info for storage
  const aiResponseText = JSON.stringify(res);
  const aiSignature = res._signature?.signature;
  const aiPublicKey = res._signature?.publicKey;
  const aiResponseHash = res._signature?.responseHash;

  await memory.addInteraction("ai", aiResponseText, aiSignature, aiPublicKey, aiResponseHash);
  return res;
}

/* ======================================================
 * Export
 * ====================================================== */
export default { 
  signedStructuredResponse, 
  verifyResponseSignature,
  chatWithMemory, 
  MemoryManager 
};

// Re-export MemoryManager for convenience
export { MemoryManager };

// Keep legacy export for backwards compatibility
export { signedStructuredResponse as structuredResponse };

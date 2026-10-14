import dotenv from "dotenv";
import { signData, verifySignature, getPublicKeyFromPrivateKey, getAddressFromPrivateKey, getAddressFromPublicKey } from "./tools/der-signature.js";
import { platformAddress, platformPublicKey, createAgentKeys, platformKeys } from "./tools/signature.js";
import { MemoryManager } from "./utilities/MemoryManager.js";
import { complete as llmComplete, LLMConfig } from "./llm-providers/index.js";
import crypto from "crypto";
import { canonicalize, canonicalHash, sha256Hex } from "./tools/canonical.js";

dotenv.config();

// Legacy constants for backward compatibility
const OPENAI_MODEL = "gpt-5-nano";

const SIGNATURE_VERSION = 2;

// Hash of the canonical signed payload (v2). Every field here is covered by the signature.
export function signedPayloadHash(body, { timestamp, address, publicKey, schemaHash, queryHash }) {
  return canonicalHash({
    v: SIGNATURE_VERSION,
    body,
    timestamp,
    address,
    publicKey,
    schemaHash,
    queryHash
  });
}

const DEFAULT_SYSTEM_PROMPT = "You are an AI that outputs ONLY valid JSON strictly conforming to the provided schema. If the schema includes a 'data' field, populate it with the domain-specific information requested. Always include a 'missingContext' array describing any missing information needed for perfection. If nothing is missing, return an empty array.";

/**
 * Build the envelope prompt exactly as signedStructuredResponse sends it.
 * Exported so experiments and tests use the same prompt, not a copy.
 */
export function buildEnvelopeMessages({
  query,
  schema,
  context,
  systemPrompt = DEFAULT_SYSTEM_PROMPT,
  nestUserSchema = false
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

  // If user provides a schema, nest it in a 'data' field separate from the envelope (if nestUserSchema is true)
  // Otherwise, merge at the same level for backward compatibility
  const mergedSchema = schema
    ? (nestUserSchema 
        ? {
            type: "object",
            properties: {
              data: schema, // Nest user schema in 'data' field
              ...baseSchema.properties
            },
            required: ["data", ...baseSchema.required]
          }
        : {
            type: "object",
            properties: {
              ...schema.properties,
              ...baseSchema.properties
            },
            required: Array.from(new Set([
              ...(schema.required || []),
              ...baseSchema.required
            ]))
          })
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

  return { messages, mergedSchema };
}

/**
 * Sign a response body. Returns the _signature block (v2). The signed payload
 * binds the canonical body to the schema it was produced under, the input it
 * answers, the signing key/address and the signing time. Anything outside it
 * (_llm, agentIdentity) is unsigned.
 */
export async function signResponseBody(body, { mergedSchema, query = null, context = null, agentKey = null } = {}) {
  const timestamp = new Date().toISOString();
  const schemaHash = canonicalHash(mergedSchema ?? null);
  const queryHash = canonicalHash({ query: query ?? null, context: context ?? null });

  let privateKey, address, publicKey;
  if (agentKey && agentKey.privateKey) {
    privateKey = agentKey.privateKey;
    address = getAddressFromPrivateKey(privateKey);
    publicKey = getPublicKeyFromPrivateKey(privateKey);
  } else {
    privateKey = platformKeys.privateKey;
    address = platformKeys.address;
    publicKey = platformKeys.publicKey;
  }
  const responseHash = signedPayloadHash(body, { timestamp, address, publicKey, schemaHash, queryHash });
  const signature = await signData(responseHash, privateKey);
  return {
    signature,
    version: SIGNATURE_VERSION,
    responseHash,
    schemaHash,
    queryHash,
    address,
    publicKey,
    timestamp,
    algorithm: "BSV-ECDSA-DER"
  };
}

/* ======================================================
 * Cryptographically Signed Response Helper with Agent Identity
 * ====================================================== */
export async function signedStructuredResponse({
  query,
  schema,
  context,
  model = OPENAI_MODEL,
  temperature = undefined, // undefined = provider default; some models (gpt-5-nano) reject other values
  systemPrompt = DEFAULT_SYSTEM_PROMPT,
  agentKey = null, // New parameter for agent-specific signing
  provider = null, // LLM provider override (openai|llama|auto)
  nestUserSchema = false // New parameter: if true, nest user schema in 'data' field
} = {}) {

  const { messages, mergedSchema } = buildEnvelopeMessages({ query, schema, context, systemPrompt, nestUserSchema });

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
    
    const sig = await signResponseBody(aiResponse, { mergedSchema, query, context, agentKey });

    // Return signed response with cryptographic proof
    return {
      ...aiResponse,
      _signature: {
        ...sig,
        encoding: "hex",
        agentIdentity: agentKey ? agentKey.agentName : "Platform" // label only, not signed
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
/**
 * Verify a signed response.
 *   trustedPublicKeys  keys the caller accepts as signers. `verified` is true only
 *                      when the signature is valid AND the signer is in this list;
 *                      with no list, only `signatureValid` can be true (the response
 *                      matches the key it names, which says nothing about who that is).
 *   expectedSchemaHash / expectedQueryHash  reject a response signed for a different
 *                      schema or input.
 *   maxAgeMs           reject a response signed longer ago than this (freshness).
 *   allowLegacy        accept v1 hash-only signatures (binds only the body; off by default).
 */
export async function verifyResponseSignature(signedResponse, {
  trustedPublicKeys = null,
  expectedSchemaHash = null,
  expectedQueryHash = null,
  maxAgeMs = null,
  allowLegacy = false
} = {}) {
  if (!signedResponse || !signedResponse._signature) {
    return { verified: false, error: "No signature found" };
  }

  const sig = signedResponse._signature;
  const { signature, responseHash, publicKey, timestamp, algorithm } = sig;

  try {
    if (algorithm !== "BSV-ECDSA-DER") {
      return { verified: false, error: `Unsupported algorithm: ${algorithm}` };
    }

    // Recreate the signed body: everything except signature and LLM metadata
    const body = { ...signedResponse };
    delete body._signature;
    delete body._llm;

    let computedHash;
    if (sig.version === SIGNATURE_VERSION) {
      if (getAddressFromPublicKey(publicKey) !== sig.address) {
        return { verified: false, error: "Address does not match public key" };
      }
      computedHash = signedPayloadHash(body, {
        timestamp,
        address: sig.address,
        publicKey,
        schemaHash: sig.schemaHash,
        queryHash: sig.queryHash
      });
    } else if (sig.version === undefined) {
      if (!allowLegacy) {
        return { verified: false, error: "Legacy (v1) signatures are not accepted; pass allowLegacy to opt in" };
      }
      // Legacy (v1): hash of JSON.stringify(body) only. Binds nothing else.
      computedHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
    } else {
      return { verified: false, error: `Unsupported signature version: ${sig.version}` };
    }

    if (computedHash !== responseHash) {
      return {
        verified: false,
        error: "Response hash mismatch",
        expected: responseHash,
        computed: computedHash
      };
    }

    const isValid = await verifySignature(responseHash, signature, publicKey);

    if (isValid && sig.version === SIGNATURE_VERSION) {
      if (expectedSchemaHash && sig.schemaHash !== expectedSchemaHash) {
        return { verified: false, signatureValid: true, error: "Signed for a different schema" };
      }
      if (expectedQueryHash && sig.queryHash !== expectedQueryHash) {
        return { verified: false, signatureValid: true, error: "Signed for a different input" };
      }
      if (maxAgeMs !== null) {
        const age = Date.now() - Date.parse(timestamp);
        if (!(age >= -60_000 && age <= maxAgeMs)) {
          return { verified: false, signatureValid: true, error: "Signature timestamp outside the allowed window" };
        }
      }
    }

    // Key pinning: without trustedPublicKeys this only shows the response was
    // signed by the key it names, not that the key belongs to anyone we trust.
    const pinned = Array.isArray(trustedPublicKeys);
    const trusted = pinned ? trustedPublicKeys.includes(publicKey) : null;
    const verified = isValid && trusted === true;

    return {
      verified,
      signatureValid: isValid,
      trusted,
      version: sig.version ?? 1,
      publicKey,
      timestamp,
      algorithm,
      responseHash,
      error: verified
        ? null
        : isValid
          ? (pinned ? "Signing key is not in the trusted set" : "Signature is valid for the key it names; no trusted key supplied")
          : "Signature verification failed"
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
    model: OPENAI_MODEL
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

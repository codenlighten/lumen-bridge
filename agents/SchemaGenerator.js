import { signedStructuredResponse } from "../structured-json.js";

/**
 * SchemaAgent
 * ----------
 * Generates JSON Schemas on demand using your signedStructuredResponse helper.
 *
 * - Takes a natural language description (`userPrompt`)
 * - Optional `context` object or message history
 * - Returns:
 *    - `generatedSchema`   -> a JSON Schema object
 *    - `schemaName`        -> suggested name for the schema
 *    - `schemaDescription` -> human-friendly description
 *    - plus the standard envelope fields: response, missingContext, etc.
 */
export class SchemaAgent {
  constructor({
    agentKey = null,
    model = "gpt-5-nano",
    temperature = 1.0,
    systemPrompt = null
  } = {}) {
    this.agentKey = agentKey;
    this.model = model;
    this.temperature = temperature;

    this.systemPrompt =
      systemPrompt ||
      `
You are a Schema-Generating AI Agent.

Your job is to create JSON Schemas (Draft-07 compatible) that precisely describe
the structure of the data needed to fulfill the user's request.

Requirements:

- Always output valid JSON that matches the provided JSON schema.
- The "generatedSchema" field MUST be a valid JSON Schema object (type: object).
- Prefer minimal but expressive schemas:
  - Use "type", "properties", "required", "items", "enum", etc.
  - Set "additionalProperties" to false unless there's a strong reason not to.
- "schemaName" should be a short, camelCase identifier (e.g., "bookChapterSchema").
- "schemaDescription" should be a concise sentence explaining what the schema describes.
- "missingContext" should list any details you would need from the user
  to further improve the schema design.
`.trim();
  }

  /**
   * Generate a JSON Schema based on a user prompt and optional context.
   *
   * @param {Object} params
   * @param {string} params.userPrompt - Natural language description of the schema to create
   * @param {Object|Array|null} params.context - Optional context (object or message array)
   * @param {Object|null} params.extraConstraints - Optional additional constraints or hints
   */
  async generateSchema({
    userPrompt,
    context = null,
    extraConstraints = null
  } = {}) {
    if (!userPrompt) {
      throw new Error("SchemaAgent.generateSchema requires a userPrompt string.");
    }

    // This schema will be MERGED with your base envelope inside signedStructuredResponse
    const schemaForResponse = {
      type: "object",
      properties: {
        // Core payload: the newly generated JSON Schema
        generatedSchema: {
          type: "object",
          description:
            "A valid JSON Schema (Draft-07 or later) describing the structure required by the user's prompt."
        },
        schemaName: {
          type: "string",
          description: "A short, camelCase name/identifier for this schema."
        },
        schemaDescription: {
          type: "string",
          description: "A concise human-readable description of what this schema models."
        },
        // Optional explanation from the agent about design choices
        designRationale: {
          type: "string",
          description:
            "A brief explanation of why the schema is structured this way and key design decisions."
        }
      },
      required: ["generatedSchema"]
    };

    // Build a query for the LLM
    const queryParts = [
      "Create a JSON Schema for the following requirement:",
      "",
      userPrompt
    ];

    if (extraConstraints) {
      queryParts.push(
        "",
        "Additional constraints or hints (JSON):",
        JSON.stringify(extraConstraints, null, 2)
      );
    }

    const fullQuery = queryParts.join("\n");

    // Call your signedStructuredResponse helper
    const res = await signedStructuredResponse({
      query: fullQuery,
      schema: schemaForResponse, // will be merged with your base envelope
      context,
      model: this.model,
      temperature: this.temperature,
      systemPrompt: this.systemPrompt,
      agentKey: this.agentKey,
      nestUserSchema: true // Nest schema data in 'data' field
    });

    // At this point `res` includes:
    // - generatedSchema, schemaName, schemaDescription, designRationale
    // - plus envelope fields: response, includesCode, code, continue, questionForUser, question, missingContext
    return res;
  }
}

export default SchemaAgent;

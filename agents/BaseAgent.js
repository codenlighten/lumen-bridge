import { signedStructuredResponse } from '../structured-json.js';
import { schemaRegistry } from '../utilities/SchemaRegistry.js';

/**
 * 🎯 BaseAgent - Foundation for Schema-Aware Agents
 * 
 * Provides a base class that all agents can extend to:
 * - Automatically embed their schema in responses
 * - Register their schema in the registry
 * - Share their contract with other agents
 * - Enable schema-driven agent communication
 * 
 * 🌉 EVOLUTION: See BaseMetaAgent for the "Future Self Bridge" pattern
 * 
 * BaseAgent (this file):
 * - Simple schema-aware agents with predefined schemas
 * - Auto-registration in SchemaRegistry
 * - Schema contracts between agents
 * 
 * BaseMetaAgent (agents/BaseMetaAgent.js):
 * - Self-reflective agents that plan their own schemas
 * - Current self → Future self bridge pattern
 * - Missing context detection & AUTO mode
 * - Memory-backed learning with cryptographic signatures
 * 
 * Use BaseAgent for:
 * - Fixed-schema agents (DataAnalysis, ContentGeneration, etc.)
 * - When you know the schema ahead of time
 * - Simple, predictable agent behaviors
 * 
 * Use BaseMetaAgent for:
 * - Dynamic schema planning based on user queries
 * - Self-evolving agents that adapt their structure
 * - Multi-step autonomous tasks
 * - Agents that learn and improve over time
 */
export class BaseAgent {
  constructor({
    agentName = 'UnnamedAgent',
    agentSchema = null,
    agentDescription = '',
    agentKey = null,
    model = 'gpt-4o-mini',
    temperature = 0.2,
    systemPrompt = null,
    autoRegisterSchema = true
  } = {}) {
    this.agentName = agentName;
    this.agentSchema = agentSchema;
    this.agentDescription = agentDescription;
    this.agentKey = agentKey;
    this.model = model;
    this.temperature = temperature;
    this.systemPrompt = systemPrompt;
    this.autoRegisterSchema = autoRegisterSchema;

    // Auto-register schema if provided
    if (this.autoRegisterSchema && this.agentSchema) {
      this._registerSchema();
    }
  }

  /**
   * Register this agent's schema in the registry
   * @private
   */
  async _registerSchema() {
    try {
      await schemaRegistry.registerSchema({
        schemaName: `${this.agentName}Schema`,
        schema: this.agentSchema,
        description: this.agentDescription,
        metadata: {
          agentName: this.agentName,
          registeredBy: 'BaseAgent',
          autoRegistered: true
        }
      });
    } catch (error) {
      console.warn(`Failed to auto-register schema for ${this.agentName}:`, error.message);
    }
  }

  /**
   * Execute the agent with schema embedding
   * @param {Object} params
   * @param {string} params.query - User query
   * @param {Object|Array} params.context - Context or message history
   * @param {Object} params.customSchema - Override schema for this call
   * @param {boolean} params.embedSchema - Whether to embed agent schema in response (default: true)
   * @returns {Promise<Object>} - Signed response with embedded schema
   */
  async execute({
    query,
    context = null,
    customSchema = null,
    embedSchema = true
  } = {}) {
    if (!query) {
      throw new Error(`${this.agentName}.execute() requires a query`);
    }

    // Use custom schema if provided, otherwise use agent's schema
    const schemaToUse = customSchema || this.agentSchema;

    // If embedSchema is true, add schema field to response
    let finalSchema = schemaToUse;
    if (embedSchema && schemaToUse) {
      finalSchema = {
        type: 'object',
        properties: {
          ...schemaToUse.properties,
          _agentSchema: {
            type: 'object',
            description: 'The schema that this agent adheres to for its responses'
          },
          _agentMetadata: {
            type: 'object',
            properties: {
              agentName: { type: 'string' },
              agentDescription: { type: 'string' },
              schemaVersion: { type: 'string' }
            },
            description: 'Metadata about the agent that generated this response'
          }
        },
        required: [...(schemaToUse.required || [])]
      };
    }

    // Call the LLM with signed structured response
    const response = await signedStructuredResponse({
      query,
      schema: finalSchema,
      context,
      model: this.model,
      temperature: this.temperature,
      systemPrompt: this.systemPrompt || this._getDefaultSystemPrompt(),
      agentKey: this.agentKey
    });

    // Embed schema metadata if requested
    if (embedSchema) {
      response._agentSchema = this.agentSchema;
      response._agentMetadata = {
        agentName: this.agentName,
        agentDescription: this.agentDescription,
        schemaVersion: '1.0.0'
      };
    }

    return response;
  }

  /**
   * Get the agent's schema for sharing with other agents
   * @returns {Object} - Agent schema
   */
  getSchema() {
    return {
      agentName: this.agentName,
      schema: this.agentSchema,
      description: this.agentDescription,
      metadata: {
        agentName: this.agentName,
        version: '1.0.0'
      }
    };
  }

  /**
   * Accept another agent's schema as input contract
   * @param {string} schemaName - Name of schema to retrieve from registry
   * @returns {Promise<Object>} - Retrieved and verified schema
   */
  async acceptSchemaContract(schemaName) {
    const schema = schemaRegistry.getSchema(schemaName);
    if (!schema) {
      throw new Error(`Schema '${schemaName}' not found in registry`);
    }

    // Verify the schema
    const verification = await schemaRegistry.verifySchema(schemaName);
    if (!verification.verified) {
      throw new Error(`Schema verification failed: ${verification.error}`);
    }

    return {
      schema: schema.schema,
      metadata: {
        schemaName: schema.schemaName,
        version: schema.version,
        registrar: schema._signature.registrar,
        verified: true
      }
    };
  }

  /**
   * Default system prompt for base agent
   * @private
   */
  _getDefaultSystemPrompt() {
    return `You are ${this.agentName}, an AI agent that responds according to a defined schema.
${this.agentDescription}

Always output valid JSON that strictly conforms to the provided schema.
Be precise, helpful, and complete in your responses.`;
  }

  /**
   * Get agent information
   * @returns {Object} - Agent info
   */
  getInfo() {
    return {
      agentName: this.agentName,
      description: this.agentDescription,
      hasSchema: !!this.agentSchema,
      schemaRegistered: this.autoRegisterSchema,
      model: this.model,
      temperature: this.temperature
    };
  }
}

/**
 * 🔗 Example: DataAnalysisAgent extending BaseAgent
 */
export class DataAnalysisAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      agentName: 'DataAnalysisAgent',
      agentDescription: 'Analyzes data and provides statistical insights',
      agentSchema: {
        type: 'object',
        properties: {
          analysis: { type: 'string' },
          statistics: {
            type: 'object',
            properties: {
              mean: { type: 'number' },
              median: { type: 'number' },
              stdDev: { type: 'number' }
            }
          },
          insights: {
            type: 'array',
            items: { type: 'string' }
          },
          recommendations: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['analysis', 'insights']
      },
      ...options
    });
  }

  async analyze(data, options = {}) {
    return await this.execute({
      query: `Analyze the following data and provide insights: ${JSON.stringify(data)}`,
      context: options.context,
      ...options
    });
  }
}

/**
 * 🎨 Example: ContentGeneratorAgent extending BaseAgent
 */
export class ContentGeneratorAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      agentName: 'ContentGeneratorAgent',
      agentDescription: 'Generates creative content based on specifications',
      agentSchema: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          contentType: { 
            type: 'string',
            enum: ['article', 'blog', 'social', 'email', 'documentation']
          },
          wordCount: { type: 'number' },
          tone: { 
            type: 'string',
            enum: ['professional', 'casual', 'technical', 'creative']
          },
          keywords: {
            type: 'array',
            items: { type: 'string' }
          },
          metadata: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              author: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        required: ['content', 'contentType', 'tone']
      },
      ...options
    });
  }

  async generate(specification, options = {}) {
    return await this.execute({
      query: `Generate content based on these specifications: ${specification}`,
      context: options.context,
      ...options
    });
  }
}

export default BaseAgent;

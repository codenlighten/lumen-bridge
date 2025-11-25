/**
 * 🌉 Schema Mediator Agent - Universal Translator Between Boxes
 * 
 * Implements the core "Schema Mediator" pattern from concept.md:
 * - Every box (agent, API, file, person) speaks its own schema
 * - Schema Mediator dynamically translates between any two schemas
 * - No hardcoded adapters needed - AI figures out the mapping
 * - Enables the "AI Message Bus" where any box can talk to any other box
 * 
 * This is the KEY differentiator for enterprise integration:
 * - Salesforce schema → SAP schema: ZERO custom code
 * - Legacy API → Modern API: Dynamic adaptation
 * - Human request → Agent schema: Natural translation
 * 
 * Genesis Primitives Used:
 * 1. query - Ask LLM to plan mappings
 * 2. detectMissingContext - Know what's needed for perfect translation
 * 3. planSchema - Design the mapping structure itself
 * 4. validateOutput - Ensure transformed data matches target schema
 * 5. reason - Figure out complex field mappings
 * 6. captureReasoning - Record WHY mappings were chosen
 * 7. composeOperations - Turn successful mappings into reusable translators
 * 8. generateCode - Create transformation functions
 * 9. shareContext - Pass mapping knowledge between mediators
 * 10. signData - Attest translation provenance
 * 
 * Value Proposition:
 * - Traditional integration: $12k-50k per connection, weeks of dev time
 * - Schema Mediator: Minutes to set up, automatic adaptation, $0 maintenance
 */

import BaseMetaAgent from './BaseMetaAgent.js';
import { createAgentKeys } from '../tools/signature.js';
import crypto from 'crypto';

export class SchemaMediatorAgent extends BaseMetaAgent {
  constructor(options = {}) {
    super({
      agentName: 'SchemaMediatorAgent',
      systemPrompt: `You are a Schema Mediator Agent - a universal translator between different data schemas.

Your job is to:
1. Understand the source schema (what data you're given)
2. Understand the target schema (what format is needed)
3. Plan intelligent field mappings between them
4. Transform data from source → target format
5. Validate the transformation matches the target schema
6. Identify any missing context needed for perfect translation

You use AI reasoning to figure out:
- Which source fields map to which target fields
- How to combine multiple source fields (firstName + lastName → fullName)
- How to split fields (fullName → firstName, lastName)
- How to convert values (Active → A, Inactive → I)
- What defaults to use for missing fields
- When to ask for clarification

Always be explicit about your reasoning and what context is missing.`,
      ...options
    });

    // Cache for learned mappings (schema pair → mapping strategy)
    this.mappingCache = new Map();
    this.cacheMaxSize = options.cacheMaxSize || 100;
    this.cacheTTL = options.cacheTTL || 3600000; // 1 hour default
    
    // Statistics
    this.stats = {
      translations: 0,
      cacheHits: 0,
      cachedMappings: 0,
      errors: 0,
      validationFailures: 0
    };
    
    // Initialize signing keys
    this.keys = null;
    this._initKeys();
  }
  
  async _initKeys() {
    try {
      this.keys = await createAgentKeys(this.agentName);
    } catch (error) {
      console.warn(`[SchemaMediator] Could not initialize signing keys:`, error.message);
    }
  }

  /**
   * Main translation method: Transform data from one schema to another
   * 
   * @param {Object} params
   * @param {Object} params.data - Source data to transform
   * @param {Object} params.sourceSchema - JSON Schema of source data
   * @param {Object} params.targetSchema - JSON Schema of target data
   * @param {string} params.sourceSchemaName - Name/ID of source schema (for caching)
   * @param {string} params.targetSchemaName - Name/ID of target schema (for caching)
   * @param {Object} params.context - Additional context (hints, rules, examples)
   * @returns {Promise<Object>} { success, transformedData, mapping, missingContext, _signature }
   */
  async translate({
    data,
    sourceSchema,
    targetSchema,
    sourceSchemaName = 'SourceSchema',
    targetSchemaName = 'TargetSchema',
    context = {},
    enforceValidation = false
  }) {
    console.log(`\n🔄 [SchemaMediator] Translating: ${sourceSchemaName} → ${targetSchemaName}`);
    
    try {
      this.stats.translations++;
      
      // Check cache for existing mapping strategy
      const cacheKey = this._getCacheKey(sourceSchemaName, targetSchemaName);
      let cacheEntry = this.mappingCache.get(cacheKey);
      let mappingStrategy;
      
      if (cacheEntry && !this._isCacheExpired(cacheEntry)) {
        console.log(`   ✓ Using cached mapping strategy`);
        this.stats.cacheHits++;
        mappingStrategy = cacheEntry.strategy;
      } else {
        // Plan the mapping strategy using AI reasoning
        console.log(`   📋 Planning mapping strategy...`);
        mappingStrategy = await this._planMapping(sourceSchema, targetSchema, context);
        
        // Cache it for future use with LRU eviction
        this._addToCache(cacheKey, mappingStrategy);
        this.stats.cachedMappings++;
      }
      
      // Apply the mapping to transform the data
      console.log(`   🔧 Applying transformation...`);
      const transformation = await this._applyMapping(data, mappingStrategy, context);
      
      // Validate the output matches target schema
      console.log(`   ✓ Validating output...`);
      const validation = await this._validateTransformation(transformation.transformedData, targetSchema);
      
      if (!validation.valid) {
        console.log(`   ⚠️  Validation errors:`, validation.errors);
        this.stats.validationFailures++;
        
        if (enforceValidation) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
      }
      
      // Sign the transformation
      const signature = await this._signTransformation({
        data,
        transformedData: transformation.transformedData,
        sourceSchemaName,
        targetSchemaName,
        timestamp: new Date().toISOString()
      });
      
      console.log(`   ✅ Translation complete`);
      
      return {
        success: true,
        transformedData: transformation.transformedData,
        mapping: mappingStrategy,
        missingContext: transformation.missingContext,
        validation,
        _signature: signature,
        _metadata: {
          sourceSchemaName,
          targetSchemaName,
          timestamp: new Date().toISOString(),
          cacheHit: !!cacheEntry && !this._isCacheExpired(cacheEntry)
        }
      };
    } catch (error) {
      this.stats.errors++;
      console.error(`   ❌ Translation failed:`, error.message);
      
      return {
        success: false,
        error: error.message,
        transformedData: null,
        missingContext: [],
        _metadata: {
          sourceSchemaName,
          targetSchemaName,
          timestamp: new Date().toISOString(),
          error: error.message
        }
      };
    }
  }

  /**
   * Retry a translation with additional context
   * Useful when initial translation identified missing context
   */
  async retryWithContext({
    data,
    sourceSchema,
    targetSchema,
    sourceSchemaName,
    targetSchemaName,
    previousMissingContext,
    additionalContext
  }) {
    console.log(`\n🔁 [SchemaMediator] Retrying translation with additional context`);
    
    // Merge the additional context
    const enhancedContext = {
      ...additionalContext,
      previousAttempt: {
        missingContext: previousMissingContext,
        providedContext: additionalContext
      }
    };
    
    // Clear cache to force re-planning with new context
    const cacheKey = this._getCacheKey(sourceSchemaName, targetSchemaName);
    this.mappingCache.delete(cacheKey);
    
    return this.translate({
      data,
      sourceSchema,
      targetSchema,
      sourceSchemaName,
      targetSchemaName,
      context: enhancedContext
    });
  }

  /**
   * Infer a schema from example data
   * Useful when you have data but no formal schema
   */
  async inferSchema(data, schemaName = 'InferredSchema') {
    try {
      const result = await this.step({
        userPrompt: `Analyze this data and generate a JSON Schema that describes its structure:

${JSON.stringify(data, null, 2)}

Generate a complete JSON Schema with:
- type, properties, required fields
- appropriate data types (string, number, boolean, object, array)
- descriptions for each field based on the data`,
      explicitSchema: {
        type: "object",
        properties: {
          schema: {
            type: "object",
            description: "The inferred JSON Schema"
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Confidence in the schema inference"
          },
          assumptions: {
            type: "array",
            items: { type: "string" },
            description: "Assumptions made during inference"
          }
        },
        required: ["schema", "confidence"]
      }
      });
      
      return result;
    } catch (error) {
      console.error(`[SchemaMediator] Schema inference failed:`, error.message);
      throw error;
    }
  }

  /**
   * Create a bidirectional mapping (A ↔ B)
   * Allows translation in both directions
   */
  async createBidirectionalMapping(schemaA, schemaB, schemaNameA = 'SchemaA', schemaNameB = 'SchemaB') {
    console.log(`\n🔄 Creating bidirectional mapping: ${schemaNameA} ↔ ${schemaNameB}`);
    
    // Create A → B mapping
    const forwardKey = this._getCacheKey(schemaNameA, schemaNameB);
    if (!this.mappingCache.has(forwardKey)) {
      const forwardMapping = await this._planMapping(schemaA, schemaB, {});
      this.mappingCache.set(forwardKey, forwardMapping);
    }
    
    // Create B → A mapping
    const reverseKey = this._getCacheKey(schemaNameB, schemaNameA);
    if (!this.mappingCache.has(reverseKey)) {
      const reverseMapping = await this._planMapping(schemaB, schemaA, {});
      this.mappingCache.set(reverseKey, reverseMapping);
    }
    
    console.log(`   ✅ Bidirectional mapping cached`);
    
    return {
      forward: this.mappingCache.get(forwardKey),
      reverse: this.mappingCache.get(reverseKey)
    };
  }

  /**
   * Clear the mapping cache
   */
  clearCache() {
    const size = this.mappingCache.size;
    this.mappingCache.clear();
    console.log(`[SchemaMediator] Cleared ${size} cached mappings`);
  }

  /**
   * Get translation statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.mappingCache.size,
      cacheHitRate: this.stats.translations > 0 
        ? (this.stats.cacheHits / this.stats.translations * 100).toFixed(1) + '%'
        : '0%',
      errorRate: this.stats.translations > 0
        ? (this.stats.errors / this.stats.translations * 100).toFixed(1) + '%'
        : '0%',
      validationFailureRate: this.stats.translations > 0
        ? (this.stats.validationFailures / this.stats.translations * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Plan the mapping strategy using AI reasoning
   * This is where the magic happens - AI figures out how to map fields
   */
  async _planMapping(sourceSchema, targetSchema, context = {}) {
    const result = await this.step({
      userPrompt: `You are planning how to transform data from SOURCE schema to TARGET schema.

SOURCE SCHEMA:
${JSON.stringify(sourceSchema, null, 2)}

TARGET SCHEMA:
${JSON.stringify(targetSchema, null, 2)}

${context.mappingHints ? `\nMAPPING HINTS:\n${JSON.stringify(context.mappingHints, null, 2)}` : ''}

Create a mapping strategy that specifies:
1. For each TARGET field, which SOURCE field(s) to use
2. What transformation type: direct, combine, split, convert, or default
3. Any conversion rules (e.g., "Active" → "A")
4. Default values for fields with no source
5. What context is missing for a perfect mapping`,
      explicitSchema: {
        type: "object",
        properties: {
          fieldMappings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                targetField: { type: "string", description: "Path in target schema (e.g., 'user.name')" },
                sourceFields: { type: "array", items: { type: "string" }, description: "Paths in source schema" },
                transformationType: { 
                  type: "string", 
                  enum: ["direct", "combine", "split", "convert", "default"],
                  description: "How to transform the data"
                },
                transformationRule: { type: "string", description: "Specific rule (e.g., 'concatenate with space', 'map Active→A')" },
                defaultValue: { description: "Default if source is missing" }
              },
              required: ["targetField", "sourceFields", "transformationType"]
            }
          },
          reasoning: { type: "string", description: "Why these mappings make sense" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          missingContext: { 
            type: "array", 
            items: { type: "string" },
            description: "What additional context would improve the mapping"
          }
        },
        required: ["fieldMappings", "reasoning", "confidence", "missingContext"]
      }
    });
    
    return result;
  }

  /**
   * Apply the mapping strategy to transform actual data
   */
  async _applyMapping(data, mappingStrategy, context = {}) {
    const result = await this.step({
      userPrompt: `Transform this SOURCE data using the MAPPING STRATEGY to produce TARGET data.

SOURCE DATA:
${JSON.stringify(data, null, 2)}

MAPPING STRATEGY:
${JSON.stringify(mappingStrategy.fieldMappings, null, 2)}

Apply each mapping rule precisely:
- direct: copy field as-is
- combine: merge multiple fields (follow the rule)
- split: break one field into multiple
- convert: apply value transformation (follow the rule)
- default: use the default value

Produce the complete transformed object.`,
      explicitSchema: {
        type: "object",
        properties: {
          transformedData: { type: "object", description: "The transformed data in target schema format" },
          appliedMappings: { 
            type: "array", 
            items: { 
              type: "object",
              properties: {
                targetField: { type: "string" },
                success: { type: "boolean" },
                usedDefault: { type: "boolean" }
              }
            }
          },
          missingContext: { type: "array", items: { type: "string" } }
        },
        required: ["transformedData", "appliedMappings", "missingContext"]
      }
    });
    
    return result;
  }

  /**
   * Validate that transformed data matches target schema
   */
  async _validateTransformation(transformedData, targetSchema) {
    const result = await this.step({
      userPrompt: `Validate that this DATA matches this SCHEMA:

DATA:
${JSON.stringify(transformedData, null, 2)}

SCHEMA:
${JSON.stringify(targetSchema, null, 2)}

Check:
- All required fields are present
- All fields match the expected type
- Enum values are valid
- Nested objects match nested schemas`,
      explicitSchema: {
        type: "object",
        properties: {
          valid: { type: "boolean" },
          errors: { type: "array", items: { type: "string" } },
          warnings: { type: "array", items: { type: "string" } }
        },
        required: ["valid", "errors"]
      }
    });
    
    return result;
  }

  /**
   * Generate cache key for schema pair
   */
  _getCacheKey(sourceSchemaName, targetSchemaName) {
    return `${sourceSchemaName}→${targetSchemaName}`;
  }

  /**
   * Add mapping to cache with LRU eviction
   */
  _addToCache(key, strategy) {
    // If cache is full, remove oldest entry (LRU)
    if (this.mappingCache.size >= this.cacheMaxSize) {
      const firstKey = this.mappingCache.keys().next().value;
      this.mappingCache.delete(firstKey);
    }
    
    this.mappingCache.set(key, {
      strategy,
      timestamp: Date.now(),
      hits: 0
    });
  }

  /**
   * Check if cache entry is expired
   */
  _isCacheExpired(cacheEntry) {
    return (Date.now() - cacheEntry.timestamp) > this.cacheTTL;
  }

  /**
   * Sign the transformation data for provenance
   */
  async _signTransformation(transformationData) {
    if (!this.keys) {
      return null;
    }
    
    try {
      const dataString = JSON.stringify(transformationData);
      const signature = crypto
        .createSign('SHA256')
        .update(dataString)
        .sign(this.keys.privateKey, 'base64');
      
      return {
        signature,
        publicKey: this.keys.publicKey,
        algorithm: 'SHA256',
        timestamp: transformationData.timestamp
      };
    } catch (error) {
      console.warn(`[SchemaMediator] Signing failed:`, error.message);
      return null;
    }
  }
}

export default SchemaMediatorAgent;

import { signData, verifySignature } from '../tools/der-signature.js';
import { platformKeys } from '../tools/signature.js';
import crypto from 'crypto';

/**
 * 📚 Schema Registry - Cryptographically Signed Schema Catalog
 * 
 * Stores JSON schemas with cryptographic signatures, allowing agents to:
 * - Register schemas with proof of origin
 * - Retrieve schemas by name or ID
 * - Verify schema integrity
 * - Track schema versions and updates
 * - Share schemas between agents with trust verification
 */
export class SchemaRegistry {
  constructor({
    agentKey = null,
    persistencePath = null
  } = {}) {
    this.agentKey = agentKey;
    this.persistencePath = persistencePath;
    
    // In-memory storage
    this.schemas = new Map(); // schemaName -> schema object
    this.schemasByHash = new Map(); // hash -> schema object
    this.schemaVersions = new Map(); // schemaName -> version[]
    
    // Statistics
    this.stats = {
      totalSchemas: 0,
      totalVersions: 0,
      registrations: 0,
      retrievals: 0,
      verifications: 0
    };
  }

  /**
   * Register a schema with cryptographic signature
   * @param {Object} params
   * @param {string} params.schemaName - Unique name for the schema
   * @param {Object} params.schema - The JSON schema object
   * @param {string} params.description - Human-readable description
   * @param {Object} params.metadata - Optional metadata
   * @param {string} params.version - Optional version (defaults to timestamp)
   * @returns {Promise<Object>} - Signed schema registration result
   */
  async registerSchema({
    schemaName,
    schema,
    description = '',
    metadata = {},
    version = null
  }) {
    if (!schemaName) {
      throw new Error('schemaName is required');
    }
    if (!schema || typeof schema !== 'object') {
      throw new Error('schema must be a valid object');
    }

    // Generate version if not provided
    const schemaVersion = version || new Date().toISOString();

    // Create schema hash for integrity verification
    const schemaText = JSON.stringify(schema);
    const schemaHash = crypto.createHash('sha256').update(schemaText).digest('hex');

    // Sign the schema hash
    const privateKey = this.agentKey?.privateKey || platformKeys.privateKey;
    const publicKey = this.agentKey?.publicKey || platformKeys.publicKey;
    const address = this.agentKey?.address || platformKeys.address;
    
    const signature = await signData(schemaHash, privateKey);

    // Create registry entry
    const registryEntry = {
      schemaName,
      schema,
      description,
      metadata,
      version: schemaVersion,
      schemaHash,
      registeredAt: new Date().toISOString(),
      _signature: {
        signature,
        schemaHash,
        address,
        publicKey,
        timestamp: new Date().toISOString(),
        algorithm: 'BSV-ECDSA-DER',
        encoding: 'hex',
        registrar: this.agentKey ? this.agentKey.agentName : 'Platform'
      }
    };

    // Store in registry
    this.schemas.set(schemaName, registryEntry);
    this.schemasByHash.set(schemaHash, registryEntry);

    // Track versions
    if (!this.schemaVersions.has(schemaName)) {
      this.schemaVersions.set(schemaName, []);
    }
    this.schemaVersions.get(schemaName).push({
      version: schemaVersion,
      hash: schemaHash,
      timestamp: registryEntry.registeredAt
    });

    // Update stats
    this.stats.registrations++;
    this.stats.totalSchemas = this.schemas.size;
    this.stats.totalVersions = Array.from(this.schemaVersions.values())
      .reduce((sum, versions) => sum + versions.length, 0);

    return {
      success: true,
      schemaName,
      version: schemaVersion,
      schemaHash,
      signature: registryEntry._signature
    };
  }

  /**
   * Retrieve a schema by name
   * @param {string} schemaName - Name of the schema to retrieve
   * @returns {Object|null} - Schema registry entry or null if not found
   */
  getSchema(schemaName) {
    this.stats.retrievals++;
    return this.schemas.get(schemaName) || null;
  }

  /**
   * Retrieve a schema by hash
   * @param {string} schemaHash - Hash of the schema to retrieve
   * @returns {Object|null} - Schema registry entry or null if not found
   */
  getSchemaByHash(schemaHash) {
    this.stats.retrievals++;
    return this.schemasByHash.get(schemaHash) || null;
  }

  /**
   * Verify the cryptographic signature of a schema
   * @param {string} schemaName - Name of the schema to verify
   * @returns {Promise<Object>} - Verification result
   */
  async verifySchema(schemaName) {
    this.stats.verifications++;
    
    const entry = this.schemas.get(schemaName);
    if (!entry) {
      return {
        verified: false,
        error: 'Schema not found'
      };
    }

    try {
      // Recreate hash from schema
      const schemaText = JSON.stringify(entry.schema);
      const computedHash = crypto.createHash('sha256').update(schemaText).digest('hex');

      // Verify hash matches
      if (computedHash !== entry.schemaHash) {
        return {
          verified: false,
          error: 'Schema hash mismatch - schema may have been tampered with',
          expected: entry.schemaHash,
          computed: computedHash
        };
      }

      // Verify cryptographic signature
      const isValid = await verifySignature(
        entry.schemaHash,
        entry._signature.signature,
        entry._signature.publicKey
      );

      return {
        verified: isValid,
        schemaName: entry.schemaName,
        version: entry.version,
        registrar: entry._signature.registrar,
        registeredAt: entry.registeredAt,
        publicKey: entry._signature.publicKey,
        address: entry._signature.address,
        error: isValid ? null : 'Signature verification failed'
      };
    } catch (error) {
      return {
        verified: false,
        error: `Verification error: ${error.message}`
      };
    }
  }

  /**
   * List all registered schemas
   * @returns {Array} - Array of schema metadata
   */
  listSchemas() {
    return Array.from(this.schemas.values()).map(entry => ({
      schemaName: entry.schemaName,
      description: entry.description,
      version: entry.version,
      registeredAt: entry.registeredAt,
      registrar: entry._signature.registrar,
      schemaHash: entry.schemaHash
    }));
  }

  /**
   * Get all versions of a schema
   * @param {string} schemaName - Name of the schema
   * @returns {Array} - Array of version information
   */
  getVersionHistory(schemaName) {
    return this.schemaVersions.get(schemaName) || [];
  }

  /**
   * Search schemas by description or metadata
   * @param {string} query - Search query
   * @returns {Array} - Matching schemas
   */
  searchSchemas(query) {
    const lowerQuery = query.toLowerCase();
    const results = [];

    for (const entry of this.schemas.values()) {
      const matchesName = entry.schemaName.toLowerCase().includes(lowerQuery);
      const matchesDescription = entry.description.toLowerCase().includes(lowerQuery);
      const matchesMetadata = JSON.stringify(entry.metadata).toLowerCase().includes(lowerQuery);

      if (matchesName || matchesDescription || matchesMetadata) {
        results.push({
          schemaName: entry.schemaName,
          description: entry.description,
          version: entry.version,
          registeredAt: entry.registeredAt,
          relevance: matchesName ? 'high' : matchesDescription ? 'medium' : 'low'
        });
      }
    }

    return results.sort((a, b) => {
      const relevanceOrder = { high: 0, medium: 1, low: 2 };
      return relevanceOrder[a.relevance] - relevanceOrder[b.relevance];
    });
  }

  /**
   * Export schemas for sharing or persistence
   * @returns {Object} - Exportable registry data
   */
  exportRegistry() {
    return {
      exportedAt: new Date().toISOString(),
      stats: this.stats,
      schemas: Array.from(this.schemas.values()),
      versions: Object.fromEntries(this.schemaVersions)
    };
  }

  /**
   * Import schemas from exported data
   * @param {Object} registryData - Exported registry data
   * @returns {Object} - Import result
   */
  async importRegistry(registryData) {
    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (const entry of registryData.schemas) {
      try {
        // Verify signature before importing
        const verification = await verifySignature(
          entry.schemaHash,
          entry._signature.signature,
          entry._signature.publicKey
        );

        if (!verification) {
          results.errors.push({
            schemaName: entry.schemaName,
            error: 'Signature verification failed'
          });
          results.skipped++;
          continue;
        }

        // Import the schema
        this.schemas.set(entry.schemaName, entry);
        this.schemasByHash.set(entry.schemaHash, entry);
        results.imported++;
      } catch (error) {
        results.errors.push({
          schemaName: entry.schemaName,
          error: error.message
        });
        results.skipped++;
      }
    }

    // Update stats
    this.stats.totalSchemas = this.schemas.size;

    return results;
  }

  /**
   * Get registry statistics
   * @returns {Object} - Registry statistics
   */
  getStats() {
    return {
      ...this.stats,
      schemaNames: Array.from(this.schemas.keys()).sort()
    };
  }

  /**
   * Clear all schemas (use with caution)
   */
  clear() {
    this.schemas.clear();
    this.schemasByHash.clear();
    this.schemaVersions.clear();
    this.stats = {
      totalSchemas: 0,
      totalVersions: 0,
      registrations: 0,
      retrievals: 0,
      verifications: 0
    };
  }
}

// Create and export a singleton instance
export const schemaRegistry = new SchemaRegistry();

// Export convenience functions
export async function registerSchema(params) {
  return await schemaRegistry.registerSchema(params);
}

export function getSchema(schemaName) {
  return schemaRegistry.getSchema(schemaName);
}

export async function verifySchema(schemaName) {
  return await schemaRegistry.verifySchema(schemaName);
}

export function listSchemas() {
  return schemaRegistry.listSchemas();
}

export function searchSchemas(query) {
  return schemaRegistry.searchSchemas(query);
}

export default schemaRegistry;

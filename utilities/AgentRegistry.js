/**
 * 🎭 Agent Registry - Automatic Agent Discovery and Configuration
 * 
 * Automatically discovers, imports, and configures agents for the LumenBridge system.
 * Provides a unified interface for agent management and schema generation.
 * 
 * ENHANCED: Now supports user-created agents with access control
 * - System agents: Built-in agents available to all users
 * - User agents: Custom agents created by users, scoped to userId
 * - Admin access: Special access to view all registered user agents
 */

import { SummaryAgent } from '../agents/SummaryAgent.js';
import { ReasoningAgent } from '../agents/ReasoningAgent.js';
import { CodeGenerator } from '../agents/CodeGenerator.js';
import { TerminalAgent } from '../agents/TerminalAgent.js';
import { SearchAgent } from '../agents/SearchAgent.js';
import { dbService } from './MongoDBService.js';

/**
 * Agent Registry - Maps friendly names to actual agent implementations
 * Supports both system agents (built-in) and user agents (custom)
 */
export class AgentRegistry {
  constructor() {
    this.agents = new Map(); // System agents
    this.schemas = new Map(); // System schemas
    this.userAgents = new Map(); // User-created agents: Map<userId, Map<agentName, agentConfig>>
    this._initialize();
  }

  /**
   * Initialize the registry with all available agents
   * @private
   */
  _initialize() {
    // Define agent mappings with friendly names
    const agentMappings = [
      // Core agents from agents/ directory
      { 
        names: ['summary', 'summarize', 'synthesis'], 
        agent: SummaryAgent, 
        method: 'summarizeContent',
        description: "Synthesizes and summarizes large amounts of content into structured insights"
      },
      { 
        names: ['reasoning', 'analysis', 'analyze', 'reason'], 
        agent: ReasoningAgent, 
        method: 'reason',
        description: "Performs step-by-step logical analysis and complex reasoning"
      },
      { 
        names: ['coding', 'code', 'programming', 'development'], 
        agent: CodeGenerator, 
        method: 'generateCode',
        description: "Generates, reviews, and optimizes code in various programming languages"
      },
      { 
        names: ['terminal', 'command', 'shell'], 
        agent: TerminalAgent, 
        method: 'generateCommand',
        description: "Generates safe terminal commands for system operations"
      },
      { 
        names: ['search', 'web', 'investigate'], 
        agent: SearchAgent, 
        method: 'search',
        description: "Performs web search using Google Custom Search API"
      }
    ];

    // Register all agent mappings
    for (const mapping of agentMappings) {
      const schema = this._generateSchema(mapping);
      
      for (const name of mapping.names) {
        this.agents.set(name, {
          name: mapping.names[0], // Primary name
          agent: mapping.agent,
          method: mapping.method,
          description: mapping.description,
          schema: schema
        });
        this.schemas.set(name, schema);
      }
    }
  }

  /**
   * Get an agent by name
   * @param {string} name - Agent name (case insensitive)
   * @returns {Object|null} - Agent configuration or null if not found
   */
  getAgent(name) {
    const normalizedName = name.toLowerCase().trim();
    return this.agents.get(normalizedName) || null;
  }

  /**
   * Get agent schema by name
   * @param {string} name - Agent name
   * @returns {Object|null} - Agent schema or null if not found
   */
  getSchema(name) {
    const normalizedName = name.toLowerCase().trim();
    return this.schemas.get(normalizedName) || null;
  }

  /**
   * Check if an agent exists
   * @param {string} name - Agent name
   * @returns {boolean} - True if agent exists
   */
  hasAgent(name) {
    const normalizedName = name.toLowerCase().trim();
    return this.agents.has(normalizedName);
  }

  /**
   * Get all available agent names
   * @returns {string[]} - Array of all agent names
   */
  getAvailableAgents() {
    const uniqueAgents = new Set();
    for (const config of this.agents.values()) {
      uniqueAgents.add(config.name);
    }
    return Array.from(uniqueAgents).sort();
  }

  /**
   * Get agent suggestions based on partial name
   * @param {string} partialName - Partial agent name
   * @returns {string[]} - Array of suggested agent names
   */
  getSuggestions(partialName) {
    const normalized = partialName.toLowerCase().trim();
    const suggestions = [];
    
    for (const name of this.agents.keys()) {
      if (name.includes(normalized)) {
        const config = this.agents.get(name);
        if (!suggestions.includes(config.name)) {
          suggestions.push(config.name);
        }
      }
    }
    
    return suggestions.sort();
  }

  /**
   * Invoke an agent with the global context pattern
   * @param {string} agentName - Name of the agent to invoke
   * @param {Object} globalContext - The global context object
   * @returns {Promise<Object>} - Agent response
   */
  async invokeAgent(agentName, globalContext) {
    const agentConfig = this.getAgent(agentName);
    
    if (!agentConfig) {
      throw new Error(`Agent '${agentName}' not found. Available agents: ${this.getAvailableAgents().join(', ')}`);
    }

    try {
      const { agent, method } = agentConfig;

      if (method) {
        // Class-based agent with method
        if (typeof agent[method] === 'function') {
          return await agent[method]({ globalContext });
        } else {
          // Instance method - create instance first
          const instance = new agent();
          return await instance[method]({ globalContext });
        }
      } else {
        // Direct function call (like researchAgent)
        return await agent({ globalContext });
      }
    } catch (error) {
      throw new Error(`Failed to invoke agent '${agentName}': ${error.message}`);
    }
  }

  /**
   * Generate a comprehensive schema for an agent
   * @param {Object} mapping - Agent mapping configuration
   * @returns {Object} - OpenAI-compatible tool schema
   * @private
   */
  _generateSchema(mapping) {
    return {
      type: "function",
      function: {
        name: mapping.names[0], // Use primary name
        description: mapping.description,
        parameters: {
          type: "object",
          properties: {
            globalContext: {
              type: "object",
              description: "Global context object containing all previous agent results and user input",
              properties: {
                userQuery: {
                  type: "string", 
                  description: "The original user query or request"
                },
                // Additional properties will be added dynamically based on previous agent results
              }
            }
          },
          required: ["globalContext"]
        }
      }
    };
  }

  /**
   * Generate OpenAI tools array for all registered agents
   * @returns {Array} - Array of OpenAI-compatible tool definitions
   */
  generateToolsArray() {
    const tools = [];
    const addedNames = new Set();

    for (const config of this.agents.values()) {
      if (!addedNames.has(config.name)) {
        tools.push(config.schema);
        addedNames.add(config.name);
      }
    }

    return tools;
  }

  /**
   * Get registry statistics
   * @returns {Object} - Registry statistics
   */
  getStats() {
    const uniqueAgents = new Set();
    const totalAliases = this.agents.size;

    for (const config of this.agents.values()) {
      uniqueAgents.add(config.name);
    }

    return {
      uniqueAgents: uniqueAgents.size,
      totalAliases: totalAliases,
      agents: Array.from(uniqueAgents).sort(),
      userAgents: this.userAgents.size,
      totalUserAgents: Array.from(this.userAgents.values()).reduce((sum, map) => sum + map.size, 0)
    };
  }

  // ==================== USER AGENT OPERATIONS ====================

  /**
   * Register a user-created agent
   * @param {string} userId - User ID who owns this agent
   * @param {Object} agentConfig - Agent configuration
   * @param {string} agentConfig.name - Agent name (unique per user)
   * @param {string} agentConfig.description - Agent description
   * @param {string} agentConfig.prompt - System prompt for the agent
   * @param {Object} agentConfig.schema - Optional custom schema
   * @param {Object} agentConfig.metadata - Optional metadata
   * @returns {Promise<Object>} - Registered agent configuration
   */
  async registerUserAgent(userId, agentConfig) {
    if (!userId) {
      throw new Error('userId is required to register a user agent');
    }

    if (!agentConfig.name) {
      throw new Error('Agent name is required');
    }

    const normalizedName = agentConfig.name.toLowerCase().trim();

    // Check if this conflicts with system agents
    if (this.agents.has(normalizedName)) {
      throw new Error(`Agent name '${agentConfig.name}' conflicts with a system agent. Please choose a different name.`);
    }

    // Initialize user agent map if needed
    if (!this.userAgents.has(userId)) {
      this.userAgents.set(userId, new Map());
    }

    const userAgentMap = this.userAgents.get(userId);

    // Check if user already has an agent with this name
    if (userAgentMap.has(normalizedName)) {
      throw new Error(`You already have an agent named '${agentConfig.name}'. Please choose a different name or update the existing agent.`);
    }

    // Create agent registration
    const registeredAgent = {
      userId,
      name: agentConfig.name,
      normalizedName,
      description: agentConfig.description || '',
      prompt: agentConfig.prompt || '',
      schema: agentConfig.schema || this._generateUserAgentSchema(agentConfig),
      metadata: agentConfig.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      type: 'user-created'
    };

    // Store in memory
    userAgentMap.set(normalizedName, registeredAgent);

    // Persist to database if available
    await this._persistUserAgent(userId, registeredAgent);

    console.log(`   ✅ User agent registered: ${agentConfig.name} (user: ${userId})`);
    return registeredAgent;
  }

  /**
   * Update a user-created agent
   * @param {string} userId - User ID who owns this agent
   * @param {string} agentName - Agent name to update
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated agent configuration
   */
  async updateUserAgent(userId, agentName, updates) {
    const normalizedName = agentName.toLowerCase().trim();
    const userAgentMap = this.userAgents.get(userId);

    if (!userAgentMap || !userAgentMap.has(normalizedName)) {
      throw new Error(`Agent '${agentName}' not found for user ${userId}`);
    }

    const agent = userAgentMap.get(normalizedName);

    // Update allowed fields
    if (updates.description !== undefined) agent.description = updates.description;
    if (updates.prompt !== undefined) agent.prompt = updates.prompt;
    if (updates.schema !== undefined) agent.schema = updates.schema;
    if (updates.metadata !== undefined) agent.metadata = { ...agent.metadata, ...updates.metadata };
    
    agent.updatedAt = new Date();

    // Persist to database
    await this._persistUserAgent(userId, agent);

    console.log(`   ✅ User agent updated: ${agentName} (user: ${userId})`);
    return agent;
  }

  /**
   * Delete a user-created agent
   * @param {string} userId - User ID who owns this agent
   * @param {string} agentName - Agent name to delete
   * @returns {Promise<boolean>} - True if deleted
   */
  async deleteUserAgent(userId, agentName) {
    const normalizedName = agentName.toLowerCase().trim();
    const userAgentMap = this.userAgents.get(userId);

    if (!userAgentMap || !userAgentMap.has(normalizedName)) {
      return false;
    }

    // Remove from memory
    userAgentMap.delete(normalizedName);

    // If user has no more agents, remove the user map
    if (userAgentMap.size === 0) {
      this.userAgents.delete(userId);
    }

    // Remove from database
    await this._deleteUserAgentFromDB(userId, normalizedName);

    console.log(`   🗑️  User agent deleted: ${agentName} (user: ${userId})`);
    return true;
  }

  /**
   * Get all agents for a specific user
   * @param {string} userId - User ID
   * @returns {Array<Object>} - Array of user's agents
   */
  getUserAgents(userId) {
    const userAgentMap = this.userAgents.get(userId);
    
    if (!userAgentMap) {
      return [];
    }

    return Array.from(userAgentMap.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  /**
   * Get a specific user agent
   * @param {string} userId - User ID
   * @param {string} agentName - Agent name
   * @returns {Object|null} - Agent configuration or null
   */
  getUserAgent(userId, agentName) {
    const normalizedName = agentName.toLowerCase().trim();
    const userAgentMap = this.userAgents.get(userId);

    if (!userAgentMap) {
      return null;
    }

    return userAgentMap.get(normalizedName) || null;
  }

  /**
   * Get all user agents across all users (admin only)
   * @returns {Array<Object>} - Array of all user agents
   */
  getAllUserAgents() {
    const allAgents = [];

    for (const [userId, agentMap] of this.userAgents.entries()) {
      for (const agent of agentMap.values()) {
        allAgents.push(agent);
      }
    }

    return allAgents.sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  /**
   * Load user agents from database on startup
   * @param {string} userId - Optional userId to load specific user's agents
   * @returns {Promise<void>}
   */
  async loadUserAgentsFromDB(userId = null) {
    if (!dbService.isConnected) {
      console.log('   ⚠️  Database not connected, skipping user agent loading');
      return;
    }

    try {
      const query = userId ? { userId, type: 'user-created' } : { type: 'user-created' };
      const agents = await dbService.collections.agents.find(query).toArray();

      for (const agent of agents) {
        if (!this.userAgents.has(agent.userId)) {
          this.userAgents.set(agent.userId, new Map());
        }

        const userAgentMap = this.userAgents.get(agent.userId);
        userAgentMap.set(agent.normalizedName, {
          userId: agent.userId,
          name: agent.name,
          normalizedName: agent.normalizedName,
          description: agent.description,
          prompt: agent.prompt,
          schema: agent.schema,
          metadata: agent.metadata,
          createdAt: new Date(agent.createdAt),
          updatedAt: new Date(agent.updatedAt),
          type: 'user-created'
        });
      }

      const count = agents.length;
      console.log(`   📂 Loaded ${count} user agent${count !== 1 ? 's' : ''} from database`);
    } catch (error) {
      console.error('   ❌ Failed to load user agents from database:', error.message);
    }
  }

  /**
   * Invoke a user agent (uses OpenAI with custom prompt)
   * @param {string} userId - User ID
   * @param {string} agentName - Agent name
   * @param {Object} context - Context to pass to agent
   * @returns {Promise<Object>} - Agent response
   */
  async invokeUserAgent(userId, agentName, context) {
    const agent = this.getUserAgent(userId, agentName);

    if (!agent) {
      throw new Error(`User agent '${agentName}' not found for user ${userId}`);
    }

    // User agents use OpenAI with their custom prompt
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
      const messages = [
        { role: 'system', content: agent.prompt },
        { role: 'user', content: JSON.stringify(context) }
      ];

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-5-nano',
        messages,
        temperature: 1.0
      });

      return {
        agentName: agent.name,
        userId: agent.userId,
        response: response.choices[0].message.content,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to invoke user agent '${agentName}': ${error.message}`);
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Generate schema for user-created agent
   * @private
   */
  _generateUserAgentSchema(agentConfig) {
    return {
      type: "function",
      function: {
        name: agentConfig.name.toLowerCase().replace(/\s+/g, '_'),
        description: agentConfig.description || `Custom user agent: ${agentConfig.name}`,
        parameters: {
          type: "object",
          properties: {
            context: {
              type: "object",
              description: "Context object for the user agent"
            }
          },
          required: ["context"]
        }
      }
    };
  }

  /**
   * Persist user agent to database
   * @private
   */
  async _persistUserAgent(userId, agent) {
    if (!dbService.isConnected) {
      return;
    }

    try {
      // Create unique identifier for user agents
      const uniqueId = `${userId}-${agent.normalizedName}`;
      
      await dbService.collections.agents.updateOne(
        { userId, normalizedName: agent.normalizedName, type: 'user-created' },
        { 
          $set: {
            agentId: uniqueId, // Add unique agentId for user agents
            userId: agent.userId,
            name: agent.name,
            normalizedName: agent.normalizedName,
            description: agent.description,
            prompt: agent.prompt,
            schema: agent.schema,
            metadata: agent.metadata,
            updatedAt: agent.updatedAt,
            type: 'user-created'
          },
          $setOnInsert: {
            createdAt: agent.createdAt
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('   ❌ Failed to persist user agent:', error.message);
    }
  }

  /**
   * Delete user agent from database
   * @private
   */
  async _deleteUserAgentFromDB(userId, normalizedName) {
    if (!dbService.isConnected) {
      return;
    }

    try {
      await dbService.collections.agents.deleteOne({
        userId,
        normalizedName,
        type: 'user-created'
      });
    } catch (error) {
      console.error('   ❌ Failed to delete user agent from database:', error.message);
    }
  }
}

// Create and export a singleton instance
export const agentRegistry = new AgentRegistry();

// Export convenience functions
export function getAgent(name) {
  return agentRegistry.getAgent(name);
}

export function hasAgent(name) {
  return agentRegistry.hasAgent(name);
}

export function getAvailableAgents() {
  return agentRegistry.getAvailableAgents();
}

export function invokeAgent(agentName, globalContext) {
  return agentRegistry.invokeAgent(agentName, globalContext);
}

export default agentRegistry;
/**
 * 🎭 Agent Registry - Automatic Agent Discovery and Configuration
 * 
 * Automatically discovers, imports, and configures agents for the LumenBridge system.
 * Provides a unified interface for agent management and schema generation.
 */

import { SummaryAgent } from '../agents/SummaryAgent.js';
import { ReasoningAgent } from '../agents/ReasoningAgent.js';
import { SimpleAgent } from '../agents/SimpleAgent.js';
import { CodingAgent } from '../agents/CodingAgent.js';
import { TerminalAgent } from '../agents/TerminalAgent.js';
import { researchAgent } from './ResearchTool.js';
import { TerminalExecutor } from './TerminalExecutor.js';

/**
 * Agent Registry - Maps friendly names to actual agent implementations
 */
export class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.schemas = new Map();
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
        names: ['simple', 'question', 'answer', 'qa'], 
        agent: SimpleAgent, 
        method: 'handleQuestion',
        description: "Handles simple questions and provides direct answers"
      },
      { 
        names: ['coding', 'code', 'programming', 'development'], 
        agent: CodingAgent, 
        method: 'generateCode',
        description: "Generates, reviews, and optimizes code in various programming languages"
      },
      { 
        names: ['terminal', 'command', 'shell'], 
        agent: TerminalAgent, 
        method: 'generateCommand',
        description: "Generates safe terminal commands for system operations"
      },
      
      // Utility agents from utilities/ directory
      { 
        names: ['research', 'search', 'web', 'investigate'], 
        agent: researchAgent, 
        method: null, // Direct function call
        description: "Performs comprehensive web research and information gathering"
      },
      { 
        names: ['execute', 'run', 'executor'], 
        agent: TerminalExecutor, 
        method: 'executeCommand',
        description: "Safely executes terminal commands with security controls"
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
      agents: Array.from(uniqueAgents).sort()
    };
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
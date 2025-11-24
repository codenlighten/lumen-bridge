/**
 * LUMEN BRIDGE - Self-Aware Agent API Server
 * 
 * Exposes the complete agent system via REST API:
 * - Individual agents (SearchAgent, TerminalAgent, CodeGenerator, etc.)
 * - Intelligent ToolRouter for autonomous routing
 * - BaseMetaAgent for custom agent creation
 * - Schema generation and registry
 * - Memory and cryptographic signatures
 * 
 * Users can:
 * 1. Use individual specialized agents
 * 2. Use the intelligent router for full autonomy
 * 3. Create custom agents extending BaseMetaAgent
 * 4. Build their own AI applications on top
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import agents
import BaseMetaAgent from './agents/BaseMetaAgent.js';
import SearchAgent from './agents/SearchAgent.js';
import TerminalAgent from './agents/TerminalAgent.js';
import CodeGenerator from './agents/CodeGenerator.js';
import SchemaAgent from './agents/SchemaGenerator.js';

// Import utilities
import { SchemaRegistry } from './utilities/SchemaRegistry.js';
import { MemoryManager } from './utilities/MemoryManager.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize agents (singleton instances)
const agents = {
  search: new SearchAgent({ maxResults: 10 }),
  terminal: new TerminalAgent('API-Terminal'),
  code: new CodeGenerator('API-CodeGen'),
  schema: new SchemaAgent()
};

// Initialize schema registry
const schemaRegistry = new SchemaRegistry();

// ============================================================================
// HEALTH & INFO
// ============================================================================

app.get('/', (req, res) => {
  res.json({
    name: 'Lumen Bridge - Self-Aware Agent API',
    version: '1.0.0',
    description: 'Self-evolving agent system with cryptographic signatures',
    architecture: 'Future Self Bridge Pattern',
    features: [
      'Individual specialized agents',
      'Intelligent routing system',
      'Schema-driven responses',
      'Cryptographic signatures (BSV-ECDSA-DER)',
      'Memory with signed history',
      'Self-reflective planning',
      'Missing context detection'
    ],
    endpoints: {
      agents: '/api/agents',
      router: '/api/router',
      schema: '/api/schema',
      memory: '/api/memory',
      docs: '/api/docs'
    }
  });
});

app.get('/api/docs', (req, res) => {
  res.json({
    description: 'Lumen Bridge API Documentation',
    endpoints: [
      {
        path: '/api/agents',
        method: 'GET',
        description: 'List all available agents and their capabilities'
      },
      {
        path: '/api/agents/search',
        method: 'POST',
        description: 'Execute web search with intelligent planning',
        body: {
          userQuery: 'string (required)',
          maxResults: 'number (optional, default: 10)',
          refinedQuery: 'string (optional, skip planning)'
        }
      },
      {
        path: '/api/agents/terminal',
        method: 'POST',
        description: 'Generate terminal commands',
        body: {
          task: 'string (required)',
          context: 'object (optional)'
        }
      },
      {
        path: '/api/agents/code',
        method: 'POST',
        description: 'Generate code from natural language',
        body: {
          prompt: 'string (required)',
          context: 'object (optional)'
        }
      },
      {
        path: '/api/agents/schema',
        method: 'POST',
        description: 'Generate JSON Schema from natural language',
        body: {
          userPrompt: 'string (required)',
          context: 'string (optional)',
          extraConstraints: 'string (optional)'
        }
      },
      {
        path: '/api/router',
        method: 'POST',
        description: 'Intelligent router - automatically selects best agent',
        body: {
          userPrompt: 'string (required)',
          context: 'object (optional)'
        }
      },
      {
        path: '/api/schema/register',
        method: 'POST',
        description: 'Register a schema in the cryptographic registry',
        body: {
          schemaName: 'string (required)',
          schema: 'object (required)',
          description: 'string (optional)',
          tags: 'array (optional)'
        }
      },
      {
        path: '/api/schema/:name',
        method: 'GET',
        description: 'Retrieve a schema by name'
      },
      {
        path: '/api/schema/search',
        method: 'POST',
        description: 'Search schemas by tags or name',
        body: {
          query: 'string (required)'
        }
      }
    ]
  });
});

// ============================================================================
// AGENTS API
// ============================================================================

app.get('/api/agents', (req, res) => {
  res.json({
    agents: [
      {
        id: 'search',
        name: 'SearchAgent',
        description: 'Web search with intelligent planning and result analysis',
        capabilities: [
          'Strategy planning',
          'Missing context detection',
          'Google Custom Search integration',
          'Result structuring',
          'Answer quality assessment',
          'Follow-up suggestions'
        ],
        endpoint: '/api/agents/search'
      },
      {
        id: 'terminal',
        name: 'TerminalAgent',
        description: 'Generate safe, executable terminal commands',
        capabilities: [
          'Command generation',
          'Risk assessment',
          'Safety checks',
          'Multi-shell support',
          'Parameter validation'
        ],
        endpoint: '/api/agents/terminal'
      },
      {
        id: 'code',
        name: 'CodeGenerator',
        description: 'Generate code from natural language descriptions',
        capabilities: [
          'Multi-language support',
          'Context-aware generation',
          'Best practices',
          'Documentation included'
        ],
        endpoint: '/api/agents/code'
      },
      {
        id: 'schema',
        name: 'SchemaAgent',
        description: 'Generate JSON Schemas from natural language',
        capabilities: [
          'Natural language to schema',
          'Design rationale',
          'Constraint handling',
          'Schema validation'
        ],
        endpoint: '/api/agents/schema'
      },
      {
        id: 'router',
        name: 'IntelligentRouter',
        description: 'Automatically routes to the best agent for the task',
        capabilities: [
          'Autonomous decision making',
          'Missing context detection',
          'Confidence scoring',
          'Multi-agent coordination'
        ],
        endpoint: '/api/router'
      }
    ]
  });
});

// SearchAgent endpoint
app.post('/api/agents/search', async (req, res) => {
  try {
    const { userQuery, maxResults, refinedQuery } = req.body;
    
    if (!userQuery) {
      return res.status(400).json({
        error: 'userQuery is required'
      });
    }

    const result = await agents.search.search({
      userQuery,
      maxResults: maxResults || 10,
      refinedQuery
    });

    res.json({
      success: true,
      agent: 'SearchAgent',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      agent: 'SearchAgent'
    });
  }
});

// TerminalAgent endpoint
app.post('/api/agents/terminal', async (req, res) => {
  try {
    const { task, context } = req.body;
    
    if (!task) {
      return res.status(400).json({
        error: 'task is required'
      });
    }

    const result = await agents.terminal.generate(task, context || {});

    res.json({
      success: true,
      agent: 'TerminalAgent',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      agent: 'TerminalAgent'
    });
  }
});

// CodeGenerator endpoint
app.post('/api/agents/code', async (req, res) => {
  try {
    const { prompt, context } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        error: 'prompt is required'
      });
    }

    const result = await agents.code.generate(prompt, context || {});

    res.json({
      success: true,
      agent: 'CodeGenerator',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      agent: 'CodeGenerator'
    });
  }
});

// SchemaAgent endpoint
app.post('/api/agents/schema', async (req, res) => {
  try {
    const { userPrompt, context, extraConstraints } = req.body;
    
    if (!userPrompt) {
      return res.status(400).json({
        error: 'userPrompt is required'
      });
    }

    const result = await agents.schema.generateSchema({
      userPrompt,
      context,
      extraConstraints
    });

    res.json({
      success: true,
      agent: 'SchemaAgent',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      agent: 'SchemaAgent'
    });
  }
});

// ============================================================================
// INTELLIGENT ROUTER API
// ============================================================================

app.post('/api/router', async (req, res) => {
  try {
    const { userPrompt, context } = req.body;
    
    if (!userPrompt) {
      return res.status(400).json({
        error: 'userPrompt is required'
      });
    }

    // Create a simple routing agent
    const router = new BaseMetaAgent({
      agentName: 'APIRouter',
      systemPrompt: `You are an intelligent routing agent. Analyze user requests and decide which specialized agent to use:

- SearchAgent: Web search, current information, research
- TerminalAgent: System commands, file operations
- CodeGenerator: Programming, code generation
- SchemaAgent: Data structure design, JSON schemas
- Direct: Simple questions you can answer directly

Respond with your routing decision and reasoning.`
    });

    const decision = await router.step({
      userPrompt: `Route this user request: "${userPrompt}"`,
      explicitSchema: {
        type: "object",
        properties: {
          selectedAgent: {
            type: "string",
            enum: ["search", "terminal", "code", "schema", "direct"]
          },
          reasoning: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          parameters: { type: "object" }
        },
        required: ["selectedAgent", "reasoning", "confidence"]
      }
    });

    // Execute the routed request
    let result = null;
    
    switch (decision.selectedAgent) {
      case 'search':
        result = await agents.search.search({
          userQuery: userPrompt,
          maxResults: 5
        });
        break;
        
      case 'terminal':
        result = await agents.terminal.generate(userPrompt, context || {});
        break;
        
      case 'code':
        result = await agents.code.generate(userPrompt, context || {});
        break;
        
      case 'schema':
        result = await agents.schema.generateSchema({
          userPrompt,
          context: JSON.stringify(context || {})
        });
        break;
        
      case 'direct':
        result = await router.step({
          userPrompt
        });
        break;
    }

    res.json({
      success: true,
      routing: {
        selectedAgent: decision.selectedAgent,
        reasoning: decision.reasoning,
        confidence: decision.confidence
      },
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      error: error.message,
      service: 'IntelligentRouter'
    });
  }
});

// ============================================================================
// SCHEMA REGISTRY API
// ============================================================================

app.post('/api/schema/register', async (req, res) => {
  try {
    const { schemaName, schema, description, tags } = req.body;
    
    if (!schemaName || !schema) {
      return res.status(400).json({
        error: 'schemaName and schema are required'
      });
    }

    const registered = await schemaRegistry.registerSchema({
      schemaName,
      schema,
      description,
      tags
    });

    res.json({
      success: true,
      schema: registered,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      service: 'SchemaRegistry'
    });
  }
});

app.get('/api/schema/:name', (req, res) => {
  try {
    const schema = schemaRegistry.getSchema(req.params.name);
    
    if (!schema) {
      return res.status(404).json({
        error: 'Schema not found',
        schemaName: req.params.name
      });
    }

    res.json({
      success: true,
      schema,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      service: 'SchemaRegistry'
    });
  }
});

app.post('/api/schema/search', (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: 'query is required'
      });
    }

    const results = schemaRegistry.searchSchemas(query);

    res.json({
      success: true,
      query,
      results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      service: 'SchemaRegistry'
    });
  }
});

app.get('/api/schema', (req, res) => {
  try {
    const allSchemas = schemaRegistry.listSchemas();

    res.json({
      success: true,
      schemas: allSchemas,
      count: allSchemas.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      service: 'SchemaRegistry'
    });
  }
});

// ============================================================================
// CUSTOM AGENT CREATION API
// ============================================================================

app.post('/api/custom-agent', async (req, res) => {
  try {
    const { agentName, systemPrompt, userPrompt, schema } = req.body;
    
    if (!agentName || !userPrompt) {
      return res.status(400).json({
        error: 'agentName and userPrompt are required'
      });
    }

    // Create a custom agent on-the-fly
    const customAgent = new BaseMetaAgent({
      agentName,
      systemPrompt: systemPrompt || `You are ${agentName}, a helpful AI assistant.`
    });

    const result = await customAgent.step({
      userPrompt,
      explicitSchema: schema
    });

    res.json({
      success: true,
      agent: agentName,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      service: 'CustomAgent'
    });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(80));
  console.log('🌉 LUMEN BRIDGE - Self-Aware Agent API Server');
  console.log('='.repeat(80));
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log('\n📚 Available Services:');
  console.log(`   • SearchAgent: http://localhost:${PORT}/api/agents/search`);
  console.log(`   • TerminalAgent: http://localhost:${PORT}/api/agents/terminal`);
  console.log(`   • CodeGenerator: http://localhost:${PORT}/api/agents/code`);
  console.log(`   • SchemaAgent: http://localhost:${PORT}/api/agents/schema`);
  console.log(`   • IntelligentRouter: http://localhost:${PORT}/api/router`);
  console.log(`   • SchemaRegistry: http://localhost:${PORT}/api/schema`);
  console.log(`   • CustomAgents: http://localhost:${PORT}/api/custom-agent`);
  console.log(`\n📖 Documentation: http://localhost:${PORT}/api/docs`);
  console.log('\n🎯 Use Cases:');
  console.log('   1. Build AI chat applications');
  console.log('   2. Create custom agent workflows');
  console.log('   3. Integrate web search into apps');
  console.log('   4. Generate code and schemas programmatically');
  console.log('   5. Build autonomous AI assistants');
  console.log('\n🌉 Future Self Bridge Architecture - Ready to serve!\n');
});

export default app;

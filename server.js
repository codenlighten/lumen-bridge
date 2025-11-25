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
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { marked } from 'marked';

// Import agents
import BaseMetaAgent from './agents/BaseMetaAgent.js';
import SearchAgent from './agents/SearchAgent.js';
import TerminalAgent from './agents/TerminalAgent.js';
import CodeGenerator from './agents/CodeGenerator.js';
import SchemaAgent from './agents/SchemaGenerator.js';
import { SchemaMediatorAgent } from './agents/SchemaMediatorAgent.js';

// Import utilities
import { SchemaRegistry } from './utilities/SchemaRegistry.js';
import { MemoryManager } from './utilities/MemoryManager.js';
import { agentRegistry } from './utilities/AgentRegistry.js';
import { dbService } from './utilities/MongoDBService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize agents (singleton instances)
const agents = {
  search: new SearchAgent({ maxResults: 10 }),
  terminal: new TerminalAgent('API-Terminal'),
  code: new CodeGenerator('API-CodeGen'),
  schema: new SchemaAgent(),
  schemaMediator: new SchemaMediatorAgent({ cacheMaxSize: 100, cacheTTL: 3600000 })
};

// Initialize schema registry
const schemaRegistry = new SchemaRegistry();

// Initialize database connection and load user agents
(async () => {
  await dbService.connect();
  await agentRegistry.loadUserAgentsFromDB();
  console.log('   ✅ User agents loaded from database');
})();

// ============================================================================
// HEALTH & INFO
// ============================================================================

// Serve landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve API documentation
app.get('/api-doc', (req, res) => {
  const mdPath = path.join(__dirname, 'public', 'api-doc.md');
  const mdContent = fs.readFileSync(mdPath, 'utf-8');
  const htmlContent = marked(mdContent);
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lumen Bridge API Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #667eea;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        h2 {
            color: #764ba2;
            margin-top: 30px;
            border-bottom: 2px solid #eee;
            padding-bottom: 8px;
        }
        h3 {
            color: #667eea;
            margin-top: 20px;
        }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            color: #764ba2;
        }
        pre {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        pre code {
            background: transparent;
            color: #d4d4d4;
            padding: 0;
        }
        a {
            color: #667eea;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .back-link {
            display: inline-block;
            margin-bottom: 20px;
            padding: 10px 20px;
            background: #667eea;
            color: white;
            border-radius: 5px;
            text-decoration: none;
        }
        .back-link:hover {
            background: #5568d3;
            text-decoration: none;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background: #667eea;
            color: white;
        }
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        ul {
            padding-left: 20px;
        }
        li {
            margin: 8px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="/" class="back-link">← Back to Home</a>
        ${htmlContent}
    </div>
</body>
</html>
  `;
  
  res.send(html);
});

// API info endpoint
app.get('/api', (req, res) => {
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
// SCHEMA MEDIATOR API - Universal Schema Translation
// ============================================================================

/**
 * Translate data from one schema to another
 * POST /api/schema/translate
 * 
 * Body:
 * {
 *   data: { ... },              // Source data to transform
 *   sourceSchema: { ... },      // JSON Schema of source
 *   targetSchema: { ... },      // JSON Schema of target
 *   sourceSchemaName: "string", // Name for caching (optional)
 *   targetSchemaName: "string", // Name for caching (optional)
 *   context: { ... },           // Mapping hints, rules (optional)
 *   enforceValidation: boolean  // Throw on validation failure (optional)
 * }
 */
app.post('/api/schema/translate', async (req, res) => {
  try {
    const {
      data,
      sourceSchema,
      targetSchema,
      sourceSchemaName,
      targetSchemaName,
      context,
      enforceValidation
    } = req.body;

    if (!data || !sourceSchema || !targetSchema) {
      return res.status(400).json({
        error: 'data, sourceSchema, and targetSchema are required'
      });
    }

    const result = await agents.schemaMediator.translate({
      data,
      sourceSchema,
      targetSchema,
      sourceSchemaName,
      targetSchemaName,
      context,
      enforceValidation
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      service: 'SchemaMediatorAgent'
    });
  }
});

/**
 * Infer a schema from example data
 * POST /api/schema/infer
 * 
 * Body:
 * {
 *   data: { ... },              // Example data
 *   schemaName: "string"        // Optional name for the schema
 * }
 */
app.post('/api/schema/infer', async (req, res) => {
  try {
    const { data, schemaName } = req.body;

    if (!data) {
      return res.status(400).json({
        error: 'data is required'
      });
    }

    const result = await agents.schemaMediator.inferSchema(data, schemaName);

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      service: 'SchemaMediatorAgent'
    });
  }
});

/**
 * Create bidirectional mapping between two schemas
 * POST /api/schema/mapping/bidirectional
 * 
 * Body:
 * {
 *   schemaA: { ... },          // First schema
 *   schemaB: { ... },          // Second schema
 *   schemaNameA: "string",     // Name for schema A (optional)
 *   schemaNameB: "string"      // Name for schema B (optional)
 * }
 */
app.post('/api/schema/mapping/bidirectional', async (req, res) => {
  try {
    const { schemaA, schemaB, schemaNameA, schemaNameB } = req.body;

    if (!schemaA || !schemaB) {
      return res.status(400).json({
        error: 'schemaA and schemaB are required'
      });
    }

    const result = await agents.schemaMediator.createBidirectionalMapping(
      schemaA,
      schemaB,
      schemaNameA,
      schemaNameB
    );

    res.json({
      success: true,
      forward: result.forward,
      reverse: result.reverse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      service: 'SchemaMediatorAgent'
    });
  }
});

/**
 * Retry translation with additional context
 * POST /api/schema/translate/retry
 * 
 * Body:
 * {
 *   data: { ... },
 *   sourceSchema: { ... },
 *   targetSchema: { ... },
 *   sourceSchemaName: "string",
 *   targetSchemaName: "string",
 *   previousMissingContext: [...],
 *   additionalContext: { ... }
 * }
 */
app.post('/api/schema/translate/retry', async (req, res) => {
  try {
    const {
      data,
      sourceSchema,
      targetSchema,
      sourceSchemaName,
      targetSchemaName,
      previousMissingContext,
      additionalContext
    } = req.body;

    if (!data || !sourceSchema || !targetSchema) {
      return res.status(400).json({
        error: 'data, sourceSchema, and targetSchema are required'
      });
    }

    const result = await agents.schemaMediator.retryWithContext({
      data,
      sourceSchema,
      targetSchema,
      sourceSchemaName,
      targetSchemaName,
      previousMissingContext,
      additionalContext
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      service: 'SchemaMediatorAgent'
    });
  }
});

/**
 * Get Schema Mediator statistics
 * GET /api/schema/mediator/stats
 */
app.get('/api/schema/mediator/stats', (req, res) => {
  try {
    const stats = agents.schemaMediator.getStats();

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      service: 'SchemaMediatorAgent'
    });
  }
});

/**
 * Clear Schema Mediator cache
 * POST /api/schema/mediator/cache/clear
 */
app.post('/api/schema/mediator/cache/clear', (req, res) => {
  try {
    agents.schemaMediator.clearCache();

    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      service: 'SchemaMediatorAgent'
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
// USER AGENT MANAGEMENT
// ============================================================================

/**
 * POST /api/agents/register
 * Register a new user-created agent
 * 
 * Body:
 * {
 *   "userId": "user123",
 *   "name": "MyCustomAgent",
 *   "description": "My custom agent for X",
 *   "prompt": "You are a helpful assistant specialized in X...",
 *   "metadata": { ... }
 * }
 */
app.post('/api/agents/register', async (req, res) => {
  try {
    const { userId, name, description, prompt, schema, metadata } = req.body;

    if (!userId || !name) {
      return res.status(400).json({
        error: 'userId and name are required'
      });
    }

    if (!prompt) {
      return res.status(400).json({
        error: 'prompt is required - this defines how your agent behaves'
      });
    }

    const registeredAgent = await agentRegistry.registerUserAgent(userId, {
      name,
      description,
      prompt,
      schema,
      metadata
    });

    res.json({
      success: true,
      message: `Agent '${name}' registered successfully`,
      agent: registeredAgent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
      service: 'AgentRegistration'
    });
  }
});

/**
 * PUT /api/agents/update
 * Update an existing user-created agent
 * 
 * Body:
 * {
 *   "userId": "user123",
 *   "agentName": "MyCustomAgent",
 *   "updates": {
 *     "description": "Updated description",
 *     "prompt": "Updated prompt...",
 *     "metadata": { ... }
 *   }
 * }
 */
app.put('/api/agents/update', async (req, res) => {
  try {
    const { userId, agentName, updates } = req.body;

    if (!userId || !agentName || !updates) {
      return res.status(400).json({
        error: 'userId, agentName, and updates are required'
      });
    }

    const updatedAgent = await agentRegistry.updateUserAgent(userId, agentName, updates);

    res.json({
      success: true,
      message: `Agent '${agentName}' updated successfully`,
      agent: updatedAgent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
      service: 'AgentUpdate'
    });
  }
});

/**
 * DELETE /api/agents/delete
 * Delete a user-created agent
 * 
 * Body:
 * {
 *   "userId": "user123",
 *   "agentName": "MyCustomAgent"
 * }
 */
app.delete('/api/agents/delete', async (req, res) => {
  try {
    const { userId, agentName } = req.body;

    if (!userId || !agentName) {
      return res.status(400).json({
        error: 'userId and agentName are required'
      });
    }

    const deleted = await agentRegistry.deleteUserAgent(userId, agentName);

    if (!deleted) {
      return res.status(404).json({
        error: `Agent '${agentName}' not found`,
        service: 'AgentDeletion'
      });
    }

    res.json({
      success: true,
      message: `Agent '${agentName}' deleted successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
      service: 'AgentDeletion'
    });
  }
});

/**
 * GET /api/agents/my-agents/:userId
 * Get all agents for a specific user
 */
app.get('/api/agents/my-agents/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required'
      });
    }

    const userAgents = agentRegistry.getUserAgents(userId);

    res.json({
      success: true,
      userId,
      count: userAgents.length,
      agents: userAgents,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      service: 'UserAgentRetrieval'
    });
  }
});

/**
 * GET /api/agents/my-agents/:userId/:agentName
 * Get a specific user agent
 */
app.get('/api/agents/my-agents/:userId/:agentName', async (req, res) => {
  try {
    const { userId, agentName } = req.params;

    const agent = agentRegistry.getUserAgent(userId, agentName);

    if (!agent) {
      return res.status(404).json({
        error: `Agent '${agentName}' not found for user ${userId}`,
        service: 'UserAgentRetrieval'
      });
    }

    res.json({
      success: true,
      agent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      service: 'UserAgentRetrieval'
    });
  }
});

/**
 * POST /api/agents/invoke-user-agent
 * Invoke a user-created agent
 * 
 * Body:
 * {
 *   "userId": "user123",
 *   "agentName": "MyCustomAgent",
 *   "context": {
 *     "userPrompt": "What can you help me with?",
 *     ...additional context
 *   }
 * }
 */
app.post('/api/agents/invoke-user-agent', async (req, res) => {
  try {
    const { userId, agentName, context } = req.body;

    if (!userId || !agentName || !context) {
      return res.status(400).json({
        error: 'userId, agentName, and context are required'
      });
    }

    const result = await agentRegistry.invokeUserAgent(userId, agentName, context);

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
      service: 'UserAgentInvocation'
    });
  }
});

/**
 * GET /api/admin/agents
 * Get all user-created agents (admin only)
 * 
 * Query params:
 * - adminKey: Secret admin key for authentication
 */
app.get('/api/admin/agents', async (req, res) => {
  try {
    const { adminKey } = req.query;

    // Simple admin key check (in production, use proper auth)
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        error: 'Forbidden: Invalid admin credentials',
        service: 'AdminAgentRetrieval'
      });
    }

    const allUserAgents = agentRegistry.getAllUserAgents();
    const stats = agentRegistry.getStats();

    res.json({
      success: true,
      stats,
      count: allUserAgents.length,
      agents: allUserAgents,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      service: 'AdminAgentRetrieval'
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
  console.log(`   • SchemaMediatorAgent: http://localhost:${PORT}/api/schema/translate`);
  console.log(`   • IntelligentRouter: http://localhost:${PORT}/api/router`);
  console.log(`   • SchemaRegistry: http://localhost:${PORT}/api/schema`);
  console.log(`   • CustomAgents: http://localhost:${PORT}/api/custom-agent`);
  console.log('\n👤 User Agent Management:');
  console.log(`   • Register Agent: POST http://localhost:${PORT}/api/agents/register`);
  console.log(`   • Update Agent: PUT http://localhost:${PORT}/api/agents/update`);
  console.log(`   • Delete Agent: DELETE http://localhost:${PORT}/api/agents/delete`);
  console.log(`   • My Agents: GET http://localhost:${PORT}/api/agents/my-agents/:userId`);
  console.log(`   • Invoke User Agent: POST http://localhost:${PORT}/api/agents/invoke-user-agent`);
  console.log(`   • Admin View All: GET http://localhost:${PORT}/api/admin/agents?adminKey=XXX`);
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

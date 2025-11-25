# Lumen Bridge API Documentation

**Base URL**: `https://lumenbridge.xyz`  
**Version**: 1.0.0  
**Authentication**: None required (public API)

---

## Table of Contents

1. [Overview](#overview)
2. [Common Response Structure](#common-response-structure)
3. [Cryptographic Signatures](#cryptographic-signatures)
4. [System Agent Endpoints](#system-agent-endpoints)
   - [SearchAgent](#1-searchagent)
   - [TerminalAgent](#2-terminalagent)
   - [CodeGenerator](#3-codegenerator)
   - [SchemaAgent](#4-schemaagent)
   - [ToolRouterAgent](#5-toolrouteragent)
   - [Schema Registry](#6-schema-registry)
   - [Schema Mediator](#7-schema-mediator)
5. [User Agent Management](#user-agent-management)
   - [Register Agent](#8-register-user-agent)
   - [Update Agent](#9-update-user-agent)
   - [Delete Agent](#10-delete-user-agent)
   - [Get My Agents](#11-get-my-agents)
   - [Get Specific Agent](#12-get-specific-agent)
   - [Invoke User Agent](#13-invoke-user-agent)
   - [Admin View All](#14-admin-view-all-agents)
6. [Error Handling](#error-handling)
7. [Rate Limits](#rate-limits)
8. [Examples](#examples)

---

## Overview

Lumen Bridge is a self-aware agent platform that implements the **Future Self Bridge** pattern. Each agent:

- Plans its own response structure (current self)
- Executes with schema-driven precision (future self)
- Detects missing context automatically
- Signs all responses cryptographically (BSV-ECDSA-DER)
- Learns from interaction history

---

## Common Response Structure

All endpoints return a consistent JSON structure:

```json
{
  "success": true,
  "agent": "AgentName",
  "result": {
    // Agent-specific response
    "_signature": {
      "signature": "30440220...",
      "responseHash": "a3f2c8d9...",
      "address": "1AreYqaA8BKuNVj...",
      "publicKey": "0206bdc3dcdc...",
      "timestamp": "2025-11-24T12:00:00.000Z",
      "algorithm": "BSV-ECDSA-DER",
      "encoding": "hex",
      "agentIdentity": "AgentName"
    },
    "_llm": {
      "provider": "openai",
      "model": "gpt-4o-mini-2024-07-18",
      "elapsed": 3214,
      "usage": {
        "promptTokens": 1201,
        "completionTokens": 105,
        "totalTokens": 1306
      }
    }
  },
  "timestamp": "2025-11-24T12:00:00.000Z"
}
```

---

## Cryptographic Signatures

Every response includes a verifiable BSV-ECDSA-DER signature:

- **Algorithm**: BSV-ECDSA (Bitcoin SV Elliptic Curve Digital Signature Algorithm)
- **Format**: DER encoding
- **Hash**: SHA-256
- **Verification**: Use the provided `publicKey` to verify the `signature` against `responseHash`

**Purpose**: Ensures response authenticity, tamper-proof tracking, and verifiable lineage.

---

## System Agent Endpoints

### 1. SearchAgent

**Intelligent web search with Google Custom Search integration**

#### POST `/api/agents/search`

Search the web with automatic strategy planning and result analysis.

**Request Body**:
```json
{
  "userQuery": "string (required)",
  "maxResults": "number (optional, default: 10)",
  "refinedQuery": "string (optional)",
  "location": "string (optional)"
}
```

**Response**:
```json
{
  "success": true,
  "agent": "SearchAgent",
  "result": {
    "action": "search_completed|answer_directly|ask_user|no_results",
    "query": "refined search query",
    "answer": "summary or direct answer",
    "finalAnswer": "comprehensive final answer",
    "results": [
      {
        "title": "Result Title",
        "link": "https://example.com",
        "snippet": "Preview text...",
        "displayLink": "example.com"
      }
    ],
    "missingContext": [],
    "strategy": {
      "searchIntent": "To find...",
      "needsSearch": true,
      "reasoning": "Explanation...",
      "searchQueries": ["query1", "query2"]
    },
    "analysis": {
      "summary": "Overall summary",
      "keyFindings": ["finding1", "finding2"],
      "recommendations": ["rec1", "rec2"]
    }
  }
}
```

**Action Types**:
- `search_completed`: Search executed successfully, results available
- `answer_directly`: Agent can answer without searching (e.g., "What is 2+2?")
- `ask_user`: Missing context needed (e.g., ambiguous query)
- `no_results`: Search executed but no results found

**Example**:
```bash
curl -X POST https://lumenbridge.codenlighten.org/api/agents/search \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "Latest developments in quantum computing 2024",
    "maxResults": 5
  }'
```

---

### 2. TerminalAgent

**Safe terminal command generation with risk assessment**

#### POST `/api/agents/terminal`

Generate terminal commands with safety analysis, alternatives, and rollback strategies.

**Request Body**:
```json
{
  "task": "string (required)",
  "context": {
    "shell": "bash|zsh|powershell (optional)",
    "os": "linux|macos|windows (optional)"
  }
}
```

**Response**:
```json
{
  "success": true,
  "agent": "TerminalAgent",
  "result": {
    "terminalCommand": "find . -type f -name '*.js'",
    "reasoning": "Explanation of why this command...",
    "shell": "bash",
    "requiresSudo": false,
    "isDestructive": false,
    "riskLevel": "safe|low|medium|high|critical",
    "safetyWarnings": [],
    "prerequisites": ["bash shell", "find command"],
    "expectedOutput": "A list of paths to all JavaScript files...",
    "alternatives": [
      {
        "command": "ls **/*.js",
        "description": "Alternative approach",
        "pros": "Simple and quick",
        "cons": "Does not search recursively"
      }
    ],
    "breakdown": [
      {
        "part": "find",
        "explanation": "Command used to search for files"
      },
      {
        "part": "-type f",
        "explanation": "Limits search to files only"
      }
    ],
    "rollback": "No rollback necessary as this is non-destructive",
    "estimatedTime": "instant|seconds|minutes"
  }
}
```

**Risk Levels**:
- `safe`: Read-only, no side effects
- `low`: Minor changes, easily reversible
- `medium`: Significant changes, some risk
- `high`: Destructive operations, backup recommended
- `critical`: System-level changes, expert knowledge required

**Example**:
```bash
curl -X POST https://lumenbridge.codenlighten.org/api/agents/terminal \
  -H "Content-Type: application/json" \
  -d '{
    "task": "List all JavaScript files in current directory",
    "context": {
      "shell": "bash"
    }
  }'
```

---

### 3. CodeGenerator

**Multi-language code generation from natural language**

#### POST `/api/agents/code`

Generate code in multiple languages with best practices and documentation.

**Request Body**:
```json
{
  "prompt": "string (required)",
  "context": {
    "language": "javascript|python|typescript|etc (optional)",
    "framework": "react|express|django|etc (optional)",
    "includeTests": "boolean (optional)"
  }
}
```

**Response**:
```json
{
  "success": true,
  "agent": "CodeGenerator",
  "result": {
    "code": "// Generated code here...",
    "language": "javascript",
    "explanation": "This code implements...",
    "bestPractices": [
      "Uses async/await for better readability",
      "Includes error handling"
    ],
    "dependencies": ["express", "dotenv"],
    "usage": "// How to use this code...",
    "tests": "// Optional test code..."
  }
}
```

**Example**:
```bash
curl -X POST https://lumenbridge.codenlighten.org/api/agents/code \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a REST API endpoint for user authentication",
    "context": {
      "language": "javascript",
      "framework": "express"
    }
  }'
```

---

### 4. SchemaAgent

**JSON Schema generation from natural language**

#### POST `/api/agents/schema`

Generate JSON Schemas with design rationale and validation rules.

**Request Body**:
```json
{
  "userPrompt": "string (required)"
}
```

**Response**:
```json
{
  "success": true,
  "agent": "SchemaAgent",
  "result": {
    "generatedSchema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "age": { "type": "integer", "minimum": 0 }
      },
      "required": ["name", "email"]
    },
    "schemaName": "userProfileSchema",
    "schemaDescription": "A schema representing a user profile...",
    "designRationale": "The schema includes required fields for name and email..."
  }
}
```

**Example**:
```bash
curl -X POST https://lumenbridge.codenlighten.org/api/agents/schema \
  -H "Content-Type: application/json" \
  -d '{
    "userPrompt": "A user profile with name, email, age, and optional bio"
  }'
```

---

### 5. ToolRouterAgent

**Intelligent routing to the best agent for each task**

#### POST `/api/router`

Automatically routes your request to the most appropriate agent.

**Request Body**:
```json
{
  "userPrompt": "string (required)"
}
```

**Response**:
```json
{
  "success": true,
  "routing": {
    "selectedAgent": "search|terminal|code|schema",
    "reasoning": "The user is asking for...",
    "confidence": 0.95
  },
  "result": {
    // Response from the selected agent
  }
}
```

**Routing Logic**:
- Analyzes the user's request
- Determines the best agent to handle it
- Provides confidence score (0.0 to 1.0)
- Executes the request with the selected agent

**Example**:
```bash
curl -X POST https://lumenbridge.codenlighten.org/api/router \
  -H "Content-Type: application/json" \
  -d '{
    "userPrompt": "Generate a Python function to calculate fibonacci numbers"
  }'
```

---

### 6. Schema Registry

**Retrieve registered schemas**

#### GET `/api/schema/:name`

Retrieve a previously registered schema by name.

**Parameters**:
- `name`: Schema name (string)

**Response**:
```json
{
  "schema": {
    "type": "object",
    "properties": { ... }
  },
  "metadata": {
    "name": "schemaName",
    "hash": "a3f2c8d9...",
    "signature": "30440220...",
    "createdAt": "2025-11-24T12:00:00.000Z"
  }
}
```

**Example**:
```bash
curl https://lumenbridge.codenlighten.org/api/schema/userProfileSchema
```

---

### 7. Schema Mediator

**Universal schema translation with AI-powered field mapping**

The Schema Mediator Agent translates data between any two schemas using AI to intelligently map fields, combine/split values, and handle format conversions.

#### POST `/api/schema/translate`

Translate data from one schema format to another.

**Request Body**:
```json
{
  "data": {
    "FirstName": "Jane",
    "LastName": "Smith",
    "Email": "jane@example.com",
    "Status__c": "Active"
  },
  "sourceSchema": {
    "type": "object",
    "properties": {
      "FirstName": { "type": "string" },
      "LastName": { "type": "string" },
      "Email": { "type": "string" },
      "Status__c": { "type": "string", "enum": ["Active", "Inactive"] }
    }
  },
  "targetSchema": {
    "type": "object",
    "properties": {
      "fullName": { "type": "string" },
      "email": { "type": "string" },
      "status": { "type": "string", "enum": ["A", "I"] }
    }
  },
  "sourceSchemaName": "SalesforceContact",
  "targetSchemaName": "InternalUser",
  "context": {
    "mappingHints": {
      "Status__c to status": "Map Active→A, Inactive→I"
    }
  },
  "enforceValidation": false
}
```

**Response**:
```json
{
  "success": true,
  "transformedData": {
    "fullName": "Jane Smith",
    "email": "jane@example.com",
    "status": "A"
  },
  "mapping": {
    "fieldMappings": [
      {
        "targetField": "fullName",
        "sourceFields": ["FirstName", "LastName"],
        "transformationType": "combine",
        "transformationRule": "concatenate with space"
      },
      {
        "targetField": "status",
        "sourceFields": ["Status__c"],
        "transformationType": "convert",
        "transformationRule": "Active→A, Inactive→I"
      }
    ],
    "reasoning": "Combined first and last names, converted status codes",
    "confidence": 0.95
  },
  "missingContext": [],
  "validation": {
    "valid": true,
    "errors": [],
    "warnings": []
  },
  "_metadata": {
    "sourceSchemaName": "SalesforceContact",
    "targetSchemaName": "InternalUser",
    "timestamp": "2025-11-25T12:00:00.000Z",
    "cacheHit": false
  }
}
```

**Example**:
```bash
curl -X POST https://lumenbridge.codenlighten.org/api/schema/translate \
  -H "Content-Type: application/json" \
  -d '{
    "data": {"FirstName": "John", "LastName": "Doe", "Email": "john@example.com"},
    "sourceSchema": {...},
    "targetSchema": {...}
  }'
```

---

#### POST `/api/schema/infer`

Infer a JSON Schema from example data.

**Request Body**:
```json
{
  "data": {
    "id": 123,
    "name": "Product A",
    "price": 29.99,
    "inStock": true,
    "tags": ["electronics", "sale"]
  },
  "schemaName": "ProductSchema"
}
```

**Response**:
```json
{
  "success": true,
  "schema": {
    "type": "object",
    "properties": {
      "id": { "type": "integer", "description": "Unique identifier" },
      "name": { "type": "string", "description": "Product name" },
      "price": { "type": "number", "description": "Product price" },
      "inStock": { "type": "boolean", "description": "Availability status" },
      "tags": { 
        "type": "array", 
        "items": { "type": "string" },
        "description": "Product tags"
      }
    },
    "required": ["id", "name", "price", "inStock"]
  },
  "confidence": 0.95,
  "assumptions": [
    "Assumed 'id' should be required based on naming convention",
    "Inferred array item type from first element"
  ]
}
```

---

#### POST `/api/schema/mapping/bidirectional`

Create a bidirectional mapping between two schemas for translation in both directions.

**Request Body**:
```json
{
  "schemaA": { "type": "object", "properties": {...} },
  "schemaB": { "type": "object", "properties": {...} },
  "schemaNameA": "SalesforceContact",
  "schemaNameB": "InternalUser"
}
```

**Response**:
```json
{
  "success": true,
  "forward": {
    "fieldMappings": [...],
    "reasoning": "..."
  },
  "reverse": {
    "fieldMappings": [...],
    "reasoning": "..."
  }
}
```

---

#### POST `/api/schema/translate/retry`

Retry a translation with additional context when the initial attempt identified missing information.

**Request Body**:
```json
{
  "data": {...},
  "sourceSchema": {...},
  "targetSchema": {...},
  "sourceSchemaName": "SchemaA",
  "targetSchemaName": "SchemaB",
  "previousMissingContext": [
    "Status code mapping rules",
    "Date format preference"
  ],
  "additionalContext": {
    "statusMapping": "Active→A, Inactive→I",
    "dateFormat": "ISO-8601"
  }
}
```

---

#### GET `/api/schema/mediator/stats`

Get Schema Mediator performance statistics.

**Response**:
```json
{
  "success": true,
  "stats": {
    "translations": 42,
    "cacheHits": 21,
    "cachedMappings": 15,
    "errors": 2,
    "validationFailures": 1,
    "cacheSize": 15,
    "cacheHitRate": "50.0%",
    "errorRate": "4.8%",
    "validationFailureRate": "2.4%"
  }
}
```

---

#### POST `/api/schema/mediator/cache/clear`

Clear the Schema Mediator's mapping cache.

**Response**:
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

---

## User Agent Management

**Create and manage custom AI agents with your own prompts and behaviors**

Lumen Bridge now supports user-created agents alongside system agents. Users can register custom agents with specialized prompts, invoke them via API, and manage them with full CRUD operations.

### Key Features

- 🔐 **User Isolation**: Users only see their own agents
- 👑 **Admin Access**: Admins can view all registered agents
- 💾 **Persistence**: All agents stored in MongoDB
- 🎯 **Custom Prompts**: Define specialized agent behaviors
- 🔄 **Full CRUD**: Create, read, update, delete operations

---

### 8. Register User Agent

**POST** `/api/agents/register`

Create a new custom agent with specialized behavior.

**Request Body**:
```json
{
  "userId": "user-alice",
  "name": "TravelAdvisor",
  "description": "Helps plan travel itineraries and suggests destinations",
  "prompt": "You are a professional travel advisor AI. Help users plan amazing trips, suggest destinations, provide travel tips, and create detailed itineraries. Be enthusiastic and knowledgeable about world destinations.",
  "metadata": {
    "category": "travel",
    "version": "1.0",
    "features": ["itinerary-planning", "destination-suggestions"]
  }
}
```

**Required Fields**:
- `userId` (string): User identifier
- `name` (string): Agent name (unique per user)
- `prompt` (string): System prompt defining agent behavior

**Optional Fields**:
- `description` (string): Agent description
- `metadata` (object): Custom metadata for organization
- `schema` (object): Custom JSON schema (auto-generated if not provided)

**Response**:
```json
{
  "success": true,
  "message": "Agent 'TravelAdvisor' registered successfully",
  "agent": {
    "userId": "user-alice",
    "name": "TravelAdvisor",
    "normalizedName": "traveladvisor",
    "description": "Helps plan travel itineraries...",
    "prompt": "You are a professional travel advisor AI...",
    "metadata": {
      "category": "travel",
      "version": "1.0"
    },
    "type": "user-created",
    "createdAt": "2025-11-24T07:39:21.000Z",
    "updatedAt": "2025-11-24T07:39:21.000Z"
  },
  "timestamp": "2025-11-24T07:39:21.000Z"
}
```

**Errors**:
- `400`: Missing required fields (userId, name, prompt)
- `400`: Duplicate agent name (same user)
- `400`: Conflicts with system agent name

---

### 9. Update User Agent

**PUT** `/api/agents/update`

Update an existing user agent.

**Request Body**:
```json
{
  "userId": "user-alice",
  "agentName": "TravelAdvisor",
  "updates": {
    "description": "Advanced travel planning with budget optimization",
    "prompt": "Updated system prompt...",
    "metadata": {
      "version": "2.0",
      "features": ["budget-optimization", "multi-city", "itinerary-planning"]
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Agent 'TravelAdvisor' updated successfully",
  "agent": {
    "userId": "user-alice",
    "name": "TravelAdvisor",
    "description": "Advanced travel planning...",
    "updatedAt": "2025-11-24T07:45:00.000Z"
  },
  "timestamp": "2025-11-24T07:45:00.000Z"
}
```

---

### 10. Delete User Agent

**DELETE** `/api/agents/delete`

Delete a user agent.

**Request Body**:
```json
{
  "userId": "user-alice",
  "agentName": "TravelAdvisor"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Agent 'TravelAdvisor' deleted successfully",
  "timestamp": "2025-11-24T07:50:00.000Z"
}
```

**Errors**:
- `404`: Agent not found
- `400`: Missing required fields

---

### 11. Get My Agents

**GET** `/api/agents/my-agents/:userId`

Retrieve all agents for a specific user.

**Example**: `GET /api/agents/my-agents/user-alice`

**Response**:
```json
{
  "success": true,
  "userId": "user-alice",
  "count": 2,
  "agents": [
    {
      "name": "TravelAdvisor",
      "description": "Advanced travel planning with budget optimization",
      "metadata": {
        "category": "travel",
        "version": "2.0"
      },
      "createdAt": "2025-11-24T07:39:21.000Z",
      "updatedAt": "2025-11-24T07:45:00.000Z"
    },
    {
      "name": "RecipeChef",
      "description": "Creates recipes and cooking instructions",
      "metadata": {
        "category": "cooking",
        "version": "1.0"
      },
      "createdAt": "2025-11-24T07:40:15.000Z",
      "updatedAt": "2025-11-24T07:40:15.000Z"
    }
  ],
  "timestamp": "2025-11-24T08:00:00.000Z"
}
```

---

### 12. Get Specific Agent

**GET** `/api/agents/my-agents/:userId/:agentName`

Retrieve a specific user agent.

**Example**: `GET /api/agents/my-agents/user-alice/TravelAdvisor`

**Response**:
```json
{
  "success": true,
  "agent": {
    "userId": "user-alice",
    "name": "TravelAdvisor",
    "normalizedName": "traveladvisor",
    "description": "Advanced travel planning with budget optimization",
    "prompt": "You are a professional travel advisor AI...",
    "metadata": {
      "category": "travel",
      "version": "2.0",
      "features": ["budget-optimization", "multi-city"]
    },
    "type": "user-created",
    "createdAt": "2025-11-24T07:39:21.000Z",
    "updatedAt": "2025-11-24T07:45:00.000Z"
  },
  "timestamp": "2025-11-24T08:05:00.000Z"
}
```

**Errors**:
- `404`: Agent not found for user

---

### 13. Invoke User Agent

**POST** `/api/agents/invoke-user-agent`

Execute a user agent with custom context.

**Request Body**:
```json
{
  "userId": "user-alice",
  "agentName": "TravelAdvisor",
  "context": {
    "userPrompt": "Suggest a 3-day itinerary for Tokyo with a budget of $1000",
    "preferences": {
      "interests": ["food", "culture", "technology"],
      "accommodation": "mid-range"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "agentName": "TravelAdvisor",
    "userId": "user-alice",
    "response": "Absolutely! Tokyo is an incredible city...\n\nDay 1: Arrival & Shibuya\n- Morning: Arrive at Narita...\n- Budget: $280\n\nDay 2: Traditional Tokyo...\n- Budget: $320\n\nDay 3: Tech & Pop Culture...\n- Budget: $310\n\nTotal: $910 (under budget!)",
    "timestamp": "2025-11-24T08:10:30.000Z"
  },
  "timestamp": "2025-11-24T08:10:30.000Z"
}
```

**Errors**:
- `400`: Missing required fields (userId, agentName, context)
- `400`: Agent not found
- `500`: OpenAI API error

---

### 14. Admin View All Agents

**GET** `/api/admin/agents?adminKey=YOUR_ADMIN_KEY`

View all registered user agents (admin only).

**Query Parameters**:
- `adminKey` (required): Admin authentication key

**Response**:
```json
{
  "success": true,
  "stats": {
    "uniqueAgents": 5,
    "totalAliases": 17,
    "userAgents": 3,
    "totalUserAgents": 5
  },
  "count": 5,
  "agents": [
    {
      "userId": "user-alice",
      "name": "TravelAdvisor",
      "description": "Advanced travel planning...",
      "createdAt": "2025-11-24T07:39:21.000Z",
      "updatedAt": "2025-11-24T07:45:00.000Z"
    },
    {
      "userId": "user-alice",
      "name": "RecipeChef",
      "description": "Creates recipes...",
      "createdAt": "2025-11-24T07:40:15.000Z"
    },
    {
      "userId": "user-bob",
      "name": "FitnessCoach",
      "description": "Workout plans...",
      "createdAt": "2025-11-24T07:42:00.000Z"
    }
  ],
  "timestamp": "2025-11-24T08:15:00.000Z"
}
```

**Errors**:
- `403`: Invalid or missing admin key

**Security Note**: Set `ADMIN_KEY` in your environment variables. Never expose this key publicly.

---

## Error Handling

All endpoints use consistent error responses:

```json
{
  "error": "Error message description",
  "agent": "AgentName",
  "timestamp": "2025-11-24T12:00:00.000Z"
}
```

**HTTP Status Codes**:
- `200`: Success
- `400`: Bad Request (missing required parameters)
- `404`: Not Found (schema not found)
- `500`: Internal Server Error

---

## Rate Limits

Currently, there are no rate limits on the public API. This may change in the future.

**Best Practices**:
- Cache responses when possible
- Use appropriate `maxResults` values for searches
- Implement exponential backoff for retries

---

## Examples

### Example 1: Search for AI News

```javascript
const response = await fetch('https://lumenbridge.codenlighten.org/api/agents/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userQuery: 'Latest AI developments',
    maxResults: 5
  })
});

const data = await response.json();
console.log(data.result.finalAnswer);
```

### Example 2: Generate Code

```javascript
const response = await fetch('https://lumenbridge.codenlighten.org/api/agents/code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Create a user authentication function',
    context: {
      language: 'javascript',
      framework: 'express'
    }
  })
});

const data = await response.json();
console.log(data.result.code);
```

### Example 3: Use Intelligent Router

```javascript
const response = await fetch('https://lumenbridge.codenlighten.org/api/router', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userPrompt: 'What is the weather in Paris?'
  })
});

const data = await response.json();
console.log(`Routed to: ${data.routing.selectedAgent}`);
console.log(`Confidence: ${data.routing.confidence}`);
```

### Example 4: Register a Custom Agent

```javascript
const response = await fetch('https://lumenbridge.codenlighten.org/api/agents/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-alice',
    name: 'CodeReviewer',
    description: 'Reviews code for best practices and security',
    prompt: 'You are a senior code reviewer with expertise in security, performance, and best practices. Review code thoroughly and provide actionable feedback.'
  })
});

const data = await response.json();
console.log('Agent registered:', data.agent.name);
```

### Example 5: Invoke a Custom Agent

```javascript
const response = await fetch('https://lumenbridge.codenlighten.org/api/agents/invoke-user-agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-alice',
    agentName: 'CodeReviewer',
    context: {
      userPrompt: 'Review this function: function getData() { return fetch("/api/users").then(r => r.json()) }'
    }
  })
});

const data = await response.json();
console.log('Review:', data.result.response);
```

### Example 6: Get My Agents

```javascript
const response = await fetch('https://lumenbridge.codenlighten.org/api/agents/my-agents/user-alice');
const data = await response.json();

console.log(`You have ${data.count} agents:`);
data.agents.forEach(agent => {
  console.log(`- ${agent.name}: ${agent.description}`);
});
```

### Example 7: Translate Data Between Schemas

```javascript
// Translate Salesforce contact to internal user format
const response = await fetch('https://lumenbridge.codenlighten.org/api/schema/translate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: {
      FirstName: "Jane",
      LastName: "Smith",
      Email: "jane@example.com",
      Status__c: "Active"
    },
    sourceSchema: {
      type: "object",
      properties: {
        FirstName: { type: "string" },
        LastName: { type: "string" },
        Email: { type: "string" },
        Status__c: { type: "string", enum: ["Active", "Inactive"] }
      }
    },
    targetSchema: {
      type: "object",
      properties: {
        fullName: { type: "string" },
        email: { type: "string" },
        status: { type: "string", enum: ["A", "I"] }
      }
    },
    sourceSchemaName: "SalesforceContact",
    targetSchemaName: "InternalUser",
    context: {
      mappingHints: {
        "Status__c to status": "Map Active→A, Inactive→I"
      }
    }
  })
});

const data = await response.json();
console.log('Transformed:', data.transformedData);
// Output: { fullName: "Jane Smith", email: "jane@example.com", status: "A" }
console.log('Cache Hit:', data._metadata.cacheHit);
```

### Example 8: Infer Schema from Data

```javascript
const response = await fetch('https://lumenbridge.codenlighten.org/api/schema/infer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: {
      orderId: 12345,
      customer: "John Doe",
      total: 199.99,
      isPaid: true,
      items: ["Widget A", "Widget B"]
    },
    schemaName: "OrderSchema"
  })
});

const data = await response.json();
console.log('Inferred Schema:', data.schema);
console.log('Confidence:', data.confidence);
```
});

const data = await response.json();
console.log(`Routed to: ${data.routing.selectedAgent}`);
console.log(`Confidence: ${data.routing.confidence}`);
```

---

## Support

- **GitHub**: [github.com/codenlighten/lumen-bridge](https://github.com/codenlighten/lumen-bridge)
- **Documentation**: [Full docs and examples](https://github.com/codenlighten/lumen-bridge/tree/main/docs)
- **User Agents Guide**: [USER-AGENTS.md](https://github.com/codenlighten/lumen-bridge/blob/main/USER-AGENTS.md)
- **API Documentation**: This document

---

**Built with ❤️ by Gregory Ward (CodenLighten)**  
🌉 Self-aware AI agents that build the future

**Last Updated**: November 24, 2025

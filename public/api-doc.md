# Lumen Bridge API Documentation

**Base URL**: `https://lumenbridge.codenlighten.org`  
**Version**: 1.0.0  
**Authentication**: None required (public API)

---

## Table of Contents

1. [Overview](#overview)
2. [Common Response Structure](#common-response-structure)
3. [Cryptographic Signatures](#cryptographic-signatures)
4. [Endpoints](#endpoints)
   - [SearchAgent](#1-searchagent)
   - [TerminalAgent](#2-terminalagent)
   - [CodeGenerator](#3-codegenerator)
   - [SchemaAgent](#4-schemaagent)
   - [ToolRouterAgent](#5-toolrouteragent)
   - [Schema Registry](#6-schema-registry)
5. [Error Handling](#error-handling)
6. [Rate Limits](#rate-limits)
7. [Examples](#examples)

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

## Endpoints

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

---

## Support

- **GitHub**: [github.com/codenlighten/lumen-bridge](https://github.com/codenlighten/lumen-bridge)
- **Documentation**: [Full docs and examples](https://github.com/codenlighten/lumen-bridge/tree/main/docs)

---

**Built with ❤️ by the Lumen Bridge Team**  
🌉 Self-aware AI agents that build the future

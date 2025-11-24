# 🌉 Lumen Bridge - Self-Aware Agent API

**Revolutionary self-evolving agent system with cryptographic signatures and the Future Self Bridge architecture**

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the server
node server.js
```

Server runs on `http://localhost:3000`

## 🎯 What Can You Build?

### 1. **AI Chat Applications**
Build intelligent chat interfaces that automatically route to the right agent:
- Web search for current information
- Code generation for programming help
- Terminal commands for system tasks
- Direct answers for general questions

### 2. **Custom Agent Workflows**
Create specialized agents for your specific use case:
- Customer support bots
- Research assistants
- Development tools
- Data analysis agents

### 3. **Autonomous AI Systems**
Build self-aware AI that knows its limitations and asks for help:
- Missing context detection
- Intelligent routing
- Multi-step task execution
- Memory and learning

## 📡 API Endpoints

### Individual Agents

#### SearchAgent - Web Search with Intelligence
```bash
POST /api/agents/search
```
```json
{
  "userQuery": "Latest Bitcoin price",
  "maxResults": 5
}
```

**Response:**
```json
{
  "success": true,
  "agent": "SearchAgent",
  "result": {
    "action": "search_completed",
    "query": "Bitcoin price today",
    "rawResults": [...],
    "analysis": {
      "summary": "Bitcoin is currently trading at...",
      "keyFindings": ["..."],
      "sources": [...],
      "answerQuality": "complete"
    },
    "_signature": {
      "algorithm": "BSV-ECDSA-DER",
      "address": "1ABC...",
      "timestamp": "2024-11-24T12:00:00.000Z"
    }
  }
}
```

#### TerminalAgent - Command Generation
```bash
POST /api/agents/terminal
```
```json
{
  "task": "List all JavaScript files",
  "context": {}
}
```

#### CodeGenerator - Code Creation
```bash
POST /api/agents/code
```
```json
{
  "prompt": "Create a React login component",
  "context": {}
}
```

#### SchemaAgent - JSON Schema Generation
```bash
POST /api/agents/schema
```
```json
{
  "userPrompt": "Schema for a user profile with name, email, and age",
  "extraConstraints": "Email should be validated"
}
```

### Intelligent Router (Auto-Select Best Agent)

```bash
POST /api/router
```
```json
{
  "userPrompt": "What's the weather in New York?"
}
```

**The router automatically:**
1. Analyzes the request
2. Selects the best agent (SearchAgent in this case)
3. Executes the task
4. Returns results with routing metadata

### Custom Agent Creation

```bash
POST /api/custom-agent
```
```json
{
  "agentName": "MathTutor",
  "systemPrompt": "You are a math tutor who explains concepts clearly",
  "userPrompt": "Explain calculus derivatives",
  "schema": {
    "type": "object",
    "properties": {
      "explanation": { "type": "string" },
      "examples": {
        "type": "array",
        "items": { "type": "string" }
      }
    }
  }
}
```

## 💡 Example Use Cases

### 1. Intelligent Chat Bot

```javascript
// Client-side code
async function chat(userMessage) {
  const response = await fetch('http://localhost:3000/api/router', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userPrompt: userMessage })
  });
  
  const data = await response.json();
  
  console.log('Routed to:', data.routing.selectedAgent);
  console.log('Confidence:', data.routing.confidence);
  console.log('Result:', data.result);
  
  return data;
}

// Examples
await chat("What are the latest features in Node.js 22?");  // → SearchAgent
await chat("Create a function to sort an array");            // → CodeGenerator
await chat("List all Python files");                         // → TerminalAgent
await chat("What is React?");                                // → Direct answer
```

### 2. Research Assistant

```javascript
async function research(topic) {
  const response = await fetch('http://localhost:3000/api/agents/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userQuery: topic,
      maxResults: 10
    })
  });
  
  const { result } = await response.json();
  
  if (result.action === 'search_completed') {
    return {
      summary: result.analysis.summary,
      findings: result.analysis.keyFindings,
      sources: result.analysis.sources,
      quality: result.analysis.answerQuality,
      followUp: result.analysis.suggestedFollowUp
    };
  } else if (result.action === 'ask_user') {
    return {
      needsClarification: true,
      missingContext: result.missingContext,
      suggestions: result.suggestedQueries
    };
  }
}
```

### 3. Development Assistant

```javascript
async function generateCode(description) {
  const response = await fetch('http://localhost:3000/api/agents/code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: description,
      context: {
        language: 'javascript',
        framework: 'react'
      }
    })
  });
  
  const { result } = await response.json();
  return result.code;
}
```

### 4. Schema-Driven Data Design

```javascript
async function designDataStructure(description) {
  const response = await fetch('http://localhost:3000/api/agents/schema', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userPrompt: description
    })
  });
  
  const { result } = await response.json();
  
  return {
    schema: result.generatedSchema,
    name: result.schemaName,
    description: result.schemaDescription,
    rationale: result.designRationale
  };
}
```

## 🏗️ Architecture

### Future Self Bridge Pattern

```
Current Self (Planning)
    ↓
Schema Generation
    ↓
External Action (Search, Command, etc.)
    ↓
Future Self (Analysis)
    ↓
Structured Response
    ↓
Cryptographic Signature
    ↓
Memory Storage
```

### Key Components

1. **BaseMetaAgent** - Self-reflective core with schema planning
2. **SearchAgent** - Web search with intelligent strategy
3. **TerminalAgent** - Safe command generation
4. **CodeGenerator** - Multi-language code creation
5. **SchemaAgent** - Natural language → JSON Schema
6. **SchemaRegistry** - Cryptographic schema storage
7. **MemoryManager** - Signed interaction history

## 🔐 Cryptographic Signatures

Every response is cryptographically signed using BSV-ECDSA-DER:

```json
{
  "_signature": {
    "signature": "3045022100...",
    "responseHash": "abc123...",
    "address": "1ABC...",
    "publicKey": "02abc...",
    "timestamp": "2024-11-24T12:00:00.000Z",
    "algorithm": "BSV-ECDSA-DER",
    "agentIdentity": "SearchAgent"
  }
}
```

Responses can be verified for:
- Authenticity (who generated it)
- Integrity (hasn't been tampered with)
- Traceability (when it was generated)

## 🧠 Self-Aware Features

### Missing Context Detection

Agents know when they don't have enough information:

```json
{
  "action": "ask_user",
  "missingContext": [
    "Specific deployment target (AWS, Heroku, etc.)",
    "Application type (web, mobile, API)"
  ],
  "suggestedQueries": [
    "Deploy Node.js app to AWS",
    "Deploy React app to Heroku"
  ]
}
```

### Confidence Scoring

Routing decisions include confidence levels:

```json
{
  "routing": {
    "selectedAgent": "search",
    "reasoning": "Query requires current information",
    "confidence": 0.95
  }
}
```

### Answer Quality Assessment

Search results include quality metrics:

```json
{
  "analysis": {
    "answerQuality": "complete",  // or "partial" or "insufficient"
    "suggestedFollowUp": [
      "More specific timeframe?",
      "Particular aspect of interest?"
    ]
  }
}
```

## 🚀 Building Your Own AI Chat

### Simple Chat Interface

```html
<!DOCTYPE html>
<html>
<head>
  <title>Lumen Bridge Chat</title>
</head>
<body>
  <div id="chat"></div>
  <input id="input" type="text" placeholder="Ask anything...">
  <button onclick="send()">Send</button>

  <script>
    async function send() {
      const input = document.getElementById('input');
      const message = input.value;
      input.value = '';

      // Display user message
      addMessage('user', message);

      // Call the intelligent router
      const response = await fetch('http://localhost:3000/api/router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: message })
      });

      const data = await response.json();

      // Display AI response
      const aiMessage = extractResponse(data.result);
      addMessage('ai', aiMessage, data.routing.selectedAgent);
    }

    function extractResponse(result) {
      if (result.action === 'search_completed') {
        return result.analysis.summary;
      } else if (result.response) {
        return result.response;
      } else if (result.code) {
        return `\`\`\`\n${result.code}\n\`\`\``;
      }
      return JSON.stringify(result, null, 2);
    }

    function addMessage(role, text, agent = null) {
      const chat = document.getElementById('chat');
      const msg = document.createElement('div');
      msg.className = role;
      msg.innerHTML = `
        <strong>${role === 'user' ? 'You' : 'AI'}${agent ? ` (${agent})` : ''}</strong>
        <p>${text}</p>
      `;
      chat.appendChild(msg);
    }
  </script>
</body>
</html>
```

## 📊 API Response Format

All endpoints return a consistent format:

```json
{
  "success": true,
  "agent": "AgentName",
  "result": { /* agent-specific result */ },
  "timestamp": "2024-11-24T12:00:00.000Z"
}
```

Errors:

```json
{
  "error": "Error message",
  "agent": "AgentName"
}
```

## 🌟 Advanced Features

### Schema Registry

Store and retrieve cryptographically signed schemas:

```javascript
// Register a schema
await fetch('http://localhost:3000/api/schema/register', {
  method: 'POST',
  body: JSON.stringify({
    schemaName: 'UserProfile',
    schema: { /* JSON Schema */ },
    description: 'User profile data structure',
    tags: ['user', 'profile', 'authentication']
  })
});

// Retrieve a schema
const schema = await fetch('http://localhost:3000/api/schema/UserProfile');

// Search schemas
const results = await fetch('http://localhost:3000/api/schema/search', {
  method: 'POST',
  body: JSON.stringify({ query: 'user' })
});
```

## 🎓 Learning & Evolution

The system learns from interactions through:
- **Memory Storage**: Every interaction is saved with cryptographic signatures
- **Schema Evolution**: Schemas improve based on usage patterns
- **Routing Optimization**: Router learns which agents work best for which tasks

## 🔧 Environment Variables

```env
# OpenAI API
OPENAI_API_KEY=sk-...

# Google Search (optional)
GOOGLE_API_KEY=AIza...
GOOGLE_CSE_ID=...

# Server
PORT=3000
```

## 📝 License

ISC

## 👨‍💻 Author

Gregory Ward (CodenLighten) - Chief Development Officer & Co-Founder, SmartLedger.Technology & Codenlighten.org

---

**Built with the Future Self Bridge architecture - where AI agents evolve by planning their own response structures** 🌉

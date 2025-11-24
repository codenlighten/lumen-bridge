# 🌉 Lumen Bridge - Self-Aware Agent Platform

**A revolutionary self-evolving AI agent system with cryptographic signatures, the Future Self Bridge architecture, and Synthetic Dev Teams**

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

## 🎯 What is Lumen Bridge?

Lumen Bridge is a **self-aware, self-evolving agent platform** that implements the revolutionary "Future Self Bridge" pattern and extends it to **"Future Team Bridge"** - where AI agents work as coordinated development teams. Unlike traditional AI systems that simply respond to prompts, Lumen Bridge agents:

- **Plan their own response structures** (current self)
- **Execute with schema-driven precision** (future self)
- **Know when they lack context** (self-awareness)
- **Sign all responses cryptographically** (BSV-ECDSA-DER)
- **Learn from interaction history** (memory)
- **Evolve their schemas over time** (self-improvement)
- **🆕 Work as synthetic dev teams in parallel** (distributed cognition)

## 🏗️ Architecture: The Future Self Bridge

```
┌─────────────────────────────────────────────────────────────┐
│                    Current Self (Planning)                   │
│  "What structure should my response have for this task?"    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Schema Generation                         │
│         (SchemaAgent generates ideal JSON Schema)           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Action Layer                       │
│    (Google Search, Terminal Commands, Code Generation)      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                 Future Self (Execution)                      │
│   "Respond using the planned schema with actual data"       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Cryptographically Signed Response               │
│        (BSV-ECDSA-DER signature, SHA-256 hash)              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Memory Storage                           │
│         (Signed interaction history preserved)              │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Core Features

### 🤖 Specialized Agents

1. **BaseMetaAgent** - Self-reflective core implementing the future self bridge
2. **SearchAgent** - Web search with intelligent planning and result analysis
3. **TerminalAgent** - Safe terminal command generation with risk assessment
4. **CodeGenerator** - Multi-language code generation from natural language
5. **SchemaAgent** - JSON Schema generation from natural language descriptions
6. **ToolRouterAgent** - Intelligent routing to the best agent for each task
7. **🆕 ProjectPlannerAgent** - Architect brain that creates contracts and decomposes projects
8. **🆕 CodeWorkerAgent** - Individual developer that executes task tickets in parallel
9. **🆕 SyntheticDevTeam** - CTO orchestrator that manages entire development teams

### 🤖 Synthetic Dev Team (NEW!)

**The Future Team Bridge** - AI agents working as coordinated development teams:

- **ProjectPlannerAgent** creates cryptographically-signed project contracts and BoxSpecs
- **Multiple CodeWorkerAgents** execute in parallel (like real developers)
- **IntegrationAgent** verifies schemas align and contracts are satisfied
- **SyntheticDevTeam orchestrator** manages the entire operation

```javascript
import SyntheticDevTeam from './utilities/SyntheticDevTeam.js';

const team = new SyntheticDevTeam();
const deliverable = await team.buildProject({
  projectSpec: "Build Express REST API with Jest testing",
  featureSpec: "User CRUD endpoints with validation"
});

// 6 files generated, 487 lines of code, 31 tests passing, ready to deploy!
```

**[Read full documentation →](./SYNTHETIC-DEV-TEAM.md)**

### 🔐 Cryptographic Foundation

Every response includes a verifiable signature:
- **Algorithm**: BSV-ECDSA-DER
- **Hash**: SHA-256
- **Fields**: Signature, address, public key, timestamp, agent identity
- **Verification**: Tamper-proof, traceable, authentic

### 🧠 Self-Awareness Features

- **Missing Context Detection** - Agents know when they need more information
- **Confidence Scoring** - Routing decisions include confidence levels
- **Answer Quality Assessment** - Results rated as complete/partial/insufficient
- **Question Generation** - Agents ask clarifying questions when needed
- **Follow-up Suggestions** - Proactive recommendations for deeper exploration

### 💾 Memory & Learning

- **Signed History** - All interactions cryptographically preserved
- **Context Retrieval** - Past conversations inform future responses
- **Schema Evolution** - Structures improve based on usage patterns
- **Statistics Tracking** - Steps, plannings, questions, continuations

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/codenlighten/lumen-bridge.git
cd lumen-bridge

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your API keys
```

### Environment Variables

```env
# OpenAI API (required)
OPENAI_API_KEY=sk-...

# Google Custom Search (optional, for SearchAgent)
GOOGLE_API_KEY=AIza...
GOOGLE_CSE_ID=...

# Server Configuration
PORT=3000
```

### Start the API Server

```bash
node server.js
```

Server runs on `http://localhost:3000`

## 📡 API Endpoints

### Individual Agents

#### SearchAgent - Intelligent Web Search
```bash
curl -X POST http://localhost:3000/api/agents/search \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "Latest TypeScript features 2024",
    "maxResults": 5
  }'
```

**Response includes:**
- Strategy planning (search intent, missing context)
- Google search results
- Structured analysis (summary, key findings, sources)
- Answer quality assessment
- Follow-up suggestions
- Cryptographic signature

#### TerminalAgent - Command Generation
```bash
curl -X POST http://localhost:3000/api/agents/terminal \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Find all JavaScript files modified today"
  }'
```

#### CodeGenerator - Code Creation
```bash
curl -X POST http://localhost:3000/api/agents/code \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a React component for a user profile card",
    "context": { "framework": "react", "styling": "tailwind" }
  }'
```

#### SchemaAgent - JSON Schema Generation
```bash
curl -X POST http://localhost:3000/api/agents/schema \
  -H "Content-Type: application/json" \
  -d '{
    "userPrompt": "Schema for a blog post with title, content, author, tags, and publish date"
  }'
```

### Intelligent Router (Auto-Select Best Agent)

```bash
curl -X POST http://localhost:3000/api/router \
  -H "Content-Type: application/json" \
  -d '{
    "userPrompt": "What are the latest features in Node.js 22?"
  }'
```

The router automatically:
1. Analyzes the request
2. Selects the optimal agent
3. Executes the task
4. Returns results with routing metadata

### Custom Agent Creation

```bash
curl -X POST http://localhost:3000/api/custom-agent \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "MathTutor",
    "systemPrompt": "You are a math tutor explaining concepts clearly",
    "userPrompt": "Explain derivatives in calculus",
    "schema": {
      "type": "object",
      "properties": {
        "explanation": { "type": "string" },
        "examples": { "type": "array" }
      }
    }
  }'
```

## 💡 Use Cases

### 1. AI Chat Application

```javascript
import SearchAgent from './agents/SearchAgent.js';

const agent = new SearchAgent();
const result = await agent.search({
  userQuery: 'Bitcoin price today'
});

if (result.action === 'search_completed') {
  console.log(result.analysis.summary);
  console.log(result.analysis.sources);
}
```

### 2. Research Assistant

```javascript
import { ToolRouterAgent } from './test-tool-router.js';

const router = new ToolRouterAgent();
const result = await router.route('Latest AI research papers 2024');

// Automatically routes to SearchAgent
// Returns structured research findings
```

### 3. Development Workflow

```javascript
import CodeGenerator from './agents/CodeGenerator.js';

const coder = new CodeGenerator();
const result = await coder.generate(
  'Create a REST API endpoint for user authentication',
  { language: 'node', framework: 'express' }
);

console.log(result.code);
```

### 4. Schema-Driven Design

```javascript
import SchemaAgent from './agents/SchemaGenerator.js';

const schemaGen = new SchemaAgent();
const result = await schemaGen.generateSchema({
  userPrompt: 'E-commerce product catalog with variants and inventory'
});

console.log(result.generatedSchema);
console.log(result.designRationale);
```

## 🧪 Testing

```bash
# Test SearchAgent
node test-search-complete.js

# Test ToolRouter integration
node test-router-search-integration.js

# Test complete system
node demo-complete-integrated-system.js

# Test API endpoints
node test-api-client.js
```

## 📦 Project Structure

```
lumen-bridge/
├── agents/
│   ├── BaseMetaAgent.js          # Core future self bridge implementation
│   ├── BaseAgent.js               # Legacy base (documented)
│   ├── SearchAgent.js             # Web search with planning
│   ├── TerminalAgent.js           # Command generation
│   ├── CodeGenerator.js           # Code creation
│   └── SchemaGenerator.js         # Schema generation
├── utilities/
│   ├── MemoryManager.js           # Signed interaction history
│   ├── SchemaRegistry.js          # Cryptographic schema storage
│   ├── google-apis.js             # Google Custom Search wrapper
│   └── MongoDBService.js          # Database integration
├── llm-providers/
│   ├── OpenAIProvider.js          # OpenAI integration
│   ├── LlamaProvider.js           # Local LLM support
│   └── llm-config.js              # Provider configuration
├── tools/
│   ├── der-signature.js           # BSV-ECDSA-DER crypto
│   └── signature.js               # Key management
├── server.js                      # Express API server
├── structured-json.js             # Core response signing
└── package.json
```

## 🎓 Key Concepts

### Future Self Bridge Pattern

The agent doesn't just respond—it **plans** how to respond:

1. **Current Self**: "For this user query, what JSON structure would be ideal?"
2. **Schema Planning**: SchemaAgent generates the perfect schema
3. **Future Self**: "Now respond using that exact structure"
4. **Verification**: Cryptographically sign the response
5. **Memory**: Store for future context

### Self-Awareness Through Missing Context

Agents detect what they don't know:

```json
{
  "action": "ask_user",
  "missingContext": [
    "Deployment target (AWS, Heroku, local)",
    "Application type (web, mobile, API)"
  ],
  "suggestedQueries": [
    "Deploy Node.js to AWS",
    "Deploy React to Heroku"
  ]
}
```

### Cryptographic Signatures

Every response is verifiable:

```json
{
  "_signature": {
    "signature": "3045022100d0d2cee...",
    "responseHash": "0d2120246c18...",
    "address": "1HPnKqz9obieL7v3BxLG...",
    "publicKey": "02d97cdbc5b729...",
    "timestamp": "2025-11-24T11:25:43.606Z",
    "algorithm": "BSV-ECDSA-DER",
    "agentIdentity": "SearchAgent"
  }
}
```

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **LLM Provider**: OpenAI (gpt-4o-mini, gpt-4o)
- **Cryptography**: BSV-ECDSA-DER (smartledger-bsv)
- **Web Server**: Express 5
- **Search**: Google Custom Search API
- **Database**: MongoDB (optional)
- **Signatures**: SHA-256 hashing

## 🌟 What Makes This Unique

### 1. True Self-Awareness
Agents know their capabilities and limitations. They ask questions when context is missing rather than guessing.

### 2. Schema-Driven Evolution
Response structures aren't hardcoded—they're generated on-the-fly based on the task at hand.

### 3. Cryptographic Verifiability
Every response is signed, traceable, and tamper-proof. Audit trails are built-in.

### 4. Memory Integration
Past interactions inform future responses. The system learns from its history.

### 5. Autonomous Routing
The system decides which specialized agent handles each task, with confidence scoring.

### 6. External API Integration
Seamlessly integrates external services (Google Search) into the agent workflow.

## 🔮 Future Enhancements

- [ ] Multi-source search (Bing, DuckDuckGo, custom APIs)
- [ ] Rate limiting and caching for external APIs
- [ ] WebSocket support for real-time streaming
- [ ] Agent marketplace (share custom agents)
- [ ] Visual workflow builder
- [ ] Multi-modal support (images, audio, video)
- [ ] Blockchain integration for permanent signatures
- [ ] Distributed agent collaboration

## 📚 Documentation

- [API Documentation](./API-README.md) - Complete API reference
- [Architecture Guide](./FUTURE-SELF-BRIDGE.md) - Deep dive into the future self bridge
- [Agent Development](./agents/BaseAgent.js) - Creating custom agents

## 🤝 Contributing

Contributions are welcome! This is a revolutionary architecture and we're excited to see what the community builds.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC License - see [LICENSE](LICENSE) for details

## 👨‍💻 Author

**Gregory Ward (CodenLighten)**  
Chief Development Officer & Co-Founder  
SmartLedger.Technology & Codenlighten.org

## 🙏 Acknowledgments

- Inspired by the vision of self-evolving AI systems
- Built on the BSV blockchain cryptographic foundation
- Powered by OpenAI's language models
- Enabled by the open-source community

---

**Built with the Future Self Bridge architecture - where AI agents evolve by planning their own response structures** 🌉

*"The future self knows what the current self planned, and responds accordingly."*

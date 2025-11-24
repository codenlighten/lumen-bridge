# 🎯 Lumen Bridge - Example Integrations

Real-world examples showing how to build applications with Lumen Bridge.

## 1. AI Chat Application

### Simple Chat Interface

```javascript
import SearchAgent from './agents/SearchAgent.js';
import CodeGenerator from './agents/CodeGenerator.js';
import BaseMetaAgent from './agents/BaseMetaAgent.js';

class ChatBot {
  constructor() {
    this.searchAgent = new SearchAgent();
    this.codeAgent = new CodeGenerator();
    this.router = new BaseMetaAgent({
      agentName: 'ChatRouter',
      systemPrompt: 'You route messages to search, code, or direct answer'
    });
  }

  async chat(userMessage) {
    // Decide which agent to use
    const decision = await this.router.step({
      userPrompt: `Route: "${userMessage}"`,
      explicitSchema: {
        type: 'object',
        properties: {
          agent: { type: 'string', enum: ['search', 'code', 'direct'] },
          reasoning: { type: 'string' }
        }
      }
    });

    // Execute with the selected agent
    if (decision.agent === 'search') {
      const result = await this.searchAgent.search({ userQuery: userMessage });
      return result.action === 'search_completed' 
        ? result.analysis.summary 
        : 'I need more context to search effectively.';
    }
    
    if (decision.agent === 'code') {
      const result = await this.codeAgent.generate(userMessage);
      return result.code || result.response;
    }

    return decision.response;
  }
}

// Usage
const bot = new ChatBot();
const response = await bot.chat('What is Bitcoin?');
console.log(response);
```

### Web UI Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>Lumen Bridge Chat</title>
  <style>
    .chat-container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .message { padding: 10px; margin: 10px 0; border-radius: 8px; }
    .user { background: #007bff; color: white; text-align: right; }
    .ai { background: #f1f1f1; }
    .agent-badge { font-size: 0.8em; color: #666; }
  </style>
</head>
<body>
  <div class="chat-container">
    <div id="messages"></div>
    <input id="input" type="text" placeholder="Ask anything..." style="width: 100%; padding: 10px;">
  </div>

  <script>
    const API_URL = 'http://localhost:3000/api/router';

    async function sendMessage() {
      const input = document.getElementById('input');
      const message = input.value.trim();
      if (!message) return;

      input.value = '';
      addMessage('user', message);

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userPrompt: message })
        });

        const data = await response.json();
        const aiResponse = extractResponse(data.result);
        addMessage('ai', aiResponse, data.routing?.selectedAgent);
      } catch (error) {
        addMessage('ai', 'Sorry, there was an error processing your request.');
      }
    }

    function extractResponse(result) {
      if (result.action === 'search_completed') {
        let response = result.analysis.summary;
        if (result.analysis.sources?.length > 0) {
          response += '\n\nSources:\n';
          result.analysis.sources.slice(0, 3).forEach((src, i) => {
            response += `${i+1}. ${src.title}\n   ${src.url}\n`;
          });
        }
        return response;
      }
      return result.response || result.code || JSON.stringify(result);
    }

    function addMessage(role, text, agent = null) {
      const messages = document.getElementById('messages');
      const div = document.createElement('div');
      div.className = `message ${role}`;
      
      let html = `<div>${text.replace(/\n/g, '<br>')}</div>`;
      if (agent) {
        html += `<div class="agent-badge">via ${agent}</div>`;
      }
      
      div.innerHTML = html;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    document.getElementById('input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  </script>
</body>
</html>
```

## 2. Research Assistant

```javascript
import SearchAgent from './agents/SearchAgent.js';
import { SchemaRegistry } from './utilities/SchemaRegistry.js';

class ResearchAssistant {
  constructor() {
    this.searchAgent = new SearchAgent({ maxResults: 10 });
    this.registry = new SchemaRegistry();
    this.researchHistory = [];
  }

  async research(topic) {
    console.log(`🔍 Researching: ${topic}`);

    // Execute search
    const searchResult = await this.searchAgent.search({
      userQuery: topic,
      maxResults: 10
    });

    if (searchResult.action === 'ask_user') {
      return {
        status: 'needs_clarification',
        missingContext: searchResult.missingContext,
        suggestions: searchResult.suggestedQueries
      };
    }

    if (searchResult.action !== 'search_completed') {
      return { status: 'failed', reason: searchResult.action };
    }

    // Structure the research findings
    const findings = {
      topic,
      summary: searchResult.analysis.summary,
      keyFindings: searchResult.analysis.keyFindings,
      sources: searchResult.analysis.sources.map(src => ({
        title: src.title,
        url: src.url,
        snippet: src.snippet,
        relevance: src.relevance
      })),
      quality: searchResult.analysis.answerQuality,
      followUp: searchResult.analysis.suggestedFollowUp || [],
      timestamp: new Date().toISOString(),
      signature: searchResult._signature
    };

    // Save to history
    this.researchHistory.push(findings);

    return {
      status: 'completed',
      findings
    };
  }

  async deepDive(topic) {
    // Initial research
    const initial = await this.research(topic);
    
    if (initial.status !== 'completed') {
      return initial;
    }

    // Follow-up on suggested queries
    const deeperFindings = [];
    
    for (const followUp of initial.findings.followUp.slice(0, 2)) {
      console.log(`   🔍 Follow-up: ${followUp}`);
      const result = await this.research(followUp);
      if (result.status === 'completed') {
        deeperFindings.push(result.findings);
      }
    }

    return {
      status: 'deep_dive_completed',
      initial: initial.findings,
      deeper: deeperFindings
    };
  }

  generateReport() {
    if (this.researchHistory.length === 0) {
      return 'No research conducted yet.';
    }

    let report = '# Research Report\n\n';
    
    this.researchHistory.forEach((finding, i) => {
      report += `## ${i + 1}. ${finding.topic}\n\n`;
      report += `**Summary:** ${finding.summary}\n\n`;
      report += `**Quality:** ${finding.quality}\n\n`;
      
      report += `**Key Findings:**\n`;
      finding.keyFindings.forEach(kf => {
        report += `- ${kf}\n`;
      });
      
      report += `\n**Sources:**\n`;
      finding.sources.forEach((src, j) => {
        report += `${j + 1}. [${src.relevance}] ${src.title}\n`;
        report += `   ${src.url}\n`;
      });
      
      report += '\n---\n\n';
    });

    return report;
  }
}

// Usage
const assistant = new ResearchAssistant();

// Simple research
const result1 = await assistant.research('Latest advances in quantum computing');
console.log(result1.findings.summary);

// Deep dive
const result2 = await assistant.deepDive('Ethereum scaling solutions');
console.log(result2.initial.summary);
console.log(result2.deeper.length, 'follow-up topics researched');

// Generate report
console.log(assistant.generateReport());
```

## 3. Development Assistant

```javascript
import CodeGenerator from './agents/CodeGenerator.js';
import TerminalAgent from './agents/TerminalAgent.js';
import BaseMetaAgent from './agents/BaseMetaAgent.js';

class DevAssistant {
  constructor() {
    this.codeGen = new CodeGenerator();
    this.terminal = new TerminalAgent();
    this.reviewer = new BaseMetaAgent({
      agentName: 'CodeReviewer',
      systemPrompt: 'You review code for best practices and security'
    });
  }

  async createFeature(description) {
    // Generate code
    const codeResult = await this.codeGen.generate(description);
    
    if (!codeResult.includesCode) {
      return { status: 'failed', reason: 'No code generated' };
    }

    // Review the code
    const review = await this.reviewer.step({
      userPrompt: `Review this code:\n\`\`\`\n${codeResult.code}\n\`\`\``,
      explicitSchema: {
        type: 'object',
        properties: {
          issues: { type: 'array', items: { type: 'string' } },
          improvements: { type: 'array', items: { type: 'string' } },
          securityConcerns: { type: 'array', items: { type: 'string' } },
          rating: { type: 'number', minimum: 1, maximum: 10 }
        }
      }
    });

    return {
      status: 'completed',
      code: codeResult.code,
      review: {
        issues: review.issues,
        improvements: review.improvements,
        security: review.securityConcerns,
        rating: review.rating
      }
    };
  }

  async setupProject(projectType) {
    // Generate setup commands
    const cmdResult = await this.terminal.generate(
      `Create a new ${projectType} project with all necessary files`
    );

    return {
      commands: cmdResult.terminalCommand,
      steps: cmdResult.steps || [],
      shell: cmdResult.shell
    };
  }

  async debugIssue(errorMessage, codeContext) {
    const analysis = await this.reviewer.step({
      userPrompt: `Debug this error:\n${errorMessage}\n\nCode:\n${codeContext}`,
      explicitSchema: {
        type: 'object',
        properties: {
          cause: { type: 'string' },
          solution: { type: 'string' },
          preventionTips: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return analysis;
  }
}

// Usage
const dev = new DevAssistant();

// Create a feature
const feature = await dev.createFeature('User authentication with JWT');
console.log(feature.code);
console.log('Review:', feature.review);

// Setup project
const setup = await dev.setupProject('React with TypeScript');
console.log('Setup commands:', setup.commands);

// Debug an issue
const debug = await dev.debugIssue(
  'TypeError: Cannot read property of undefined',
  'const user = data.users[0];'
);
console.log('Cause:', debug.cause);
console.log('Solution:', debug.solution);
```

## 4. Custom Agent for Specific Domain

```javascript
import BaseMetaAgent from './agents/BaseMetaAgent.js';
import SearchAgent from './agents/SearchAgent.js';

class MedicalResearchAgent extends BaseMetaAgent {
  constructor() {
    super({
      agentName: 'MedicalResearch',
      systemPrompt: `You are a medical research assistant.
      
You help researchers by:
1. Finding recent medical studies
2. Summarizing clinical trial data
3. Identifying research gaps
4. Suggesting related studies

Always cite sources and indicate confidence levels.`
    });

    this.searchAgent = new SearchAgent({ maxResults: 15 });
  }

  async researchCondition(condition) {
    // Step 1: Get recent studies
    const studies = await this.searchAgent.search({
      userQuery: `${condition} recent clinical trials 2024`,
      maxResults: 15
    });

    if (studies.action !== 'search_completed') {
      return { status: 'search_failed' };
    }

    // Step 2: Analyze findings
    const analysis = await this.step({
      userPrompt: `Analyze these medical studies about ${condition}:\n${JSON.stringify(studies.analysis.sources, null, 2)}`,
      explicitSchema: {
        type: 'object',
        properties: {
          overview: { type: 'string' },
          keyFindings: { type: 'array', items: { type: 'string' } },
          treatments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                efficacy: { type: 'string' },
                sideEffects: { type: 'string' }
              }
            }
          },
          researchGaps: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] }
        }
      }
    });

    return {
      status: 'completed',
      condition,
      sources: studies.analysis.sources,
      analysis
    };
  }
}

// Usage
const medAgent = new MedicalResearchAgent();
const research = await medAgent.researchCondition('Type 2 Diabetes');
console.log(research.analysis.overview);
console.log(research.analysis.treatments);
```

## 5. Multi-Agent Workflow

```javascript
import SearchAgent from './agents/SearchAgent.js';
import CodeGenerator from './agents/CodeGenerator.js';
import BaseMetaAgent from './agents/BaseMetaAgent.js';

class MultiAgentWorkflow {
  constructor() {
    this.agents = {
      search: new SearchAgent(),
      code: new CodeGenerator(),
      planner: new BaseMetaAgent({ agentName: 'Planner' })
    };
  }

  async buildFeatureWithResearch(featureDescription) {
    console.log('🎯 Multi-agent workflow started');

    // Step 1: Plan the feature
    console.log('   📋 Planning...');
    const plan = await this.agents.planner.step({
      userPrompt: `Create a development plan for: ${featureDescription}`,
      explicitSchema: {
        type: 'object',
        properties: {
          steps: { type: 'array', items: { type: 'string' } },
          researchNeeded: { type: 'array', items: { type: 'string' } },
          technologies: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Step 2: Research each technology
    console.log('   🔍 Researching...');
    const research = {};
    for (const tech of plan.technologies) {
      const result = await this.agents.search.search({
        userQuery: `${tech} best practices and latest features`,
        maxResults: 3
      });
      research[tech] = result.action === 'search_completed' 
        ? result.analysis.summary 
        : null;
    }

    // Step 3: Generate code
    console.log('   💻 Generating code...');
    const codePrompt = `
Feature: ${featureDescription}
Plan: ${plan.steps.join(', ')}
Research insights: ${JSON.stringify(research)}
    `;
    
    const code = await this.agents.code.generate(codePrompt);

    return {
      plan,
      research,
      code: code.code,
      workflow: {
        steps: ['planning', 'research', 'code_generation'],
        duration: Date.now()
      }
    };
  }
}

// Usage
const workflow = new MultiAgentWorkflow();
const result = await workflow.buildFeatureWithResearch(
  'Real-time chat with WebSocket and Redis pub/sub'
);

console.log('Plan:', result.plan.steps);
console.log('Research:', Object.keys(result.research));
console.log('Code generated:', result.code ? 'Yes' : 'No');
```

## 6. Express.js Integration

```javascript
import express from 'express';
import SearchAgent from './agents/SearchAgent.js';
import CodeGenerator from './agents/CodeGenerator.js';

const app = express();
app.use(express.json());

// Initialize agents
const agents = {
  search: new SearchAgent(),
  code: new CodeGenerator()
};

// Custom endpoint for your app
app.post('/api/intelligent-assistant', async (req, res) => {
  try {
    const { query, type } = req.body;

    let result;
    
    if (type === 'search' || query.includes('search') || query.includes('find')) {
      result = await agents.search.search({ userQuery: query });
    } else if (type === 'code' || query.includes('code') || query.includes('function')) {
      result = await agents.code.generate(query);
    } else {
      result = { message: 'Please specify search or code request' };
    }

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

## 7. React Integration

```jsx
import React, { useState } from 'react';

function LumenBridgeChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: input })
      });

      const data = await response.json();
      
      let content = '';
      if (data.result.action === 'search_completed') {
        content = data.result.analysis.summary;
      } else if (data.result.code) {
        content = `\`\`\`\n${data.result.code}\n\`\`\``;
      } else {
        content = data.result.response || JSON.stringify(data.result);
      }

      const aiMsg = {
        role: 'assistant',
        content,
        agent: data.routing?.selectedAgent
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="content">{msg.content}</div>
            {msg.agent && <div className="agent-badge">{msg.agent}</div>}
          </div>
        ))}
        {loading && <div className="loading">Thinking...</div>}
      </div>
      
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask anything..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default LumenBridgeChat;
```

---

These examples demonstrate the flexibility and power of Lumen Bridge for building intelligent applications! 🌉

# 🎯 Lumen Bridge - Quick API Reference

**The most elegant, optimized AI agent API available today.**

## 🔑 Session-Based Memory

**Memory travels with YOUR session, not individual agents.**

All agents in a session share the same conversation context:
- Use SearchAgent, CodeGenerator, TerminalAgent → Same memory
- Context flows seamlessly across agent switches  
- Session identified by: `publicKey` > `X-Session-Id` header > IP + User-Agent

```bash
# Your session ID is in every response header
X-Session-Id: pk_abc123... (from publicKey)
X-Session-Id: my-custom-id (from header)
X-Session-Id: anon_hash... (anonymous)
```

## 📊 Performance Tiers

| Mode | Speed | Caching | Use Case |
|------|-------|---------|----------|
| **Standard** | Baseline | No | Highest quality, full workflow |
| **Fast** | 50% faster | No | Skip strategy planning (SearchAgent only) |
| **Express** | 99% faster | Yes | Repeated queries, FAQ, documentation |

## 🔍 SearchAgent

```bash
# Standard - Full quality with strategy planning (~80s)
POST /api/agents/search
{
  "userQuery": "Your question here",
  "maxResults": 10
}

# Fast - Skip strategy planning (~45s, 44% faster)
POST /api/agents/search/fast
{
  "userQuery": "Your question here",
  "maxResults": 10
}

# Express - With caching (<1ms on cache hit)
POST /api/agents/search/express
{
  "userQuery": "Your question here",
  "maxResults": 10
}
```

## 💻 CodeGenerator

```bash
# Standard - Generate code (~10-20s)
POST /api/agents/code
{
  "prompt": "Create a function that...",
  "context": {
    "language": "javascript",
    "framework": "node"
  }
}

# Express - Cached code generation
POST /api/agents/code/express
{
  "prompt": "Create a function that...",
  "context": {}
}
```

## 🔧 CodeImprover

```bash
# Standard - Improve existing code
POST /api/agents/code/improve
{
  "code": "function add(a,b){return a+b}",
  "context": {
    "modernize": true,
    "addComments": true
  }
}

# Express - Cached improvements
POST /api/agents/code/improve/express
{
  "code": "Your code here",
  "context": {}
}
```

## 🖥️ TerminalAgent

```bash
# Standard - Generate terminal commands
POST /api/agents/terminal
{
  "task": "List all JavaScript files in src folder",
  "context": {
    "os": "linux"
  }
}

# Express - Cached commands
POST /api/agents/terminal/express
{
  "task": "List files in current directory",
  "context": {}
}
```

## 📋 SchemaAgent

```bash
# Generate JSON schemas
POST /api/agents/schema
{
  "userPrompt": "Schema for a blog post",
  "context": {},
  "extraConstraints": "Include timestamps"
}
```

## 🧭 IntelligentRouter

```bash
# Auto-route to best agent
POST /api/router
{
  "userPrompt": "Any request here",
  "context": {}
}
```

## 📊 Cache Management

```bash
# Get cache statistics
GET /api/cache/stats

# Response:
{
  "stats": {
    "size": 42,
    "maxSize": 1000,
    "hits": 127,
    "misses": 45,
    "hitRate": "73.84%",
    "ttl": 300000
  }
}

# Clear cache (admin only)
POST /api/cache/clear?adminKey=YOUR_ADMIN_KEY
```

## 💾 Session Memory Management

```bash
# Get your current session stats
GET /api/session/stats

# Response:
{
  "session": {
    "sessionId": "pk_abc123...",
    "created": "2025-12-06T10:00:00Z",
    "lastAccess": "2025-12-06T10:05:00Z",
    "ageMinutes": 5,
    "idleMinutes": 0,
    "interactions": 12,
    "summaries": 0,
    "totalCount": 12,
    "tokenCount": 1524
  }
}

# Get your conversation history
GET /api/session/history

# Response includes full conversation context
{
  "sessionId": "pk_abc123...",
  "context": [ ... ],  // All interactions
  "stats": { ... }
}

# Clear your session memory
POST /api/session/clear

# Get all sessions (admin only)
GET /api/sessions/all?adminKey=YOUR_ADMIN_KEY
```

## 📈 Response Headers

All optimized endpoints return performance headers:

```
X-Response-Time: 2345ms           # Total request time
X-Cache-Status: HIT | MISS        # Cache hit or miss
X-Cache-Age: 1234ms               # Age of cached response
X-Performance-Mode: express       # Performance tier used
```

## 🎨 Example Usage

### Express Mode (Fastest)

```javascript
// First call - cache miss (~45s)
const response1 = await fetch('http://localhost:3005/api/agents/code/express', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Create a hello world function'
  })
});
// X-Cache-Status: MISS
// X-Response-Time: 45000ms

// Second identical call - cache hit (<1ms!)
const response2 = await fetch('http://localhost:3005/api/agents/code/express', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Create a hello world function'
  })
});
// X-Cache-Status: HIT
// X-Response-Time: <1ms
// 45,000x faster! 🚀
```

### Standard Mode (Highest Quality)

```javascript
const response = await fetch('http://localhost:3005/api/agents/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userQuery: 'Latest developments in quantum computing',
    maxResults: 5
  })
});

const data = await response.json();
// Full strategy planning
// Google search
// Result analysis
// Highest quality output
```

## 🧪 Testing

```bash
# Test all endpoints
node test-all-endpoints.js

# Test performance comparison
node demo-performance.js

# Direct LLM baseline
node test-direct-llm.js
```

## 🔑 Best Practices

### ✅ DO

- Use Express endpoints for FAQ and repeated queries
- Check cache hit rate (target >30%)
- Monitor X-Response-Time headers
- Use Fast mode for real-time applications
- Use Standard mode for complex research

### ❌ DON'T

- Cache time-sensitive queries (weather, stocks, news)
- Use Express mode for unique one-time queries
- Expect cache hits on first call
- Cache sensitive or user-specific data

## 📊 Performance Comparison

| Endpoint | First Call | Cached Call | Speedup |
|----------|-----------|-------------|---------|
| SearchAgent Standard | 80s | N/A | Baseline |
| SearchAgent Fast | 45s | N/A | 1.8x |
| SearchAgent Express | 45s | <1ms | 45,000x |
| CodeGenerator | 10s | <1ms | 10,000x |
| CodeImprover | 15s | <1ms | 15,000x |
| TerminalAgent | 5s | <1ms | 5,000x |

## 🌐 Production Deployment

```nginx
# Nginx configuration
location /api/agents/ {
    proxy_pass http://localhost:3005;
    proxy_read_timeout 180s;
    proxy_connect_timeout 10s;
    
    # Pass performance headers
    proxy_pass_header X-Cache-Status;
    proxy_pass_header X-Response-Time;
}
```

## 🚀 Quick Start

```bash
# Start server
node server.js

# Test express endpoints
curl -X POST http://localhost:3005/api/agents/code/express \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello world function"}'

# Check cache stats
curl http://localhost:3005/api/cache/stats
```

---

**Total Endpoints:** 50+  
**Optimized Agents:** 9 (with express variants)  
**Average Speedup:** 99% (cache hits)  
**Infrastructure Overhead:** <1ms

**The fastest, most elegant AI agent API available today.** ⚡

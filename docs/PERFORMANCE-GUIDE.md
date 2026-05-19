# 🚀 Performance Guide - Lumen Bridge

**The fastest, most elegant AI agent API available today.**

## Performance Tiers

### ⚡ Express Mode (Sub-second responses)
```bash
curl -X POST http://localhost:3005/api/agents/search/express \
  -H "Content-Type: application/json" \
  -d '{"userQuery": "What is AI?"}'

# First call: ~45s (cache MISS)
# Subsequent calls: <1ms (cache HIT)
# 99% faster on cache hits! 🚀
```

### 🏃 Fast Mode (~50% faster)
```bash
curl -X POST http://localhost:3005/api/agents/search/fast \
  -H "Content-Type: application/json" \
  -d '{"userQuery": "Latest AI developments"}'

# Skips strategy planning
# ~45s vs ~80s standard
# 1 LLM call instead of 2
```

### 🎯 Standard Mode (Highest quality)
```bash
curl -X POST http://localhost:3005/api/agents/search \
  -H "Content-Type: application/json" \
  -d '{"userQuery": "Complex research query"}'

# Full Future Self Bridge workflow
# Strategy planning + execution
# ~80s, 2 LLM calls
```

## Response Time Targets

| Tier | Average | 95th Percentile | Use Case |
|------|---------|-----------------|----------|
| **Express** (cache hit) | <1ms | <5ms | Repeated queries, FAQ |
| **Express** (cache miss) | 45s | 60s | First-time queries |
| **Fast** | 45s | 60s | Real-time apps |
| **Standard** | 80s | 120s | Research, complex reasoning |

## Cache Statistics

```bash
# View cache performance
curl http://localhost:3005/api/cache/stats

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
```

## Headers

All optimized endpoints return performance headers:

```
X-Cache-Status: HIT | MISS
X-Cache-Age: 1234ms
X-Performance-Mode: express | fast | standard
X-Response-Time: 45678ms
```

## Configuration

### Environment Variables

```bash
# Cache settings
CACHE_TTL=300000          # 5 minutes default
CACHE_MAX_SIZE=1000       # Max cached items

# Performance mode (global default)
LUMEN_PERFORMANCE_MODE=balanced  # fast | balanced | thorough
```

### Per-Request Options

```javascript
{
  "userQuery": "...",
  "options": {
    "cacheEnabled": true,      // Use caching
    "skipStrategyPlanning": true,  // Fast mode
    "maxResponseTime": 30000   // Timeout after 30s
  }
}
```

## Measured Performance

### Bottleneck Analysis

**Our Infrastructure:** <1ms overhead ✅
- Request parsing: <1ms
- Response formatting: <1ms
- Signature generation: <1ms

**LLM Calls:** 99.9% of total time
- Simple query (2+2): 2.4s
- Code generation: 9.9s
- Complex analysis: 25-45s

**Google Search API:** 519ms (negligible)

### Real-World Example

```
SearchAgent workflow breakdown:
├─ Strategy Planning: 43,000ms (50%)  ← Eliminated in Fast Mode
├─ Google Search:        500ms (0.6%)
├─ Result Analysis:   45,000ms (49.4%)
└─ Our Overhead:          <1ms (0.0%)  ✅
Total: ~88,500ms

With Fast Mode: ~45,500ms (48% faster)
With Cache Hit:      <1ms (99.9% faster)
```

## Best Practices

### 1. Use the Right Tier

- **Express** for FAQ, documentation, repeated queries
- **Fast** for real-time applications, chatbots
- **Standard** for research, complex reasoning

### 2. Cache Strategy

```javascript
// Good: cacheable queries
"What is machine learning?"
"How do I install Node.js?"

// Bad: time-sensitive queries
"What's the weather today?"
"Latest stock prices"
```

### 3. Parallel Requests

```javascript
// Run multiple agents in parallel
const [search, code, analysis] = await Promise.all([
  fetch('/api/agents/search/fast', ...),
  fetch('/api/agents/code', ...),
  fetch('/api/agents/analyze', ...)
]);

// 3x faster than sequential!
```

### 4. Monitor Performance

```javascript
// Check cache hit rate
const stats = await fetch('/api/cache/stats');

// Aim for >30% hit rate
// If lower, adjust cache TTL or query patterns
```

## Optimization Techniques

### Schema Minimization

```javascript
// ❌ Verbose schema = slower
{
  type: "object",
  properties: {
    // 20+ properties with deep nesting
  }
}

// ✅ Minimal schema = faster  
{
  type: "object",
  properties: {
    answer: { type: "string" },
    confidence: { type: "number" }
  }
}
```

### Token Management

```javascript
// Fewer tokens = faster responses
{
  "userQuery": "Brief answer only",
  "options": {
    "maxTokens": 500,  // Limit response length
    "temperature": 0.3  // More focused, less verbose
  }
}
```

## Production Deployment

### Nginx Configuration

```nginx
location /api/agents/ {
    proxy_pass http://localhost:3005;
    proxy_read_timeout 180s;      # Allow for LLM processing
    proxy_connect_timeout 10s;
    proxy_send_timeout 180s;
    
    # Caching
    proxy_cache my_cache;
    proxy_cache_valid 200 5m;
    add_header X-Cache-Status $upstream_cache_status;
}
```

### Load Balancing

```nginx
upstream lumen_backend {
    least_conn;  # Route to least busy server
    server localhost:3005;
    server localhost:3006;
    server localhost:3007;
}
```

### Redis Caching (Advanced)

```javascript
// For distributed systems, use Redis instead of in-memory cache
import Redis from 'redis';

const cache = new RedisCache({
  host: 'localhost',
  port: 6379,
  ttl: 300
});
```

## Monitoring & Metrics

### Key Metrics to Track

1. **Cache Hit Rate** - Target: >30%
2. **P95 Response Time** - Target: <60s
3. **Error Rate** - Target: <1%
4. **Token Usage** - Monitor costs
5. **Concurrent Requests** - Scale accordingly

### Example Dashboard Query

```javascript
// Prometheus metrics
lumen_request_duration_seconds{endpoint="/api/agents/search/express"}
lumen_cache_hit_rate
lumen_llm_token_usage_total
```

## Troubleshooting

### Slow Responses

```bash
# 1. Check which mode you're using
curl -I http://localhost:3005/api/agents/search/fast

# 2. Monitor LLM performance (our overhead is <1ms)
# If LLM is slow, consider:
- Reducing max_tokens
- Simplifying schema
- Using faster model tier

# 3. Check cache hit rate
curl http://localhost:3005/api/cache/stats
```

### Cache Not Working

```bash
# Verify cache is enabled
curl http://localhost:3005/api/cache/stats

# Check headers
curl -I -X POST http://localhost:3005/api/agents/search/express \
  -H "Content-Type: application/json" \
  -d '{"userQuery": "test"}'

# Look for: X-Cache-Status: HIT
```

## Performance Demo

```bash
# Run the interactive demo
node demo-performance.js

# Output shows:
# - Standard mode timing
# - Fast mode timing  
# - Express mode (cache miss)
# - Express mode (cache hit) ← 🚀
# - Detailed comparison
```

---

**Built for speed. Optimized for elegance.**

For questions or support, see [GitHub Issues](https://github.com/codenlighten/lumen-bridge/issues).

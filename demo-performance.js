/**
 * 🚀 Performance Demo - Show the speed improvements
 */

console.log('\n⚡ LUMEN BRIDGE PERFORMANCE DEMONSTRATION\n');
console.log('='.repeat(70));
console.log('\nComparing three performance tiers:\n');
console.log('  1. STANDARD  - Full strategy planning (highest quality)');
console.log('  2. FAST      - Skip strategy planning (50% faster)');
console.log('  3. EXPRESS   - Cached responses (99% faster on cache hit)\n');
console.log('='.repeat(70));

const API_URL = 'http://localhost:3005';
const testQuery = 'What is machine learning?';

async function testEndpoint(name, endpoint, expectCached = false) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userQuery: testQuery, maxResults: 3 })
    });

    const data = await response.json();
    const totalTime = Date.now() - startTime;

    const cacheStatus = response.headers.get('X-Cache-Status') || 'N/A';
    const performanceMode = response.headers.get('X-Performance-Mode') || 'standard';

    console.log(`\n📊 ${name}:`);
    console.log(`   Endpoint: ${endpoint}`);
    console.log(`   Time: ${totalTime}ms`);
    console.log(`   Mode: ${performanceMode}`);
    console.log(`   Cache: ${cacheStatus}`);
    console.log(`   Result: ${data.result?.action || 'success'}`);
    
    if (data.result?._cache) {
      console.log(`   Cache Age: ${data.result._cache.age}ms`);
      console.log(`   Access Count: ${data.result._cache.accessCount}`);
    }

    return { name, time: totalTime, cacheStatus, performanceMode };
  } catch (error) {
    console.error(`\n❌ ${name} failed:`, error.message);
    return { name, time: -1, error: error.message };
  }
}

async function getCacheStats() {
  try {
    const response = await fetch(`${API_URL}/api/cache/stats`);
    const data = await response.json();
    return data.stats;
  } catch (error) {
    return null;
  }
}

async function runDemo() {
  const results = [];

  // Test 1: Standard endpoint
  console.log('\n🔍 Test 1: STANDARD MODE');
  console.log('-'.repeat(70));
  const standard = await testEndpoint('Standard', '/api/agents/search');
  results.push(standard);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Fast endpoint
  console.log('\n\n⚡ Test 2: FAST MODE');
  console.log('-'.repeat(70));
  const fast = await testEndpoint('Fast', '/api/agents/search/fast');
  results.push(fast);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Express endpoint (first call - cache miss)
  console.log('\n\n🚄 Test 3: EXPRESS MODE (Cache Miss)');
  console.log('-'.repeat(70));
  const expressMiss = await testEndpoint('Express (Miss)', '/api/agents/search/express');
  results.push(expressMiss);

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 4: Express endpoint (second call - cache hit!)
  console.log('\n\n💨 Test 4: EXPRESS MODE (Cache Hit)');
  console.log('-'.repeat(70));
  const expressHit = await testEndpoint('Express (Hit)', '/api/agents/search/express', true);
  results.push(expressHit);

  // Summary
  console.log('\n\n' + '='.repeat(70));
  console.log('📈 PERFORMANCE SUMMARY');
  console.log('='.repeat(70));
  console.log('\nResponse Times:');
  
  results.forEach(r => {
    if (r.time > 0) {
      const emoji = r.time < 100 ? '🚀' : r.time < 30000 ? '⚡' : '🐌';
      console.log(`  ${emoji} ${r.name.padEnd(25)} ${r.time.toString().padStart(6)}ms   [${r.cacheStatus}]`);
    }
  });

  if (results[3]?.time > 0 && results[0]?.time > 0) {
    const speedup = Math.round(results[0].time / results[3].time);
    console.log(`\n💡 Cache Hit Speedup: ${speedup}x faster than standard!`);
  }

  // Cache stats
  const cacheStats = await getCacheStats();
  if (cacheStats) {
    console.log('\n📊 Cache Statistics:');
    console.log(`   Size: ${cacheStats.size}/${cacheStats.maxSize} items`);
    console.log(`   Hits: ${cacheStats.hits}`);
    console.log(`   Misses: ${cacheStats.misses}`);
    console.log(`   Hit Rate: ${cacheStats.hitRate}`);
    console.log(`   TTL: ${cacheStats.ttl}ms`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Performance demonstration complete!\n');
}

// Check if server is running
fetch(`${API_URL}/api/cache/stats`)
  .then(() => runDemo())
  .catch(() => {
    console.error('\n❌ Error: Server not running on port 3005');
    console.error('   Please start the server first: node server.js\n');
    process.exit(1);
  });

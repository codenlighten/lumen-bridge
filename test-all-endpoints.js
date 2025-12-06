/**
 * 🧪 Complete Agent Endpoint Test Suite
 * Tests all optimized agents with performance metrics
 */

const API_URL = 'http://localhost:3005';

console.log('\n🧪 LUMEN BRIDGE - Complete Endpoint Test Suite\n');
console.log('='.repeat(70));

const tests = [
  {
    name: 'SearchAgent',
    endpoint: '/api/agents/search',
    body: { userQuery: 'What is AI?' }
  },
  {
    name: 'SearchAgent (Fast)',
    endpoint: '/api/agents/search/fast',
    body: { userQuery: 'What is AI?' }
  },
  {
    name: 'SearchAgent (Express)',
    endpoint: '/api/agents/search/express',
    body: { userQuery: 'What is AI?' }
  },
  {
    name: 'TerminalAgent',
    endpoint: '/api/agents/terminal',
    body: { task: 'List files in current directory' }
  },
  {
    name: 'TerminalAgent (Express)',
    endpoint: '/api/agents/terminal/express',
    body: { task: 'List files in current directory' }
  },
  {
    name: 'CodeGenerator',
    endpoint: '/api/agents/code',
    body: { prompt: 'Create a function that adds two numbers' }
  },
  {
    name: 'CodeGenerator (Express)',
    endpoint: '/api/agents/code/express',
    body: { prompt: 'Create a function that adds two numbers' }
  },
  {
    name: 'CodeImprover',
    endpoint: '/api/agents/code/improve',
    body: { code: 'function add(a,b){return a+b}' }
  },
  {
    name: 'CodeImprover (Express)',
    endpoint: '/api/agents/code/improve/express',
    body: { code: 'function add(a,b){return a+b}' }
  }
];

async function testEndpoint(test) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_URL}${test.endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(test.body)
    });

    const data = await response.json();
    const totalTime = Date.now() - startTime;

    const cacheStatus = response.headers.get('X-Cache-Status') || 'N/A';
    const responseTime = response.headers.get('X-Response-Time') || `${totalTime}ms`;
    const perfMode = response.headers.get('X-Performance-Mode') || 'standard';

    const emoji = totalTime < 100 ? '🚀' : totalTime < 5000 ? '⚡' : totalTime < 30000 ? '✅' : '⏱️';
    
    console.log(`${emoji} ${test.name.padEnd(30)} ${totalTime.toString().padStart(6)}ms   [${cacheStatus}]`);

    return { 
      name: test.name, 
      time: totalTime, 
      cacheStatus,
      perfMode,
      success: data.success 
    };
  } catch (error) {
    console.error(`❌ ${test.name.padEnd(30)} FAILED: ${error.message}`);
    return { name: test.name, time: -1, error: error.message };
  }
}

async function runTests() {
  console.log('\n📊 Testing All Endpoints:\n');
  
  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test);
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test cache hits by running express endpoints again
  console.log('\n💨 Testing Cache Hits (Second Run):\n');
  
  const expressTests = tests.filter(t => t.name.includes('Express'));
  for (const test of expressTests) {
    const result = await testEndpoint(test);
    results.push({ ...result, name: result.name + ' (2nd)' });
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📈 SUMMARY\n');

  const successful = results.filter(r => r.time > 0);
  const avgTime = successful.reduce((sum, r) => sum + r.time, 0) / successful.length;
  const fastest = successful.reduce((min, r) => r.time < min.time ? r : min, successful[0]);
  const slowest = successful.reduce((max, r) => r.time > max.time ? r : max, successful[0]);

  console.log(`Total Tests:     ${results.length}`);
  console.log(`Successful:      ${successful.length}`);
  console.log(`Failed:          ${results.length - successful.length}`);
  console.log(`Average Time:    ${Math.round(avgTime)}ms`);
  console.log(`Fastest:         ${fastest.name} (${fastest.time}ms)`);
  console.log(`Slowest:         ${slowest.name} (${slowest.time}ms)`);

  // Cache performance
  const cacheHits = results.filter(r => r.cacheStatus === 'HIT').length;
  const cacheMisses = results.filter(r => r.cacheStatus === 'MISS').length;
  const total = cacheHits + cacheMisses;
  
  if (total > 0) {
    console.log(`\nCache Hit Rate:  ${cacheHits}/${total} (${Math.round(cacheHits/total*100)}%)`);
  }

  // Get final cache stats
  try {
    const response = await fetch(`${API_URL}/api/cache/stats`);
    const data = await response.json();
    
    console.log('\n📊 Cache Statistics:');
    console.log(`   Size:       ${data.stats.size}/${data.stats.maxSize}`);
    console.log(`   Hits:       ${data.stats.hits}`);
    console.log(`   Misses:     ${data.stats.misses}`);
    console.log(`   Hit Rate:   ${data.stats.hitRate}`);
  } catch (error) {
    // Ignore
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Test Suite Complete\n');
}

// Check if server is running
fetch(`${API_URL}/api/cache/stats`)
  .then(() => runTests())
  .catch(() => {
    console.error('\n❌ Error: Server not running on port 3005');
    console.error('   Please start the server first: node server.js\n');
    process.exit(1);
  });

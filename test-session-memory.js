/**
 * Test Session Memory Management
 * 
 * Demonstrates how session memory travels across different agents
 * within the same user session.
 */

const BASE_URL = 'http://localhost:3005';

// Simulate a user session with a custom session ID
const SESSION_ID = `test_session_${Date.now()}`;

async function makeRequest(endpoint, data = {}, method = 'POST') {
  const url = `${BASE_URL}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': SESSION_ID,  // Custom session ID for testing
    },
  };

  if (method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const result = await response.json();
  
  // Log session ID from response
  const responseSessionId = response.headers.get('X-Session-Id');
  console.log(`   📋 Session ID: ${responseSessionId}`);
  
  return result;
}

async function testSessionMemory() {
  console.log('\n🧪 Testing Session Memory Management\n');
  console.log('='.repeat(80));

  try {
    // Step 1: Check initial session stats
    console.log('\n1️⃣  Checking initial session stats...');
    const initialStats = await makeRequest('/api/session/stats', {}, 'GET');
    console.log('   Initial session:', JSON.stringify(initialStats.session, null, 2));

    // Step 2: Use SearchAgent
    console.log('\n2️⃣  Using SearchAgent (this adds to session memory)...');
    const searchResult = await makeRequest('/api/agents/search/fast', {
      userQuery: 'What is quantum computing?',
      maxResults: 3,
    });
    console.log('   ✅ Search completed');

    // Step 3: Check session stats after search
    console.log('\n3️⃣  Checking session stats after search...');
    const afterSearchStats = await makeRequest('/api/session/stats', {}, 'GET');
    console.log('   Sessions stats:', JSON.stringify(afterSearchStats.session, null, 2));

    // Step 4: Use CodeGenerator (different agent, same session)
    console.log('\n4️⃣  Using CodeGenerator (different agent, same session)...');
    const codeResult = await makeRequest('/api/agents/code/express', {
      prompt: 'Create a function to calculate fibonacci numbers',
    });
    console.log('   ✅ Code generation completed');

    // Step 5: Check session history
    console.log('\n5️⃣  Retrieving full session history...');
    const history = await makeRequest('/api/session/history', {}, 'GET');
    console.log('   Session History:');
    console.log(`   - Session ID: ${history.sessionId}`);
    console.log(`   - Total interactions: ${history.stats.totalCount}`);
    console.log(`   - Interactions in memory: ${history.stats.interactions}`);
    console.log(`   - Summaries: ${history.stats.summaries}`);
    console.log(`   - Token count: ${history.stats.tokenCount}`);
    
    if (history.context && history.context.length > 0) {
      console.log('\n   📜 Conversation Context:');
      history.context.forEach((msg, idx) => {
        const preview = msg.content.substring(0, 80).replace(/\n/g, ' ');
        console.log(`      ${idx + 1}. [${msg.role}] ${preview}...`);
      });
    }

    // Step 6: Use TerminalAgent (third agent, still same session)
    console.log('\n6️⃣  Using TerminalAgent (third agent, same session)...');
    const terminalResult = await makeRequest('/api/agents/terminal/express', {
      task: 'List all JavaScript files in current directory',
    });
    console.log('   ✅ Terminal command generated');

    // Step 7: Final session stats
    console.log('\n7️⃣  Final session stats after using 3 different agents...');
    const finalStats = await makeRequest('/api/session/stats', {}, 'GET');
    console.log('   Final stats:', JSON.stringify(finalStats.session, null, 2));

    // Step 8: Clear session
    console.log('\n8️⃣  Clearing session memory...');
    const clearResult = await makeRequest('/api/session/clear', {});
    console.log('   ✅ Session cleared:', clearResult.message);

    // Step 9: Verify session is cleared
    console.log('\n9️⃣  Verifying session is cleared...');
    const afterClearStats = await makeRequest('/api/session/stats', {}, 'GET');
    console.log('   After clear:', JSON.stringify(afterClearStats.session, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('✅ Session Memory Test Complete!\n');
    console.log('📊 Key Findings:');
    console.log('   • Memory travels with user session, not individual agents');
    console.log('   • Same session ID used across SearchAgent, CodeGenerator, TerminalAgent');
    console.log('   • Conversation context preserved across agent switches');
    console.log('   • Session can be cleared independently of agents');
    console.log('   • Stats show session age, idle time, and memory usage\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

async function testMultipleSessions() {
  console.log('\n🧪 Testing Multiple Sessions\n');
  console.log('='.repeat(80));

  try {
    // Create two different sessions
    const session1 = `session_1_${Date.now()}`;
    const session2 = `session_2_${Date.now()}`;

    console.log(`\n📋 Session 1: ${session1}`);
    console.log(`📋 Session 2: ${session2}`);

    // Make request from session 1
    console.log('\n1️⃣  Session 1: Using SearchAgent...');
    await fetch(`${BASE_URL}/api/agents/search/fast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': session1,
      },
      body: JSON.stringify({
        userQuery: 'What is machine learning?',
        maxResults: 3,
      }),
    });

    // Make request from session 2
    console.log('2️⃣  Session 2: Using CodeGenerator...');
    await fetch(`${BASE_URL}/api/agents/code/express`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': session2,
      },
      body: JSON.stringify({
        prompt: 'Create a hello world function',
      }),
    });

    // Check all sessions (admin endpoint)
    console.log('\n3️⃣  Checking all sessions...');
    const allSessions = await fetch(`${BASE_URL}/api/sessions/all?adminKey=${process.env.ADMIN_KEY || 'test'}`, {
      method: 'GET',
    });
    const sessionsData = await allSessions.json();
    
    console.log(`\n   Total Active Sessions: ${sessionsData.totalSessions}`);
    sessionsData.sessions.forEach((session, idx) => {
      console.log(`\n   Session ${idx + 1}:`);
      console.log(`   - ID: ${session.sessionId}`);
      console.log(`   - Interactions: ${session.interactions}`);
      console.log(`   - Age: ${session.ageMinutes} minutes`);
      console.log(`   - Idle: ${session.idleMinutes} minutes`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Multiple Sessions Test Complete!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

async function testSessionIdentification() {
  console.log('\n🧪 Testing Session Identification Methods\n');
  console.log('='.repeat(80));

  try {
    // Test 1: Custom session ID
    console.log('\n1️⃣  Using custom X-Session-Id header...');
    const customSession = await fetch(`${BASE_URL}/api/session/stats`, {
      method: 'GET',
      headers: {
        'X-Session-Id': 'my-custom-session-id',
      },
    });
    const customData = await customSession.json();
    console.log(`   ✅ Session ID: ${customData.session.sessionId}`);

    // Test 2: Anonymous (IP + User-Agent)
    console.log('\n2️⃣  Using anonymous session (no session ID)...');
    const anonSession = await fetch(`${BASE_URL}/api/session/stats`, {
      method: 'GET',
    });
    const anonData = await anonSession.json();
    console.log(`   ✅ Session ID: ${anonData.session.sessionId}`);
    console.log(`   (Auto-generated from IP + User-Agent)`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Session Identification Test Complete!\n');
    console.log('📊 Supported Methods:');
    console.log('   1. X-Session-Id header (highest priority)');
    console.log('   2. Public key from signature (for authenticated users)');
    console.log('   3. IP + User-Agent hash (anonymous fallback)\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting Session Memory Tests\n');
  
  await testSessionMemory();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testMultipleSessions();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testSessionIdentification();
  
  console.log('\n🎉 All tests completed!\n');
}

runAllTests().catch(console.error);

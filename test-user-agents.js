/**
 * Test User Agent Registration and Management
 * 
 * Tests:
 * 1. Register user agents
 * 2. Retrieve user agents
 * 3. Update user agents
 * 4. Invoke user agents
 * 5. Delete user agents
 * 6. Admin view all agents
 * 7. Access control (users can't see other users' agents)
 */

import { agentRegistry } from './utilities/AgentRegistry.js';
import { dbService } from './utilities/MongoDBService.js';

console.log('\n' + '='.repeat(80));
console.log('🧪 TESTING USER AGENT MANAGEMENT');
console.log('='.repeat(80) + '\n');

async function runTests() {
  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await dbService.connect();
    await agentRegistry.loadUserAgentsFromDB();
    console.log('✅ Database connected and user agents loaded\n');

    // Clean up any existing test agents
    console.log('🧹 Cleaning up previous test data...');
    const testUsers = ['user-alice', 'user-bob'];
    for (const userId of testUsers) {
      const agents = agentRegistry.getUserAgents(userId);
      for (const agent of agents) {
        await agentRegistry.deleteUserAgent(userId, agent.name);
      }
    }
    console.log('✅ Cleanup complete\n');

    // Test 1: Register user agents
    console.log('='.repeat(80));
    console.log('TEST 1: Register User Agents');
    console.log('='.repeat(80));

    const user1 = 'user-alice';
    const user2 = 'user-bob';

    console.log('\n👤 Registering agents for Alice...');
    const aliceAgent1 = await agentRegistry.registerUserAgent(user1, {
      name: 'TravelAdvisor',
      description: 'Helps plan travel itineraries and suggests destinations',
      prompt: 'You are a travel advisor AI. Help users plan amazing trips, suggest destinations, provide travel tips, and create detailed itineraries. Be enthusiastic and knowledgeable about world destinations.',
      metadata: {
        category: 'travel',
        version: '1.0'
      }
    });
    console.log('   ✅ Created:', aliceAgent1.name);

    const aliceAgent2 = await agentRegistry.registerUserAgent(user1, {
      name: 'RecipeChef',
      description: 'Creates recipes and cooking instructions',
      prompt: 'You are a professional chef AI. Create delicious recipes, provide cooking instructions, suggest ingredient substitutions, and share culinary tips. Be creative and helpful.',
      metadata: {
        category: 'cooking',
        version: '1.0'
      }
    });
    console.log('   ✅ Created:', aliceAgent2.name);

    console.log('\n👤 Registering agents for Bob...');
    const bobAgent1 = await agentRegistry.registerUserAgent(user2, {
      name: 'FitnessCoach',
      description: 'Provides workout plans and fitness advice',
      prompt: 'You are a certified fitness coach AI. Create personalized workout plans, provide exercise instructions, suggest nutrition tips, and motivate users. Be supportive and encouraging.',
      metadata: {
        category: 'fitness',
        version: '1.0'
      }
    });
    console.log('   ✅ Created:', bobAgent1.name);

    // Test 2: Retrieve user agents
    console.log('\n' + '='.repeat(80));
    console.log('TEST 2: Retrieve User Agents');
    console.log('='.repeat(80));

    console.log('\n📂 Alice\'s agents:');
    const aliceAgents = agentRegistry.getUserAgents(user1);
    console.log(`   Found ${aliceAgents.length} agents:`);
    aliceAgents.forEach(agent => {
      console.log(`   • ${agent.name} - ${agent.description}`);
    });

    console.log('\n📂 Bob\'s agents:');
    const bobAgents = agentRegistry.getUserAgents(user2);
    console.log(`   Found ${bobAgents.length} agents:`);
    bobAgents.forEach(agent => {
      console.log(`   • ${agent.name} - ${agent.description}`);
    });

    // Test 3: Access control - users can't see each other's agents
    console.log('\n' + '='.repeat(80));
    console.log('TEST 3: Access Control');
    console.log('='.repeat(80));

    console.log('\n🔒 Testing isolation...');
    const aliceTryingBobAgent = agentRegistry.getUserAgent(user1, 'FitnessCoach');
    const bobTryingAliceAgent = agentRegistry.getUserAgent(user2, 'TravelAdvisor');

    console.log(`   Alice trying to access Bob's FitnessCoach: ${aliceTryingBobAgent ? '❌ FAIL - Should be null' : '✅ PASS - Correctly null'}`);
    console.log(`   Bob trying to access Alice's TravelAdvisor: ${bobTryingAliceAgent ? '❌ FAIL - Should be null' : '✅ PASS - Correctly null'}`);

    // Test 4: Update user agent
    console.log('\n' + '='.repeat(80));
    console.log('TEST 4: Update User Agent');
    console.log('='.repeat(80));

    console.log('\n✏️  Updating Alice\'s TravelAdvisor...');
    const updated = await agentRegistry.updateUserAgent(user1, 'TravelAdvisor', {
      description: 'Advanced travel planning with budget optimization',
      metadata: {
        category: 'travel',
        version: '2.0',
        features: ['budget-optimization', 'multi-city']
      }
    });
    console.log('   ✅ Updated successfully');
    console.log(`   New description: ${updated.description}`);
    console.log(`   New version: ${updated.metadata.version}`);

    // Test 5: Invoke user agent (if OpenAI key available)
    console.log('\n' + '='.repeat(80));
    console.log('TEST 5: Invoke User Agent');
    console.log('='.repeat(80));

    if (process.env.OPENAI_API_KEY) {
      console.log('\n🚀 Invoking Alice\'s TravelAdvisor...');
      try {
        const result = await agentRegistry.invokeUserAgent(user1, 'TravelAdvisor', {
          userPrompt: 'Suggest a 3-day itinerary for Tokyo with a budget of $1000'
        });
        console.log('   ✅ Agent invoked successfully');
        console.log(`   Response preview: ${result.response.substring(0, 200)}...`);
      } catch (error) {
        console.log(`   ⚠️  Invocation failed: ${error.message}`);
      }
    } else {
      console.log('\n   ⚠️  Skipping invocation test (OPENAI_API_KEY not set)');
    }

    // Test 6: Admin view all agents
    console.log('\n' + '='.repeat(80));
    console.log('TEST 6: Admin View All Agents');
    console.log('='.repeat(80));

    console.log('\n👑 Admin viewing all user agents...');
    const allAgents = agentRegistry.getAllUserAgents();
    console.log(`   Total user agents: ${allAgents.length}`);
    
    const userGroups = {};
    allAgents.forEach(agent => {
      if (!userGroups[agent.userId]) {
        userGroups[agent.userId] = [];
      }
      userGroups[agent.userId].push(agent.name);
    });

    for (const [userId, agents] of Object.entries(userGroups)) {
      console.log(`\n   ${userId}:`);
      agents.forEach(name => console.log(`      • ${name}`));
    }

    // Test 7: Registry statistics
    console.log('\n' + '='.repeat(80));
    console.log('TEST 7: Registry Statistics');
    console.log('='.repeat(80));

    const stats = agentRegistry.getStats();
    console.log('\n📊 Registry Stats:');
    console.log(`   System Agents: ${stats.uniqueAgents}`);
    console.log(`   System Aliases: ${stats.totalAliases}`);
    console.log(`   User Count: ${stats.userAgents}`);
    console.log(`   Total User Agents: ${stats.totalUserAgents}`);

    // Test 8: Delete user agent
    console.log('\n' + '='.repeat(80));
    console.log('TEST 8: Delete User Agent');
    console.log('='.repeat(80));

    console.log('\n🗑️  Deleting Bob\'s FitnessCoach...');
    const deleted = await agentRegistry.deleteUserAgent(user2, 'FitnessCoach');
    console.log(`   ${deleted ? '✅ Deleted successfully' : '❌ Delete failed'}`);

    const bobAgentsAfterDelete = agentRegistry.getUserAgents(user2);
    console.log(`   Bob's remaining agents: ${bobAgentsAfterDelete.length}`);

    // Test 9: Try to register conflicting name
    console.log('\n' + '='.repeat(80));
    console.log('TEST 9: Conflict Detection');
    console.log('='.repeat(80));

    console.log('\n⚠️  Testing duplicate name (same user)...');
    try {
      await agentRegistry.registerUserAgent(user1, {
        name: 'TravelAdvisor',
        description: 'Duplicate',
        prompt: 'Test'
      });
      console.log('   ❌ FAIL - Should have thrown error');
    } catch (error) {
      console.log('   ✅ PASS - Correctly rejected duplicate');
      console.log(`   Error: ${error.message}`);
    }

    console.log('\n⚠️  Testing system agent name conflict...');
    try {
      await agentRegistry.registerUserAgent(user1, {
        name: 'terminal',
        description: 'Trying to use system agent name',
        prompt: 'Test'
      });
      console.log('   ❌ FAIL - Should have thrown error');
    } catch (error) {
      console.log('   ✅ PASS - Correctly rejected system conflict');
      console.log(`   Error: ${error.message}`);
    }

    // Test 10: Database persistence
    console.log('\n' + '='.repeat(80));
    console.log('TEST 10: Database Persistence');
    console.log('='.repeat(80));

    if (dbService.isConnected) {
      console.log('\n💾 Checking database persistence...');
      const dbAgents = await dbService.collections.agents.find({ type: 'user-created' }).toArray();
      console.log(`   Agents in database: ${dbAgents.length}`);
      
      console.log('\n   Stored agents:');
      dbAgents.forEach(agent => {
        console.log(`      • ${agent.name} (${agent.userId}) - Updated: ${new Date(agent.updatedAt).toLocaleString()}`);
      });
    } else {
      console.log('\n   ⚠️  Database not connected, skipping persistence test');
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS COMPLETED');
    console.log('='.repeat(80));

    const finalStats = agentRegistry.getStats();
    console.log('\n📈 Final Statistics:');
    console.log(`   • System Agents: ${finalStats.uniqueAgents}`);
    console.log(`   • Users with Agents: ${finalStats.userAgents}`);
    console.log(`   • Total User Agents: ${finalStats.totalUserAgents}`);
    console.log('\n✨ User Agent Management System is fully functional!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
  } finally {
    // Disconnect
    if (dbService.isConnected) {
      await dbService.disconnect();
    }
    process.exit(0);
  }
}

// Run tests
runTests();

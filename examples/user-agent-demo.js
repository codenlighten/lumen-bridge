/**
 * User Agent Management Demo
 * 
 * Demonstrates how to:
 * 1. Register custom user agents
 * 2. Retrieve your agents
 * 3. Invoke user agents
 * 4. Update agent configuration
 * 5. Delete agents
 */

const API_BASE = process.env.API_URL || 'http://localhost:3000';

/**
 * Helper function to make API calls
 */
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  return await response.json();
}

async function demo() {
  console.log('\n' + '='.repeat(80));
  console.log('🎭 USER AGENT MANAGEMENT DEMO');
  console.log('='.repeat(80) + '\n');

  const userId = 'demo-user-123';

  // Step 1: Register a Travel Advisor agent
  console.log('📝 Step 1: Register TravelAdvisor agent...\n');
  
  const travelAgent = await apiCall('/api/agents/register', 'POST', {
    userId,
    name: 'TravelAdvisor',
    description: 'Expert travel planning and itinerary creation',
    prompt: `You are an expert travel advisor with 20+ years of experience.
    
Your expertise includes:
- Budget-optimized travel planning
- Multi-city itinerary creation
- Cultural insights and local recommendations
- Safety and health considerations
- Visa and documentation requirements

Always provide:
1. Detailed day-by-day itineraries
2. Cost breakdowns with budget alternatives
3. Cultural tips and etiquette
4. Local hidden gems
5. Practical travel advice

Be enthusiastic, knowledgeable, and personalized in your recommendations.`,
    metadata: {
      category: 'travel',
      version: '1.0',
      specialties: ['budget-travel', 'cultural-tourism', 'adventure']
    }
  });

  console.log('✅ Agent registered:', travelAgent.agent.name);
  console.log(`   Description: ${travelAgent.agent.description}`);
  console.log(`   Created: ${new Date(travelAgent.agent.createdAt).toLocaleString()}\n`);

  // Step 2: Register a Fitness Coach agent
  console.log('📝 Step 2: Register FitnessCoach agent...\n');
  
  const fitnessAgent = await apiCall('/api/agents/register', 'POST', {
    userId,
    name: 'FitnessCoach',
    description: 'Personalized fitness and nutrition guidance',
    prompt: `You are a certified fitness coach and nutritionist.
    
Your expertise includes:
- Personalized workout plan creation
- Nutrition and meal planning
- Injury prevention and recovery
- Motivation and accountability
- Progress tracking strategies

Always provide:
1. Clear, detailed exercise instructions
2. Progressive difficulty levels
3. Safety warnings and form tips
4. Nutrition recommendations
5. Motivation and encouragement

Be supportive, knowledgeable, and adaptive to individual needs.`,
    metadata: {
      category: 'fitness',
      version: '1.0',
      certifications: ['CPT', 'Nutrition Specialist']
    }
  });

  console.log('✅ Agent registered:', fitnessAgent.agent.name);
  console.log(`   Description: ${fitnessAgent.agent.description}\n`);

  // Step 3: Get all my agents
  console.log('📂 Step 3: Retrieve all my agents...\n');
  
  const myAgents = await apiCall(`/api/agents/my-agents/${userId}`);
  
  console.log(`Found ${myAgents.count} agents:`);
  myAgents.agents.forEach((agent, i) => {
    console.log(`\n${i + 1}. ${agent.name}`);
    console.log(`   ${agent.description}`);
    console.log(`   Category: ${agent.metadata.category}`);
    console.log(`   Created: ${new Date(agent.createdAt).toLocaleString()}`);
  });

  // Step 4: Invoke the TravelAdvisor
  console.log('\n' + '='.repeat(80));
  console.log('🚀 Step 4: Invoke TravelAdvisor agent...\n');
  
  const travelQuery = {
    userId,
    agentName: 'TravelAdvisor',
    context: {
      userPrompt: 'I want to visit Japan for 7 days with a budget of $2000. Suggest an itinerary covering Tokyo and Kyoto.'
    }
  };

  console.log('Query:', travelQuery.context.userPrompt);
  console.log('\nCalling agent...\n');

  const travelResult = await apiCall('/api/agents/invoke-user-agent', 'POST', travelQuery);
  
  console.log('✅ Response received:');
  console.log('─'.repeat(80));
  console.log(travelResult.result.response);
  console.log('─'.repeat(80));

  // Step 5: Invoke the FitnessCoach
  console.log('\n🚀 Step 5: Invoke FitnessCoach agent...\n');
  
  const fitnessQuery = {
    userId,
    agentName: 'FitnessCoach',
    context: {
      userPrompt: 'Create a 4-week beginner workout plan for someone who wants to build muscle. I can work out 4 days per week.'
    }
  };

  console.log('Query:', fitnessQuery.context.userPrompt);
  console.log('\nCalling agent...\n');

  const fitnessResult = await apiCall('/api/agents/invoke-user-agent', 'POST', fitnessQuery);
  
  console.log('✅ Response received:');
  console.log('─'.repeat(80));
  // Show first 500 chars
  const preview = fitnessResult.result.response.substring(0, 500);
  console.log(preview + '...\n');
  console.log('[Full response truncated for demo]');
  console.log('─'.repeat(80));

  // Step 6: Update an agent
  console.log('\n✏️  Step 6: Update TravelAdvisor...\n');
  
  const updateResult = await apiCall('/api/agents/update', 'PUT', {
    userId,
    agentName: 'TravelAdvisor',
    updates: {
      description: 'Expert travel planning with focus on sustainable and eco-friendly tourism',
      metadata: {
        category: 'travel',
        version: '2.0',
        specialties: ['eco-tourism', 'sustainable-travel', 'cultural-immersion'],
        updated: new Date().toISOString()
      }
    }
  });

  console.log('✅ Agent updated');
  console.log(`   New description: ${updateResult.agent.description}`);
  console.log(`   New version: ${updateResult.agent.metadata.version}`);

  // Step 7: Get updated agent
  console.log('\n📂 Step 7: Verify update...\n');
  
  const updatedAgent = await apiCall(`/api/agents/my-agents/${userId}/TravelAdvisor`);
  
  console.log('Updated agent details:');
  console.log(`   Name: ${updatedAgent.agent.name}`);
  console.log(`   Description: ${updatedAgent.agent.description}`);
  console.log(`   Version: ${updatedAgent.agent.metadata.version}`);
  console.log(`   Specialties: ${updatedAgent.agent.metadata.specialties.join(', ')}`);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ DEMO COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(80));
  console.log('\n📊 Summary:');
  console.log(`   • Registered: 2 agents`);
  console.log(`   • Invoked: 2 agents`);
  console.log(`   • Updated: 1 agent`);
  console.log(`   • User: ${userId}`);
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Create more specialized agents for your needs');
  console.log('   2. Build workflows that chain multiple agents');
  console.log('   3. Integrate with your own applications');
  console.log('   4. Experiment with different prompts and configurations');
  
  console.log('\n📖 Documentation: USER-AGENTS.md');
  console.log('\n');
}

// Run demo
demo().catch(console.error);

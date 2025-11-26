/**
 * Example: Using a Generated Agent from MongoDB
 * 
 * This demonstrates how to:
 * 1. Load a generated agent from MongoDB Atlas
 * 2. Dynamically instantiate it
 * 3. Execute it with test input
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function useGeneratedAgent() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas\n');
    
    const db = client.db(process.env.DB_NAME);
    
    // 1. Find the ReactAppCreatorAgent
    const agent = await db.collection('generated_agents').findOne({
      name: 'ReactAppCreatorAgent'
    });
    
    if (!agent) {
      console.error('❌ Agent not found');
      return;
    }
    
    console.log(`📦 Loaded Agent: ${agent.name}`);
    console.log(`   Purpose: ${agent.purpose}`);
    console.log(`   Address: ${agent.address}`);
    console.log(`   Code: ${agent.code.length} characters\n`);
    
    // 2. Display the input schema
    console.log('📋 Input Schema:');
    console.log(JSON.stringify(agent.schemas.inputSchema, null, 2));
    console.log('\n');
    
    // 3. Display the generated code
    console.log('💻 Generated Code:');
    console.log('─'.repeat(80));
    console.log(agent.code);
    console.log('─'.repeat(80));
    console.log('\n');
    
    // 4. Show test case
    console.log('🧪 Test Case from Phase 6 (Handshake):');
    console.log('Input:', JSON.stringify(agent.testResult.testCase.testInput, null, 2));
    console.log('\nExpected Output:', JSON.stringify(agent.testResult.testCase.expectedOutput, null, 2));
    console.log('\n');
    
    // 5. Instructions for using the agent
    console.log('📖 How to Use This Agent:');
    console.log('─'.repeat(80));
    console.log(`
1. Save the generated code to a file:
   ${agent.name}.js

2. Install dependencies:
   npm install

3. Import and use:
   import { ${agent.name} } from './${agent.name}.js';
   
   const agent = new ${agent.name}();
   const result = await agent.process({
     appName: "my-awesome-app",
     appVersion: "1.0.0",
     useTypeScript: true,
     additionalLibraries: ["react-router-dom", "axios"]
   });
   
4. Or use via API:
   POST http://localhost:3000/api/meta/agents/${agent._id}/invoke
   
   Body:
   {
     "input": {
       "appName": "my-awesome-app",
       "appVersion": "1.0.0",
       "useTypeScript": true,
       "additionalLibraries": ["react-router-dom"]
     }
   }
`);
    console.log('─'.repeat(80));
    
    // 6. Show all available generated agents
    const allAgents = await db.collection('generated_agents').find({}).toArray();
    console.log(`\n📚 All Generated Agents (${allAgents.length}):`);
    allAgents.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.name}`);
      console.log(`      Purpose: ${a.purpose}`);
      console.log(`      Inputs: ${a.inputs.join(', ')}`);
      console.log(`      Outputs: ${a.outputs.join(', ')}`);
      console.log(`      Created: ${new Date(a.createdAt).toLocaleString()}\n`);
    });
    
  } finally {
    await client.close();
  }
}

// Run the example
useGeneratedAgent().catch(console.error);

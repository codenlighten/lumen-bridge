/**
 * Test invoking a generated agent via API
 */

const testInput = {
  appName: "my-awesome-app",
  appVersion: "2.5.1",
  useTypeScript: true,
  additionalLibraries: ["react-router-dom", "axios", "styled-components"]
};

async function invokeAgent() {
  try {
    const response = await fetch('http://localhost:3000/api/meta/agents/ReactAppCreatorAgent/invoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: testInput })
    });

    const result = await response.json();
    
    console.log('🚀 Agent Invocation Result:');
    console.log('═'.repeat(80));
    console.log(JSON.stringify(result, null, 2));
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

invokeAgent();

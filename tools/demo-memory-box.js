#!/usr/bin/env node

/**
 * Memory Box Live Demo
 * Demonstrates conversation memory management capabilities
 */

import MemoryBox from '../boxes/Memory.box.js';

console.log('🧠 MEMORY BOX LIVE DEMONSTRATION');
console.log('═══════════════════════════════════════════════════════════════\n');

// Demo configuration
const demoConfig = {
  ownerName: 'demo-user',
  memoryDir: './demo-memory',
  maxInteractions: 8,  // Small for demo
  tokenLimit: 10000
};

/**
 * Simulate a realistic conversation
 */
async function demoConversation() {
  console.log('🎬 SCENARIO: AI Assistant helping with Python development\n');
  
  // Initialize memory
  console.log('1️⃣ INITIALIZING MEMORY SYSTEM...');
  let result = await MemoryBox.execute({
    action: 'initialize',
    ...demoConfig
  });
  console.log(`   ✅ Initialized: ${result.stats.ownerName} (${result.stats.interactions} interactions)\n`);

  // Conversation sequence
  const conversation = [
    { role: 'user', text: 'Hi! I need help with Python. Can you help me create a REST API?' },
    { role: 'assistant', text: 'Absolutely! I\'d be happy to help you create a REST API in Python. Are you looking to use Flask, FastAPI, or another framework?' },
    { role: 'user', text: 'I think FastAPI would be good. I want to build an API for a task management system.' },
    { role: 'assistant', text: 'Great choice! FastAPI is excellent for modern APIs. Let me help you set up a task management API with CRUD operations. We\'ll need models for tasks, users, and authentication.' },
    { role: 'user', text: 'That sounds perfect. Can you show me how to create the task model first?' },
    { role: 'assistant', text: 'Here\'s a basic Task model using Pydantic:\n\n```python\nfrom pydantic import BaseModel\nfrom datetime import datetime\nfrom typing import Optional\n\nclass Task(BaseModel):\n    id: Optional[int]\n    title: str\n    description: Optional[str]\n    completed: bool = False\n    created_at: datetime\n    due_date: Optional[datetime]\n```' },
    { role: 'user', text: 'Perfect! Now how do I create the database connection and CRUD operations?' },
    { role: 'assistant', text: 'For the database, I recommend SQLAlchemy with SQLite for development. Here\'s how to set up the database models and CRUD operations...' },
    { role: 'user', text: 'This is getting complex. Can you remind me what we covered so far?' }
  ];

  // Add conversations with progress tracking
  for (let i = 0; i < conversation.length; i++) {
    const msg = conversation[i];
    console.log(`${i + 2}️⃣ ADDING ${msg.role.toUpperCase()} MESSAGE (${msg.text.length} chars)...`);
    
    result = await MemoryBox.execute({
      action: 'addInteraction',
      role: msg.role,
      text: msg.text,
      ...demoConfig
    });
    
    console.log(`   ✅ Added: ${result.stats.interactions} total interactions, ${result.stats.tokenCount} tokens\n`);
    
    // Show compression when we hit the limit
    if (result.stats.interactions >= demoConfig.maxInteractions && i < conversation.length - 1) {
      console.log('⚡ MEMORY LIMIT REACHED - TRIGGERING COMPRESSION...');
      result = await MemoryBox.execute({
        action: 'compress',
        ...demoConfig
      });
      console.log(`   🔄 Compressed: ${result.stats.summaries} summaries, ${result.stats.interactions} recent interactions\n`);
    }
  }

  return result;
}

/**
 * Demonstrate memory retrieval and search
 */
async function demoMemoryRetrieval() {
  console.log('🔍 MEMORY RETRIEVAL DEMONSTRATION\n');
  
  // Get current memory stats
  console.log('1️⃣ GETTING MEMORY STATISTICS...');
  let result = await MemoryBox.execute({
    action: 'getStats',
    ...demoConfig
  });
  
  console.log(`   📊 Stats: ${result.stats.interactions} interactions, ${result.stats.summaries} summaries`);
  console.log(`   💾 Storage: ${result.stats.tokenCount} tokens, Owner: ${result.stats.ownerName}\n`);
  
  // Get conversation context
  console.log('2️⃣ RETRIEVING CONVERSATION CONTEXT...');
  result = await MemoryBox.execute({
    action: 'getContext',
    ...demoConfig
  });
  
  console.log(`   📝 Context: ${result.result.length} messages retrieved`);
  console.log('   💭 Recent conversation:');
  result.result.slice(-3).forEach((msg, i) => {
    const preview = msg.content.length > 60 ? msg.content.substring(0, 60) + '...' : msg.content;
    console.log(`      ${msg.role}: ${preview}`);
  });
  console.log();
  
  // Search memory
  console.log('3️⃣ SEARCHING MEMORY FOR SPECIFIC TOPICS...');
  
  const searches = [
    { query: 'FastAPI', description: 'Framework mentions' },
    { query: 'Python task model', description: 'Model development' },
    { query: 'database', description: 'Database setup' }
  ];
  
  for (const search of searches) {
    try {
      result = await MemoryBox.execute({
        action: 'searchMemory',
        query: search.query,
        limit: 2,
        ...demoConfig
      });
      
      if (result.success && result.result) {
        console.log(`   🔎 "${search.query}" (${search.description}): ${result.result.length} matches`);
        if (result.result.length > 0) {
          const firstMatch = result.result[0];
          const preview = firstMatch.content && firstMatch.content.length > 80 
            ? firstMatch.content.substring(0, 80) + '...' 
            : (firstMatch.content || 'No content');
          console.log(`      └─ ${firstMatch.type}: ${preview}`);
        }
      } else {
        console.log(`   ❌ Search failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ❌ Search error for "${search.query}": ${error.message}`);
    }
  }
  console.log();
}

/**
 * Show memory reflection capabilities
 */
async function demoReflection() {
  console.log('🪞 MEMORY BOX REFLECTION CAPABILITIES\n');
  
  const reflection = MemoryBox.reflect();
  
  console.log(`📦 Box Type: ${reflection.boxType}`);
  console.log(`🎯 Function: ${reflection.primaryFunction}`);
  console.log(`🔧 Capabilities: ${reflection.keyCapabilities.join(', ')}`);
  console.log(`💾 Memory Features: ${reflection.memoryFeatures.join(', ')}`);
  console.log(`⚡ Supported Actions: ${reflection.supportedActions.join(', ')}\n`);
}

/**
 * Run complete demonstration
 */
async function runDemo() {
  try {
    // Clean up any existing demo memory
    await import('fs/promises').then(fs => 
      fs.rmdir('./demo-memory', { recursive: true }).catch(() => {})
    );
    
    await demoConversation();
    await demoMemoryRetrieval();
    await demoReflection();
    
    console.log('✨ DEMONSTRATION COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎉 Memory Box successfully demonstrated:');
    console.log('   ✅ Conversation tracking with automatic compression');
    console.log('   ✅ Intelligent memory search and retrieval');
    console.log('   ✅ Statistics and context management'); 
    console.log('   ✅ Box reflection and introspection');
    console.log('   ✅ Persistent storage with owner isolation');
    
    // Clean up demo files
    await import('fs/promises').then(fs => 
      fs.rmdir('./demo-memory', { recursive: true }).catch(() => {})
    );
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error(error.stack);
  }
}

// Run demonstration
runDemo();
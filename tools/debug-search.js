#!/usr/bin/env node

/**
 * Debug Memory Box Search
 */

import MemoryBox from '../boxes/Memory.box.js';

async function debugSearch() {
  // Initialize
  console.log('🔧 Debug: Initializing memory...');
  let result = await MemoryBox.execute({
    action: 'initialize',
    ownerName: 'debug-user',
    memoryDir: './debug-memory'
  });
  console.log('Init result:', JSON.stringify(result, null, 2));

  // Add some content
  console.log('\n🔧 Debug: Adding test content...');
  result = await MemoryBox.execute({
    action: 'addInteraction',
    role: 'user',
    text: 'Testing FastAPI with Python development',
    ownerName: 'debug-user',
    memoryDir: './debug-memory'
  });
  console.log('Add result:', JSON.stringify(result, null, 2));

  // Test search
  console.log('\n🔧 Debug: Testing search...');
  result = await MemoryBox.execute({
    action: 'searchMemory',
    query: 'FastAPI',
    limit: 5,
    ownerName: 'debug-user',
    memoryDir: './debug-memory'
  });
  console.log('Search result:', JSON.stringify(result, null, 2));

  // Clean up
  await import('fs/promises').then(fs => 
    fs.rmdir('./debug-memory', { recursive: true }).catch(() => {})
  );
}

debugSearch().catch(console.error);
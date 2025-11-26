/**
 * Check MongoDB databases and collections
 * Run: node check-db.js
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;

async function checkDatabases() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    // List all databases
    const adminDb = client.db().admin();
    const dbList = await adminDb.listDatabases();
    
    console.log('📁 Available databases:');
    dbList.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    console.log(`\n🎯 Current DB_NAME from .env: ${process.env.DB_NAME || 'lumenassistant'}`);
    
    // Check both possible databases
    const dbNames = ['lumencode', 'lumenassistant', 'lumenassistant3'];
    
    for (const dbName of dbNames) {
      console.log(`\n📊 Checking database: ${dbName}`);
      const db = client.db(dbName);
      
      try {
        const collections = await db.listCollections().toArray();
        
        if (collections.length === 0) {
          console.log('   No collections found.');
          continue;
        }
        
        console.log(`   Collections (${collections.length}):`);
        
        for (const coll of collections) {
          const collection = db.collection(coll.name);
          const count = await collection.countDocuments();
          console.log(`   - ${coll.name}: ${count} documents`);
          
          // Show sample if it's a user-related collection
          if (coll.name.includes('user') || coll.name.includes('pending')) {
            const sample = await collection.findOne({});
            if (sample) {
              console.log(`     Sample: ${JSON.stringify(sample, null, 2).substring(0, 200)}...`);
            }
          }
        }
      } catch (err) {
        console.log(`   Error accessing database: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkDatabases();

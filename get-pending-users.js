/**
 * Get pending verification tokens from MongoDB
 * Run: node get-pending-users.js
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'lumenassistant';

async function getPendingUsers() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(dbName);
    const pendingUsers = db.collection('pending_users');
    
    const users = await pendingUsers.find({}).toArray();
    
    if (users.length === 0) {
      console.log('No pending users found.');
      return;
    }
    
    console.log(`📋 Found ${users.length} pending user(s):\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Public Key: ${user.publicKey}`);
      console.log(`   Token: ${user.verificationToken}`);
      console.log(`   Expires: ${user.tokenExpiry}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`\n   🔗 Verification URL:`);
      console.log(`   ${process.env.BASE_URL || 'http://localhost:3000'}/api/users/verify?token=${user.verificationToken}`);
      console.log(`\n   Or use query params:`);
      console.log(`   email=${encodeURIComponent(user.email)}&token=${user.verificationToken}`);
      console.log('\n---\n');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

getPendingUsers();

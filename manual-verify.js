/**
 * Manually verify a pending user
 * Run: node manual-verify.js <email>
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = 'lumenassistant3'; // Production DB

async function manualVerify(email) {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(dbName);
    const pendingUsers = db.collection('pending_users');
    const verifiedUsers = db.collection('verified_users');
    
    // Find pending user
    const pendingUser = await pendingUsers.findOne({ email });
    
    if (!pendingUser) {
      console.log(`❌ No pending user found with email: ${email}`);
      console.log('\n📋 Checking verified users...');
      
      const verifiedUser = await verifiedUsers.findOne({ email });
      if (verifiedUser) {
        console.log('✅ User already verified!');
        console.log(`   Email: ${verifiedUser.email}`);
        console.log(`   Public Key: ${verifiedUser.publicKey}`);
        console.log(`   Tier: ${verifiedUser.tier}`);
        console.log(`   Verified At: ${verifiedUser.verifiedAt}`);
      } else {
        console.log('❌ User not found in verified users either.');
        console.log('   User needs to register first.');
      }
      return;
    }
    
    console.log('📧 Found pending user:');
    console.log(`   Email: ${pendingUser.email}`);
    console.log(`   Public Key: ${pendingUser.publicKey}`);
    console.log(`   Created: ${pendingUser.createdAt}`);
    console.log(`   Token Expires: ${pendingUser.tokenExpiry}\n`);
    
    // Move to verified users
    const verifiedUser = {
      email: pendingUser.email,
      publicKey: pendingUser.publicKey,
      passwordHash: pendingUser.passwordHash,
      tier: pendingUser.tier || 'free',
      requestCount: 0,
      monthlyLimit: pendingUser.monthlyLimit || 100,
      resetDate: pendingUser.resetDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
      verifiedAt: new Date(),
      createdAt: pendingUser.createdAt,
      manuallyVerified: true
    };
    
    // Insert into verified users
    await verifiedUsers.insertOne(verifiedUser);
    console.log('✅ User moved to verified_users\n');
    
    // Remove from pending
    await pendingUsers.deleteOne({ email });
    console.log('✅ User removed from pending_users\n');
    
    console.log('🎉 User manually verified successfully!');
    console.log('\n📊 User Details:');
    console.log(`   Email: ${verifiedUser.email}`);
    console.log(`   Public Key: ${verifiedUser.publicKey}`);
    console.log(`   Tier: ${verifiedUser.tier}`);
    console.log(`   Monthly Limit: ${verifiedUser.monthlyLimit} requests`);
    console.log(`   Verified At: ${verifiedUser.verifiedAt}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
  }
}

const email = process.argv[2];

if (!email) {
  console.log('Usage: node manual-verify.js <email>');
  console.log('Example: node manual-verify.js codenlighten1@gmail.com');
  process.exit(1);
}

manualVerify(email);

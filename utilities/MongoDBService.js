import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MongoDB Service for Persistent Agent Storage
 * 
 * Stores:
 * - User relationship profiles
 * - Agent global contexts
 * - Conversation history
 * - Notification settings
 */

class MongoDBService {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
    this.collections = {
      users: null,
      agents: null,
      conversations: null,
      settings: null
    };
  }

  async connect() {
    if (this.isConnected) {
      return;
    }

    const uri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME || 'lumenassistant';

    if (!uri) {
      console.warn('⚠️  MONGODB_URI not found in .env - running in memory-only mode');
      return;
    }

    try {
      this.client = new MongoClient(uri);
      await this.client.connect();
      
      this.db = this.client.db(dbName);
      
      // Initialize collections
      this.collections.users = this.db.collection('users');
      this.collections.agents = this.db.collection('agents');
      this.collections.conversations = this.db.collection('conversations');
      this.collections.settings = this.db.collection('settings');
      
      // Create indexes
      await this.createIndexes();
      
      this.isConnected = true;
      console.log(`✅ Connected to MongoDB: ${dbName}`);
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      console.warn('   Running in memory-only mode');
    }
  }

  async createIndexes() {
    try {
      // User profiles
      await this.collections.users.createIndex({ userId: 1 }, { unique: true });
      await this.collections.users.createIndex({ 'relationship.userId': 1 });
      
      // Agents
      await this.collections.agents.createIndex({ agentId: 1 }, { unique: true });
      await this.collections.agents.createIndex({ userId: 1 });
      await this.collections.agents.createIndex({ type: 1 });
      
      // Conversations
      await this.collections.conversations.createIndex({ userId: 1, timestamp: -1 });
      await this.collections.conversations.createIndex({ agentId: 1, timestamp: -1 });
      
      // Settings
      await this.collections.settings.createIndex({ userId: 1 }, { unique: true });
      
      console.log('   📇 Database indexes created');
    } catch (error) {
      console.warn('   ⚠️  Index creation warning:', error.message);
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  // ==================== AGENT OPERATIONS ====================

  /**
   * Save agent global context to database
   */
  async saveAgent(agentId, agent) {
    if (!this.isConnected) return false;

    try {
      const agentData = {
        agentId,
        userId: agent.userId || null,
        type: agent.constructor.name,
        name: agent.name,
        objective: agent.objective,
        globalContext: agent.globalContext,
        notificationSettings: agent.notificationSettings || null,
        keys: {
          publicKey: agent.keys.publicKey,
          address: agent.keys.address
        },
        updatedAt: new Date(),
        createdAt: new Date()
      };

      await this.collections.agents.updateOne(
        { agentId },
        { $set: agentData, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );

      console.log(`   💾 Agent saved to DB: ${agentId}`);
      return true;
    } catch (error) {
      console.error('   ❌ Failed to save agent:', error.message);
      return false;
    }
  }

  /**
   * Load agent from database
   */
  async loadAgent(agentId) {
    if (!this.isConnected) return null;

    try {
      const agentData = await this.collections.agents.findOne({ agentId });
      
      if (!agentData) {
        return null;
      }

      console.log(`   📂 Agent loaded from DB: ${agentId}`);
      return agentData;
    } catch (error) {
      console.error('   ❌ Failed to load agent:', error.message);
      return null;
    }
  }

  /**
   * Get all agents for a user
   */
  async getUserAgents(userId) {
    if (!this.isConnected) return [];

    try {
      const agents = await this.collections.agents
        .find({ userId })
        .sort({ updatedAt: -1 })
        .toArray();

      return agents;
    } catch (error) {
      console.error('   ❌ Failed to get user agents:', error.message);
      return [];
    }
  }

  /**
   * Delete agent from database
   */
  async deleteAgent(agentId) {
    if (!this.isConnected) return false;

    try {
      const result = await this.collections.agents.deleteOne({ agentId });
      
      if (result.deletedCount > 0) {
        console.log(`   🗑️  Agent deleted from DB: ${agentId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('   ❌ Failed to delete agent:', error.message);
      return false;
    }
  }

  // ==================== USER PROFILE OPERATIONS ====================

  /**
   * Save user profile (relationship data)
   */
  async saveUserProfile(userId, profile) {
    if (!this.isConnected) return false;

    try {
      await this.collections.users.updateOne(
        { userId },
        { 
          $set: { 
            ...profile,
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );

      console.log(`   💾 User profile saved: ${userId}`);
      return true;
    } catch (error) {
      console.error('   ❌ Failed to save user profile:', error.message);
      return false;
    }
  }

  /**
   * Load user profile
   */
  async loadUserProfile(userId) {
    if (!this.isConnected) return null;

    try {
      const profile = await this.collections.users.findOne({ userId });
      
      if (profile) {
        console.log(`   📂 User profile loaded: ${userId}`);
      }
      
      return profile;
    } catch (error) {
      console.error('   ❌ Failed to load user profile:', error.message);
      return null;
    }
  }

  // ==================== CONVERSATION HISTORY ====================

  /**
   * Save conversation message
   */
  async saveConversation(userId, agentId, message, response) {
    if (!this.isConnected) return false;

    try {
      const conversation = {
        userId,
        agentId,
        message,
        response: {
          reply: response.reply,
          includesCode: response.includesCode,
          code: response.code,
          learnings: response.learnings,
          signature: response.signature
        },
        timestamp: new Date()
      };

      await this.collections.conversations.insertOne(conversation);
      return true;
    } catch (error) {
      console.error('   ❌ Failed to save conversation:', error.message);
      return false;
    }
  }

  /**
   * Get conversation history for user
   */
  async getConversationHistory(userId, limit = 50) {
    if (!this.isConnected) return [];

    try {
      const conversations = await this.collections.conversations
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return conversations.reverse(); // Return in chronological order
    } catch (error) {
      console.error('   ❌ Failed to get conversation history:', error.message);
      return [];
    }
  }

  // ==================== NOTIFICATION SETTINGS ====================

  /**
   * Save user notification settings
   */
  async saveSettings(userId, settings) {
    if (!this.isConnected) return false;

    try {
      await this.collections.settings.updateOne(
        { userId },
        { 
          $set: { 
            ...settings,
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );

      console.log(`   💾 Settings saved for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('   ❌ Failed to save settings:', error.message);
      return false;
    }
  }

  /**
   * Load user settings
   */
  async loadSettings(userId) {
    if (!this.isConnected) return null;

    try {
      const settings = await this.collections.settings.findOne({ userId });
      return settings;
    } catch (error) {
      console.error('   ❌ Failed to load settings:', error.message);
      return null;
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Get database statistics
   */
  async getStats() {
    if (!this.isConnected) {
      return { connected: false };
    }

    try {
      const [userCount, agentCount, conversationCount] = await Promise.all([
        this.collections.users.countDocuments(),
        this.collections.agents.countDocuments(),
        this.collections.conversations.countDocuments()
      ]);

      return {
        connected: true,
        users: userCount,
        agents: agentCount,
        conversations: conversationCount
      };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.isConnected) {
      return { healthy: false, message: 'Not connected' };
    }

    try {
      await this.db.admin().ping();
      return { healthy: true, message: 'Connected' };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }

  /**
   * Clear all data (use with caution!)
   */
  async clearAll() {
    if (!this.isConnected) return false;

    try {
      await Promise.all([
        this.collections.users.deleteMany({}),
        this.collections.agents.deleteMany({}),
        this.collections.conversations.deleteMany({}),
        this.collections.settings.deleteMany({})
      ]);

      console.log('   🗑️  All data cleared from database');
      return true;
    } catch (error) {
      console.error('   ❌ Failed to clear data:', error.message);
      return false;
    }
  }
}

// Export singleton instance
export const dbService = new MongoDBService();

export default dbService;

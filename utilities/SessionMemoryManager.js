import { MemoryManager } from "./MemoryManager.js";
import crypto from "crypto";

/**
 * SessionMemoryManager - Manages memory on a per-user-session basis
 * 
 * Instead of each agent having its own memory, memory is tied to the user's session.
 * This allows conversation context to flow seamlessly across different agents.
 * 
 * Key Features:
 * - Session-based memory (not agent-based)
 * - Session identification via publicKey or sessionId
 * - Automatic session cleanup for inactive sessions
 * - Shared memory context across all agents in a session
 */
export class SessionMemoryManager {
  constructor({ 
    maxInteractions = 21, 
    maxSummaries = 3, 
    tokenLimit = 100000,
    persistToFile = true,
    memoryDir = './memory',
    sessionTimeout = 24 * 60 * 60 * 1000, // 24 hours default
  } = {}) {
    this.maxInteractions = maxInteractions;
    this.maxSummaries = maxSummaries;
    this.tokenLimit = tokenLimit;
    this.persistToFile = persistToFile;
    this.memoryDir = memoryDir;
    this.sessionTimeout = sessionTimeout;

    // Map of sessionId -> { memory: MemoryManager, lastAccess: timestamp }
    this.sessions = new Map();

    // Start cleanup interval (every hour)
    this.cleanupInterval = setInterval(() => this._cleanupInactiveSessions(), 60 * 60 * 1000);
    
    console.log(`📋 SessionMemoryManager initialized (timeout: ${sessionTimeout / 1000 / 60} minutes)`);
  }

  /**
   * Get or create a session ID from request
   * Priority: publicKey > x-session-id header > generate new
   */
  getSessionId(req) {
    // Use publicKey as session ID if available (most reliable)
    if (req.verificationResult?.publicKey) {
      return `pk_${req.verificationResult.publicKey.substring(0, 32)}`;
    }

    // Use session ID from header if provided
    if (req.headers['x-session-id']) {
      return req.headers['x-session-id'];
    }

    // Use IP + User-Agent as fallback (less reliable but better than nothing)
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const userAgent = req.headers['user-agent'] || 'unknown';
    const sessionKey = `${ip}_${userAgent}`;
    const hash = crypto.createHash('sha256').update(sessionKey).digest('hex');
    return `anon_${hash.substring(0, 32)}`;
  }

  /**
   * Get memory for a specific session
   * Creates new session if it doesn't exist
   */
  getMemory(sessionId) {
    let session = this.sessions.get(sessionId);

    if (!session) {
      // Create new memory for this session
      const memory = new MemoryManager({
        maxInteractions: this.maxInteractions,
        maxSummaries: this.maxSummaries,
        tokenLimit: this.tokenLimit,
        persistToFile: this.persistToFile,
        memoryDir: this.memoryDir,
        ownerName: sessionId,
      });

      session = {
        memory,
        lastAccess: Date.now(),
        created: Date.now(),
      };

      this.sessions.set(sessionId, session);
      console.log(`   🆕 New session created: ${sessionId.substring(0, 16)}...`);
    } else {
      // Update last access time
      session.lastAccess = Date.now();
    }

    return session.memory;
  }

  /**
   * Get memory for a request (convenience method)
   */
  getMemoryForRequest(req) {
    const sessionId = this.getSessionId(req);
    return this.getMemory(sessionId);
  }

  /**
   * Add interaction to session memory
   */
  async addInteraction(sessionId, role, text, signature = null, publicKey = null, originalHash = null) {
    const memory = this.getMemory(sessionId);
    await memory.addInteraction(role, text, signature, publicKey, originalHash);
  }

  /**
   * Add interaction from request (convenience method)
   */
  async addInteractionFromRequest(req, role, text) {
    const sessionId = this.getSessionId(req);
    const signature = req.body?.signature || req.headers['x-signature'];
    const publicKey = req.verificationResult?.publicKey;
    const originalHash = req.body?.textHash;

    await this.addInteraction(sessionId, role, text, signature, publicKey, originalHash);
  }

  /**
   * Get conversation context for a session
   */
  getContext(sessionId) {
    const memory = this.getMemory(sessionId);
    return memory.getContext();
  }

  /**
   * Get context for a request (convenience method)
   */
  getContextForRequest(req) {
    const sessionId = this.getSessionId(req);
    return this.getContext(sessionId);
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { exists: false };
    }

    const memoryStats = session.memory.getStats();
    const now = Date.now();
    const age = now - session.created;
    const idle = now - session.lastAccess;

    return {
      exists: true,
      sessionId,
      created: new Date(session.created).toISOString(),
      lastAccess: new Date(session.lastAccess).toISOString(),
      ageMinutes: Math.round(age / 1000 / 60),
      idleMinutes: Math.round(idle / 1000 / 60),
      ...memoryStats,
    };
  }

  /**
   * Get stats for request session
   */
  getStatsForRequest(req) {
    const sessionId = this.getSessionId(req);
    return this.getSessionStats(sessionId);
  }

  /**
   * Clear a specific session
   */
  clearSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.memory.clearMemory();
      this.sessions.delete(sessionId);
      console.log(`🧹 Session cleared: ${sessionId.substring(0, 16)}...`);
      return true;
    }
    return false;
  }

  /**
   * Clear session from request
   */
  clearSessionFromRequest(req) {
    const sessionId = this.getSessionId(req);
    return this.clearSession(sessionId);
  }

  /**
   * Cleanup inactive sessions
   */
  _cleanupInactiveSessions() {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const idle = now - session.lastAccess;
      if (idle > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} inactive sessions`);
    }
  }

  /**
   * Get all session statistics
   */
  getAllStats() {
    const stats = {
      totalSessions: this.sessions.size,
      sessions: [],
      config: {
        maxInteractions: this.maxInteractions,
        maxSummaries: this.maxSummaries,
        tokenLimit: this.tokenLimit,
        sessionTimeout: this.sessionTimeout,
      },
    };

    for (const [sessionId, session] of this.sessions.entries()) {
      stats.sessions.push(this.getSessionStats(sessionId));
    }

    return stats;
  }

  /**
   * Express middleware to attach session memory to request
   */
  middleware() {
    return (req, res, next) => {
      const sessionId = this.getSessionId(req);
      req.sessionId = sessionId;
      req.sessionMemory = this.getMemory(sessionId);
      
      // Add session ID to response headers
      res.setHeader('X-Session-Id', sessionId);
      
      next();
    };
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    console.log(`🛑 SessionMemoryManager destroyed`);
  }
}

// Create singleton instance
export const sessionMemoryManager = new SessionMemoryManager({
  maxInteractions: 21,
  maxSummaries: 3,
  tokenLimit: 100000,
  persistToFile: true,
  memoryDir: './memory/sessions',
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
});

// Export factory function
export function createSessionMemoryManager(config = {}) {
  return new SessionMemoryManager(config);
}

export default SessionMemoryManager;

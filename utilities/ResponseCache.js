/**
 * Response Cache - In-memory caching for identical queries
 * 
 * Provides sub-millisecond responses for repeated queries
 */

import crypto from 'crypto';

export class ResponseCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 300000; // 5 minutes default
    this.maxSize = options.maxSize || 1000; // Max cached items
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Generate cache key from query + context
   */
  _generateKey(query, context = {}) {
    const normalized = {
      query: query.trim().toLowerCase(),
      context: JSON.stringify(context)
    };
    return crypto.createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');
  }

  /**
   * Check if cached response exists and is still valid
   */
  has(query, context = {}) {
    const key = this._generateKey(query, context);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cached response
   */
  get(query, context = {}) {
    const key = this._generateKey(query, context);
    const entry = this.cache.get(key);
    
    if (!entry || Date.now() > entry.expiresAt) {
      this.misses++;
      return null;
    }

    this.hits++;
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    return {
      ...entry.data,
      _cache: {
        hit: true,
        age: Date.now() - entry.createdAt,
        accessCount: entry.accessCount
      }
    };
  }

  /**
   * Store response in cache
   */
  set(query, context = {}, data, ttl = null) {
    const key = this._generateKey(query, context);
    
    // Enforce max size (LRU eviction)
    if (this.cache.size >= this.maxSize) {
      this._evictLRU();
    }

    const expiresAt = Date.now() + (ttl || this.ttl);
    
    this.cache.set(key, {
      data,
      createdAt: Date.now(),
      expiresAt,
      lastAccessed: Date.now(),
      accessCount: 0
    });
  }

  /**
   * Evict least recently used item
   */
  _evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear all cached items
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0%',
      ttl: this.ttl
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

// Global cache instance
export const globalCache = new ResponseCache({
  ttl: 300000,      // 5 minutes
  maxSize: 1000     // 1000 items
});

// Auto-cleanup every minute
setInterval(() => {
  const removed = globalCache.cleanup();
  if (removed > 0) {
    console.log(`🗑️  Cache cleanup: removed ${removed} expired items`);
  }
}, 60000);

/**
 * 💾 Cache Service
 * Implements intelligent caching to reduce redundant data fetching
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
    this.maxCacheSize = 100; // Maximum cache entries

    // Clear expired entries every 2 minutes
    setInterval(() => this.cleanupExpired(), 2 * 60 * 1000);
  }

  /**
   * Set cache entry with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.defaultTTL) {
    // Cleanup if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(key, value);
    this.timestamps.set(key, Date.now() + ttl);

    console.log(`📦 Cached: ${key} (TTL: ${ttl}ms)`);
  }

  /**
   * Get cache entry
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if expired/missing
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const expiry = this.timestamps.get(key);
    if (Date.now() > expiry) {
      // Expired, remove from cache
      this.cache.delete(key);
      this.timestamps.delete(key);
      console.log(`⏰ Cache expired: ${key}`);
      return null;
    }

    console.log(`🎯 Cache hit: ${key}`);
    return this.cache.get(key);
  }

  /**
   * Get or fetch data with caching
   * @param {string} key - Cache key
   * @param {Function} fetcher - Function to fetch data
   * @param {number} ttl - Time to live
   * @returns {Promise<any>} Cached or fresh data
   */
  async getOrFetch(key, fetcher, ttl = this.defaultTTL) {
    // Try cache first
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    try {
      console.log(`🔄 Cache miss, fetching: ${key}`);
      const data = await fetcher();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error(`❌ Fetch failed for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache entry
   * @param {string} key - Cache key to invalidate
   */
  invalidate(key) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      console.log(`🗑️ Invalidated: ${key}`);
    }
  }

  /**
   * Invalidate cache entries by pattern
   * @param {RegExp|string} pattern - Pattern to match keys
   */
  invalidatePattern(pattern) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.invalidate(key);
        count++;
      }
    }

    console.log(`🗑️ Invalidated ${count} entries matching: ${pattern}`);
  }

  /**
   * Clear all cache
   */
  clear() {
    const count = this.cache.size;
    this.cache.clear();
    this.timestamps.clear();
    console.log(`🧹 Cleared ${count} cache entries`);
  }

  /**
   * Remove oldest cache entries when full
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, expiry] of this.timestamps) {
      if (expiry < oldestTime) {
        oldestTime = expiry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.invalidate(oldestKey);
      console.log(`♻️ Evicted oldest entry: ${oldestKey}`);
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanupExpired() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, expiry] of this.timestamps) {
      if (now > expiry) {
        this.cache.delete(key);
        this.timestamps.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getStats() {
    const now = Date.now();
    const active = Array.from(this.timestamps.values()).filter(
      (expiry) => expiry > now
    ).length;

    return {
      totalEntries: this.cache.size,
      activeEntries: active,
      expiredEntries: this.cache.size - active,
      memoryUsage: this.getApproximateSize(),
      hitRate: this.calculateHitRate(),
    };
  }

  /**
   * Calculate approximate cache size
   * @returns {string} Formatted size
   */
  getApproximateSize() {
    let size = 0;
    for (const value of this.cache.values()) {
      size += JSON.stringify(value).length;
    }
    return `${(size / 1024).toFixed(2)} KB`;
  }

  /**
   * Calculate cache hit rate (simplified)
   * @returns {string} Hit rate percentage
   */
  calculateHitRate() {
    // This is a simplified calculation
    // In real implementation, you'd track hits/misses
    return "N/A (tracking not implemented)";
  }

  /**
   * Specialized cache methods for common patterns
   */

  // Cache account data
  cacheAccount(accountId, data, ttl = 10 * 60 * 1000) {
    this.set(`account:${accountId}`, data, ttl);
  }

  getAccount(accountId) {
    return this.get(`account:${accountId}`);
  }

  // Cache payment cards
  cachePaymentCards(cards, ttl = 15 * 60 * 1000) {
    this.set("payment:cards", cards, ttl);
  }

  getPaymentCards() {
    return this.get("payment:cards");
  }

  // Cache API responses
  cacheApiResponse(endpoint, params, data, ttl = 5 * 60 * 1000) {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    this.set(key, data, ttl);
  }

  getApiResponse(endpoint, params) {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    return this.get(key);
  }
}

// Global instance
window.cacheService = new CacheService();

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = CacheService;
}

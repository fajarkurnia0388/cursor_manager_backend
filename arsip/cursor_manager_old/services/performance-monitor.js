/**
 * ⚡ PERFORMANCE MONITOR - Advanced Performance Monitoring Service
 *
 * Provides comprehensive performance tracking and optimization:
 * - Real-time performance metrics collection
 * - Memory usage monitoring
 * - Database operation optimization
 * - Caching system implementation
 * - Performance benchmarking
 * - Automated performance alerts
 *
 * Dependencies: Config, Logger, ErrorHandler
 * Version: 1.0.0
 * Author: Cursor Account Manager Extension
 */

class PerformanceMonitor {
  constructor() {
    // Validate dependencies
    if (typeof Config === "undefined") {
      throw new Error("Config service is required for PerformanceMonitor");
    }
    if (typeof Logger === "undefined") {
      throw new Error("Logger service is required for PerformanceMonitor");
    }
    if (typeof ErrorHandler === "undefined") {
      throw new Error(
        "ErrorHandler service is required for PerformanceMonitor"
      );
    }

    this.config = Config.PERFORMANCE || {};
    this.logger = Logger;
    if (typeof ErrorHandler !== "undefined") {
      this.errorHandler = ErrorHandler;
    } else {
      console.warn(
        "ErrorHandler service not available in PerformanceMonitor, using fallback"
      );
      this.errorHandler = {
        handleError: (error, context) => {
          console.error(`PerformanceMonitor Error [${context}]:`, error);
        },
      };
    }

    // Performance state
    this.isInitialized = false;
    this.startTime = Date.now();
    this.cache = new Map();
    this.performanceLog = [];

    // Performance metrics
    this.metrics = {
      operationCount: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      databaseOperations: 0,
      errorCount: 0,
      slowOperations: 0,
    };

    // Performance thresholds
    this.thresholds = {
      slowOperationMs: 100,
      memoryWarningMB: 50,
      cacheSizeLimit: 1000,
      maxLogEntries: 5000,
    };

    // Cache configuration
    this.cacheConfig = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: this.config.MAX_CACHE_SIZE || 1000,
      enableLRU: true,
    };

    this.initialize();
  }

  /**
   * Initialize Performance Monitor
   */
  async initialize() {
    try {
      this.logger.info(
        "PerformanceMonitor: Initializing performance monitoring..."
      );

      // Initialize cache system
      this.initializeCache();

      // Start performance monitoring
      this.startPerformanceTracking();

      // Setup memory monitoring
      this.setupMemoryMonitoring();

      this.isInitialized = true;
      this.logger.info(
        "PerformanceMonitor: ✅ Performance monitoring initialized"
      );
    } catch (error) {
      if (typeof errorHandler !== "undefined") {
        errorHandler.handleError(error, "PerformanceMonitor.initialize");
      } else {
        console.error("PerformanceMonitor Error [initialize]:", error);
      }
      throw error;
    }
  }

  // ============================================================================
  // ⚡ PERFORMANCE TRACKING
  // ============================================================================

  /**
   * Track operation performance
   * @param {string} operationName - Name of the operation
   * @param {function} operation - Operation to track
   * @returns {any} Operation result
   */
  async trackOperation(operationName, operation) {
    const startTime = performance.now();
    let result = null;
    let error = null;

    try {
      result = await operation();
      return result;
    } catch (err) {
      error = err;
      this.metrics.errorCount++;
      throw err;
    } finally {
      const executionTime = performance.now() - startTime;
      this.recordOperationMetrics(operationName, executionTime, error);
    }
  }

  /**
   * Record operation metrics
   * @param {string} operationName - Name of the operation
   * @param {number} executionTime - Execution time in milliseconds
   * @param {Error} error - Error if operation failed
   */
  recordOperationMetrics(operationName, executionTime, error = null) {
    this.metrics.operationCount++;
    this.metrics.totalExecutionTime += executionTime;
    this.metrics.averageExecutionTime =
      this.metrics.totalExecutionTime / this.metrics.operationCount;

    // Check for slow operations
    if (executionTime > this.thresholds.slowOperationMs) {
      this.metrics.slowOperations++;
      this.logger.warn(
        "PerformanceMonitor",
        "slowOperation",
        `Slow operation detected: ${operationName}`,
        {
          executionTime: executionTime.toFixed(2) + "ms",
          threshold: this.thresholds.slowOperationMs + "ms",
        }
      );
    }

    // Log performance entry
    const logEntry = {
      id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      operationName,
      executionTime: Math.round(executionTime * 100) / 100,
      success: !error,
      error: error ? error.message : null,
      memoryUsage: this.getCurrentMemoryUsage(),
    };

    this.performanceLog.push(logEntry);

    // Maintain log size limit
    if (this.performanceLog.length > this.thresholds.maxLogEntries) {
      this.performanceLog = this.performanceLog.slice(
        -this.thresholds.maxLogEntries
      );
    }

    this.logger.debug(
      "PerformanceMonitor",
      "recordMetrics",
      `Operation completed: ${operationName}`,
      {
        executionTime: executionTime.toFixed(2) + "ms",
        success: !error,
      }
    );
  }

  // ============================================================================
  // 💾 CACHING SYSTEM
  // ============================================================================

  /**
   * Initialize cache system
   */
  initializeCache() {
    this.cache.clear();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      totalSize: 0,
    };

    this.logger.info("PerformanceMonitor: 💾 Cache system initialized");
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {any} Cached value or null
   */
  getCached(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.cacheStats.misses++;
      this.updateCacheHitRate();
      return null;
    }

    // Check TTL
    if (entry.expiry && Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.cacheStats.misses++;
      this.updateCacheHitRate();
      return null;
    }

    // Update access time for LRU
    entry.lastAccess = Date.now();
    this.cacheStats.hits++;
    this.updateCacheHitRate();

    return entry.value;
  }

  /**
   * Set cached value
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  setCached(key, value, ttl = this.cacheConfig.defaultTTL) {
    // Check cache size limit
    if (this.cache.size >= this.cacheConfig.maxSize) {
      this.evictLRUEntries(1);
    }

    const entry = {
      key,
      value,
      expiry: ttl ? Date.now() + ttl : null,
      created: Date.now(),
      lastAccess: Date.now(),
      size: this.estimateSize(value),
    };

    this.cache.set(key, entry);
    this.cacheStats.sets++;
    this.cacheStats.totalSize += entry.size;

    this.logger.debug(
      "PerformanceMonitor",
      "cache",
      `Value cached for key: ${key}`,
      {
        size: entry.size + " bytes",
        ttl: ttl ? ttl + "ms" : "permanent",
      }
    );
  }

  /**
   * Evict LRU entries
   * @param {number} count - Number of entries to evict
   */
  evictLRUEntries(count = 1) {
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].lastAccess - b[1].lastAccess
    );

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      const [key, entry] = entries[i];
      this.cache.delete(key);
      this.cacheStats.evictions++;
      this.cacheStats.totalSize -= entry.size;
    }
  }

  /**
   * Update cache hit rate
   */
  updateCacheHitRate() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    this.metrics.cacheHitRate =
      total > 0 ? (this.cacheStats.hits / total) * 100 : 0;
  }

  // ============================================================================
  // 📊 PERFORMANCE MONITORING
  // ============================================================================

  /**
   * Start performance tracking
   */
  startPerformanceTracking() {
    // Track page load performance if available
    if (typeof performance !== "undefined" && performance.timing) {
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;

      this.recordOperationMetrics("page_load", loadTime);
    }

    // Setup periodic performance checks
    setInterval(() => {
      this.performPeriodicChecks();
    }, 30000); // Every 30 seconds

    this.logger.info("PerformanceMonitor: 📊 Performance tracking started");
  }

  /**
   * Setup memory monitoring
   */
  setupMemoryMonitoring() {
    if (typeof performance !== "undefined" && performance.memory) {
      setInterval(() => {
        this.updateMemoryMetrics();
      }, 10000); // Every 10 seconds
    }

    this.logger.info("PerformanceMonitor: 🧠 Memory monitoring started");
  }

  /**
   * Perform periodic performance checks
   */
  performPeriodicChecks() {
    try {
      // Update memory metrics
      this.updateMemoryMetrics();

      // Check cache performance
      this.optimizeCache();

      // Check for performance issues
      this.detectPerformanceIssues();
    } catch (error) {
      if (typeof errorHandler !== "undefined") {
        errorHandler.handleError(
          error,
          "PerformanceMonitor.performPeriodicChecks"
        );
      } else {
        console.error(
          "PerformanceMonitor Error [performPeriodicChecks]:",
          error
        );
      }
    }
  }

  /**
   * Update memory metrics
   */
  updateMemoryMetrics() {
    if (typeof performance !== "undefined" && performance.memory) {
      const memory = performance.memory;
      this.metrics.memoryUsage = Math.round(
        memory.usedJSHeapSize / (1024 * 1024)
      );

      // Check memory warning threshold
      if (this.metrics.memoryUsage > this.thresholds.memoryWarningMB) {
        this.logger.warn(
          "PerformanceMonitor",
          "memoryWarning",
          "High memory usage detected",
          {
            current: this.metrics.memoryUsage + "MB",
            threshold: this.thresholds.memoryWarningMB + "MB",
          }
        );
      }
    }
  }

  /**
   * Optimize cache performance
   */
  optimizeCache() {
    // Remove expired entries
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry && now > entry.expiry) {
        this.cache.delete(key);
        this.cacheStats.totalSize -= entry.size;
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.logger.debug(
        "PerformanceMonitor",
        "cacheCleanup",
        `Removed ${expiredCount} expired cache entries`
      );
    }

    // Check cache size
    if (this.cache.size > this.cacheConfig.maxSize * 0.9) {
      const evictCount = Math.floor(this.cacheConfig.maxSize * 0.1);
      this.evictLRUEntries(evictCount);
    }
  }

  /**
   * Detect performance issues
   */
  detectPerformanceIssues() {
    const issues = [];

    // Check average execution time
    if (this.metrics.averageExecutionTime > this.thresholds.slowOperationMs) {
      issues.push({
        type: "SLOW_OPERATIONS",
        severity: "MEDIUM",
        message: `Average execution time (${this.metrics.averageExecutionTime.toFixed(
          2
        )}ms) exceeds threshold`,
      });
    }

    // Check error rate
    const errorRate =
      this.metrics.operationCount > 0
        ? (this.metrics.errorCount / this.metrics.operationCount) * 100
        : 0;

    if (errorRate > 5) {
      issues.push({
        type: "HIGH_ERROR_RATE",
        severity: "HIGH",
        message: `Error rate (${errorRate.toFixed(1)}%) is high`,
      });
    }

    // Check cache hit rate
    if (
      this.metrics.cacheHitRate < 50 &&
      this.cacheStats.hits + this.cacheStats.misses > 100
    ) {
      issues.push({
        type: "LOW_CACHE_HIT_RATE",
        severity: "MEDIUM",
        message: `Cache hit rate (${this.metrics.cacheHitRate.toFixed(
          1
        )}%) is low`,
      });
    }

    // Report issues
    for (const issue of issues) {
      this.logger.warn(
        "PerformanceMonitor",
        "performanceIssue",
        issue.message,
        {
          type: issue.type,
          severity: issue.severity,
        }
      );
    }
  }

  // ============================================================================
  // 🛠️ UTILITY METHODS
  // ============================================================================

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage() {
    if (typeof performance !== "undefined" && performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
    }
    return 0;
  }

  /**
   * Estimate object size
   * @param {any} obj - Object to estimate size for
   * @returns {number} Estimated size in bytes
   */
  estimateSize(obj) {
    if (obj === null || obj === undefined) return 0;

    const type = typeof obj;

    switch (type) {
      case "boolean":
        return 4;
      case "number":
        return 8;
      case "string":
        return obj.length * 2;
      case "object":
        if (Array.isArray(obj)) {
          return obj.reduce((sum, item) => sum + this.estimateSize(item), 0);
        } else {
          return Object.keys(obj).reduce((sum, key) => {
            return sum + this.estimateSize(key) + this.estimateSize(obj[key]);
          }, 0);
        }
      default:
        return 0;
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      metrics: { ...this.metrics },
      cache: {
        size: this.cache.size,
        stats: { ...this.cacheStats },
        hitRate: this.metrics.cacheHitRate.toFixed(1) + "%",
      },
      system: {
        uptime: Date.now() - this.startTime,
        isInitialized: this.isInitialized,
        logEntries: this.performanceLog.length,
      },
      thresholds: { ...this.thresholds },
    };
  }

  /**
   * Get performance log
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered performance log
   */
  getPerformanceLog(filters = {}) {
    let filtered = [...this.performanceLog];

    if (filters.operationName) {
      filtered = filtered.filter((entry) =>
        entry.operationName.includes(filters.operationName)
      );
    }

    if (filters.minExecutionTime) {
      filtered = filtered.filter(
        (entry) => entry.executionTime >= filters.minExecutionTime
      );
    }

    if (filters.errorsOnly) {
      filtered = filtered.filter((entry) => !entry.success);
    }

    if (filters.limit) {
      filtered = filtered.slice(-filters.limit);
    }

    return filtered;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.cacheStats.totalSize = 0;
    this.logger.info("PerformanceMonitor: Cache cleared");
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      operationCount: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      databaseOperations: 0,
      errorCount: 0,
      slowOperations: 0,
    };

    this.performanceLog = [];
    this.logger.info("PerformanceMonitor: Metrics reset");
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    const stats = this.getPerformanceStats();
    const recentErrors = this.getPerformanceLog({
      errorsOnly: true,
      limit: 10,
    });
    const slowOperations = this.getPerformanceLog({
      minExecutionTime: this.thresholds.slowOperationMs,
      limit: 10,
    });

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalOperations: stats.metrics.operationCount,
        averageExecutionTime:
          stats.metrics.averageExecutionTime.toFixed(2) + "ms",
        errorRate:
          stats.metrics.operationCount > 0
            ? (
                (stats.metrics.errorCount / stats.metrics.operationCount) *
                100
              ).toFixed(1) + "%"
            : "0%",
        memoryUsage: stats.metrics.memoryUsage + "MB",
        cacheHitRate: stats.cache.hitRate,
        uptime: Math.round(stats.system.uptime / 1000) + "s",
      },
      performance: stats,
      recentErrors,
      slowOperations,
      recommendations: this.generateRecommendations(stats),
    };
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(stats) {
    const recommendations = [];

    if (stats.metrics.averageExecutionTime > this.thresholds.slowOperationMs) {
      recommendations.push(
        "Consider optimizing slow operations or implementing more aggressive caching"
      );
    }

    if (stats.metrics.cacheHitRate < 70) {
      recommendations.push(
        "Cache hit rate is low. Review caching strategy and TTL values"
      );
    }

    if (stats.metrics.memoryUsage > this.thresholds.memoryWarningMB) {
      recommendations.push(
        "Memory usage is high. Consider implementing memory cleanup routines"
      );
    }

    if (stats.cache.size > stats.cache.stats.sets * 0.5) {
      recommendations.push(
        "Cache eviction rate is high. Consider increasing cache size or adjusting TTL"
      );
    }

    return recommendations;
  }
}

// Export for use in extension
if (typeof module !== "undefined" && module.exports) {
  module.exports = PerformanceMonitor;
} else if (typeof window !== "undefined") {
  window.PerformanceMonitor = PerformanceMonitor;
}

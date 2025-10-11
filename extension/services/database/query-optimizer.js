/**
 * 🚀 Database Query Optimizer Service
 * Advanced query optimization and caching untuk SQLite operations
 *
 * Features:
 * - Prepared statement caching
 * - Query plan analysis
 * - Performance monitoring
 * - Automatic index recommendations
 * - Query rewriting optimization
 */

class QueryOptimizer {
  constructor(options = {}) {
    // Cache configuration
    this.maxCacheSize = options.maxCacheSize || 100;
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
    this.enableQueryPlanAnalysis = options.enableQueryPlanAnalysis !== false;
    this.enableIndexRecommendations =
      options.enableIndexRecommendations !== false;

    // Statement caching
    this.preparedStatements = new Map();
    this.queryPlans = new Map();
    this.queryStats = new Map();

    // Performance tracking
    this.performanceMetrics = {
      totalQueries: 0,
      cachedQueries: 0,
      optimizedQueries: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      slowQueryCount: 0,
      indexRecommendations: 0,
    };

    // Query patterns
    this.commonPatterns = new Map();
    this.slowQueryThreshold = options.slowQueryThreshold || 100; // ms

    // Cleanup timer
    this.cleanupTimer = null;
    this.startCleanupTimer();
  }

  /**
   * Optimize and execute query
   */
  async executeQuery(db, sql, params = []) {
    const startTime = performance.now();
    const queryHash = this.hashQuery(sql, params);

    try {
      // ✅ Input validation
      if (typeof inputValidator !== "undefined") {
        if (!db) {
          throw new Error("Database connection is required");
        }
        if (!sql || typeof sql !== "string") {
          throw new Error("SQL query must be a non-empty string");
        }
        if (!Array.isArray(params)) {
          throw new Error("Parameters must be an array");
        }
      }

      this.performanceMetrics.totalQueries++;

      // Get or create prepared statement
      let stmt = this.getPreparedStatement(db, sql, queryHash);
      let results;

      // Track query pattern
      this.trackQueryPattern(sql);

      // Execute query
      if (sql.trim().toLowerCase().startsWith("select")) {
        results = await this.executeSelectQuery(stmt, params, sql, queryHash);
      } else {
        results = await this.executeModifyQuery(stmt, params, sql, queryHash);
      }

      // Track performance
      const executionTime = performance.now() - startTime;
      this.trackPerformance(sql, queryHash, executionTime);

      // Analyze query if needed
      if (
        this.enableQueryPlanAnalysis &&
        executionTime > this.slowQueryThreshold
      ) {
        await this.analyzeSlowQuery(db, sql, params, executionTime);
      }

      if (typeof logger !== "undefined") {
        logger.debug(
          "QueryOptimizer",
          "executeQuery",
          "Query executed successfully",
          {
            queryHash,
            executionTime: executionTime.toFixed(2),
            cached: this.preparedStatements.has(queryHash),
          }
        );
      }

      return results;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.trackPerformance(sql, queryHash, executionTime, true);

      if (typeof errorHandler !== "undefined") {
        throw errorHandler.handleDatabaseError("query_optimize", error, {
          sql,
          params,
          queryHash,
          executionTime,
        });
      }
      throw error;
    }
  }

  /**
   * Get or create prepared statement
   */
  getPreparedStatement(db, sql, queryHash) {
    let cacheEntry = this.preparedStatements.get(queryHash);

    if (cacheEntry && Date.now() - cacheEntry.createdAt < this.cacheTimeout) {
      // Use cached statement
      this.performanceMetrics.cachedQueries++;
      cacheEntry.hitCount++;
      cacheEntry.lastUsed = Date.now();

      return cacheEntry.statement;
    }

    // Create new prepared statement
    const stmt = db.prepare(sql);

    // Cache management - remove oldest if cache is full
    if (this.preparedStatements.size >= this.maxCacheSize) {
      this.evictOldestStatement();
    }

    // Add to cache
    this.preparedStatements.set(queryHash, {
      statement: stmt,
      sql,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      hitCount: 0,
      executionCount: 0,
      totalTime: 0,
    });

    return stmt;
  }

  /**
   * Execute SELECT query with optimization
   */
  async executeSelectQuery(stmt, params, sql, queryHash) {
    const cacheEntry = this.preparedStatements.get(queryHash);
    if (cacheEntry) {
      cacheEntry.executionCount++;
    }

    const results = [];

    // Bind parameters and execute
    stmt.bind(params);

    // Collect results
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }

    // Reset statement for reuse
    stmt.reset();

    return results;
  }

  /**
   * Execute INSERT/UPDATE/DELETE query
   */
  async executeModifyQuery(stmt, params, sql, queryHash) {
    const cacheEntry = this.preparedStatements.get(queryHash);
    if (cacheEntry) {
      cacheEntry.executionCount++;
    }

    // Bind parameters and execute
    stmt.bind(params);
    stmt.step();

    const results = {
      changes: stmt.getRowsModified ? stmt.getRowsModified() : 0,
      lastInsertRowid: null,
    };

    // Get last insert ID for INSERT operations
    if (sql.trim().toLowerCase().startsWith("insert")) {
      try {
        const idStmt = stmt.db.prepare("SELECT last_insert_rowid()");
        if (idStmt.step()) {
          results.lastInsertRowid = idStmt.getAsObject()["last_insert_rowid()"];
        }
        idStmt.free();
      } catch (error) {
        // Ignore errors getting last insert ID
      }
    }

    // Reset statement for reuse
    stmt.reset();

    return results;
  }

  /**
   * Track query performance
   */
  trackPerformance(sql, queryHash, executionTime, isError = false) {
    // Update global metrics
    this.performanceMetrics.totalExecutionTime += executionTime;
    this.performanceMetrics.averageExecutionTime =
      this.performanceMetrics.totalExecutionTime /
      this.performanceMetrics.totalQueries;

    if (executionTime > this.slowQueryThreshold) {
      this.performanceMetrics.slowQueryCount++;
    }

    // Update query-specific stats
    if (!this.queryStats.has(queryHash)) {
      this.queryStats.set(queryHash, {
        sql: this.sanitizeSQL(sql),
        executionCount: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errorCount: 0,
        lastExecuted: null,
      });
    }

    const stats = this.queryStats.get(queryHash);
    stats.executionCount++;
    stats.totalTime += executionTime;
    stats.averageTime = stats.totalTime / stats.executionCount;
    stats.minTime = Math.min(stats.minTime, executionTime);
    stats.maxTime = Math.max(stats.maxTime, executionTime);
    stats.lastExecuted = Date.now();

    if (isError) {
      stats.errorCount++;
    }

    // Update cache entry timing
    const cacheEntry = this.preparedStatements.get(queryHash);
    if (cacheEntry) {
      cacheEntry.totalTime += executionTime;
    }
  }

  /**
   * Track query patterns
   */
  trackQueryPattern(sql) {
    const pattern = this.extractQueryPattern(sql);

    if (!this.commonPatterns.has(pattern)) {
      this.commonPatterns.set(pattern, {
        pattern,
        count: 0,
        queries: new Set(),
        lastSeen: null,
      });
    }

    const patternData = this.commonPatterns.get(pattern);
    patternData.count++;
    patternData.queries.add(this.sanitizeSQL(sql));
    patternData.lastSeen = Date.now();
  }

  /**
   * Analyze slow query for optimization opportunities
   */
  async analyzeSlowQuery(db, sql, params, executionTime) {
    try {
      if (!this.enableQueryPlanAnalysis) return;

      // Get query plan
      const queryPlan = await this.getQueryPlan(db, sql, params);
      const queryHash = this.hashQuery(sql, params);

      this.queryPlans.set(queryHash, {
        sql: this.sanitizeSQL(sql),
        executionTime,
        plan: queryPlan,
        analyzedAt: Date.now(),
      });

      // Generate index recommendations
      if (this.enableIndexRecommendations) {
        const recommendations = this.generateIndexRecommendations(
          sql,
          queryPlan
        );

        if (recommendations.length > 0) {
          this.performanceMetrics.indexRecommendations +=
            recommendations.length;

          if (typeof logger !== "undefined") {
            logger.warn(
              "QueryOptimizer",
              "analyzeSlowQuery",
              "Slow query detected with index recommendations",
              {
                queryHash,
                executionTime: executionTime.toFixed(2),
                recommendations: recommendations.map((r) => r.suggestion),
              }
            );
          }
        }
      }
    } catch (error) {
      if (typeof logger !== "undefined") {
        logger.warn(
          "QueryOptimizer",
          "analyzeSlowQuery",
          "Failed to analyze slow query",
          {
            error: error.message,
            sql: this.sanitizeSQL(sql),
          }
        );
      }
    }
  }

  /**
   * Get query execution plan
   */
  async getQueryPlan(db, sql, params) {
    try {
      const explainQuery = `EXPLAIN QUERY PLAN ${sql}`;
      const stmt = db.prepare(explainQuery);

      if (params.length > 0) {
        stmt.bind(params);
      }

      const plan = [];
      while (stmt.step()) {
        plan.push(stmt.getAsObject());
      }

      stmt.free();
      return plan;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate index recommendations
   */
  generateIndexRecommendations(sql, queryPlan) {
    const recommendations = [];

    if (!queryPlan) return recommendations;

    // Analyze query plan for optimization opportunities
    for (const step of queryPlan) {
      const detail = step.detail || "";

      // Look for table scans
      if (detail.includes("SCAN TABLE")) {
        const tableMatch = detail.match(/SCAN TABLE (\w+)/);
        if (tableMatch) {
          recommendations.push({
            type: "INDEX",
            table: tableMatch[1],
            suggestion: `Consider adding an index on table ${tableMatch[1]} for columns used in WHERE clauses`,
            priority: "HIGH",
          });
        }
      }

      // Look for inefficient joins
      if (detail.includes("TEMP B-TREE")) {
        recommendations.push({
          type: "INDEX",
          suggestion:
            "Query is using temporary B-tree. Consider adding indexes on join columns",
          priority: "MEDIUM",
        });
      }

      // Look for sorting without index
      if (detail.includes("USE TEMP B-TREE FOR ORDER BY")) {
        recommendations.push({
          type: "INDEX",
          suggestion:
            "Query is sorting without index. Consider adding composite index for ORDER BY columns",
          priority: "MEDIUM",
        });
      }
    }

    return recommendations;
  }

  /**
   * Extract query pattern for categorization
   */
  extractQueryPattern(sql) {
    // Normalize query to identify patterns
    return sql
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\d+/g, "?")
      .replace(/'[^']*'/g, "?")
      .replace(/"[^"]*"/g, "?")
      .substring(0, 100); // First 100 characters
  }

  /**
   * Generate hash for query caching
   */
  hashQuery(sql, params) {
    const input = sql + JSON.stringify(params);
    let hash = 0;

    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString();
  }

  /**
   * Sanitize SQL for logging
   */
  sanitizeSQL(sql) {
    return sql.replace(/\s+/g, " ").trim().substring(0, 200); // Limit length for logging
  }

  /**
   * Evict oldest cached statement
   */
  evictOldestStatement() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.preparedStatements) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.preparedStatements.get(oldestKey);
      try {
        entry.statement.free();
      } catch (error) {
        // Ignore errors freeing statement
      }
      this.preparedStatements.delete(oldestKey);
    }
  }

  /**
   * Start cleanup timer
   */
  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Perform cache cleanup
   */
  performCleanup() {
    const now = Date.now();
    const expiredEntries = [];

    // Find expired cache entries
    for (const [key, entry] of this.preparedStatements) {
      if (now - entry.lastUsed > this.cacheTimeout) {
        expiredEntries.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredEntries) {
      const entry = this.preparedStatements.get(key);
      try {
        entry.statement.free();
      } catch (error) {
        // Ignore errors freeing statement
      }
      this.preparedStatements.delete(key);
    }

    if (expiredEntries.length > 0 && typeof logger !== "undefined") {
      logger.debug(
        "QueryOptimizer",
        "performCleanup",
        "Cleaned up expired cache entries",
        {
          expiredCount: expiredEntries.length,
          remainingCount: this.preparedStatements.size,
        }
      );
    }
  }

  /**
   * Get optimization statistics
   */
  getStats() {
    return {
      performance: { ...this.performanceMetrics },
      cache: {
        size: this.preparedStatements.size,
        maxSize: this.maxCacheSize,
        hitRate:
          this.performanceMetrics.totalQueries > 0
            ? (
                (this.performanceMetrics.cachedQueries /
                  this.performanceMetrics.totalQueries) *
                100
              ).toFixed(2)
            : 0,
      },
      patterns: {
        uniquePatterns: this.commonPatterns.size,
        totalQueries: Array.from(this.commonPatterns.values()).reduce(
          (sum, p) => sum + p.count,
          0
        ),
      },
      queryPlans: this.queryPlans.size,
    };
  }

  /**
   * Get slow queries report
   */
  getSlowQueries(limit = 10) {
    return Array.from(this.queryStats.values())
      .filter((stats) => stats.averageTime > this.slowQueryThreshold)
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, limit)
      .map((stats) => ({
        sql: stats.sql,
        averageTime: stats.averageTime.toFixed(2),
        maxTime: stats.maxTime.toFixed(2),
        executionCount: stats.executionCount,
        errorCount: stats.errorCount,
      }));
  }

  /**
   * Get index recommendations
   */
  getIndexRecommendations() {
    const recommendations = [];

    for (const planData of this.queryPlans.values()) {
      if (planData.plan) {
        const queryRecommendations = this.generateIndexRecommendations(
          planData.sql,
          planData.plan
        );
        recommendations.push(
          ...queryRecommendations.map((rec) => ({
            ...rec,
            sql: planData.sql,
            executionTime: planData.executionTime,
          }))
        );
      }
    }

    return recommendations;
  }

  /**
   * Clear all caches
   */
  clearCache() {
    // Free all prepared statements
    for (const entry of this.preparedStatements.values()) {
      try {
        entry.statement.free();
      } catch (error) {
        // Ignore errors freeing statements
      }
    }

    // Clear all caches
    this.preparedStatements.clear();
    this.queryPlans.clear();
    this.queryStats.clear();
    this.commonPatterns.clear();

    if (typeof logger !== "undefined") {
      logger.info("QueryOptimizer", "clearCache", "All caches cleared");
    }
  }

  /**
   * Destroy optimizer
   */
  destroy() {
    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Clear caches
    this.clearCache();

    if (typeof logger !== "undefined") {
      logger.info("QueryOptimizer", "destroy", "Query optimizer destroyed");
    }
  }
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = QueryOptimizer;
} else {
  // Works in both window and service worker contexts
  const globalThis = (function () {
    if (typeof window !== "undefined") return window;
    if (typeof self !== "undefined") return self;
    if (typeof global !== "undefined") return global;
    throw new Error("Unable to locate global object");
  })();
  globalThis.QueryOptimizer = QueryOptimizer;
}

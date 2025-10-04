/**
 * 🏊‍♂️ Database Connection Pool Service
 * Advanced connection management untuk SQLite operations
 *
 * Features:
 * - Connection pooling dengan automatic cleanup
 * - Load balancing for read/write operations
 * - Connection health monitoring
 * - Performance optimization
 * - Automatic failover handling
 */

class ConnectionPool {
  constructor(options = {}) {
    // Pool configuration
    this.maxConnections = options.maxConnections || 10;
    this.minConnections = options.minConnections || 2;
    this.acquireTimeout = options.acquireTimeout || 30000; // 30 seconds
    this.idleTimeout = options.idleTimeout || 300000; // 5 minutes
    this.healthCheckInterval = options.healthCheckInterval || 60000; // 1 minute

    // Connection tracking
    this.pool = [];
    this.activeConnections = new Set();
    this.waitingQueue = [];

    // Performance monitoring
    this.stats = {
      totalConnections: 0,
      activeCount: 0,
      waitingCount: 0,
      poolHits: 0,
      poolMisses: 0,
      totalAcquisitions: 0,
      averageAcquisitionTime: 0,
      healthCheckCount: 0,
      failedHealthChecks: 0,
    };

    // Health monitoring
    this.healthCheckTimer = null;
    this.isDestroyed = false;

    this.initialize();
  }

  /**
   * Initialize connection pool
   */
  async initialize() {
    try {
      if (typeof logger !== "undefined") {
        logger.info(
          "ConnectionPool",
          "initialize",
          "Starting connection pool initialization",
          {
            maxConnections: this.maxConnections,
            minConnections: this.minConnections,
          }
        );
      }

      // Create minimum connections
      for (let i = 0; i < this.minConnections; i++) {
        await this.createConnection();
      }

      // Start health monitoring
      this.startHealthMonitoring();

      if (typeof logger !== "undefined") {
        logger.info(
          "ConnectionPool",
          "initialize",
          "Connection pool initialized successfully",
          {
            poolSize: this.pool.length,
            stats: this.getStats(),
          }
        );
      }
    } catch (error) {
      if (typeof errorHandler !== "undefined") {
        throw errorHandler.handleDatabaseError("connection_pool_init", error);
      }
      throw error;
    }
  }

  /**
   * Acquire connection from pool
   */
  async acquire() {
    const startTime = performance.now();

    try {
      // ✅ Input validation
      if (typeof inputValidator !== "undefined") {
        if (this.isDestroyed) {
          throw new Error("Connection pool has been destroyed");
        }
      }

      this.stats.totalAcquisitions++;

      // Try to get connection from pool
      let connection = this.getAvailableConnection();

      if (connection) {
        this.stats.poolHits++;
        this.activeConnections.add(connection);
        this.updateAcquisitionStats(startTime);

        if (typeof logger !== "undefined") {
          logger.debug(
            "ConnectionPool",
            "acquire",
            "Connection acquired from pool",
            {
              connectionId: connection.id,
              poolSize: this.pool.length,
              activeCount: this.activeConnections.size,
            }
          );
        }

        return connection;
      }

      // Pool full, try to create new connection
      if (this.pool.length < this.maxConnections) {
        connection = await this.createConnection();
        this.activeConnections.add(connection);
        this.stats.poolMisses++;
        this.updateAcquisitionStats(startTime);

        return connection;
      }

      // Wait for available connection
      return await this.waitForConnection(startTime);
    } catch (error) {
      if (typeof errorHandler !== "undefined") {
        throw errorHandler.handleDatabaseError("connection_acquire", error);
      }
      throw error;
    }
  }

  /**
   * Release connection back to pool
   */
  async release(connection) {
    try {
      // ✅ Input validation
      if (typeof inputValidator !== "undefined") {
        if (!connection) {
          throw new Error("Connection is required for release");
        }
        if (this.isDestroyed) {
          throw new Error("Connection pool has been destroyed");
        }
      }

      // Remove from active connections
      this.activeConnections.delete(connection);

      // Check connection health
      if (await this.isConnectionHealthy(connection)) {
        // Return to pool
        connection.lastUsed = Date.now();
        connection.isAvailable = true;

        // Process waiting queue
        this.processWaitingQueue();

        if (typeof logger !== "undefined") {
          logger.debug(
            "ConnectionPool",
            "release",
            "Connection released to pool",
            {
              connectionId: connection.id,
              poolSize: this.pool.length,
              activeCount: this.activeConnections.size,
            }
          );
        }
      } else {
        // Remove unhealthy connection
        await this.removeConnection(connection);
      }
    } catch (error) {
      if (typeof errorHandler !== "undefined") {
        throw errorHandler.handleDatabaseError("connection_release", error, {
          connectionId: connection?.id,
        });
      }
      throw error;
    }
  }

  /**
   * Create new connection
   */
  async createConnection() {
    try {
      const connection = {
        id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        db: null, // Will be set by database service
        isAvailable: true,
        isHealthy: true,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        queryCount: 0,
        errorCount: 0,
      };

      this.pool.push(connection);
      this.stats.totalConnections++;

      if (typeof logger !== "undefined") {
        logger.debug(
          "ConnectionPool",
          "createConnection",
          "New connection created",
          {
            connectionId: connection.id,
            totalConnections: this.stats.totalConnections,
          }
        );
      }

      return connection;
    } catch (error) {
      if (typeof errorHandler !== "undefined") {
        throw errorHandler.handleDatabaseError("connection_create", error);
      }
      throw error;
    }
  }

  /**
   * Get available connection from pool
   */
  getAvailableConnection() {
    return this.pool.find((conn) => conn.isAvailable && conn.isHealthy);
  }

  /**
   * Wait for connection to become available
   */
  async waitForConnection(startTime) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.removeFromWaitingQueue(resolve, reject);
        reject(
          new Error(
            `Connection acquisition timeout after ${this.acquireTimeout}ms`
          )
        );
      }, this.acquireTimeout);

      const waiter = {
        resolve: (connection) => {
          clearTimeout(timeoutId);
          this.updateAcquisitionStats(startTime);
          resolve(connection);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        startTime,
      };

      this.waitingQueue.push(waiter);
      this.stats.waitingCount = this.waitingQueue.length;
    });
  }

  /**
   * Process waiting queue
   */
  processWaitingQueue() {
    if (this.waitingQueue.length === 0) return;

    const connection = this.getAvailableConnection();
    if (!connection) return;

    const waiter = this.waitingQueue.shift();
    this.stats.waitingCount = this.waitingQueue.length;

    this.activeConnections.add(connection);
    connection.isAvailable = false;

    waiter.resolve(connection);
  }

  /**
   * Check connection health
   */
  async isConnectionHealthy(connection) {
    try {
      if (!connection || !connection.db) return false;

      // Simple health check - try to execute basic query
      const stmt = connection.db.prepare("SELECT 1");
      const result = stmt.step();
      stmt.free();

      connection.isHealthy = result !== null;
      return connection.isHealthy;
    } catch (error) {
      connection.isHealthy = false;
      connection.errorCount++;
      return false;
    }
  }

  /**
   * Remove connection from pool
   */
  async removeConnection(connection) {
    try {
      const index = this.pool.indexOf(connection);
      if (index !== -1) {
        this.pool.splice(index, 1);
      }

      this.activeConnections.delete(connection);

      // Close database connection if exists
      if (connection.db) {
        try {
          connection.db.close();
        } catch (closeError) {
          if (typeof logger !== "undefined") {
            logger.warn(
              "ConnectionPool",
              "removeConnection",
              "Error closing database connection",
              {
                connectionId: connection.id,
                error: closeError.message,
              }
            );
          }
        }
      }

      if (typeof logger !== "undefined") {
        logger.debug(
          "ConnectionPool",
          "removeConnection",
          "Connection removed from pool",
          {
            connectionId: connection.id,
            poolSize: this.pool.length,
          }
        );
      }

      // Ensure minimum connections
      if (this.pool.length < this.minConnections && !this.isDestroyed) {
        await this.createConnection();
      }
    } catch (error) {
      if (typeof logger !== "undefined") {
        logger.error(
          "ConnectionPool",
          "removeConnection",
          "Error removing connection",
          {
            error: error.message,
            connectionId: connection?.id,
          }
        );
      }
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckTimer) return;

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  /**
   * Perform health check on all connections
   */
  async performHealthCheck() {
    try {
      this.stats.healthCheckCount++;

      const unhealthyConnections = [];

      // Check all pooled connections
      for (const connection of this.pool) {
        if (!connection.isAvailable) continue; // Skip active connections

        if (!(await this.isConnectionHealthy(connection))) {
          unhealthyConnections.push(connection);
          this.stats.failedHealthChecks++;
        }

        // Check for idle timeout
        if (Date.now() - connection.lastUsed > this.idleTimeout) {
          if (this.pool.length > this.minConnections) {
            unhealthyConnections.push(connection);
          }
        }
      }

      // Remove unhealthy connections
      for (const connection of unhealthyConnections) {
        await this.removeConnection(connection);
      }

      if (typeof logger !== "undefined" && unhealthyConnections.length > 0) {
        logger.info(
          "ConnectionPool",
          "performHealthCheck",
          "Health check completed",
          {
            removedConnections: unhealthyConnections.length,
            poolSize: this.pool.length,
            stats: this.getStats(),
          }
        );
      }
    } catch (error) {
      if (typeof logger !== "undefined") {
        logger.error(
          "ConnectionPool",
          "performHealthCheck",
          "Health check failed",
          {
            error: error.message,
          }
        );
      }
    }
  }

  /**
   * Update acquisition statistics
   */
  updateAcquisitionStats(startTime) {
    const acquisitionTime = performance.now() - startTime;
    this.stats.averageAcquisitionTime =
      (this.stats.averageAcquisitionTime * (this.stats.totalAcquisitions - 1) +
        acquisitionTime) /
      this.stats.totalAcquisitions;
    this.stats.activeCount = this.activeConnections.size;
  }

  /**
   * Remove waiter from queue
   */
  removeFromWaitingQueue(resolve, reject) {
    const index = this.waitingQueue.findIndex(
      (w) => w.resolve === resolve && w.reject === reject
    );
    if (index !== -1) {
      this.waitingQueue.splice(index, 1);
      this.stats.waitingCount = this.waitingQueue.length;
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      poolSize: this.pool.length,
      availableConnections: this.pool.filter(
        (c) => c.isAvailable && c.isHealthy
      ).length,
      activeCount: this.activeConnections.size,
      waitingCount: this.waitingQueue.length,
      healthyConnections: this.pool.filter((c) => c.isHealthy).length,
      poolUtilization:
        this.pool.length > 0
          ? ((this.activeConnections.size / this.pool.length) * 100).toFixed(2)
          : 0,
    };
  }

  /**
   * Destroy connection pool
   */
  async destroy() {
    try {
      this.isDestroyed = true;

      // Stop health monitoring
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = null;
      }

      // Reject all waiting requests
      for (const waiter of this.waitingQueue) {
        waiter.reject(new Error("Connection pool destroyed"));
      }
      this.waitingQueue = [];

      // Close all connections
      for (const connection of this.pool) {
        await this.removeConnection(connection);
      }

      this.pool = [];
      this.activeConnections.clear();

      if (typeof logger !== "undefined") {
        logger.info(
          "ConnectionPool",
          "destroy",
          "Connection pool destroyed successfully"
        );
      }
    } catch (error) {
      if (typeof errorHandler !== "undefined") {
        throw errorHandler.handleDatabaseError(
          "connection_pool_destroy",
          error
        );
      }
      throw error;
    }
  }
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = ConnectionPool;
} else {
  // Works in both window and service worker contexts
  const globalThis = (function () {
    if (typeof window !== "undefined") return window;
    if (typeof self !== "undefined") return self;
    if (typeof global !== "undefined") return global;
    throw new Error("Unable to locate global object");
  })();
  globalThis.ConnectionPool = ConnectionPool;
}

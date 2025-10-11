/**
 * 🗄️ Database Manager Service
 * Mengelola kedua database SQLite (accounts dan payment cards)
 *
 * Features:
 * - Initialize both databases
 * - Health monitoring
 * - Coordinated operations
 * - Error handling
 * - Performance tracking
 */

class DatabaseManager {
  constructor() {
    this.accounts = null;
    this.cards = null;
    this.initialized = false;
    this.initializationPromise = null;
    this.healthCheckInterval = null;

    // ✅ Advanced Database Features
    this.connectionPool = null;
    this.queryOptimizer = null;
    this.backupService = null;

    // Performance monitoring
    this.performanceMetrics = {
      totalQueries: 0,
      totalConnectionTime: 0,
      averageQueryTime: 0,
      errorCount: 0,
      lastHealthCheck: null,
      uptime: 0,
    };

    // ✅ Fix: Use centralized configuration
    this.config = {
      healthCheckInterval:
        typeof Config !== "undefined"
          ? Config.DATABASE.HEALTH_CHECK_INTERVAL
          : 30000,
      maxInitRetries:
        typeof Config !== "undefined" ? Config.DATABASE.MAX_INIT_RETRIES : 3,
      initRetryDelay:
        typeof Config !== "undefined" ? Config.DATABASE.INIT_RETRY_DELAY : 1000,
      // Advanced feature configuration
      enableConnectionPooling: true,
      enableQueryOptimization: true,
      enableAutoBackup: true,
      maxConnections: 10,
      backupInterval: 3600000, // 1 hour
    };
  }

  /**
   * Initialize both databases
   */
  async initialize() {
    // Prevent multiple simultaneous initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  async _initialize() {
    console.log("🚀 Initializing Database Manager...");

    let retries = 0;
    while (retries < this.config.maxInitRetries) {
      try {
        // Load SQL.js library
        await this.loadSqlJs();

        // Initialize both database services
        this.accounts = new AccountsDatabaseService();
        this.cards = new CardsDatabaseService();

        console.log("📊 Initializing databases...");
        const startTime = performance.now();

        // Initialize databases in parallel
        await Promise.all([
          this.accounts.initialize(),
          this.cards.initialize(),
        ]);

        const initTime = performance.now() - startTime;
        console.log(
          `✅ Databases initialized successfully in ${initTime.toFixed(2)}ms`
        );

        this.initialized = true;
        this.startTime = Date.now(); // ✅ Fix: Initialize startTime

        // ✅ Initialize advanced database features
        await this.initializeAdvancedFeatures();

        // Start health monitoring
        this.startHealthMonitoring();

        // Log initialization success
        this.logEvent("database_manager_initialized", {
          initTime,
          retries,
        });

        return true;
      } catch (error) {
        retries++;
        console.error(
          `❌ Database initialization failed (attempt ${retries}/${this.config.maxInitRetries}):`,
          error
        );

        if (retries >= this.config.maxInitRetries) {
          this.logEvent("database_manager_init_failed", {
            error: error.message,
            retries,
          });
          throw new Error(
            `Database Manager initialization failed after ${retries} attempts: ${error.message}`
          );
        }

        // Wait before retrying
        await this.sleep(this.config.initRetryDelay);
      }
    }
  }

  /**
   * Load SQL.js library
   */
  async loadSqlJs() {
    try {
      // Check if already loaded
      if (typeof initSqlJs !== "undefined") {
        console.log("📚 SQL.js already loaded");
        return;
      }

      console.log("📥 Loading SQL.js library...");

      if (typeof importScripts !== "undefined") {
        // Service worker context
        try {
          importScripts(chrome.runtime.getURL("libs/sql.js"));
        } catch (e) {
          // Fallback: mark resource as web accessible and try plain path
          console.warn(
            "⚠️ importScripts failed with runtime URL, trying relative path /libs/sql.js",
            e
          );
          importScripts("libs/sql.js");
        }
      } else {
        // Browser context - load dynamically
        await this.loadScript(chrome.runtime.getURL("libs/sql.js"));
      }

      if (typeof initSqlJs === "undefined") {
        throw new Error("SQL.js library failed to load");
      }

      console.log("✅ SQL.js library loaded successfully");
    } catch (error) {
      console.error("❌ Failed to load SQL.js library:", error);
      throw new Error(`Failed to load SQL.js: ${error.message}`);
    }
  }

  /**
   * Load script dynamically
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Get accounts database service
   */
  getAccountsDB() {
    this.ensureInitialized();
    return this.accounts;
  }

  /**
   * Get cards database service
   */
  getCardsDB() {
    this.ensureInitialized();
    return this.cards;
  }

  /**
   * Health check for both databases
   */
  async healthCheck() {
    try {
      if (!this.initialized) {
        return {
          status: "not_initialized",
          timestamp: new Date().toISOString(),
        };
      }

      const [accountsHealth, cardsHealth] = await Promise.all([
        this.accounts.healthCheck(),
        this.cards.healthCheck(),
      ]);

      const overall = this.calculateOverallHealth(accountsHealth, cardsHealth);

      return {
        status: overall.status,
        score: overall.score,
        timestamp: new Date().toISOString(),
        databases: {
          accounts: accountsHealth,
          cards: cardsHealth,
        },
        manager: {
          initialized: this.initialized,
          uptime: this.getUptime(),
        },
      };
    } catch (error) {
      console.error("❌ Health check failed:", error);
      return {
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Calculate overall health based on individual database health
   */
  calculateOverallHealth(accountsHealth, cardsHealth) {
    let score = 100;
    let status = "healthy";

    // Check accounts database
    if (accountsHealth.status !== "healthy") {
      score -= 40;
      status = "warning";
    }

    // Check cards database
    if (cardsHealth.status !== "healthy") {
      score -= 40;
      status = "warning";
    }

    // Set critical if very low score
    if (score < 50) {
      status = "critical";
    }

    return { score: Math.max(0, score), status };
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.healthCheck();

        // Log health issues
        if (health.status !== "healthy") {
          console.warn("⚠️ Database health issue detected:", health);
          this.logEvent("database_health_warning", health);
        }
      } catch (error) {
        console.error("❌ Health check error:", error);
      }
    }, this.config.healthCheckInterval);

    console.log("💓 Health monitoring started");
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log("💔 Health monitoring stopped");
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      this.ensureInitialized();

      const [accountsStats, cardsStats] = await Promise.all([
        this.accounts.getDatabaseStats(),
        this.cards.getDatabaseStats(),
      ]);

      return {
        timestamp: new Date().toISOString(),
        uptime: this.getUptime(),
        databases: {
          accounts: accountsStats,
          cards: cardsStats,
        },
        total: {
          accounts: accountsStats.total_accounts || 0,
          cards: cardsStats.total_cards || 0, // ✅ Fix: Use correct database reference
          queries:
            (accountsStats.queryStats?.totalQueries || 0) +
            (cardsStats.queryStats?.totalQueries || 0),
          errors:
            (accountsStats.queryStats?.errors || 0) +
            (cardsStats.queryStats?.errors || 0),
        },
      };
    } catch (error) {
      console.error("❌ Error getting database stats:", error);
      throw error;
    }
  }

  /**
   * Backup both databases
   */
  async backup() {
    try {
      this.ensureInitialized();

      console.log("💾 Creating database backups...");
      const startTime = performance.now();

      const [accountsBackup, cardsBackup] = await Promise.all([
        this.accounts.backup(),
        this.cards.backup(),
      ]);

      const backupTime = performance.now() - startTime;
      console.log(
        `✅ Backups created successfully in ${backupTime.toFixed(2)}ms`
      );

      this.logEvent("databases_backed_up", {
        backupTime,
        accountsBackup: accountsBackup.filename,
        cardsBackup: cardsBackup.filename,
      });

      return {
        success: true,
        backupTime,
        accounts: accountsBackup,
        cards: cardsBackup,
      };
    } catch (error) {
      console.error("❌ Backup failed:", error);
      this.logEvent("backup_failed", { error: error.message });
      throw error;
    }
  }

  /**
   * Cleanup old data from both databases
   */
  async cleanup(options = {}) {
    try {
      this.ensureInitialized();

      console.log("🧹 Starting database cleanup...");
      const startTime = performance.now();

      const [accountsCleanup, cardsCleanup] = await Promise.all([
        this.accounts.cleanup(options),
        this.cards.cleanup(options),
      ]);

      const cleanupTime = performance.now() - startTime;
      console.log(`✅ Cleanup completed in ${cleanupTime.toFixed(2)}ms`);

      this.logEvent("databases_cleaned", {
        cleanupTime,
        accountsResults: accountsCleanup,
        cardsResults: cardsCleanup,
      });

      return {
        success: true,
        cleanupTime,
        accounts: accountsCleanup,
        cards: cardsCleanup,
      };
    } catch (error) {
      console.error("❌ Cleanup failed:", error);
      throw error;
    }
  }

  /**
   * Close all database connections
   */
  async close() {
    try {
      console.log("🔒 Closing database connections...");

      // Stop health monitoring
      this.stopHealthMonitoring();

      if (this.accounts) {
        await this.accounts.close();
      }

      if (this.cards) {
        await this.cards.close();
      }

      this.initialized = false;
      this.initializationPromise = null;

      console.log("✅ Database Manager closed successfully");
    } catch (error) {
      console.error("❌ Error closing Database Manager:", error);
      throw error;
    }
  }

  /**
   * Ensure database is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error(
        "Database Manager not initialized. Call initialize() first."
      );
    }
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime() {
    if (!this.initialized) return 0;
    return Date.now() - this.startTime;
  }

  /**
   * Log events for monitoring
   */
  logEvent(event, data = {}) {
    const logData = {
      event,
      timestamp: new Date().toISOString(),
      ...data,
    };

    console.log(`📊 Database Event: ${event}`, logData);

    // Store in Chrome storage for debugging (keep last 100 events)
    chrome.storage.local.get("database_events", (result) => {
      const events = result.database_events || [];
      events.push(logData);

      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }

      chrome.storage.local.set({ database_events: events });
    });
  }

  /**
   * ✅ Initialize advanced database features
   */
  async initializeAdvancedFeatures() {
    try {
      if (typeof logger !== "undefined") {
        logger.info(
          "DatabaseManager",
          "initializeAdvancedFeatures",
          "Initializing advanced database features"
        );
      }

      // Initialize connection pool
      if (
        this.config.enableConnectionPooling &&
        typeof ConnectionPool !== "undefined"
      ) {
        this.connectionPool = new ConnectionPool({
          maxConnections: this.config.maxConnections,
          minConnections: 2,
          acquireTimeout: 30000,
          idleTimeout: 300000,
        });

        if (typeof logger !== "undefined") {
          logger.info(
            "DatabaseManager",
            "initializeAdvancedFeatures",
            "Connection pool initialized"
          );
        }
      }

      // Initialize query optimizer
      if (
        this.config.enableQueryOptimization &&
        typeof QueryOptimizer !== "undefined"
      ) {
        this.queryOptimizer = new QueryOptimizer({
          maxCacheSize: 100,
          cacheTimeout: 300000,
          enableQueryPlanAnalysis: true,
          enableIndexRecommendations: true,
          slowQueryThreshold: 100,
        });

        if (typeof logger !== "undefined") {
          logger.info(
            "DatabaseManager",
            "initializeAdvancedFeatures",
            "Query optimizer initialized"
          );
        }
      }

      // Initialize backup service
      if (
        this.config.enableAutoBackup &&
        typeof BackupRecoveryService !== "undefined"
      ) {
        this.backupService = new BackupRecoveryService({
          backupInterval: this.config.backupInterval,
          maxBackups: 10,
          compressionEnabled: true,
          encryptionEnabled: false,
        });

        if (typeof logger !== "undefined") {
          logger.info(
            "DatabaseManager",
            "initializeAdvancedFeatures",
            "Backup service initialized"
          );
        }
      }

      if (typeof logger !== "undefined") {
        logger.info(
          "DatabaseManager",
          "initializeAdvancedFeatures",
          "All advanced features initialized successfully"
        );
      }
    } catch (error) {
      if (typeof logger !== "undefined") {
        logger.warn(
          "DatabaseManager",
          "initializeAdvancedFeatures",
          "Some advanced features failed to initialize",
          {
            error: error.message,
          }
        );
      }
      // Don't fail initialization if advanced features fail
    }
  }

  /**
   * ✅ Execute optimized query
   */
  async executeOptimizedQuery(databaseService, sql, params = []) {
    try {
      this.performanceMetrics.totalQueries++;
      const startTime = performance.now();

      let result;
      if (this.queryOptimizer) {
        result = await this.queryOptimizer.executeQuery(
          databaseService.db,
          sql,
          params
        );
      } else {
        // Fallback to regular query execution
        result = await databaseService.query(sql, params);
      }

      // Update performance metrics
      const queryTime = performance.now() - startTime;
      this.performanceMetrics.totalConnectionTime += queryTime;
      this.performanceMetrics.averageQueryTime =
        this.performanceMetrics.totalConnectionTime /
        this.performanceMetrics.totalQueries;

      return result;
    } catch (error) {
      this.performanceMetrics.errorCount++;
      throw error;
    }
  }

  /**
   * ✅ Create database backup
   */
  async createBackup(databaseType = "both") {
    try {
      if (!this.backupService) {
        throw new Error("Backup service not available");
      }

      const results = {};

      if (databaseType === "both" || databaseType === "accounts") {
        results.accounts = await this.backupService.createBackup(
          this.accounts,
          {
            type: "full",
          }
        );
      }

      if (databaseType === "both" || databaseType === "cards") {
        results.cards = await this.backupService.createBackup(this.cards, {
          type: "full",
        });
      }

      if (typeof logger !== "undefined") {
        logger.info(
          "DatabaseManager",
          "createBackup",
          "Backup completed successfully",
          {
            databaseType,
            results: Object.keys(results),
          }
        );
      }

      return results;
    } catch (error) {
      if (typeof errorHandler !== "undefined") {
        throw errorHandler.handleDatabaseError("database_backup", error, {
          databaseType,
        });
      }
      throw error;
    }
  }

  /**
   * ✅ Restore from backup
   */
  async restoreBackup(backupId, databaseType = "both") {
    try {
      if (!this.backupService) {
        throw new Error("Backup service not available");
      }

      const results = {};

      if (databaseType === "both" || databaseType === "accounts") {
        results.accounts = await this.backupService.restoreBackup(
          this.accounts,
          backupId
        );
      }

      if (databaseType === "both" || databaseType === "cards") {
        results.cards = await this.backupService.restoreBackup(
          this.cards,
          backupId
        );
      }

      if (typeof logger !== "undefined") {
        logger.info(
          "DatabaseManager",
          "restoreBackup",
          "Restore completed successfully",
          {
            backupId,
            databaseType,
            results: Object.keys(results),
          }
        );
      }

      return results;
    } catch (error) {
      if (typeof errorHandler !== "undefined") {
        throw errorHandler.handleDatabaseError("database_restore", error, {
          backupId,
          databaseType,
        });
      }
      throw error;
    }
  }

  /**
   * ✅ Get advanced performance metrics
   */
  getAdvancedMetrics() {
    const metrics = {
      database: {
        ...this.performanceMetrics,
        uptime: this.getUptime(),
        isHealthy: this.initialized,
      },
    };

    // Add connection pool metrics
    if (this.connectionPool) {
      metrics.connectionPool = this.connectionPool.getStats();
    }

    // Add query optimizer metrics
    if (this.queryOptimizer) {
      metrics.queryOptimizer = this.queryOptimizer.getStats();
    }

    // Add backup service metrics
    if (this.backupService) {
      metrics.backupService = this.backupService.getStats();
    }

    return metrics;
  }

  /**
   * Utility function for sleep
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!DatabaseManager._instance) {
      DatabaseManager._instance = new DatabaseManager();
    }
    return DatabaseManager._instance;
  }
}

// Singleton instance
DatabaseManager._instance = null;

// Export untuk digunakan di extension
if (typeof module !== "undefined") {
  module.exports = DatabaseManager;
}

// For service worker context
if (typeof self !== "undefined") {
  self.DatabaseManager = DatabaseManager;
}

// Create and export singleton instance
const databaseManager = DatabaseManager.getInstance();

if (typeof self !== "undefined") {
  self.databaseManager = databaseManager;
}

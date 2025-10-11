/**
 * 🗄️ Base Database Service untuk SQLite Operations
 * Menyediakan foundation untuk semua database operations
 *
 * Features:
 * - Connection management
 * - Transaction support
 * - Query execution
 * - Error handling
 * - Performance monitoring
 */

class BaseDatabaseService {
  constructor(databaseName) {
    this.databaseName = databaseName;
    this.db = null;
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 3;
    this.queryStats = {
      totalQueries: 0,
      totalTime: 0,
      errors: 0,
    };
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    try {
      console.log(`Initializing database: ${this.databaseName}`);

      // For Chrome Extension, we'll use a WebSQL polyfill or IndexedDB-based SQLite
      // This is a placeholder for the actual implementation
      this.db = await this.createConnection();
      this.isConnected = true;

      // Run any pending migrations
      await this.runMigrations();

      console.log(`Database ${this.databaseName} initialized successfully`);
    } catch (error) {
      console.error(
        `Failed to initialize database ${this.databaseName}:`,
        error
      );
      await this.handleConnectionError(error);
    }
  }

  /**
   * Create database connection
   * This will be implemented with SQL.js or a WebSQL polyfill
   */
  async createConnection() {
    try {
      // Load SQL.js library (akan di-import dari CDN atau local)
      if (typeof initSqlJs === "undefined") {
        throw new Error("SQL.js library not loaded");
      }

      const locate = (file) => {
        // Prefer chrome.runtime URL when available
        try {
          if (
            typeof chrome !== "undefined" &&
            chrome.runtime &&
            chrome.runtime.getURL
          ) {
            return chrome.runtime.getURL(`libs/${file}`);
          }
        } catch (_) {}
        // Fallback to relative path
        return `/libs/${file}`;
      };

      const SQL = await initSqlJs({ locateFile: locate });

      // Try to load existing database from storage
      const existingData = await this.loadDatabaseFromStorage();

      let db;
      if (existingData) {
        db = new SQL.Database(existingData);
        console.log(`Loaded existing database: ${this.databaseName}`);
      } else {
        db = new SQL.Database();
        console.log(`Created new database: ${this.databaseName}`);
      }

      return db;
    } catch (error) {
      console.error("Error creating database connection:", error);
      throw error;
    }
  }

  /**
   * Load database from Chrome storage
   */
  async loadDatabaseFromStorage() {
    try {
      const result = await chrome.storage.local.get(
        `sqlite_${this.databaseName}`
      );
      const data = result[`sqlite_${this.databaseName}`];

      if (data) {
        // Convert base64 back to Uint8Array
        return Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      }

      return null;
    } catch (error) {
      console.warn("Could not load database from storage:", error);
      return null;
    }
  }

  /**
   * Save database to Chrome storage
   */
  async saveDatabaseToStorage() {
    try {
      if (!this.db) return;

      const data = this.db.export();
      // Convert Uint8Array to base64 for storage
      const base64Data = btoa(String.fromCharCode.apply(null, data));

      await chrome.storage.local.set({
        [`sqlite_${this.databaseName}`]: base64Data,
      });

      console.log(`Database ${this.databaseName} saved to storage`);
    } catch (error) {
      console.error("Error saving database to storage:", error);
      throw error;
    }
  }

  /**
   * Execute SQL query with parameters
   */
  async query(sql, params = []) {
    const startTime = performance.now();

    try {
      this.ensureConnection();

      console.log(`Executing query: ${sql}`, params);

      const stmt = this.db.prepare(sql);
      let results;

      if (sql.trim().toLowerCase().startsWith("select")) {
        // SELECT query - return all results
        results = stmt.getAsObject(params);
        const allResults = [];
        while (stmt.step()) {
          allResults.push(stmt.getAsObject());
        }
        results = allResults;
      } else {
        // INSERT/UPDATE/DELETE - return info
        stmt.run(params);
        results = {
          changes: this.db.getRowsModified(),
          lastInsertRowid: this.db.exec("SELECT last_insert_rowid()")[0]
            ?.values[0][0],
        };
      }

      stmt.free();

      // Update stats
      const queryTime = performance.now() - startTime;
      this.updateQueryStats(queryTime, false);

      // Auto-save after modifications
      if (!sql.trim().toLowerCase().startsWith("select")) {
        await this.saveDatabaseToStorage();
      }

      return results;
    } catch (error) {
      console.error("Query execution error:", error);
      console.error("SQL:", sql);
      console.error("Params:", params);

      const queryTime = performance.now() - startTime;
      this.updateQueryStats(queryTime, true);

      throw new DatabaseError(`Query failed: ${error.message}`, sql, params);
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction(queries) {
    try {
      this.ensureConnection();

      console.log(`Starting transaction with ${queries.length} queries`);

      await this.query("BEGIN TRANSACTION");

      const results = [];
      for (const { sql, params = [] } of queries) {
        const result = await this.executeQueryUnsafe(sql, params);
        results.push(result);
      }

      await this.query("COMMIT");

      // Save after transaction
      await this.saveDatabaseToStorage();

      console.log("Transaction completed successfully");
      return results;
    } catch (error) {
      console.error("Transaction failed, rolling back:", error);

      try {
        await this.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }

      throw error;
    }
  }

  /**
   * Execute query without auto-save (for transactions)
   */
  async executeQueryUnsafe(sql, params = []) {
    const stmt = this.db.prepare(sql);

    let results;
    if (sql.trim().toLowerCase().startsWith("select")) {
      const allResults = [];
      while (stmt.step()) {
        allResults.push(stmt.getAsObject());
      }
      results = allResults;
    } else {
      stmt.run(params);
      results = {
        changes: this.db.getRowsModified(),
        lastInsertRowid: this.db.exec("SELECT last_insert_rowid()")[0]
          ?.values[0][0],
      };
    }

    stmt.free();
    return results;
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    try {
      // Check current schema version
      let currentVersion = await this.getSchemaVersion();
      const targetVersion = await this.getTargetSchemaVersion();

      console.log(
        `Database ${this.databaseName} current version: ${currentVersion}, target: ${targetVersion}`
      );

      if (currentVersion < targetVersion) {
        console.log(
          `Running migrations from ${currentVersion} to ${targetVersion}`
        );
        await this.executeMigrations(currentVersion, targetVersion);
      }
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    }
  }

  /**
   * Get current schema version
   */
  async getSchemaVersion() {
    try {
      // Try to get version from app_settings table
      const result = await this.query(
        "SELECT value FROM app_settings WHERE key = 'storage_version'"
      );

      if (result.length > 0) {
        return parseFloat(result[0].value) || 1.0;
      }

      return 0; // No version info = new database
    } catch (error) {
      console.log("No version info found, assuming new database");
      return 0;
    }
  }

  /**
   * Get target schema version (to be overridden by subclasses)
   */
  async getTargetSchemaVersion() {
    return 1.0;
  }

  /**
   * Execute migrations (to be overridden by subclasses)
   */
  async executeMigrations(fromVersion, toVersion) {
    console.log(
      `Executing migrations for ${this.databaseName} from ${fromVersion} to ${toVersion}`
    );
    // Subclasses will implement specific migration logic
  }

  /**
   * Ensure database connection is active
   */
  ensureConnection() {
    if (!this.isConnected || !this.db) {
      throw new DatabaseError(
        "Database not connected. Call initialize() first."
      );
    }
  }

  /**
   * Handle connection errors with retry logic
   */
  async handleConnectionError(error) {
    this.connectionRetries++;

    if (this.connectionRetries <= this.maxRetries) {
      console.log(
        `Retrying connection (${this.connectionRetries}/${this.maxRetries})`
      );

      // Exponential backoff
      const delay = Math.pow(2, this.connectionRetries) * 1000;
      await this.sleep(delay);

      await this.initialize();
    } else {
      console.error(`Max retries reached for database ${this.databaseName}`);
      throw new DatabaseError(
        "Database connection failed after multiple retries",
        error
      );
    }
  }

  /**
   * Update query performance statistics
   */
  updateQueryStats(queryTime, isError = false) {
    this.queryStats.totalQueries++;
    this.queryStats.totalTime += queryTime;

    if (isError) {
      this.queryStats.errors++;
    }
  }

  /**
   * Get query performance statistics
   */
  getStats() {
    return {
      ...this.queryStats,
      averageQueryTime:
        this.queryStats.totalQueries > 0
          ? this.queryStats.totalTime / this.queryStats.totalQueries
          : 0,
      errorRate:
        this.queryStats.totalQueries > 0
          ? (this.queryStats.errors / this.queryStats.totalQueries) * 100
          : 0,
    };
  }

  /**
   * Close database connection
   */
  async close() {
    try {
      if (this.db) {
        await this.saveDatabaseToStorage();
        this.db.close();
        this.db = null;
      }

      this.isConnected = false;
      console.log(`Database ${this.databaseName} closed`);
    } catch (error) {
      console.error("Error closing database:", error);
    }
  }

  /**
   * Backup database
   */
  async backup() {
    try {
      this.ensureConnection();

      const data = this.db.export();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${this.databaseName}_backup_${timestamp}.db`;

      // Save backup to Downloads folder
      const blob = new Blob([data], { type: "application/x-sqlite3" });
      const url = URL.createObjectURL(blob);

      const downloadId = await new Promise((resolve, reject) => {
        chrome.downloads.download(
          {
            url: url,
            filename: `cursor_backups/${filename}`,
            saveAs: false,
          },
          (id) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(id);
            }
          }
        );
      });

      URL.revokeObjectURL(url);

      console.log(`Database backup created: ${filename}`);
      return { filename, downloadId };
    } catch (error) {
      console.error("Backup failed:", error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restore(backupData) {
    try {
      console.log(`Restoring database ${this.databaseName} from backup`);

      // Close current connection
      await this.close();

      // Create new database from backup data
      if (typeof initSqlJs === "undefined") {
        throw new Error("SQL.js library not loaded");
      }

      const SQL = await initSqlJs({
        locateFile: (file) => `/libs/sql-wasm.wasm`,
      });

      this.db = new SQL.Database(backupData);
      this.isConnected = true;

      // Save to storage
      await this.saveDatabaseToStorage();

      console.log(`Database ${this.databaseName} restored successfully`);
    } catch (error) {
      console.error("Restore failed:", error);
      throw error;
    }
  }

  /**
   * Utility function for async sleep
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check for database
   */
  async healthCheck() {
    try {
      await this.query("SELECT 1 as health");
      return {
        status: "healthy",
        connected: this.isConnected,
        stats: this.getStats(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        connected: false,
        error: error.message,
      };
    }
  }
}

/**
 * Custom Database Error class
 */
class DatabaseError extends Error {
  constructor(message, sql = null, params = null) {
    super(message);
    this.name = "DatabaseError";
    this.sql = sql;
    this.params = params;
    this.timestamp = new Date().toISOString();
  }
}

// Export untuk digunakan oleh service lain
if (typeof module !== "undefined") {
  module.exports = { BaseDatabaseService, DatabaseError };
}

// For service worker context
if (typeof self !== "undefined") {
  self.BaseDatabaseService = BaseDatabaseService;
  self.DatabaseError = DatabaseError;
}

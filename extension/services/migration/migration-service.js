/**
 * 🔄 Migration Service Orchestrator
 * Mengelola proses migrasi dari Chrome Local Storage ke SQLite
 *
 * ⚠️ DEPRECATED: This service is only for one-time migration during upgrade.
 * In SQLite-only mode, this service should not be used for regular operations.
 *
 * Features:
 * - Orchestrate complete migration process
 * - Data backup and validation
 * - Rollback capability
 * - Progress tracking
 * - Error handling and recovery
 */

class MigrationService {
  constructor() {
    this.databaseManager = null;
    this.accountsMigrator = null;
    this.cardsMigrator = null;
    this.validator = null;

    this.migrationState = {
      isRunning: false,
      currentStep: null,
      progress: 0,
      errors: [],
      startTime: null,
      backup: null,
    };

    this.steps = [
      { name: "backup", weight: 10 },
      { name: "accounts", weight: 40 },
      { name: "cards", weight: 30 },
      { name: "validation", weight: 15 },
      { name: "cleanup", weight: 5 },
    ];
  }

  /**
   * Initialize migration service
   */
  async initialize() {
    try {
      console.log("🔄 Initializing Migration Service...");

      // Initialize database manager
      this.databaseManager = DatabaseManager.getInstance();
      await this.databaseManager.initialize();

      // Initialize migrators
      this.accountsMigrator = new AccountsMigrator(this.databaseManager);
      this.cardsMigrator = new CardsMigrator(this.databaseManager);
      this.validator = new ValidationService(this.databaseManager);

      console.log("✅ Migration Service initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Migration Service:", error);
      throw error;
    }
  }

  /**
   * Check if migration is needed
   */
  async isMigrationNeeded() {
    try {
      // Check if we already have SQLite data
      const accountsDB = this.databaseManager.getAccountsDB();
      const cardsDB = this.databaseManager.getCardsDB();

      const [accounts, cards] = await Promise.all([
        accountsDB.getAllAccounts(),
        cardsDB.getAllCards(),
      ]);

      // If we have data in SQLite, migration is probably done
      if (accounts.length > 0 || cards.length > 0) {
        return false;
      }

      // Check if we have legacy data
      const legacyData = await chrome.storage.local.get([
        "cursor_accounts",
        "cursor_payment_cards",
      ]);

      const hasLegacyAccounts =
        legacyData.cursor_accounts &&
        Object.keys(legacyData.cursor_accounts).length > 0;

      const hasLegacyCards =
        legacyData.cursor_payment_cards &&
        Array.isArray(legacyData.cursor_payment_cards) &&
        legacyData.cursor_payment_cards.length > 0;

      return hasLegacyAccounts || hasLegacyCards;
    } catch (error) {
      console.error("❌ Error checking migration status:", error);
      return true; // Assume migration needed if we can't check
    }
  }

  /**
   * Start migration process
   * ⚠️ DEPRECATED: Should only be used for one-time upgrade migration
   */
  async migrate(options = {}) {
    // ✅ Fix: Warn if used in SQLite-only mode
    console.warn(
      "⚠️ MigrationService is deprecated in SQLite-only mode. This should only be used for one-time upgrade migration."
    );

    if (this.migrationState.isRunning) {
      throw new Error("Migration is already running");
    }

    const migrationId = `migration_${Date.now()}`;
    console.log(`🚀 Starting migration: ${migrationId}`);

    this.migrationState = {
      isRunning: true,
      currentStep: null,
      progress: 0,
      errors: [],
      startTime: Date.now(),
      backup: null,
      migrationId,
      options,
    };

    try {
      // Step 1: Create backup
      await this.executeStep("backup", async () => {
        this.migrationState.backup = await this.createBackup();
        return this.migrationState.backup;
      });

      // Step 2: Migrate accounts
      const accountsResult = await this.executeStep("accounts", async () => {
        return await this.accountsMigrator.migrate();
      });

      // Step 3: Migrate cards
      const cardsResult = await this.executeStep("cards", async () => {
        return await this.cardsMigrator.migrate();
      });

      // Step 4: Validate migration
      const validationResult = await this.executeStep(
        "validation",
        async () => {
          return await this.validator.validateMigration(
            accountsResult,
            cardsResult
          );
        }
      );

      if (!validationResult.success) {
        throw new Error(
          `Migration validation failed: ${validationResult.errors.join(", ")}`
        );
      }

      // Step 5: Cleanup and finalize
      await this.executeStep("cleanup", async () => {
        await this.finalizeMigration();
        return { cleaned: true };
      });

      const totalTime = Date.now() - this.migrationState.startTime;

      const result = {
        success: true,
        migrationId,
        totalTime,
        accounts: accountsResult,
        cards: cardsResult,
        validation: validationResult,
        backup: this.migrationState.backup,
      };

      console.log(`✅ Migration completed successfully in ${totalTime}ms`);
      this.logMigrationEvent("migration_completed", result);

      return result;
    } catch (error) {
      console.error("❌ Migration failed:", error);

      // Attempt rollback
      try {
        await this.rollback();
      } catch (rollbackError) {
        console.error("❌ Rollback also failed:", rollbackError);
        this.migrationState.errors.push({
          step: "rollback",
          error: rollbackError.message,
        });
      }

      this.logMigrationEvent("migration_failed", {
        error: error.message,
        errors: this.migrationState.errors,
      });

      throw error;
    } finally {
      this.migrationState.isRunning = false;
    }
  }

  /**
   * Execute a migration step with progress tracking
   */
  async executeStep(stepName, stepFunction) {
    try {
      console.log(`📋 Executing step: ${stepName}`);
      this.migrationState.currentStep = stepName;

      const stepStartTime = Date.now();
      const result = await stepFunction();
      const stepTime = Date.now() - stepStartTime;

      // Update progress
      const step = this.steps.find((s) => s.name === stepName);
      if (step) {
        this.migrationState.progress += step.weight;
      }

      console.log(`✅ Step ${stepName} completed in ${stepTime}ms`);

      this.logMigrationEvent(`step_${stepName}_completed`, {
        stepTime,
        result,
        progress: this.migrationState.progress,
      });

      return result;
    } catch (error) {
      console.error(`❌ Step ${stepName} failed:`, error);

      this.migrationState.errors.push({
        step: stepName,
        error: error.message,
        timestamp: Date.now(),
      });

      this.logMigrationEvent(`step_${stepName}_failed`, {
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Create backup of current data
   */
  async createBackup() {
    console.log("💾 Creating backup of current data...");

    try {
      const allData = await chrome.storage.local.get(null);
      const backupData = {
        timestamp: new Date().toISOString(),
        version: "1.0",
        data: allData,
      };

      // Save backup file to Downloads
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const filename = `cursor_migration_backup_${Date.now()}.json`;

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

      console.log(`✅ Backup created: ${filename}`);

      return {
        downloadId,
        filename,
        data: backupData,
      };
    } catch (error) {
      console.error("❌ Backup creation failed:", error);
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Rollback to previous state
   */
  async rollback() {
    console.log("⏪ Starting rollback process...");

    try {
      if (!this.migrationState.backup) {
        throw new Error("No backup available for rollback");
      }

      // Clear current SQLite data
      await this.databaseManager.close();

      // Clear SQLite data from Chrome storage
      const sqliteKeys = await chrome.storage.local.get(null);
      const keysToRemove = Object.keys(sqliteKeys).filter((key) =>
        key.startsWith("sqlite_")
      );

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }

      // Restore original data
      await chrome.storage.local.clear();
      await chrome.storage.local.set(this.migrationState.backup.data); // ✅ Fix: Remove double .data

      // Clear migration flags
      await chrome.storage.local.set({
        migration_completed: false,
        use_sqlite_storage: false,
      });

      console.log("✅ Rollback completed successfully");

      this.logMigrationEvent("rollback_completed", {
        backupFile: this.migrationState.backup.filename,
      });
    } catch (error) {
      console.error("❌ Rollback failed:", error);
      throw error;
    }
  }

  /**
   * Finalize migration
   */
  async finalizeMigration() {
    console.log("🎯 Finalizing migration...");

    try {
      // Set migration flags
      await chrome.storage.local.set({
        migration_completed: true,
        use_sqlite_storage: true,
        migration_date: new Date().toISOString(),
        migration_id: this.migrationState.migrationId,
      });

      // Optional: Clean up old Chrome storage data
      if (this.migrationState.options.cleanupOldData !== false) {
        await this.cleanupLegacyData();
      }

      console.log("✅ Migration finalized successfully");
    } catch (error) {
      console.error("❌ Migration finalization failed:", error);
      throw error;
    }
  }

  /**
   * Clean up legacy Chrome storage data
   */
  async cleanupLegacyData() {
    console.log("🧹 Cleaning up legacy data...");

    try {
      const legacyKeys = [
        "cursor_accounts",
        "cursor_accounts:avatars",
        "cursor_accounts:info",
        "cursor_active_account",
        "cursor_payment_cards",
        "account_downloads",
      ];

      await chrome.storage.local.remove(legacyKeys);
      console.log("✅ Legacy data cleaned up");
    } catch (error) {
      console.warn("⚠️ Failed to clean legacy data:", error);
      // Not critical - don't throw
    }
  }

  /**
   * Get migration progress
   */
  getMigrationProgress() {
    return {
      isRunning: this.migrationState.isRunning,
      currentStep: this.migrationState.currentStep,
      progress: this.migrationState.progress,
      errors: this.migrationState.errors,
      startTime: this.migrationState.startTime,
      elapsed: this.migrationState.startTime
        ? Date.now() - this.migrationState.startTime
        : 0,
    };
  }

  /**
   * Log migration events
   */
  logMigrationEvent(event, data = {}) {
    const logData = {
      event,
      migrationId: this.migrationState.migrationId,
      timestamp: new Date().toISOString(),
      ...data,
    };

    console.log(`📊 Migration Event: ${event}`, logData);

    // Store in Chrome storage for debugging
    chrome.storage.local.get("migration_events", (result) => {
      const events = result.migration_events || [];
      events.push(logData);

      // Keep only last 50 migration events
      if (events.length > 50) {
        events.splice(0, events.length - 50);
      }

      chrome.storage.local.set({ migration_events: events });
    });
  }
}

// Export untuk digunakan di extension
if (typeof module !== "undefined") {
  module.exports = MigrationService;
}

// For service worker context
if (typeof self !== "undefined") {
  self.MigrationService = MigrationService;
}

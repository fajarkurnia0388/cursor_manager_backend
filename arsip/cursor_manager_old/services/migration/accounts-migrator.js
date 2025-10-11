/**
 * 👥 Accounts Migrator
 * Mengelola migrasi data accounts dari Chrome Local Storage ke SQLite
 *
 * Features:
 * - Migrate accounts data from Chrome storage
 * - Handle cookies normalization
 * - Preserve account settings and metadata
 * - Error handling and recovery
 * - Progress tracking
 */

class AccountsMigrator {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
    this.dbService = null;
  }

  /**
   * Initialize accounts migrator
   */
  async initialize() {
    this.dbService = this.databaseManager.getAccountsDB();
  }

  /**
   * Migrate all accounts data
   */
  async migrate() {
    console.log("👥 Starting accounts migration...");

    if (!this.dbService) {
      await this.initialize();
    }

    const startTime = Date.now();
    let migratedCount = 0;
    const errors = [];
    const results = {
      totalAccounts: 0,
      migratedAccounts: 0,
      skippedAccounts: 0,
      errors: [],
      migrationTime: 0,
    };

    try {
      // Get existing data from Chrome storage
      const [accounts, avatars, infos, activeAccount, downloads] =
        await Promise.all([
          chrome.storage.local.get("cursor_accounts"),
          chrome.storage.local.get("cursor_accounts:avatars"),
          chrome.storage.local.get("cursor_accounts:info"),
          chrome.storage.local.get("cursor_active_account"),
          chrome.storage.local.get("account_downloads"),
        ]);

      const accountsData = accounts.cursor_accounts || {};
      const avatarsData = avatars["cursor_accounts:avatars"] || {};
      const infosData = infos["cursor_accounts:info"] || {};
      const activeAccountName = activeAccount.cursor_active_account;
      const downloadsData = downloads.account_downloads || {};

      results.totalAccounts = Object.keys(accountsData).length;

      if (results.totalAccounts === 0) {
        console.log("ℹ️ No accounts to migrate");
        return results;
      }

      console.log(`📊 Found ${results.totalAccounts} accounts to migrate`);

      // Migrate each account
      for (const [accountName, cookies] of Object.entries(accountsData)) {
        try {
          await this.migrateAccount(
            accountName,
            cookies,
            infosData[accountName],
            avatarsData[accountName],
            downloadsData[accountName]
          );

          migratedCount++;
          console.log(`✅ Migrated account: ${accountName}`);
        } catch (error) {
          console.error(`❌ Failed to migrate account ${accountName}:`, error);
          errors.push({
            account: accountName,
            error: error.message,
            timestamp: Date.now(),
          });
          results.skippedAccounts++;
        }
      }

      // Set active account if exists
      if (activeAccountName && migratedCount > 0) {
        try {
          await this.dbService.setActiveAccount(activeAccountName);
          console.log(`🎯 Set active account: ${activeAccountName}`);
        } catch (error) {
          console.warn(`⚠️ Failed to set active account: ${error.message}`);
          errors.push({
            account: activeAccountName,
            error: `Failed to set as active: ${error.message}`,
            timestamp: Date.now(),
          });
        }
      }

      const migrationTime = Date.now() - startTime;

      results.migratedAccounts = migratedCount;
      results.errors = errors;
      results.migrationTime = migrationTime;

      console.log(
        `✅ Accounts migration completed: ${migratedCount}/${results.totalAccounts} in ${migrationTime}ms`
      );

      return results;
    } catch (error) {
      console.error("❌ Accounts migration failed:", error);
      throw new Error(`Accounts migration failed: ${error.message}`);
    }
  }

  /**
   * Migrate single account
   */
  async migrateAccount(
    accountName,
    cookies,
    accountInfo,
    avatarUrl,
    downloadId
  ) {
    try {
      // Extract account information
      const email = accountInfo?.email || accountName;
      const status = accountInfo?.status || "";

      // Validate cookies
      const validCookies = this.validateCookies(cookies);

      // Migrate account to SQLite
      await this.dbService.upsertAccount(
        accountName,
        email,
        status,
        avatarUrl || null,
        validCookies
      );

      // Migrate download tracking if exists
      if (downloadId) {
        await this.migrateDownloadRecord(accountName, downloadId);
      }

      console.log(`📦 Account ${accountName} migrated successfully`);
    } catch (error) {
      console.error(`❌ Error migrating account ${accountName}:`, error);
      throw error;
    }
  }

  /**
   * Validate and normalize cookies
   */
  validateCookies(cookies) {
    if (!Array.isArray(cookies)) {
      console.warn("⚠️ Invalid cookies format, expected array");
      return [];
    }

    const validCookies = [];

    for (const cookie of cookies) {
      try {
        // Validate required fields
        if (!cookie.name || !cookie.domain) {
          console.warn(
            "⚠️ Skipping invalid cookie (missing name or domain):",
            cookie
          );
          continue;
        }

        // Normalize cookie data
        const normalizedCookie = {
          domain: cookie.domain,
          name: cookie.name,
          value: cookie.value || "",
          path: cookie.path || "/",
          expirationDate: this.normalizeExpirationDate(cookie.expirationDate),
          hostOnly: Boolean(cookie.hostOnly),
          httpOnly: Boolean(cookie.httpOnly),
          secure: Boolean(cookie.secure),
          session: Boolean(cookie.session),
          sameSite: cookie.sameSite || null,
          storeId: cookie.storeId || null,
        };

        validCookies.push(normalizedCookie);
      } catch (error) {
        console.warn("⚠️ Skipping invalid cookie:", cookie, error);
      }
    }

    return validCookies;
  }

  /**
   * Normalize expiration date
   */
  normalizeExpirationDate(expirationDate) {
    if (!expirationDate) return null;

    // Convert to number if string
    if (typeof expirationDate === "string") {
      const parsed = parseFloat(expirationDate);
      return isNaN(parsed) ? null : parsed;
    }

    // Validate number
    if (typeof expirationDate === "number" && expirationDate > 0) {
      return expirationDate;
    }

    return null;
  }

  /**
   * Migrate download record
   */
  async migrateDownloadRecord(accountName, downloadId) {
    try {
      // Note: SQLite schema doesn't have account_downloads table in the current design
      // This is for future implementation if needed
      console.log(`📥 Download record for ${accountName}: ${downloadId}`);

      // For now, we can store this in app_settings or create the table if needed
      // This is a placeholder implementation
    } catch (error) {
      console.warn(
        `⚠️ Failed to migrate download record for ${accountName}:`,
        error
      );
      // Not critical - don't throw
    }
  }

  /**
   * Get migration statistics from Chrome storage
   */
  async getPreMigrationStats() {
    try {
      const [accounts, avatars, infos] = await Promise.all([
        chrome.storage.local.get("cursor_accounts"),
        chrome.storage.local.get("cursor_accounts:avatars"),
        chrome.storage.local.get("cursor_accounts:info"),
      ]);

      const accountsData = accounts.cursor_accounts || {};
      const avatarsData = avatars["cursor_accounts:avatars"] || {};
      const infosData = infos["cursor_accounts:info"] || {};

      const stats = {
        totalAccounts: Object.keys(accountsData).length,
        accountsWithAvatars: Object.keys(avatarsData).length,
        accountsWithInfo: Object.keys(infosData).length,
        totalCookies: 0,
        accountsByStatus: {},
      };

      // Count cookies and analyze data
      for (const [accountName, cookies] of Object.entries(accountsData)) {
        if (Array.isArray(cookies)) {
          stats.totalCookies += cookies.length;
        }

        const accountInfo = infosData[accountName];
        if (accountInfo?.status) {
          stats.accountsByStatus[accountInfo.status] =
            (stats.accountsByStatus[accountInfo.status] || 0) + 1;
        }
      }

      return stats;
    } catch (error) {
      console.error("❌ Error getting pre-migration stats:", error);
      return {
        totalAccounts: 0,
        accountsWithAvatars: 0,
        accountsWithInfo: 0,
        totalCookies: 0,
        accountsByStatus: {},
      };
    }
  }

  /**
   * Verify migration success
   */
  async verifyMigration() {
    try {
      console.log("🔍 Verifying accounts migration...");

      // Get pre-migration stats
      const preStats = await this.getPreMigrationStats();

      // Get post-migration stats from SQLite
      const postStats = await this.dbService.getDatabaseStats();

      const verification = {
        success: true,
        issues: [],
        preMigration: preStats,
        postMigration: {
          totalAccounts: postStats.total_accounts || 0,
          activesAccounts: postStats.active_accounts || 0,
          totalCookies: postStats.total_cookies || 0,
        },
      };

      // Check if account counts match
      if (preStats.totalAccounts !== verification.postMigration.totalAccounts) {
        verification.issues.push(
          `Account count mismatch: expected ${preStats.totalAccounts}, got ${verification.postMigration.totalAccounts}`
        );
      }

      // Check if we have reasonable cookie count
      if (
        preStats.totalCookies > 0 &&
        verification.postMigration.totalCookies === 0
      ) {
        verification.issues.push("No cookies found in migrated data");
      }

      if (verification.issues.length > 0) {
        verification.success = false;
        console.warn("⚠️ Migration verification issues:", verification.issues);
      } else {
        console.log("✅ Accounts migration verification passed");
      }

      return verification;
    } catch (error) {
      console.error("❌ Migration verification failed:", error);
      return {
        success: false,
        issues: [`Verification failed: ${error.message}`],
        preMigration: {},
        postMigration: {},
      };
    }
  }
}

// Export untuk digunakan di extension
if (typeof module !== "undefined") {
  module.exports = AccountsMigrator;
}

// For service worker context
if (typeof self !== "undefined") {
  self.AccountsMigrator = AccountsMigrator;
}



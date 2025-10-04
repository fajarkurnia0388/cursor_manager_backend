/**
 * 👥 Accounts Database Service
 * Mengelola operasi database untuk akun Cursor
 *
 * Features:
 * - CRUD operations untuk accounts
 * - Cookie management
 * - Account switching
 * - Duplicate detection
 * - Import/export functionality
 */

class AccountsDatabaseService extends BaseDatabaseService {
  constructor() {
    super("cursor_accounts");
    this.SCHEMA_VERSION = 1.0;
  }

  /**
   * Get target schema version
   */
  async getTargetSchemaVersion() {
    return this.SCHEMA_VERSION;
  }

  /**
   * Execute migrations for accounts database
   */
  async executeMigrations(fromVersion, toVersion) {
    console.log(
      `Migrating accounts database from ${fromVersion} to ${toVersion}`
    );

    if (fromVersion === 0) {
      // Initial schema creation
      await this.createInitialSchema();
    }

    // Add future migration logic here
    // if (fromVersion < 1.1) { ... }

    // Update version
    await this.query(
      "INSERT OR REPLACE INTO app_settings (key, value, type, description) VALUES (?, ?, ?, ?)",
      [
        "storage_version",
        toVersion.toString(),
        "string",
        "Database schema version",
      ]
    );
  }

  /**
   * Create initial database schema
   */
  async createInitialSchema() {
    const schema = `
      -- Create accounts table
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        status TEXT DEFAULT '',
        avatar_url TEXT,
        is_active BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used DATETIME,
        expires_at DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create account_cookies table
      CREATE TABLE IF NOT EXISTS account_cookies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_name TEXT NOT NULL,
        domain TEXT NOT NULL,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        path TEXT DEFAULT '/',
        expiration_date REAL,
        host_only BOOLEAN DEFAULT TRUE,
        http_only BOOLEAN DEFAULT FALSE,
        secure BOOLEAN DEFAULT FALSE,
        session BOOLEAN DEFAULT FALSE,
        same_site TEXT,
        store_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_name) REFERENCES accounts(name) ON DELETE CASCADE,
        UNIQUE(account_name, domain, name, path)
      );

      -- Create app_settings table
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        type TEXT DEFAULT 'string',
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create account_downloads table
      CREATE TABLE IF NOT EXISTS account_downloads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_name TEXT NOT NULL,
        download_id INTEGER NOT NULL,
        filename TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_name) REFERENCES accounts(name) ON DELETE CASCADE,
        UNIQUE(account_name, download_id)
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
      CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
      CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active) WHERE is_active = TRUE;
      CREATE INDEX IF NOT EXISTS idx_cookies_account ON account_cookies(account_name);
      CREATE INDEX IF NOT EXISTS idx_cookies_domain ON account_cookies(domain);
      CREATE INDEX IF NOT EXISTS idx_cookies_expiration ON account_cookies(expiration_date);

      -- Create triggers
      CREATE TRIGGER IF NOT EXISTS accounts_updated_at 
      AFTER UPDATE ON accounts
      BEGIN
        UPDATE accounts SET updated_at = CURRENT_TIMESTAMP WHERE name = NEW.name;
      END;

      CREATE TRIGGER IF NOT EXISTS cookies_updated_at 
      AFTER UPDATE ON account_cookies
      BEGIN
        UPDATE account_cookies SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TRIGGER IF NOT EXISTS update_account_last_used
      AFTER UPDATE ON account_cookies
      BEGIN
        UPDATE accounts 
        SET last_used = CURRENT_TIMESTAMP 
        WHERE name = NEW.account_name;
      END;

      -- Create views
      CREATE VIEW IF NOT EXISTS accounts_with_cookies AS
      SELECT 
        a.id,
        a.name,
        a.email,
        a.status,
        a.avatar_url,
        a.is_active,
        a.created_at,
        a.last_used,
        a.expires_at,
        a.updated_at,
        COUNT(c.id) as cookie_count,
        MIN(c.expiration_date) as earliest_cookie_expiry,
        MAX(c.expiration_date) as latest_cookie_expiry
      FROM accounts a
      LEFT JOIN account_cookies c ON a.name = c.account_name
      GROUP BY a.name;

      CREATE VIEW IF NOT EXISTS active_account AS
      SELECT 
        a.id,
        a.name,
        a.email,
        a.status,
        a.avatar_url,
        a.created_at,
        a.last_used,
        a.expires_at,
        COUNT(c.id) as cookie_count
      FROM accounts a
      LEFT JOIN account_cookies c ON a.name = c.account_name
      WHERE a.is_active = TRUE
      GROUP BY a.name;
    `;

    // Execute schema creation in transaction
    const statements = schema.split(";").filter((stmt) => stmt.trim());
    await this.transaction(statements.map((sql) => ({ sql })));

    // Insert default settings
    await this.insertDefaultSettings();
  }

  /**
   * Insert default app settings
   */
  async insertDefaultSettings() {
    const defaultSettings = [
      ["storage_version", "1.0", "string", "Version of database schema"],
      ["active_account", "", "string", "Currently active account name"],
      [
        "auto_export_enabled",
        "true",
        "boolean",
        "Auto export accounts to Downloads folder",
      ],
      ["theme", "dark", "string", "UI theme preference"],
      ["debug_mode", "false", "boolean", "Enable debug mode"],
      [
        "consolidate_duplicates",
        "true",
        "boolean",
        "Automatically consolidate duplicate accounts",
      ],
      [
        "backup_retention_days",
        "30",
        "number",
        "Number of days to keep backups",
      ],
    ];

    for (const [key, value, type, description] of defaultSettings) {
      await this.query(
        "INSERT OR IGNORE INTO app_settings (key, value, type, description) VALUES (?, ?, ?, ?)",
        [key, value, type, description]
      );
    }
  }

  // ===========================================
  // ACCOUNT MANAGEMENT METHODS
  // ===========================================

  /**
   * Get all accounts with cookie information
   */
  async getAllAccounts() {
    try {
      const accounts = await this.query(`
        SELECT * FROM accounts_with_cookies 
        ORDER BY last_used DESC, created_at DESC
      `);

      // Convert cookie counts to numbers and format dates
      return accounts.map((account) => ({
        ...account,
        cookie_count: Number(account.cookie_count) || 0,
        is_active: Boolean(account.is_active),
        created_at: account.created_at ? new Date(account.created_at) : null,
        last_used: account.last_used ? new Date(account.last_used) : null,
        expires_at: account.expires_at ? new Date(account.expires_at) : null,
        earliest_cookie_expiry: account.earliest_cookie_expiry
          ? new Date(account.earliest_cookie_expiry * 1000)
          : null,
      }));
    } catch (error) {
      console.error("Error getting all accounts:", error);
      throw error;
    }
  }

  /**
   * Get account by name
   */
  async getAccount(accountName) {
    try {
      const accounts = await this.query(
        "SELECT * FROM accounts_with_cookies WHERE name = ?",
        [accountName]
      );

      if (accounts.length === 0) {
        return null;
      }

      const account = accounts[0];

      // Get cookies for this account
      const cookies = await this.getAccountCookies(accountName);

      return {
        ...account,
        cookies,
        is_active: Boolean(account.is_active),
        cookie_count: Number(account.cookie_count) || 0,
        created_at: account.created_at ? new Date(account.created_at) : null,
        last_used: account.last_used ? new Date(account.last_used) : null,
        expires_at: account.expires_at ? new Date(account.expires_at) : null,
      };
    } catch (error) {
      console.error("Error getting account:", error);
      throw error;
    }
  }

  /**
   * Create or update account
   */
  async upsertAccount(
    accountName,
    email,
    status = "",
    avatarUrl = null,
    cookies = []
  ) {
    try {
      await this.transaction([
        // Insert or update account
        {
          sql: `
            INSERT INTO accounts (name, email, status, avatar_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(name) DO UPDATE SET
              email = excluded.email,
              status = CASE 
                WHEN excluded.status != '' THEN excluded.status 
                ELSE accounts.status 
              END,
              avatar_url = COALESCE(excluded.avatar_url, accounts.avatar_url),
              updated_at = CURRENT_TIMESTAMP
          `,
          params: [accountName, email, status, avatarUrl],
        },
        // Delete old cookies
        {
          sql: "DELETE FROM account_cookies WHERE account_name = ?",
          params: [accountName],
        },
      ]);

      // Insert new cookies if provided
      if (cookies && cookies.length > 0) {
        await this.insertAccountCookies(accountName, cookies);
      }

      // Update expires_at based on earliest cookie expiry
      await this.updateAccountExpiryDate(accountName);

      // Set as active if it's the first account
      const activeAccount = await this.getActiveAccount();
      if (!activeAccount) {
        await this.setActiveAccount(accountName);
      }

      return await this.getAccount(accountName);
    } catch (error) {
      console.error("Error upserting account:", error);
      throw error;
    }
  }

  /**
   * Remove account
   */
  async removeAccount(accountName, deleteDownloads = false) {
    try {
      await this.transaction([
        // Remove account (cookies will be deleted by CASCADE)
        {
          sql: "DELETE FROM accounts WHERE name = ?",
          params: [accountName],
        },
        // Remove download records
        {
          sql: "DELETE FROM account_downloads WHERE account_name = ?",
          params: [accountName],
        },
      ]);

      // Clear active account if this was the active one
      const activeAccount = await this.getActiveAccount();
      if (activeAccount === accountName) {
        await this.setSetting("active_account", "");
      }

      console.log(`Account ${accountName} removed successfully`);
      return true;
    } catch (error) {
      console.error("Error removing account:", error);
      throw error;
    }
  }

  /**
   * Get active account name
   */
  async getActiveAccount() {
    try {
      const result = await this.getSetting("active_account");
      return result || null;
    } catch (error) {
      console.error("Error getting active account:", error);
      return null;
    }
  }

  /**
   * Set active account
   */
  async setActiveAccount(accountName) {
    try {
      // Deactivate all accounts
      await this.query("UPDATE accounts SET is_active = FALSE");

      // Activate the specified account
      if (accountName) {
        await this.query(
          "UPDATE accounts SET is_active = TRUE WHERE name = ?",
          [accountName]
        );
        await this.setSetting("active_account", accountName);
      } else {
        await this.setSetting("active_account", "");
      }

      console.log(`Active account set to: ${accountName || "none"}`);
    } catch (error) {
      console.error("Error setting active account:", error);
      throw error;
    }
  }

  // ===========================================
  // COOKIE MANAGEMENT METHODS
  // ===========================================

  /**
   * Get cookies for an account
   */
  async getAccountCookies(accountName) {
    try {
      const cookies = await this.query(
        "SELECT * FROM account_cookies WHERE account_name = ? ORDER BY domain, name",
        [accountName]
      );

      // Convert to expected cookie format
      return cookies.map((cookie) => ({
        domain: cookie.domain,
        name: cookie.name,
        value: cookie.value,
        path: cookie.path,
        expirationDate: cookie.expiration_date,
        hostOnly: Boolean(cookie.host_only),
        httpOnly: Boolean(cookie.http_only),
        secure: Boolean(cookie.secure),
        session: Boolean(cookie.session),
        sameSite: cookie.same_site,
        storeId: cookie.store_id,
      }));
    } catch (error) {
      console.error("Error getting account cookies:", error);
      throw error;
    }
  }

  /**
   * Insert cookies for an account
   */
  async insertAccountCookies(accountName, cookies) {
    try {
      const queries = cookies.map((cookie) => ({
        sql: `
          INSERT INTO account_cookies (
            account_name, domain, name, value, path, expiration_date,
            host_only, http_only, secure, session, same_site, store_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        params: [
          accountName,
          cookie.domain,
          cookie.name,
          cookie.value,
          cookie.path || "/",
          cookie.expirationDate,
          cookie.hostOnly ? 1 : 0,
          cookie.httpOnly ? 1 : 0,
          cookie.secure ? 1 : 0,
          cookie.session ? 1 : 0,
          cookie.sameSite,
          cookie.storeId,
        ],
      }));

      await this.transaction(queries);
      console.log(
        `Inserted ${cookies.length} cookies for account ${accountName}`
      );
    } catch (error) {
      console.error("Error inserting account cookies:", error);
      throw error;
    }
  }

  /**
   * Update account expiry date based on cookies
   */
  async updateAccountExpiryDate(accountName) {
    try {
      await this.query(
        `
        UPDATE accounts 
        SET expires_at = CASE 
          WHEN (
            SELECT MIN(expiration_date) 
            FROM account_cookies 
            WHERE account_name = ? AND expiration_date IS NOT NULL
          ) IS NOT NULL 
          THEN datetime((
            SELECT MIN(expiration_date) 
            FROM account_cookies 
            WHERE account_name = ? AND expiration_date IS NOT NULL
          ), 'unixepoch')
          ELSE NULL 
        END
        WHERE name = ?
      `,
        [accountName, accountName, accountName]
      );
    } catch (error) {
      console.error("Error updating account expiry date:", error);
    }
  }

  // ===========================================
  // SETTINGS METHODS
  // ===========================================

  /**
   * Get app setting
   */
  async getSetting(key) {
    try {
      const result = await this.query(
        "SELECT value, type FROM app_settings WHERE key = ?",
        [key]
      );

      if (result.length === 0) {
        return null;
      }

      const { value, type } = result[0];

      // Convert based on type
      switch (type) {
        case "boolean":
          return value === "true";
        case "number":
          return Number(value);
        case "json":
          return JSON.parse(value);
        default:
          return value;
      }
    } catch (error) {
      console.error("Error getting setting:", error);
      return null;
    }
  }

  /**
   * Set app setting
   */
  async setSetting(key, value, type = null) {
    try {
      // Auto-detect type if not provided
      if (!type) {
        if (typeof value === "boolean") type = "boolean";
        else if (typeof value === "number") type = "number";
        else if (typeof value === "object") type = "json";
        else type = "string";
      }

      // Convert value to string for storage
      let stringValue;
      if (type === "json") {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = String(value);
      }

      await this.query(
        `
        INSERT INTO app_settings (key, value, type, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          type = excluded.type,
          updated_at = CURRENT_TIMESTAMP
      `,
        [key, stringValue, type]
      );

      console.log(`Setting ${key} updated to: ${stringValue}`);
    } catch (error) {
      console.error("Error setting app setting:", error);
      throw error;
    }
  }

  // ===========================================
  // SEARCH AND FILTER METHODS
  // ===========================================

  /**
   * Search accounts by email or name
   */
  async searchAccounts(searchTerm) {
    try {
      if (!searchTerm) {
        return await this.getAllAccounts();
      }

      const accounts = await this.query(
        `
        SELECT * FROM accounts_with_cookies 
        WHERE name LIKE ? OR email LIKE ?
        ORDER BY last_used DESC, created_at DESC
      `,
        [`%${searchTerm}%`, `%${searchTerm}%`]
      );

      return accounts.map((account) => ({
        ...account,
        cookie_count: Number(account.cookie_count) || 0,
        is_active: Boolean(account.is_active),
      }));
    } catch (error) {
      console.error("Error searching accounts:", error);
      throw error;
    }
  }

  /**
   * Filter accounts by status
   */
  async getAccountsByStatus(status) {
    try {
      const accounts = await this.query(
        `
        SELECT * FROM accounts_with_cookies 
        WHERE status = ?
        ORDER BY last_used DESC, created_at DESC
      `,
        [status]
      );

      return accounts.map((account) => ({
        ...account,
        cookie_count: Number(account.cookie_count) || 0,
        is_active: Boolean(account.is_active),
      }));
    } catch (error) {
      console.error("Error filtering accounts by status:", error);
      throw error;
    }
  }

  // ===========================================
  // DUPLICATE DETECTION METHODS
  // ===========================================

  /**
   * Find duplicate account by session token
   */
  async findDuplicateAccount(cookies) {
    try {
      // Extract session token from cookies
      const sessionToken = this.extractSessionToken(cookies);
      if (!sessionToken) {
        return null;
      }

      // Find accounts with the same session token
      const result = await this.query(
        `
        SELECT DISTINCT a.name, a.email, a.status
        FROM accounts a
        JOIN account_cookies c ON a.name = c.account_name
        WHERE c.name IN ('WorkosCursorSessionToken', 'SessionToken')
          AND c.value = ?
      `,
        [sessionToken]
      );

      if (result.length > 0) {
        return {
          source: "database",
          account: result[0],
        };
      }

      return null;
    } catch (error) {
      console.error("Error finding duplicate account:", error);
      return null;
    }
  }

  /**
   * Extract session token from cookies
   */
  extractSessionToken(cookies) {
    const sessionCookie = cookies.find(
      (c) => c.name === "WorkosCursorSessionToken" || c.name === "SessionToken"
    );
    return sessionCookie ? sessionCookie.value : null;
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const stats = await this.query(`
        SELECT 
          (SELECT COUNT(*) FROM accounts) as total_accounts,
          (SELECT COUNT(*) FROM accounts WHERE is_active = TRUE) as active_accounts,
          (SELECT COUNT(*) FROM account_cookies) as total_cookies,
          (SELECT COUNT(DISTINCT status) FROM accounts WHERE status != '') as unique_statuses,
          (SELECT COUNT(*) FROM accounts WHERE last_used > datetime('now', '-30 days')) as recent_activity
      `);

      return {
        ...stats[0],
        queryStats: this.getStats(),
      };
    } catch (error) {
      console.error("Error getting database stats:", error);
      throw error;
    }
  }

  /**
   * Cleanup old data
   */
  async cleanup(options = {}) {
    try {
      const {
        removeExpiredCookies = true,
        cleanupOldHistory = true,
        retentionDays = 30,
      } = options;

      const queries = [];

      if (removeExpiredCookies) {
        queries.push({
          sql: `DELETE FROM account_cookies 
                WHERE expiration_date IS NOT NULL 
                AND expiration_date < strftime('%s', 'now')`,
        });
      }

      if (cleanupOldHistory) {
        queries.push({
          sql: `DELETE FROM account_downloads 
                WHERE created_at < datetime('now', '-${retentionDays} days')`,
        });
      }

      if (queries.length > 0) {
        const results = await this.transaction(queries);
        console.log("Cleanup completed:", results);
        return results;
      }

      return [];
    } catch (error) {
      console.error("Error during cleanup:", error);
      throw error;
    }
  }
}

// Export untuk digunakan di extension
if (typeof module !== "undefined") {
  module.exports = AccountsDatabaseService;
}

// For service worker context
if (typeof self !== "undefined") {
  self.AccountsDatabaseService = AccountsDatabaseService;
}



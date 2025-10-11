// Simplified SQLite Account Management Service untuk Cursor Account Manager
class AccountService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.STORAGE_KEY = "cursor_accounts";
    this.AVATARS_KEY = "cursor_accounts:avatars";
    this.ACTIVE_KEY = "cursor_active_account";
    this.ACCOUNT_INFO_KEY = "cursor_accounts:info";
  }

  // Initialize SQLite database
  async initializeDB() {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log("Initializing SQLite database...");

      // Initialize SQL.js
      const SQL = await initSqlJs({
        locateFile: (file) => chrome.runtime.getURL(`libs/${file}`),
      });

      // Create or load database
      const dbData = await this.loadDatabaseFromStorage();
      if (dbData) {
        this.db = new SQL.Database(new Uint8Array(dbData));
        console.log("Database loaded from storage");
      } else {
        this.db = new SQL.Database();
        await this.createTables();
        console.log("New database created");
      }

      this.isInitialized = true;
      console.log("SQLite database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize SQLite:", error);
      // Fallback to Chrome Storage if SQLite fails
      this.isInitialized = true;
      this.db = null;
    }
  }

  // Create database tables
  async createTables() {
    if (!this.db) return;

    try {
      // Create accounts table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS accounts (
          name TEXT PRIMARY KEY,
          email TEXT,
          status TEXT,
          avatar_url TEXT,
          is_active INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create cookies table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS cookies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_name TEXT,
          name TEXT,
          value TEXT,
          domain TEXT,
          path TEXT,
          secure INTEGER,
          httpOnly INTEGER,
          sameSite TEXT,
          expirationDate REAL,
          FOREIGN KEY(account_name) REFERENCES accounts(name) ON DELETE CASCADE
        )
      `);

      // Create account info table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS account_info (
          account_name TEXT PRIMARY KEY,
          email TEXT,
          status TEXT,
          FOREIGN KEY(account_name) REFERENCES accounts(name) ON DELETE CASCADE
        )
      `);

      await this.saveDatabaseToStorage();
      console.log("Database tables created");
    } catch (error) {
      console.error("Error creating tables:", error);
    }
  }

  // Save database to Chrome storage
  async saveDatabaseToStorage() {
    if (!this.db) return;

    try {
      const data = this.db.export();
      await chrome.storage.local.set({
        sqlite_db: Array.from(data),
      });
    } catch (error) {
      console.error("Error saving database:", error);
    }
  }

  // Load database from Chrome storage
  async loadDatabaseFromStorage() {
    try {
      const result = await chrome.storage.local.get("sqlite_db");
      return result.sqlite_db || null;
    } catch (error) {
      console.error("Error loading database:", error);
      return null;
    }
  }

  // Get all accounts
  async getAll() {
    await this.initializeDB();

    if (!this.db) {
      // Fallback to Chrome Storage
      return this.getAllFromStorage();
    }

    try {
      const stmt = this.db.prepare(`
        SELECT a.*, COUNT(c.id) as cookie_count
        FROM accounts a
        LEFT JOIN cookies c ON a.name = c.account_name
        GROUP BY a.name
      `);

      const accounts = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();

        // Get cookies for this account
        const cookieStmt = this.db.prepare(
          "SELECT * FROM cookies WHERE account_name = ?"
        );
        cookieStmt.bind([row.name]);

        const cookies = [];
        while (cookieStmt.step()) {
          const cookie = cookieStmt.getAsObject();
          // Convert SQLite database format to expected cookie format
          cookies.push({
            domain: cookie.domain,
            name: cookie.name,
            value: cookie.value,
            path: cookie.path,
            expirationDate: cookie.expirationDate,
            hostOnly: Boolean(cookie.hostOnly),
            httpOnly: Boolean(cookie.httpOnly),
            secure: Boolean(cookie.secure),
            session: Boolean(cookie.session),
            sameSite: cookie.sameSite,
            storeId: cookie.storeId,
          });
        }
        cookieStmt.free();

        accounts.push({
          name: row.name,
          email: row.email || row.name,
          status: row.status || "",
          avatarUrl: row.avatar_url,
          active: row.is_active === 1,
          cookies: cookies,
          expiresAt: this.getEarliestExpiry(cookies),
        });
      }
      stmt.free();

      return accounts;
    } catch (error) {
      console.error("Error getting accounts from SQLite:", error);
      return this.getAllFromStorage();
    }
  }

  // Fallback method using Chrome Storage
  async getAllFromStorage() {
    const accounts = await chrome.storage.local.get(this.STORAGE_KEY);
    const avatars = await chrome.storage.local.get(this.AVATARS_KEY);
    const accountInfo = await chrome.storage.local.get(this.ACCOUNT_INFO_KEY);
    const activeAccount = await this.getActiveAccount();

    if (!accounts[this.STORAGE_KEY]) {
      return [];
    }

    return Object.entries(accounts[this.STORAGE_KEY]).map(([name, cookies]) => {
      const info = accountInfo[this.ACCOUNT_INFO_KEY]?.[name] || {};
      // Ensure cookies have proper boolean types
      const cleanCookies = cookies.map((cookie) => ({
        ...cookie,
        secure: Boolean(cookie.secure),
        httpOnly: Boolean(cookie.httpOnly),
        session: Boolean(cookie.session),
        hostOnly: Boolean(cookie.hostOnly),
      }));
      return {
        name,
        cookies: cleanCookies,
        active: name === activeAccount,
        avatarUrl: avatars[this.AVATARS_KEY]?.[name] || null,
        expiresAt: this.getEarliestExpiry(cleanCookies),
        email: info.email || name,
        status: info.status || "",
      };
    });
  }

  // Save or update account
  async upsert(accountName, cookies) {
    await this.initializeDB();

    if (!this.db) {
      // Fallback to Chrome Storage
      return this.upsertToStorage(accountName, cookies);
    }

    try {
      // Insert or update account
      this.db.run(
        `INSERT OR REPLACE INTO accounts (name, email, is_active) 
         VALUES (?, ?, 0)`,
        [accountName, accountName]
      );

      // Delete existing cookies
      this.db.run("DELETE FROM cookies WHERE account_name = ?", [accountName]);

      // Insert new cookies
      const stmt = this.db.prepare(
        `INSERT INTO cookies (account_name, name, value, domain, path, 
          secure, httpOnly, sameSite, expirationDate) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const cookie of cookies) {
        stmt.bind([
          accountName,
          cookie.name,
          cookie.value,
          cookie.domain,
          cookie.path || "/",
          cookie.secure === true ? 1 : 0,
          cookie.httpOnly === true ? 1 : 0,
          cookie.sameSite || "unspecified",
          cookie.expirationDate || null,
        ]);
        stmt.step();
        stmt.reset();
      }
      stmt.free();

      await this.saveDatabaseToStorage();

      // Set as active if it's the first account
      const currentActive = await this.getActiveAccount();
      if (!currentActive) {
        await this.setActiveAccount(accountName);
      }
    } catch (error) {
      console.error("Error upserting to SQLite:", error);
      return this.upsertToStorage(accountName, cookies);
    }
  }

  // Fallback upsert to Chrome Storage
  async upsertToStorage(accountName, cookies) {
    const accounts = await chrome.storage.local.get(this.STORAGE_KEY);
    const accountsData = accounts[this.STORAGE_KEY] || {};

    accountsData[accountName] = cookies;

    await chrome.storage.local.set({
      [this.STORAGE_KEY]: accountsData,
    });

    // Set as active if it's the first account
    const currentActive = await this.getActiveAccount();
    if (!currentActive) {
      await this.setActiveAccount(accountName);
    }
  }

  // Get active account
  async getActiveAccount() {
    await this.initializeDB();

    if (!this.db) {
      const result = await chrome.storage.local.get(this.ACTIVE_KEY);
      return result[this.ACTIVE_KEY] || null;
    }

    try {
      const stmt = this.db.prepare(
        "SELECT name FROM accounts WHERE is_active = 1 LIMIT 1"
      );
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row.name;
      }
      stmt.free();
      return null;
    } catch (error) {
      console.error("Error getting active account:", error);
      const result = await chrome.storage.local.get(this.ACTIVE_KEY);
      return result[this.ACTIVE_KEY] || null;
    }
  }

  // Set active account
  async setActiveAccount(accountName) {
    await this.initializeDB();

    if (!this.db) {
      await chrome.storage.local.set({
        [this.ACTIVE_KEY]: accountName,
      });
      return;
    }

    try {
      // Reset all accounts to inactive
      this.db.run("UPDATE accounts SET is_active = 0");
      // Set the specified account as active
      this.db.run("UPDATE accounts SET is_active = 1 WHERE name = ?", [
        accountName,
      ]);
      await this.saveDatabaseToStorage();
    } catch (error) {
      console.error("Error setting active account:", error);
      await chrome.storage.local.set({
        [this.ACTIVE_KEY]: accountName,
      });
    }
  }

  // Find specific account
  async find(accountName) {
    const accounts = await this.getAll();
    return accounts.find((acc) => acc.name === accountName);
  }

  // Switch to account
  async switchTo(accountName) {
    const account = await this.find(accountName);
    if (!account) {
      throw new Error(`Account ${accountName} not found`);
    }

    // Clear all Cursor cookies
    await this.clearCursorCookies();

    // Restore cookies for target account
    for (const cookie of account.cookies) {
      // Build URL properly
      let domain = cookie.domain;
      if (domain.startsWith(".")) {
        domain = domain.substring(1);
      }

      const cookieData = {
        url: `https://${domain}${cookie.path || "/"}`,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || "/",
        secure: Boolean(cookie.secure),
        httpOnly: Boolean(cookie.httpOnly),
        sameSite: cookie.sameSite || "unspecified",
      };

      // Only add expiration if it exists and is valid
      if (cookie.expirationDate && cookie.expirationDate > 0) {
        cookieData.expirationDate = cookie.expirationDate;
      }

      try {
        await chrome.cookies.set(cookieData);
        console.log("Successfully set cookie:", cookie.name);
      } catch (error) {
        console.error("Failed to set cookie:", cookie.name, error);
      }
    }

    // Update active account
    await this.setActiveAccount(accountName);

    // Update badge
    await this.updateBadge(accountName);

    // Reload Cursor tabs
    await this.reloadCursorTabs();
  }

  // Remove account
  async remove(accountName, deleteFile = false) {
    await this.initializeDB();

    if (!this.db) {
      return this.removeFromStorage(accountName, deleteFile);
    }

    try {
      // Delete from SQLite
      this.db.run("DELETE FROM accounts WHERE name = ?", [accountName]);
      this.db.run("DELETE FROM cookies WHERE account_name = ?", [accountName]);
      this.db.run("DELETE FROM account_info WHERE account_name = ?", [
        accountName,
      ]);

      await this.saveDatabaseToStorage();

      // If this was active account, clear active status
      const activeAccount = await this.getActiveAccount();
      if (activeAccount === accountName) {
        await chrome.storage.local.remove(this.ACTIVE_KEY);
        await this.updateBadge("");
      }
    } catch (error) {
      console.error("Error removing from SQLite:", error);
      return this.removeFromStorage(accountName, deleteFile);
    }
  }

  // Fallback remove from Chrome Storage
  async removeFromStorage(accountName, deleteFile = false) {
    const accounts = await chrome.storage.local.get(this.STORAGE_KEY);
    const accountsData = accounts[this.STORAGE_KEY] || {};

    delete accountsData[accountName];

    await chrome.storage.local.set({
      [this.STORAGE_KEY]: accountsData,
    });

    // Remove avatar
    const avatars = await chrome.storage.local.get(this.AVATARS_KEY);
    const avatarsData = avatars[this.AVATARS_KEY] || {};
    delete avatarsData[accountName];
    await chrome.storage.local.set({
      [this.AVATARS_KEY]: avatarsData,
    });

    // Remove account info
    const accountInfo = await chrome.storage.local.get(this.ACCOUNT_INFO_KEY);
    const infoData = accountInfo[this.ACCOUNT_INFO_KEY] || {};
    delete infoData[accountName];
    await chrome.storage.local.set({
      [this.ACCOUNT_INFO_KEY]: infoData,
    });

    // If this was active account, clear active status
    const activeAccount = await this.getActiveAccount();
    if (activeAccount === accountName) {
      await chrome.storage.local.remove(this.ACTIVE_KEY);
      await this.updateBadge("");
    }
  }

  // Get current cookies
  async getCurrentCookies() {
    const cookies = await chrome.cookies.getAll({
      domain: ".cursor.com",
    });

    const authCookies = cookies.filter((cookie) => {
      return (
        cookie.name.includes("WorkosCursorSessionToken") ||
        cookie.name.includes("connect.sid") ||
        cookie.name === "__cf_bm" ||
        cookie.name === "csrf_token" ||
        cookie.name.startsWith("_cf")
      );
    });

    console.log(`Found ${authCookies.length} auth cookies`);
    return authCookies;
  }

  // Clear Cursor cookies
  async clearCursorCookies() {
    const cookies = await chrome.cookies.getAll({
      domain: ".cursor.com",
    });

    for (const cookie of cookies) {
      const url = `https://${
        cookie.domain.startsWith(".")
          ? cookie.domain.substring(1)
          : cookie.domain
      }${cookie.path}`;

      await chrome.cookies.remove({
        url: url,
        name: cookie.name,
      });
    }

    console.log(`Cleared ${cookies.length} cursor.com cookies`);
  }

  // Update badge
  async updateBadge(text) {
    if (text) {
      // Extract first 3 chars of username for badge
      const badgeText = text.substring(0, 3).toUpperCase();
      await chrome.action.setBadgeText({ text: badgeText });
      await chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
    } else {
      await chrome.action.setBadgeText({ text: "" });
    }
  }

  // Reload Cursor tabs and navigate to dashboard
  async reloadCursorTabs() {
    const tabs = await chrome.tabs.query({ url: "*://*.cursor.com/*" });

    if (tabs.length > 0) {
      // Force reload all cursor.com tabs
      for (const tab of tabs) {
        await chrome.tabs.reload(tab.id, { bypassCache: true });
        console.log(`Reloaded cursor.com tab: ${tab.url}`);
      }
      // Focus on the first tab
      await chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      // No cursor tabs open, create new one
      chrome.tabs.create({
        url: "https://cursor.com/dashboard",
        active: true,
      });
      console.log(`Created new tab for dashboard`);
    }
  }

  // Auto-detect account
  async autoDetectAccount() {
    const cookies = await this.getCurrentCookies();
    if (cookies.length === 0) return null;

    // Check if this account already exists
    const duplicate = await this.findDuplicateAccount(cookies);
    if (duplicate) {
      console.log(
        `Current session matches existing account: ${duplicate.account.name}`
      );
      // Set existing account as active instead of creating new one
      await this.setActiveAccount(duplicate.account.name);
      return duplicate.account.name;
    }

    const username = await this.extractUsername();
    await this.upsert(username, cookies);

    // Initialize account info with empty status (will be updated from dashboard)
    await this.saveAccountInfo(username, username, "");

    return username;
  }

  // Extract username
  async extractUsername() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab && tab.url && tab.url.includes("cursor.com")) {
      try {
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // Try to find email or username from the page
            const selectors = [
              'p[class*="truncate"]',
              'div[title*="@"]',
              '[class*="email"]',
              '[class*="user"]',
            ];

            for (const selector of selectors) {
              const elements = document.querySelectorAll(selector);
              for (const el of elements) {
                const text = el.textContent?.trim();
                if (text && text.includes("@")) {
                  return text;
                }
              }
            }
            return null;
          },
        });

        if (result && result[0] && result[0].result) {
          return result[0].result;
        }
      } catch (error) {
        console.log("Could not extract username from page:", error);
      }
    }

    // Generate random account name as fallback
    return this.generateAccountName();
  }

  // Generate random account name
  generateAccountName() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `account_${timestamp}_${random}`;
  }

  // Find duplicate account
  async findDuplicateAccount(cookies) {
    const accounts = await this.getAll();

    for (const account of accounts) {
      const matchingCookies = cookies.filter((cookie) => {
        return account.cookies.some(
          (savedCookie) =>
            savedCookie.name === cookie.name &&
            savedCookie.value === cookie.value &&
            savedCookie.domain === cookie.domain
        );
      });

      // If at least 50% of cookies match, consider it duplicate
      if (matchingCookies.length >= cookies.length * 0.5) {
        return {
          account: account,
          matchPercentage: (matchingCookies.length / cookies.length) * 100,
        };
      }
    }

    return null;
  }

  // Save account info
  async saveAccountInfo(accountName, email, status) {
    await this.initializeDB();

    if (!this.db) {
      // Fallback to Chrome Storage
      const accountInfo = await chrome.storage.local.get(this.ACCOUNT_INFO_KEY);
      const infoData = accountInfo[this.ACCOUNT_INFO_KEY] || {};
      infoData[accountName] = { email, status };
      await chrome.storage.local.set({
        [this.ACCOUNT_INFO_KEY]: infoData,
      });
      return;
    }

    try {
      this.db.run(
        `INSERT OR REPLACE INTO account_info (account_name, email, status) 
         VALUES (?, ?, ?)`,
        [accountName, email, status]
      );

      // Also update main accounts table
      this.db.run("UPDATE accounts SET email = ?, status = ? WHERE name = ?", [
        email,
        status,
        accountName,
      ]);

      await this.saveDatabaseToStorage();
    } catch (error) {
      console.error("Error saving account info:", error);
      // Fallback to Chrome Storage
      const accountInfo = await chrome.storage.local.get(this.ACCOUNT_INFO_KEY);
      const infoData = accountInfo[this.ACCOUNT_INFO_KEY] || {};
      infoData[accountName] = { email, status };
      await chrome.storage.local.set({
        [this.ACCOUNT_INFO_KEY]: infoData,
      });
    }
  }

  // Get earliest expiry
  getEarliestExpiry(cookies) {
    if (!cookies || cookies.length === 0) return null;

    const expiryDates = cookies
      .filter((c) => c.expirationDate)
      .map((c) => c.expirationDate);

    if (expiryDates.length === 0) return null;

    return Math.min(...expiryDates);
  }

  // Get account details for database viewer
  async getAccountDetails(accountName) {
    await this.initializeDB();

    // Get account from database
    const account = await this.find(accountName);
    if (!account) return null;

    // Get account info
    const accountInfo = await this.getAccountInfo(accountName);

    // Check if this is the active account
    const activeAccount = await this.getActiveAccount();
    const isActive = activeAccount === accountName;

    // Determine plan based on status
    let plan = "Free";
    if (accountInfo?.status) {
      const statusLower = accountInfo.status.toLowerCase();
      if (statusLower.includes("pro") && statusLower.includes("trial")) {
        plan = "Pro Trial";
      } else if (statusLower.includes("pro")) {
        plan = "Pro";
      } else if (statusLower.includes("business")) {
        plan = "Business";
      }
    }

    return {
      name: accountName,
      email: accountInfo?.email || accountName,
      cookies: account.cookies || [],
      isActive: isActive,
      plan: plan,
      status: accountInfo?.status || "",
      dateAdded: account.dateAdded || Date.now(),
      info: accountInfo || {},
    };
  }

  // Export account to file
  async exportAccountToFile(accountName) {
    const account = await this.find(accountName);
    if (!account) throw new Error("Account not found");

    const exportData = {
      version: "1.0",
      extension: "cursor-account-manager",
      exportDate: new Date().toISOString(),
      account: {
        name: account.name,
        email: account.email,
        status: account.status,
        cookies: account.cookies,
        expiresAt: account.expiresAt,
      },
    };

    const filename = `cursor_accounts/${account.email || account.name}.json`;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    // Create data URL
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onloadend = () => {
        const dataUrl = reader.result;

        // Use Chrome downloads API
        chrome.downloads.download(
          {
            url: dataUrl,
            filename: filename,
            saveAs: false,
          },
          (downloadId) => {
            if (chrome.runtime.lastError) {
              console.error("Download failed:", chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              console.log("Download started with ID:", downloadId);
              resolve(downloadId);
            }
          }
        );
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Import account from JSON
  async importAccountFromJSON(jsonText, customName, overrideExisting = false) {
    try {
      const data = JSON.parse(jsonText);

      let cookies = null;
      let accountInfo = {};

      // Support multiple JSON formats
      if (Array.isArray(data)) {
        // Direct cookies array format: [{"name": "...", "value": "...", ...}, ...]
        cookies = data;
        console.log("Detected direct cookies array format");
      } else if (data.account && data.account.cookies) {
        // Full export format: {"account": {"cookies": [...], "name": "...", ...}}
        cookies = data.account.cookies;
        accountInfo = data.account;
        console.log("Detected full export format");
      } else if (data.cookies) {
        // Alternative format: {"cookies": [...]}
        cookies = data.cookies;
        console.log("Detected alternative cookies format");
      } else {
        throw new Error(
          "Invalid account data format. Expected cookies array or account object with cookies."
        );
      }

      // Validate cookies
      if (!Array.isArray(cookies) || cookies.length === 0) {
        throw new Error("No cookies found in the provided data");
      }

      // Validate cookie structure
      const requiredFields = ["name", "value", "domain"];
      for (const cookie of cookies) {
        for (const field of requiredFields) {
          if (!cookie[field]) {
            throw new Error(`Cookie missing required field: ${field}`);
          }
        }
      }

      // Generate account name
      const accountName =
        customName ||
        accountInfo.name ||
        accountInfo.email ||
        this.generateAccountName();

      if (!overrideExisting) {
        const existing = await this.find(accountName);
        if (existing) {
          const error = new Error(`Account ${accountName} already exists`);
          error.isDuplicate = true;
          error.existingAccount = existing;
          throw error;
        }
      }

      console.log(
        `Importing account: ${accountName} with ${cookies.length} cookies`
      );
      await this.upsert(accountName, cookies);

      if (accountInfo.email || accountInfo.status) {
        await this.saveAccountInfo(
          accountName,
          accountInfo.email || accountName,
          accountInfo.status || ""
        );
      }

      return accountName;
    } catch (error) {
      console.error("Error importing account:", error);
      throw error;
    }
  }

  // Clear all data
  async clearAllData() {
    await this.initializeDB();

    if (this.db) {
      try {
        this.db.run("DELETE FROM accounts");
        this.db.run("DELETE FROM cookies");
        this.db.run("DELETE FROM account_info");
        await this.saveDatabaseToStorage();
      } catch (error) {
        console.error("Error clearing SQLite data:", error);
      }
    }

    // Also clear Chrome Storage
    await chrome.storage.local.remove([
      this.STORAGE_KEY,
      this.AVATARS_KEY,
      this.ACTIVE_KEY,
      this.ACCOUNT_INFO_KEY,
    ]);

    await this.updateBadge("");
    return true;
  }

  // Get all stored data
  async getAllStoredData() {
    const accounts = await this.getAll();
    return {
      accounts: accounts,
      activeAccount: await this.getActiveAccount(),
    };
  }

  // Scan downloads for accounts
  async scanDownloadsForAccounts() {
    try {
      const downloads = await new Promise((resolve) => {
        chrome.downloads.search(
          {
            query: ["cursor_accounts"],
            exists: true,
            limit: 100,
          },
          resolve
        );
      });

      const accountFiles = downloads.filter(
        (item) =>
          item.filename.includes("cursor_accounts") &&
          item.filename.endsWith(".json")
      );

      return accountFiles.map((file) => ({
        id: file.id,
        filename: file.filename,
        url: file.url,
      }));
    } catch (error) {
      console.error("Error scanning downloads:", error);
      return [];
    }
  }

  // Reveal account file
  async revealAccountFile(accountName) {
    try {
      const downloads = await new Promise((resolve) => {
        chrome.downloads.search(
          {
            query: ["cursor_accounts", accountName],
            exists: true,
            limit: 10,
          },
          resolve
        );
      });

      if (downloads && downloads.length > 0) {
        chrome.downloads.show(downloads[0].id);
        return { success: true, found: true };
      }

      return { success: false, found: false };
    } catch (error) {
      console.error("Error revealing file:", error);
      return { success: false, error: error.message };
    }
  }

  // Get detailed database info for an account
  async getAccountDatabaseInfo(accountName) {
    await this.initializeDB();

    const account = await this.find(accountName);
    if (!account) {
      throw new Error(`Account ${accountName} not found`);
    }

    let storageInfo = {
      name: account.name,
      email: account.email,
      status: account.status,
      is_active: account.active,
      created_at: null,
      last_used: null,
      storage_type: this.db ? "SQLite" : "Chrome Storage API",
      storage_location: this.db
        ? "chrome.storage.local['sqlite_db']"
        : "chrome.storage.local",
      table_name: this.db
        ? "accounts, cookies, account_info"
        : "cursor_accounts",
      cookie_count: account.cookies ? account.cookies.length : 0,
      earliest_expiry: account.expiresAt,
      cookies: account.cookies
        ? account.cookies.map((c) => ({
            name: c.name,
            domain: c.domain,
            path: c.path,
            expirationDate: c.expirationDate,
            secure: c.secure,
            httpOnly: c.httpOnly,
          }))
        : [],
    };

    // Try to get additional info from SQLite if available
    if (this.db) {
      try {
        const stmt = this.db.prepare(
          "SELECT created_at, updated_at FROM accounts WHERE name = ?"
        );
        stmt.bind([accountName]);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          storageInfo.created_at = row.created_at;
          storageInfo.last_used = row.updated_at;
        }
        stmt.free();
      } catch (error) {
        console.log("Could not fetch timestamps from SQLite:", error);
      }
    }

    return storageInfo;
  }

  // Consolidate duplicates
  async consolidateDuplicates() {
    const accounts = await this.getAll();
    const consolidated = [];
    const seen = new Map();

    for (const account of accounts) {
      const key = account.email || account.name;
      if (!seen.has(key)) {
        seen.set(key, account);
      } else {
        // Merge with existing
        const existing = seen.get(key);
        if (account.cookies.length > existing.cookies.length) {
          seen.set(key, account);
        }
        consolidated.push(account.name);
      }
    }

    // Remove consolidated accounts
    for (const name of consolidated) {
      await this.remove(name, false);
    }

    return {
      success: true,
      consolidated: consolidated.length,
      remaining: seen.size,
    };
  }
}

// Create global instance
const accountService = new AccountService();

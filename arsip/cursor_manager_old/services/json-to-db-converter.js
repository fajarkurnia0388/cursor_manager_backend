// JSON to Database Converter Service
// Converts JSON account files directly to SQLite database

class JsonToDbConverter {
  constructor() {
    this.db = null;
    this.SQL = null;
    this.processedCount = 0;
    this.skippedCount = 0;
    this.errorCount = 0;
  }

  // Initialize SQLite
  async initializeSQLite() {
    if (this.SQL) return;
    
    try {
      console.log("Initializing SQL.js for converter...");
      this.SQL = await initSqlJs({
        locateFile: file => chrome.runtime.getURL(`libs/${file}`)
      });
      console.log("SQL.js initialized for converter");
    } catch (error) {
      console.error("Failed to initialize SQL.js:", error);
      throw error;
    }
  }

  // Create new database or load existing
  async initializeDatabase(existingDbData = null) {
    await this.initializeSQLite();
    
    if (existingDbData) {
      // Load existing database
      this.db = new this.SQL.Database(new Uint8Array(existingDbData));
      console.log("Loaded existing database for conversion");
    } else {
      // Create new database
      this.db = new this.SQL.Database();
      await this.createTables();
      console.log("Created new database for conversion");
    }
  }

  // Create database tables
  async createTables() {
    if (!this.db) throw new Error("Database not initialized");
    
    const schema = `
      CREATE TABLE IF NOT EXISTS accounts (
        name TEXT PRIMARY KEY,
        email TEXT,
        status TEXT,
        avatar_url TEXT,
        is_active INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

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
      );

      CREATE TABLE IF NOT EXISTS account_info (
        account_name TEXT PRIMARY KEY,
        email TEXT,
        status TEXT,
        FOREIGN KEY(account_name) REFERENCES accounts(name) ON DELETE CASCADE
      );
    `;

    const statements = schema.split(';').filter(stmt => stmt.trim());
    for (const sql of statements) {
      this.db.run(sql);
    }
  }

  // Parse JSON file content
  parseJsonFile(jsonContent) {
    try {
      const data = JSON.parse(jsonContent);
      
      // Check different JSON formats
      if (data.account && data.account.cookies) {
        // Full export format
        return {
          name: data.account.name || data.account.email || this.generateAccountName(),
          email: data.account.email || '',
          status: data.account.status || '',
          cookies: data.account.cookies
        };
      } else if (Array.isArray(data)) {
        // Direct cookies array
        return {
          name: this.generateAccountName(),
          email: '',
          status: '',
          cookies: data
        };
      } else if (data.cookies) {
        // Alternative format
        return {
          name: data.name || data.email || this.generateAccountName(),
          email: data.email || '',
          status: data.status || '',
          cookies: data.cookies
        };
      } else {
        throw new Error("Unsupported JSON format");
      }
    } catch (error) {
      console.error("Error parsing JSON:", error);
      throw error;
    }
  }

  // Generate unique account name
  generateAccountName() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `account_${timestamp}_${random}`;
  }

  // Add account to database
  async addAccountToDb(accountData) {
    if (!this.db) throw new Error("Database not initialized");
    
    try {
      // Check if account already exists
      const existingStmt = this.db.prepare("SELECT name FROM accounts WHERE name = ?");
      existingStmt.bind([accountData.name]);
      const exists = existingStmt.step();
      existingStmt.free();
      
      if (exists) {
        console.log(`Account ${accountData.name} already exists, skipping...`);
        this.skippedCount++;
        return false;
      }

      // Insert account
      this.db.run(
        "INSERT INTO accounts (name, email, status) VALUES (?, ?, ?)",
        [accountData.name, accountData.email, accountData.status]
      );

      // Insert cookies
      const cookieStmt = this.db.prepare(
        `INSERT INTO cookies (account_name, name, value, domain, path, secure, httpOnly, sameSite, expirationDate) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const cookie of accountData.cookies) {
        cookieStmt.bind([
          accountData.name,
          cookie.name,
          cookie.value,
          cookie.domain,
          cookie.path || '/',
          cookie.secure ? 1 : 0,
          cookie.httpOnly ? 1 : 0,
          cookie.sameSite || 'unspecified',
          cookie.expirationDate || null
        ]);
        cookieStmt.step();
        cookieStmt.reset();
      }
      cookieStmt.free();

      // Insert account info
      if (accountData.email || accountData.status) {
        this.db.run(
          "INSERT OR REPLACE INTO account_info (account_name, email, status) VALUES (?, ?, ?)",
          [accountData.name, accountData.email, accountData.status]
        );
      }

      console.log(`Successfully added account: ${accountData.name}`);
      this.processedCount++;
      return true;
    } catch (error) {
      console.error(`Error adding account ${accountData.name}:`, error);
      this.errorCount++;
      throw error;
    }
  }

  // Convert single JSON file to database
  async convertJsonToDb(jsonContent) {
    try {
      const accountData = this.parseJsonFile(jsonContent);
      await this.addAccountToDb(accountData);
      return { success: true, account: accountData.name };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Convert multiple JSON files to database
  async convertMultipleJsonToDb(jsonFiles) {
    const results = [];
    this.processedCount = 0;
    this.skippedCount = 0;
    this.errorCount = 0;

    for (const file of jsonFiles) {
      try {
        const result = await this.convertJsonToDb(file.content);
        results.push({
          filename: file.name,
          ...result
        });
      } catch (error) {
        results.push({
          filename: file.name,
          success: false,
          error: error.message
        });
        this.errorCount++;
      }
    }

    return {
      results,
      summary: {
        total: jsonFiles.length,
        processed: this.processedCount,
        skipped: this.skippedCount,
        errors: this.errorCount
      }
    };
  }

  // Export database to bytes
  exportDatabase() {
    if (!this.db) throw new Error("Database not initialized");
    return this.db.export();
  }

  // Save database to Chrome storage
  async saveDatabaseToStorage() {
    if (!this.db) throw new Error("Database not initialized");
    
    try {
      const data = this.db.export();
      await chrome.storage.local.set({
        sqlite_db: Array.from(data)
      });
      console.log("Database saved to Chrome storage");
      return true;
    } catch (error) {
      console.error("Error saving database to storage:", error);
      throw error;
    }
  }

  // Export database to file
  async exportDatabaseToFile() {
    if (!this.db) throw new Error("Database not initialized");
    
    try {
      const dbData = this.db.export();
      const blob = new Blob([dbData], { type: 'application/x-sqlite3' });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `CursorAccountManager/converted_${timestamp}.db`;
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          chrome.downloads.download({
            url: reader.result,
            filename: filename,
            saveAs: false
          }, (downloadId) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              console.log(`Database exported to: ${filename}`);
              resolve({ filename, downloadId });
            }
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error exporting database to file:", error);
      throw error;
    }
  }

  // Get database statistics
  getDatabaseStats() {
    if (!this.db) return null;
    
    try {
      const accountCount = this.db.exec("SELECT COUNT(*) as count FROM accounts")[0].values[0][0];
      const cookieCount = this.db.exec("SELECT COUNT(*) as count FROM cookies")[0].values[0][0];
      const accountList = this.db.exec("SELECT name, email, status FROM accounts");
      
      return {
        accountCount,
        cookieCount,
        accounts: accountList[0] ? accountList[0].values.map(row => ({
          name: row[0],
          email: row[1],
          status: row[2]
        })) : []
      };
    } catch (error) {
      console.error("Error getting database stats:", error);
      return null;
    }
  }

  // Close database
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Create global instance
const jsonToDbConverter = new JsonToDbConverter();

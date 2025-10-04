# 📚 Implementation Guide

**Tanggal:** Oktober 2025  
**Target:** Step-by-step guide untuk implementasi arsitektur baru  
**Audience:** Developer yang akan implement

---

## 🎯 Overview

Dokumen ini adalah panduan praktis untuk mengimplementasikan arsitektur storage yang dipilih. Setiap section berisi:
- ✅ Checklist items
- 💻 Code examples (copy-paste ready)
- 🧪 Testing steps
- ⚠️ Common pitfalls

---

## 📋 Pre-Implementation Checklist

### Before You Start
- [ ] Read DECISION_MATRIX.md - understand trade-offs
- [ ] Choose storage architecture (Chrome/WASM/Native)
- [ ] Setup development environment
- [ ] Backup current codebase
- [ ] Create feature branch: `git checkout -b feature/new-storage`
- [ ] Review IMPROVEMENT_PLAN.md for cleanup items

### Development Environment
```bash
# Install dependencies
npm install

# Or if using Python backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Install testing tools
npm install --save-dev jest @types/jest
npm install --save-dev @types/chrome
```

---

## 🏗️ Implementation Path 1: SQLite WASM (Recommended)

**Timeline:** 2 weeks  
**Complexity:** Medium  
**Best for:** Most users

### Week 1: Core SQLite Integration

#### Day 1-2: Setup & Database Schema

**Step 1: Install sql.js**
```bash
npm install sql.js
# Or download manually
wget https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js
wget https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm
```

**Step 2: Create database service**

Create file: `services/sqlite-service.js`

```javascript
/**
 * SQLite WASM Service - Main database handler
 * Handles all SQLite operations with auto-save to IndexedDB
 */

import initSqlJs from 'sql.js';

class SQLiteService {
  constructor() {
    this.db = null;
    this.SQL = null;
    this.isInitialized = false;
    this.saveInterval = null;
    this.dbName = 'cursor_accounts_db';
  }

  /**
   * Initialize SQLite database
   * Loads from IndexedDB if exists, creates new otherwise
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize SQL.js
      this.SQL = await initSqlJs({
        locateFile: file => chrome.runtime.getURL(`libs/${file}`)
      });

      // Try to load existing database
      const savedData = await this.loadFromIndexedDB();
      
      if (savedData) {
        // Restore from saved data
        this.db = new this.SQL.Database(new Uint8Array(savedData));
        console.log('✅ Database loaded from IndexedDB');
      } else {
        // Create new database
        this.db = new this.SQL.Database();
        await this.createTables();
        console.log('✅ New database created');
      }

      // Setup auto-save
      this.setupAutoSave();
      
      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ Failed to initialize SQLite:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  async createTables() {
    // Accounts table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        avatar_url TEXT,
        is_active INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Cookies table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cookies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        domain TEXT NOT NULL,
        path TEXT DEFAULT '/',
        expiration_date INTEGER,
        http_only INTEGER DEFAULT 0,
        secure INTEGER DEFAULT 0,
        same_site TEXT DEFAULT 'no_restriction',
        session INTEGER DEFAULT 0,
        store_id TEXT,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )
    `);

    // Payment cards table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS payment_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_number TEXT NOT NULL,
        card_holder TEXT NOT NULL,
        expiry_month TEXT NOT NULL,
        expiry_year TEXT NOT NULL,
        cvc TEXT NOT NULL,
        card_type TEXT DEFAULT 'credit',
        nickname TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    this.db.run('CREATE INDEX IF NOT EXISTS idx_account_name ON accounts(name)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_account_status ON accounts(status)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_cookie_account ON cookies(account_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_card_active ON payment_cards(is_active)');

    console.log('✅ Tables created successfully');
  }

  /**
   * Setup auto-save every 5 minutes
   */
  setupAutoSave() {
    // Save immediately before page unload
    window.addEventListener('beforeunload', () => {
      this.saveToIndexedDB();
    });

    // Periodic save every 5 minutes
    this.saveInterval = setInterval(() => {
      this.saveToIndexedDB();
    }, 5 * 60 * 1000);
  }

  /**
   * Save database to IndexedDB
   */
  async saveToIndexedDB() {
    try {
      const data = this.db.export();
      const buffer = data.buffer;

      // Save to IndexedDB
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['databases'], 'readwrite');
      const store = transaction.objectStore('databases');
      
      await store.put({
        id: this.dbName,
        data: buffer,
        timestamp: Date.now()
      });

      console.log('💾 Database saved to IndexedDB');
      
    } catch (error) {
      console.error('❌ Failed to save database:', error);
    }
  }

  /**
   * Load database from IndexedDB
   */
  async loadFromIndexedDB() {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['databases'], 'readonly');
      const store = transaction.objectStore('databases');
      const request = store.get(this.dbName);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.data : null);
        };
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('❌ Failed to load database:', error);
      return null;
    }
  }

  /**
   * Open IndexedDB connection
   */
  async openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CursorAccountManager', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('databases')) {
          db.createObjectStore('databases', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Execute SQL query
   */
  exec(sql, params = []) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(sql);
      
      if (params.length > 0) {
        stmt.bind(params);
      }

      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      
      stmt.free();
      
      // Auto-save after write operations
      if (sql.trim().toUpperCase().startsWith('INSERT') ||
          sql.trim().toUpperCase().startsWith('UPDATE') ||
          sql.trim().toUpperCase().startsWith('DELETE')) {
        this.saveToIndexedDB();
      }

      return results;
      
    } catch (error) {
      console.error('❌ SQL execution error:', error);
      throw error;
    }
  }

  /**
   * Run SQL without returning results (INSERT, UPDATE, DELETE)
   */
  run(sql, params = []) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.run(sql, params);
      this.saveToIndexedDB();
    } catch (error) {
      console.error('❌ SQL run error:', error);
      throw error;
    }
  }

  /**
   * Export database to file
   */
  async exportToFile() {
    try {
      const data = this.db.export();
      const blob = new Blob([data], { type: 'application/x-sqlite3' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cursor-accounts-${Date.now()}.db`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      console.log('✅ Database exported to file');
      
    } catch (error) {
      console.error('❌ Export failed:', error);
      throw error;
    }
  }

  /**
   * Import database from file
   */
  async importFromFile(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Close current database
      if (this.db) {
        this.db.close();
      }
      
      // Load new database
      this.db = new this.SQL.Database(uint8Array);
      
      // Save to IndexedDB
      await this.saveToIndexedDB();
      
      console.log('✅ Database imported successfully');
      
    } catch (error) {
      console.error('❌ Import failed:', error);
      throw error;
    }
  }

  /**
   * Close database and cleanup
   */
  async close() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }

    // Final save
    await this.saveToIndexedDB();

    if (this.db) {
      this.db.close();
    }

    this.isInitialized = false;
    console.log('✅ Database closed');
  }

  /**
   * Get database statistics
   */
  getStats() {
    if (!this.isInitialized) {
      return null;
    }

    const accountCount = this.exec('SELECT COUNT(*) as count FROM accounts')[0].count;
    const cookieCount = this.exec('SELECT COUNT(*) as count FROM cookies')[0].count;
    const cardCount = this.exec('SELECT COUNT(*) as count FROM payment_cards')[0].count;

    return {
      accounts: accountCount,
      cookies: cookieCount,
      cards: cardCount,
      size: this.db.export().length
    };
  }
}

// Export singleton instance
export const sqliteService = new SQLiteService();
export default SQLiteService;
```

**Step 3: Update manifest.json**
```json
{
  "manifest_version": 3,
  "name": "Cursor Account Manager",
  "version": "2.0.0",
  
  "web_accessible_resources": [
    {
      "resources": [
        "libs/sql-wasm.wasm",
        "libs/sql-wasm.js"
      ],
      "matches": ["<all_urls>"]
    }
  ],
  
  "permissions": [
    "storage",
    "cookies",
    "tabs"
  ]
}
```

**Testing:**
```javascript
// Test in browser console
import { sqliteService } from './services/sqlite-service.js';

(async () => {
  await sqliteService.initialize();
  console.log('Stats:', sqliteService.getStats());
})();
```

#### Day 3-4: Account Service Migration

Create file: `services/account-service-v2.js`

```javascript
/**
 * Account Service v2 - SQLite WASM backend
 * Replaces Chrome Storage with SQLite
 */

import { sqliteService } from './sqlite-service.js';

class AccountServiceV2 {
  constructor() {
    this.db = sqliteService;
  }

  /**
   * Initialize service
   */
  async initialize() {
    await this.db.initialize();
  }

  /**
   * Get all accounts with cookies
   */
  async getAll() {
    try {
      // Get all accounts
      const accounts = this.db.exec(`
        SELECT 
          a.*,
          COUNT(c.id) as cookie_count
        FROM accounts a
        LEFT JOIN cookies c ON a.id = c.account_id
        GROUP BY a.id
        ORDER BY a.created_at DESC
      `);

      // Get cookies for each account
      const accountsWithCookies = await Promise.all(
        accounts.map(async (account) => {
          const cookies = this.db.exec(
            'SELECT * FROM cookies WHERE account_id = ?',
            [account.id]
          );

          return {
            id: account.id,
            name: account.name,
            email: account.email,
            status: account.status,
            avatarUrl: account.avatar_url,
            active: account.is_active === 1,
            cookies: cookies.map(this.formatCookie),
            cookieCount: account.cookie_count,
            createdAt: account.created_at,
            updatedAt: account.updated_at,
            expiresAt: this.getEarliestExpiry(cookies)
          };
        })
      );

      return accountsWithCookies;
      
    } catch (error) {
      console.error('Failed to get accounts:', error);
      throw error;
    }
  }

  /**
   * Get account by ID
   */
  async getById(id) {
    const accounts = this.db.exec(
      'SELECT * FROM accounts WHERE id = ?',
      [id]
    );

    if (accounts.length === 0) {
      return null;
    }

    const account = accounts[0];
    const cookies = this.db.exec(
      'SELECT * FROM cookies WHERE account_id = ?',
      [id]
    );

    return {
      id: account.id,
      name: account.name,
      email: account.email,
      status: account.status,
      avatarUrl: account.avatar_url,
      active: account.is_active === 1,
      cookies: cookies.map(this.formatCookie),
      createdAt: account.created_at,
      updatedAt: account.updated_at
    };
  }

  /**
   * Get account by name
   */
  async getByName(name) {
    const accounts = this.db.exec(
      'SELECT * FROM accounts WHERE name = ?',
      [name]
    );

    if (accounts.length === 0) {
      return null;
    }

    return this.getById(accounts[0].id);
  }

  /**
   * Create new account
   */
  async create(accountData) {
    try {
      const { name, email, cookies = [], avatarUrl = '', status = 'active' } = accountData;

      // Validate
      if (!name || !email) {
        throw new Error('Name and email are required');
      }

      // Check if account exists
      const existing = await this.getByName(name);
      if (existing) {
        throw new Error(`Account "${name}" already exists`);
      }

      // Insert account
      this.db.run(`
        INSERT INTO accounts (name, email, status, avatar_url)
        VALUES (?, ?, ?, ?)
      `, [name, email, status, avatarUrl]);

      // Get inserted account ID
      const result = this.db.exec('SELECT last_insert_rowid() as id');
      const accountId = result[0].id;

      // Insert cookies
      for (const cookie of cookies) {
        await this.addCookie(accountId, cookie);
      }

      console.log(`✅ Account "${name}" created (ID: ${accountId})`);

      return this.getById(accountId);
      
    } catch (error) {
      console.error('Failed to create account:', error);
      throw error;
    }
  }

  /**
   * Update account
   */
  async update(id, updates) {
    try {
      const account = await this.getById(id);
      if (!account) {
        throw new Error(`Account ID ${id} not found`);
      }

      const { name, email, status, avatarUrl, cookies } = updates;

      // Update account fields
      const fields = [];
      const values = [];

      if (name !== undefined) {
        fields.push('name = ?');
        values.push(name);
      }
      if (email !== undefined) {
        fields.push('email = ?');
        values.push(email);
      }
      if (status !== undefined) {
        fields.push('status = ?');
        values.push(status);
      }
      if (avatarUrl !== undefined) {
        fields.push('avatar_url = ?');
        values.push(avatarUrl);
      }

      if (fields.length > 0) {
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        this.db.run(`
          UPDATE accounts
          SET ${fields.join(', ')}
          WHERE id = ?
        `, values);
      }

      // Update cookies if provided
      if (cookies) {
        // Delete old cookies
        this.db.run('DELETE FROM cookies WHERE account_id = ?', [id]);
        
        // Insert new cookies
        for (const cookie of cookies) {
          await this.addCookie(id, cookie);
        }
      }

      console.log(`✅ Account ID ${id} updated`);

      return this.getById(id);
      
    } catch (error) {
      console.error('Failed to update account:', error);
      throw error;
    }
  }

  /**
   * Delete account
   */
  async delete(id) {
    try {
      const account = await this.getById(id);
      if (!account) {
        return false;
      }

      // Delete account (cookies cascade)
      this.db.run('DELETE FROM accounts WHERE id = ?', [id]);

      console.log(`✅ Account "${account.name}" deleted`);

      return true;
      
    } catch (error) {
      console.error('Failed to delete account:', error);
      throw error;
    }
  }

  /**
   * Set active account
   */
  async setActive(id) {
    try {
      // Deactivate all accounts
      this.db.run('UPDATE accounts SET is_active = 0');

      // Activate target account
      this.db.run('UPDATE accounts SET is_active = 1 WHERE id = ?', [id]);

      const account = await this.getById(id);
      console.log(`✅ Account "${account.name}" set as active`);

      return account;
      
    } catch (error) {
      console.error('Failed to set active account:', error);
      throw error;
    }
  }

  /**
   * Get active account
   */
  async getActive() {
    const accounts = this.db.exec(
      'SELECT * FROM accounts WHERE is_active = 1'
    );

    if (accounts.length === 0) {
      return null;
    }

    return this.getById(accounts[0].id);
  }

  /**
   * Search accounts
   */
  async search(query) {
    const accounts = this.db.exec(`
      SELECT * FROM accounts
      WHERE name LIKE ? OR email LIKE ?
      ORDER BY created_at DESC
    `, [`%${query}%`, `%${query}%`]);

    return Promise.all(
      accounts.map(acc => this.getById(acc.id))
    );
  }

  /**
   * Add cookie to account
   */
  async addCookie(accountId, cookie) {
    this.db.run(`
      INSERT INTO cookies (
        account_id, name, value, domain, path,
        expiration_date, http_only, secure, same_site, session, store_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      accountId,
      cookie.name,
      cookie.value,
      cookie.domain,
      cookie.path || '/',
      cookie.expirationDate || null,
      cookie.httpOnly ? 1 : 0,
      cookie.secure ? 1 : 0,
      cookie.sameSite || 'no_restriction',
      cookie.session ? 1 : 0,
      cookie.storeId || null
    ]);
  }

  /**
   * Format cookie from database to Chrome cookie format
   */
  formatCookie(cookie) {
    return {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expirationDate: cookie.expiration_date,
      httpOnly: cookie.http_only === 1,
      secure: cookie.secure === 1,
      sameSite: cookie.same_site,
      session: cookie.session === 1,
      storeId: cookie.store_id
    };
  }

  /**
   * Get earliest expiry from cookies
   */
  getEarliestExpiry(cookies) {
    if (!cookies || cookies.length === 0) {
      return null;
    }

    const expiries = cookies
      .map(c => c.expiration_date)
      .filter(exp => exp && exp > 0)
      .sort((a, b) => a - b);

    return expiries.length > 0 ? expiries[0] : null;
  }

  /**
   * Get statistics
   */
  async getStats() {
    const stats = this.db.exec(`
      SELECT
        COUNT(*) as total_accounts,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_accounts,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_accounts
      FROM accounts
    `)[0];

    const cookieStats = this.db.exec(`
      SELECT COUNT(*) as total_cookies FROM cookies
    `)[0];

    return {
      ...stats,
      ...cookieStats,
      database: this.db.getStats()
    };
  }
}

// Export singleton
export const accountService = new AccountServiceV2();
export default AccountServiceV2;
```

**Testing:**
```javascript
// Test account operations
import { accountService } from './services/account-service-v2.js';

(async () => {
  await accountService.initialize();
  
  // Create test account
  const account = await accountService.create({
    name: 'test_account',
    email: 'test@example.com',
    cookies: [
      {
        name: '__Secure-next-auth.session-token',
        value: 'test_token_123',
        domain: '.cursor.sh',
        path: '/',
        secure: true,
        httpOnly: true
      }
    ]
  });
  
  console.log('Created:', account);
  
  // Get all accounts
  const allAccounts = await accountService.getAll();
  console.log('All accounts:', allAccounts);
  
  // Search
  const results = await accountService.search('test');
  console.log('Search results:', results);
  
  // Stats
  const stats = await accountService.getStats();
  console.log('Stats:', stats);
})();
```

#### Day 5: UI Integration

**Update sidepanel.js to use new service:**

```javascript
// At the top of sidepanel.js
import { accountService } from './services/account-service-v2.js';

class SidePanelManager {
  constructor() {
    this.accountService = accountService;
    // ... rest of constructor
  }

  async init() {
    try {
      // Initialize SQLite
      await this.accountService.initialize();
      console.log('✅ SQLite initialized');
      
      // Load accounts
      await this.loadAccounts();
      
      // Setup UI
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Init failed:', error);
      this.showError('Failed to initialize database');
    }
  }

  async loadAccounts() {
    try {
      const accounts = await this.accountService.getAll();
      this.renderAccounts(accounts);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      this.showError('Failed to load accounts');
    }
  }

  async handleAddAccount(formData) {
    try {
      const account = await this.accountService.create({
        name: formData.name,
        email: formData.email,
        cookies: formData.cookies,
        avatarUrl: formData.avatarUrl
      });

      this.showSuccess(`Account "${account.name}" added`);
      await this.loadAccounts();
      
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleDeleteAccount(accountId) {
    try {
      const account = await this.accountService.getById(accountId);
      
      if (confirm(`Delete account "${account.name}"?`)) {
        await this.accountService.delete(accountId);
        this.showSuccess('Account deleted');
        await this.loadAccounts();
      }
      
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleSwitchAccount(accountId) {
    try {
      const account = await this.accountService.setActive(accountId);
      
      // Inject cookies
      for (const cookie of account.cookies) {
        await chrome.cookies.set({
          url: `https://${cookie.domain}`,
          ...cookie
        });
      }

      this.showSuccess(`Switched to "${account.name}"`);
      await this.loadAccounts();
      
    } catch (error) {
      this.showError(error.message);
    }
  }
}
```

### Week 2: File System Integration & Polish

#### Day 6-7: File System Access API

Create file: `services/file-system-service.js`

```javascript
/**
 * File System Service
 * Handles auto-save to user-selected folder
 */

import { sqliteService } from './sqlite-service.js';

class FileSystemService {
  constructor() {
    this.directoryHandle = null;
    this.fileHandle = null;
    this.autoSaveInterval = null;
  }

  /**
   * Setup auto-save folder
   * User selects a folder once, we remember it
   */
  async setupAutoSave() {
    try {
      // Request directory access
      this.directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      // Save handle to IndexedDB for persistence
      await this.saveDirectoryHandle();

      // Get or create database file
      this.fileHandle = await this.directoryHandle.getFileHandle(
        'cursor-accounts.db',
        { create: true }
      );

      // Start auto-save
      this.startAutoSave();

      console.log('✅ Auto-save setup complete');
      return true;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('User cancelled folder selection');
      } else {
        console.error('Failed to setup auto-save:', error);
      }
      return false;
    }
  }

  /**
   * Restore previous directory handle
   */
  async restoreAutoSave() {
    try {
      const saved = await this.loadDirectoryHandle();
      if (!saved) {
        return false;
      }

      // Verify permission
      const permission = await saved.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        // Request permission again
        const newPermission = await saved.requestPermission({ mode: 'readwrite' });
        if (newPermission !== 'granted') {
          return false;
        }
      }

      this.directoryHandle = saved;
      this.fileHandle = await this.directoryHandle.getFileHandle(
        'cursor-accounts.db',
        { create: true }
      );

      this.startAutoSave();
      console.log('✅ Auto-save restored');
      return true;
      
    } catch (error) {
      console.error('Failed to restore auto-save:', error);
      return false;
    }
  }

  /**
   * Start auto-save interval
   */
  startAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    // Save immediately
    this.saveToFile();

    // Then every 5 minutes
    this.autoSaveInterval = setInterval(() => {
      this.saveToFile();
    }, 5 * 60 * 1000);
  }

  /**
   * Save database to file
   */
  async saveToFile() {
    if (!this.fileHandle) {
      return;
    }

    try {
      // Export database
      const data = sqliteService.db.export();

      // Write to file
      const writable = await this.fileHandle.createWritable();
      await writable.write(new Blob([data]));
      await writable.close();

      console.log('💾 Database saved to file');
      
    } catch (error) {
      console.error('Failed to save to file:', error);
    }
  }

  /**
   * Load database from file
   */
  async loadFromFile() {
    if (!this.fileHandle) {
      return null;
    }

    try {
      const file = await this.fileHandle.getFile();
      const arrayBuffer = await file.arrayBuffer();
      return new Uint8Array(arrayBuffer);
      
    } catch (error) {
      console.error('Failed to load from file:', error);
      return null;
    }
  }

  /**
   * Save directory handle to IndexedDB
   */
  async saveDirectoryHandle() {
    const db = await this.openIndexedDB();
    const transaction = db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    
    await store.put({
      id: 'directory_handle',
      handle: this.directoryHandle
    });
  }

  /**
   * Load directory handle from IndexedDB
   */
  async loadDirectoryHandle() {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get('directory_handle');

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result?.handle || null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Open IndexedDB
   */
  async openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CursorAccountManager', 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Disable auto-save
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Export database manually
   */
  async manualExport() {
    try {
      await sqliteService.exportToFile();
      return true;
    } catch (error) {
      console.error('Manual export failed:', error);
      return false;
    }
  }

  /**
   * Import database from file picker
   */
  async manualImport() {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'SQLite Database',
            accept: { 'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3'] }
          }
        ]
      });

      const file = await fileHandle.getFile();
      await sqliteService.importFromFile(file);
      
      return true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Import failed:', error);
      }
      return false;
    }
  }
}

// Export singleton
export const fileSystemService = new FileSystemService();
export default FileSystemService;
```

**Add UI for file system:**

```html
<!-- In sidepanel.html -->
<div class="settings-panel">
  <h3>⚙️ Settings</h3>
  
  <div class="setting-item">
    <label>Auto-Save to Folder</label>
    <button id="setup-auto-save-btn" class="btn-primary">
      📁 Select Folder
    </button>
    <p class="hint">Database will auto-save to your chosen folder every 5 minutes</p>
  </div>

  <div class="setting-item">
    <label>Manual Export/Import</label>
    <div class="button-group">
      <button id="export-db-btn" class="btn-secondary">
        ⬇️ Export Database
      </button>
      <button id="import-db-btn" class="btn-secondary">
        ⬆️ Import Database
      </button>
    </div>
  </div>
</div>
```

```javascript
// In sidepanel.js
import { fileSystemService } from './services/file-system-service.js';

// Setup button handlers
document.getElementById('setup-auto-save-btn').addEventListener('click', async () => {
  const success = await fileSystemService.setupAutoSave();
  if (success) {
    showSuccess('Auto-save enabled!');
  }
});

document.getElementById('export-db-btn').addEventListener('click', async () => {
  const success = await fileSystemService.manualExport();
  if (success) {
    showSuccess('Database exported!');
  }
});

document.getElementById('import-db-btn').addEventListener('click', async () => {
  const success = await fileSystemService.manualImport();
  if (success) {
    showSuccess('Database imported!');
    await loadAccounts(); // Reload UI
  }
});

// On init, try to restore auto-save
async function init() {
  await sqliteService.initialize();
  await fileSystemService.restoreAutoSave();
  // ... rest of init
}
```

#### Day 8-10: Migration & Testing

Create file: `services/migration-service.js`

```javascript
/**
 * Migration Service
 * Migrates data from Chrome Storage to SQLite
 */

import { accountService } from './account-service-v2.js';

class MigrationService {
  /**
   * Migrate from Chrome Storage to SQLite
   */
  async migrateFromChromeStorage() {
    try {
      console.log('Starting migration from Chrome Storage...');

      // Load data from Chrome Storage
      const chromeData = await this.loadChromeStorageData();
      
      if (!chromeData.accounts || chromeData.accounts.length === 0) {
        console.log('No data to migrate');
        return { success: true, migrated: 0 };
      }

      // Migrate each account
      let migrated = 0;
      for (const account of chromeData.accounts) {
        try {
          await accountService.create({
            name: account.name,
            email: account.email || account.name,
            status: account.status || 'active',
            avatarUrl: account.avatarUrl || '',
            cookies: account.cookies || []
          });
          migrated++;
        } catch (error) {
          console.error(`Failed to migrate account "${account.name}":`, error);
        }
      }

      console.log(`✅ Migrated ${migrated} accounts`);

      // Optionally: Clear Chrome Storage after successful migration
      // await this.clearChromeStorage();

      return { success: true, migrated };
      
    } catch (error) {
      console.error('Migration failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load data from Chrome Storage
   */
  async loadChromeStorageData() {
    const keys = [
      'cursor_accounts',
      'cursor_accounts:avatars',
      'cursor_accounts:info',
      'cursor_active_account',
      'cursor_payment_cards'
    ];

    const data = await chrome.storage.local.get(keys);
    
    return {
      accounts: data['cursor_accounts'] || [],
      avatars: data['cursor_accounts:avatars'] || {},
      info: data['cursor_accounts:info'] || {},
      activeAccount: data['cursor_active_account'] || null,
      paymentCards: data['cursor_payment_cards'] || []
    };
  }

  /**
   * Clear Chrome Storage (optional, after successful migration)
   */
  async clearChromeStorage() {
    await chrome.storage.local.clear();
    console.log('Chrome Storage cleared');
  }

  /**
   * Check if migration needed
   */
  async needsMigration() {
    // Check if Chrome Storage has data
    const chromeData = await this.loadChromeStorageData();
    const hasChromeData = chromeData.accounts && chromeData.accounts.length > 0;

    // Check if SQLite has data
    const sqliteAccounts = await accountService.getAll();
    const hasSQLiteData = sqliteAccounts.length > 0;

    // Migration needed if Chrome has data but SQLite doesn't
    return hasChromeData && !hasSQLiteData;
  }
}

// Export singleton
export const migrationService = new MigrationService();
export default MigrationService;
```

**Auto-migration on startup:**

```javascript
// In sidepanel.js - in init()
async function init() {
  try {
    // Initialize SQLite
    await sqliteService.initialize();
    
    // Check if migration needed
    const needsMigration = await migrationService.needsMigration();
    
    if (needsMigration) {
      showMigrationDialog();
    } else {
      await loadAccounts();
    }
    
  } catch (error) {
    console.error('Init failed:', error);
  }
}

function showMigrationDialog() {
  const dialog = document.createElement('div');
  dialog.className = 'migration-dialog';
  dialog.innerHTML = `
    <div class="dialog-content">
      <h2>🔄 Upgrade to SQLite</h2>
      <p>We've detected existing accounts in Chrome Storage.</p>
      <p>Upgrade to SQLite for better performance and persistence!</p>
      
      <div class="button-group">
        <button id="migrate-now-btn" class="btn-primary">
          ⬆️ Migrate Now
        </button>
        <button id="skip-migration-btn" class="btn-secondary">
          Skip (Keep Chrome Storage)
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);

  document.getElementById('migrate-now-btn').addEventListener('click', async () => {
    showLoading('Migrating...');
    
    const result = await migrationService.migrateFromChromeStorage();
    
    hideLoading();
    
    if (result.success) {
      showSuccess(`✅ Migrated ${result.migrated} accounts!`);
      await loadAccounts();
    } else {
      showError(`Migration failed: ${result.error}`);
    }
    
    dialog.remove();
  });

  document.getElementById('skip-migration-btn').addEventListener('click', () => {
    dialog.remove();
    loadAccounts();
  });
}
```

**Testing checklist:**
- [ ] Create account in SQLite
- [ ] Edit account
- [ ] Delete account
- [ ] Switch between accounts
- [ ] Export database
- [ ] Import database
- [ ] Auto-save to folder
- [ ] Migrate from Chrome Storage
- [ ] Refresh page (data persists)
- [ ] Uninstall/reinstall extension (data persists if exported)

---

## 🏗️ Implementation Path 2: Native Messaging + Python

**Timeline:** 9 weeks  
**Complexity:** High  
**Best for:** Power users

### Phase 1: Python Backend (Week 1-2)

See NATIVE_MESSAGING_ARCHITECTURE.md for complete implementation.

**Quick start:**
```bash
mkdir cursor-manager-backend
cd cursor-manager-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install sqlalchemy aiosqlite pydantic click rich

# Create project structure
mkdir -p src/{core,services,handlers,utils}
mkdir -p tests
mkdir -p database/schemas

# Start with native_host.py (copy from architecture doc)
```

---

## 🧪 Testing Guide

### Unit Testing

```javascript
// tests/account-service.test.js
import { describe, it, expect, beforeEach } from '@jest/globals';
import { accountService } from '../services/account-service-v2.js';

describe('AccountService', () => {
  beforeEach(async () => {
    await accountService.initialize();
    // Clear database
    await accountService.db.run('DELETE FROM accounts');
  });

  it('should create account', async () => {
    const account = await accountService.create({
      name: 'test',
      email: 'test@example.com'
    });

    expect(account.name).toBe('test');
    expect(account.email).toBe('test@example.com');
  });

  it('should get all accounts', async () => {
    await accountService.create({ name: 'test1', email: 'test1@example.com' });
    await accountService.create({ name: 'test2', email: 'test2@example.com' });

    const accounts = await accountService.getAll();
    expect(accounts.length).toBe(2);
  });

  it('should delete account', async () => {
    const account = await accountService.create({ name: 'test', email: 'test@example.com' });
    await accountService.delete(account.id);

    const accounts = await accountService.getAll();
    expect(accounts.length).toBe(0);
  });
});
```

### Integration Testing

```javascript
// tests/integration/full-flow.test.js
describe('Full User Flow', () => {
  it('should handle complete account lifecycle', async () => {
    // Initialize
    await sqliteService.initialize();
    await accountService.initialize();

    // Create account
    const account = await accountService.create({
      name: 'integration_test',
      email: 'test@example.com',
      cookies: [
        { name: 'session', value: 'abc123', domain: '.cursor.sh' }
      ]
    });

    expect(account.id).toBeDefined();

    // Get account
    const retrieved = await accountService.getById(account.id);
    expect(retrieved.name).toBe('integration_test');
    expect(retrieved.cookies.length).toBe(1);

    // Update account
    const updated = await accountService.update(account.id, {
      status: 'expired'
    });
    expect(updated.status).toBe('expired');

    // Search
    const searchResults = await accountService.search('integration');
    expect(searchResults.length).toBe(1);

    // Delete
    await accountService.delete(account.id);
    const afterDelete = await accountService.getAll();
    expect(afterDelete.length).toBe(0);
  });
});
```

---

## 🎯 Common Pitfalls & Solutions

### Issue 1: sql-wasm.wasm Not Loading
**Error:** `Failed to load sql-wasm.wasm`

**Solution:**
```javascript
// Make sure web_accessible_resources is correct in manifest.json
{
  "web_accessible_resources": [
    {
      "resources": ["libs/sql-wasm.wasm"],
      "matches": ["<all_urls>"]
    }
  ]
}

// Use chrome.runtime.getURL
const SQL = await initSqlJs({
  locateFile: file => chrome.runtime.getURL(`libs/${file}`)
});
```

### Issue 2: IndexedDB Quota Exceeded
**Error:** `QuotaExceededError`

**Solution:**
```javascript
// Monitor database size
const stats = sqliteService.getStats();
if (stats.size > 50 * 1024 * 1024) { // 50MB
  alert('Database is large. Consider exporting to file.');
}

// Implement cleanup
async function cleanup() {
  // Delete old expired accounts
  await accountService.db.run(`
    DELETE FROM accounts
    WHERE status = 'expired' AND updated_at < datetime('now', '-30 days')
  `);
}
```

### Issue 3: File System Access Not Working
**Error:** `showDirectoryPicker is not a function`

**Solution:**
```javascript
// Check browser support
if (!('showDirectoryPicker' in window)) {
  alert('File System Access API not supported. Use manual export instead.');
  // Fall back to manual export/import
}

// Check context (must be user gesture)
button.addEventListener('click', async () => {
  // This works - triggered by user click
  await fileSystemService.setupAutoSave();
});

// This won't work - no user gesture
window.onload = async () => {
  await fileSystemService.setupAutoSave(); // ERROR!
};
```

---

## ✅ Final Checklist

### Before Release
- [ ] All tests passing
- [ ] Migration from Chrome Storage works
- [ ] Export/import working
- [ ] Performance acceptable (<100ms operations)
- [ ] Memory usage reasonable (<100MB)
- [ ] Error handling comprehensive
- [ ] UI responsive
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in manifest.json

### Release Process
```bash
# Create release branch
git checkout -b release/v2.0.0

# Update version
# Edit manifest.json: "version": "2.0.0"

# Build (if applicable)
npm run build

# Create zip for Chrome Web Store
zip -r cursor-manager-v2.0.0.zip . -x "*.git*" "node_modules/*" "tests/*"

# Tag release
git tag v2.0.0
git push origin v2.0.0

# Upload to Chrome Web Store
# Go to https://chrome.google.com/webstore/developer/dashboard
```

---

## 📞 Need Help?

### Resources
- [sql.js Documentation](https://sql.js.org/)
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

### Common Commands
```bash
# Development
npm start

# Testing
npm test
npm run test:watch

# Lint
npm run lint

# Build
npm run build

# Clean
npm run clean
```

---

**Prepared By:** AI Architect  
**Date:** Oktober 2025  
**Status:** Ready for Implementation  
**Estimated Time:** 2 weeks (SQLite WASM) or 9 weeks (Native Messaging)


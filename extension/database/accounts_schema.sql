-- ==========================================
-- CURSOR ACCOUNT MANAGER - ACCOUNTS DATABASE SCHEMA
-- ==========================================
-- Database: cursor_accounts.db
-- Description: Schema untuk menyimpan data akun Cursor
-- Version: 1.0
-- Created: 2025-09-12

-- ==========================================
-- TABLE: accounts
-- ==========================================
-- Tabel utama untuk menyimpan data akun
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,           -- Nama akun (identitas unik)
    email TEXT NOT NULL,                 -- Email akun
    status TEXT DEFAULT '',              -- Status: 'free', 'pro trial', 'pro plan', 'business', 'empty', ''
    avatar_url TEXT,                     -- URL avatar akun
    is_active BOOLEAN DEFAULT FALSE,     -- Apakah akun sedang aktif
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME,                  -- Terakhir kali digunakan
    expires_at DATETIME,                 -- Kapan cookie akan expire (earliest expiry)
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TABLE: account_cookies
-- ==========================================
-- Tabel untuk menyimpan cookies akun (normalized)
CREATE TABLE IF NOT EXISTS account_cookies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_name TEXT NOT NULL,          -- Reference ke accounts.name
    domain TEXT NOT NULL,                -- Domain cookie (e.g., cursor.com)
    name TEXT NOT NULL,                  -- Nama cookie
    value TEXT NOT NULL,                 -- Value cookie
    path TEXT DEFAULT '/',               -- Path cookie
    expiration_date REAL,                -- Expiration date (Unix timestamp)
    host_only BOOLEAN DEFAULT TRUE,      -- Host only flag
    http_only BOOLEAN DEFAULT FALSE,     -- HTTP only flag
    secure BOOLEAN DEFAULT FALSE,        -- Secure flag
    session BOOLEAN DEFAULT FALSE,       -- Session flag
    same_site TEXT,                      -- SameSite policy: 'lax', 'strict', 'none', null
    store_id TEXT,                       -- Store ID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (account_name) REFERENCES accounts(name) ON DELETE CASCADE,
    
    -- Unique constraint untuk mencegah duplikasi cookie
    UNIQUE(account_name, domain, name, path)
);

-- ==========================================
-- TABLE: app_settings
-- ==========================================
-- Tabel untuk menyimpan pengaturan aplikasi
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,                -- Kunci setting
    value TEXT,                          -- Nilai setting
    type TEXT DEFAULT 'string',          -- Tipe data: 'string', 'number', 'boolean', 'json'
    description TEXT,                    -- Deskripsi setting
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TABLE: account_downloads
-- ==========================================
-- Tabel untuk tracking download ID akun
CREATE TABLE IF NOT EXISTS account_downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_name TEXT NOT NULL,          -- Reference ke accounts.name
    download_id INTEGER NOT NULL,       -- Chrome download ID
    filename TEXT,                       -- Nama file yang didownload
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (account_name) REFERENCES accounts(name) ON DELETE CASCADE,
    
    -- Unique constraint
    UNIQUE(account_name, download_id)
);

-- ==========================================
-- INDEXES untuk optimasi query
-- ==========================================

-- Index untuk pencarian akun berdasarkan email
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);

-- Index untuk pencarian akun berdasarkan status
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

-- Index untuk pencarian akun aktif
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active) WHERE is_active = TRUE;

-- Index untuk pencarian cookies berdasarkan account_name
CREATE INDEX IF NOT EXISTS idx_cookies_account ON account_cookies(account_name);

-- Index untuk pencarian cookies berdasarkan domain
CREATE INDEX IF NOT EXISTS idx_cookies_domain ON account_cookies(domain);

-- Index untuk pencarian cookies berdasarkan expiration
CREATE INDEX IF NOT EXISTS idx_cookies_expiration ON account_cookies(expiration_date);

-- Index untuk app_settings
CREATE INDEX IF NOT EXISTS idx_settings_type ON app_settings(type);

-- ==========================================
-- TRIGGERS untuk auto-update timestamps
-- ==========================================

-- Trigger untuk update timestamp pada accounts
CREATE TRIGGER IF NOT EXISTS accounts_updated_at 
AFTER UPDATE ON accounts
BEGIN
    UPDATE accounts SET updated_at = CURRENT_TIMESTAMP WHERE name = NEW.name;
END;

-- Trigger untuk update timestamp pada account_cookies
CREATE TRIGGER IF NOT EXISTS cookies_updated_at 
AFTER UPDATE ON account_cookies
BEGIN
    UPDATE account_cookies SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger untuk update timestamp pada app_settings
CREATE TRIGGER IF NOT EXISTS settings_updated_at 
AFTER UPDATE ON app_settings
BEGIN
    UPDATE app_settings SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
END;

-- Trigger untuk update last_used pada accounts ketika cookies diupdate
CREATE TRIGGER IF NOT EXISTS update_account_last_used
AFTER UPDATE ON account_cookies
BEGIN
    UPDATE accounts 
    SET last_used = CURRENT_TIMESTAMP 
    WHERE name = NEW.account_name;
END;

-- ==========================================
-- VIEWS untuk kemudahan query
-- ==========================================

-- View untuk mendapatkan akun dengan informasi cookie
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

-- View untuk mendapatkan akun aktif
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

-- ==========================================
-- INITIAL DATA - App Settings
-- ==========================================

-- Insert default app settings
INSERT OR IGNORE INTO app_settings (key, value, type, description) VALUES
('storage_version', '1.0', 'string', 'Version of database schema'),
('active_account', '', 'string', 'Currently active account name'),
('auto_export_enabled', 'true', 'boolean', 'Auto export accounts to Downloads folder'),
('theme', 'dark', 'string', 'UI theme preference'),
('debug_mode', 'false', 'boolean', 'Enable debug mode'),
('consolidate_duplicates', 'true', 'boolean', 'Automatically consolidate duplicate accounts'),
('backup_retention_days', '30', 'number', 'Number of days to keep backups');

-- ==========================================
-- SAMPLE QUERIES untuk referensi
-- ==========================================

/*
-- Get all accounts with cookie count
SELECT * FROM accounts_with_cookies ORDER BY last_used DESC;

-- Get active account
SELECT * FROM active_account;

-- Get cookies for specific account
SELECT * FROM account_cookies WHERE account_name = 'account_name' ORDER BY expiration_date ASC;

-- Search accounts by email
SELECT * FROM accounts WHERE email LIKE '%search_term%';

-- Get accounts by status
SELECT * FROM accounts WHERE status = 'pro plan';

-- Get expiring cookies (next 7 days)
SELECT a.name, a.email, c.name as cookie_name, c.expiration_date
FROM accounts a
JOIN account_cookies c ON a.name = c.account_name
WHERE c.expiration_date < (strftime('%s', 'now') + 7*24*60*60);

-- Count accounts by status
SELECT status, COUNT(*) as count FROM accounts GROUP BY status;

-- Get recent activity (last 30 days)
SELECT name, email, status, last_used 
FROM accounts 
WHERE last_used > datetime('now', '-30 days')
ORDER BY last_used DESC;
*/



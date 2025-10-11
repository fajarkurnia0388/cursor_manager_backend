-- ==========================================
-- CURSOR ACCOUNT MANAGER - PAYMENT CARDS DATABASE SCHEMA
-- ==========================================
-- Database: cursor_payment_cards.db
-- Description: Schema untuk menyimpan data payment cards
-- Version: 1.0
-- Created: 2025-09-12

-- ==========================================
-- TABLE: payment_cards
-- ==========================================
-- Tabel utama untuk menyimpan data payment cards
CREATE TABLE IF NOT EXISTS payment_cards (
    id TEXT PRIMARY KEY,                 -- Unique card ID (e.g., card_1234567890_abc123)
    card_number TEXT NOT NULL,           -- Nomor kartu (encrypted/hashed)
    card_number_hash TEXT NOT NULL,      -- Hash untuk duplicate detection
    card_number_masked TEXT NOT NULL,    -- Masked number untuk display (****-****-****-1234)
    expiry_month INTEGER NOT NULL,       -- Bulan expiry (1-12)
    expiry_year INTEGER NOT NULL,        -- Tahun expiry (2-digit, e.g., 25 for 2025)
    expiry_display TEXT NOT NULL,        -- Format display MM/YY
    cvc TEXT NOT NULL,                   -- CVC code (encrypted)
    card_type TEXT NOT NULL,             -- Visa, MasterCard, American Express, Discover, Unknown
    card_name TEXT,                      -- Custom name/description
    cardholder_name TEXT DEFAULT 'John Doe', -- Default cardholder name
    is_active BOOLEAN DEFAULT TRUE,      -- Apakah card masih aktif
    is_default BOOLEAN DEFAULT FALSE,    -- Apakah ini default card
    usage_count INTEGER DEFAULT 0,      -- Berapa kali digunakan untuk auto-fill
    last_used DATETIME,                  -- Terakhir kali digunakan
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TABLE: card_categories
-- ==========================================
-- Tabel untuk kategori/tag card (optional)
CREATE TABLE IF NOT EXISTS card_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,           -- Nama kategori (e.g., "Personal", "Business", "Test Cards")
    description TEXT,                    -- Deskripsi kategori
    color TEXT DEFAULT '#4CAF50',        -- Warna untuk UI
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TABLE: card_category_mappings
-- ==========================================
-- Tabel untuk mapping card ke category (many-to-many)
CREATE TABLE IF NOT EXISTS card_category_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id TEXT NOT NULL,               -- Reference ke payment_cards.id
    category_id INTEGER NOT NULL,       -- Reference ke card_categories.id
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (card_id) REFERENCES payment_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES card_categories(id) ON DELETE CASCADE,
    
    -- Unique constraint
    UNIQUE(card_id, category_id)
);

-- ==========================================
-- TABLE: card_usage_history
-- ==========================================
-- Tabel untuk tracking penggunaan card
CREATE TABLE IF NOT EXISTS card_usage_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id TEXT NOT NULL,               -- Reference ke payment_cards.id
    domain TEXT,                         -- Domain website tempat digunakan
    url TEXT,                           -- URL lengkap (optional)
    fields_filled INTEGER DEFAULT 0,    -- Berapa field yang berhasil diisi
    success BOOLEAN DEFAULT TRUE,       -- Apakah auto-fill berhasil
    error_message TEXT,                  -- Error message jika gagal
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (card_id) REFERENCES payment_cards(id) ON DELETE CASCADE
);

-- ==========================================
-- TABLE: card_import_batches
-- ==========================================
-- Tabel untuk tracking import batch
CREATE TABLE IF NOT EXISTS card_import_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,                       -- Nama file yang diimport
    source_type TEXT DEFAULT 'text',     -- 'text', 'csv', 'json'
    total_cards INTEGER DEFAULT 0,      -- Total card dalam batch
    successful_imports INTEGER DEFAULT 0, -- Berhasil diimport
    failed_imports INTEGER DEFAULT 0,   -- Gagal diimport
    duplicate_skipped INTEGER DEFAULT 0, -- Duplikat yang diskip
    notes TEXT,                          -- Catatan import
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TABLE: card_import_details
-- ==========================================
-- Detail per card dalam import batch
CREATE TABLE IF NOT EXISTS card_import_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,          -- Reference ke card_import_batches.id
    card_id TEXT,                       -- Reference ke payment_cards.id (NULL jika gagal import)
    raw_data TEXT,                      -- Data mentah dari import
    status TEXT DEFAULT 'pending',      -- 'success', 'failed', 'duplicate', 'skipped'
    error_message TEXT,                  -- Error message jika gagal
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (batch_id) REFERENCES card_import_batches(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES payment_cards(id) ON DELETE SET NULL
);

-- ==========================================
-- TABLE: app_settings
-- ==========================================
-- Tabel untuk pengaturan aplikasi payment cards
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,                -- Kunci setting
    value TEXT,                          -- Nilai setting
    type TEXT DEFAULT 'string',          -- Tipe data: 'string', 'number', 'boolean', 'json'
    description TEXT,                    -- Deskripsi setting
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INDEXES untuk optimasi query
-- ==========================================

-- Index untuk pencarian berdasarkan card type
CREATE INDEX IF NOT EXISTS idx_cards_type ON payment_cards(card_type);

-- Index untuk pencarian card aktif
CREATE INDEX IF NOT EXISTS idx_cards_active ON payment_cards(is_active) WHERE is_active = TRUE;

-- Index untuk pencarian berdasarkan masked number
CREATE INDEX IF NOT EXISTS idx_cards_masked ON payment_cards(card_number_masked);

-- Index untuk duplicate detection
CREATE INDEX IF NOT EXISTS idx_cards_hash ON payment_cards(card_number_hash);

-- Index untuk pencarian berdasarkan expiry
CREATE INDEX IF NOT EXISTS idx_cards_expiry ON payment_cards(expiry_year, expiry_month);

-- Index untuk sorting berdasarkan usage
CREATE INDEX IF NOT EXISTS idx_cards_usage ON payment_cards(usage_count DESC, last_used DESC);

-- Index untuk card usage history
CREATE INDEX IF NOT EXISTS idx_usage_card ON card_usage_history(card_id);
CREATE INDEX IF NOT EXISTS idx_usage_domain ON card_usage_history(domain);
CREATE INDEX IF NOT EXISTS idx_usage_date ON card_usage_history(used_at);

-- Index untuk import batches
CREATE INDEX IF NOT EXISTS idx_import_date ON card_import_batches(imported_at);
CREATE INDEX IF NOT EXISTS idx_import_details_batch ON card_import_details(batch_id);

-- ==========================================
-- TRIGGERS untuk auto-update timestamps dan logic
-- ==========================================

-- Trigger untuk update timestamp pada payment_cards
CREATE TRIGGER IF NOT EXISTS cards_updated_at 
AFTER UPDATE ON payment_cards
BEGIN
    UPDATE payment_cards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger untuk update timestamp pada app_settings
CREATE TRIGGER IF NOT EXISTS settings_updated_at 
AFTER UPDATE ON app_settings
BEGIN
    UPDATE app_settings SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
END;

-- Trigger untuk update usage_count ketika card digunakan
CREATE TRIGGER IF NOT EXISTS increment_usage_count
AFTER INSERT ON card_usage_history
WHEN NEW.success = TRUE
BEGIN
    UPDATE payment_cards 
    SET usage_count = usage_count + 1,
        last_used = CURRENT_TIMESTAMP
    WHERE id = NEW.card_id;
END;

-- Trigger untuk ensure only one default card per type (optional)
CREATE TRIGGER IF NOT EXISTS ensure_single_default
AFTER UPDATE OF is_default ON payment_cards
WHEN NEW.is_default = TRUE
BEGIN
    UPDATE payment_cards 
    SET is_default = FALSE 
    WHERE card_type = NEW.card_type 
      AND id != NEW.id 
      AND is_default = TRUE;
END;

-- Trigger untuk auto-generate card_name jika belum ada
CREATE TRIGGER IF NOT EXISTS auto_generate_card_name
AFTER INSERT ON payment_cards
WHEN NEW.card_name IS NULL OR NEW.card_name = ''
BEGIN
    UPDATE payment_cards 
    SET card_name = NEW.card_type || ' ending in ' || SUBSTR(NEW.card_number_masked, -4)
    WHERE id = NEW.id;
END;

-- ==========================================
-- VIEWS untuk kemudahan query
-- ==========================================

-- View untuk cards dengan statistik usage
CREATE VIEW IF NOT EXISTS cards_with_stats AS
SELECT 
    c.id,
    c.card_number_masked,
    c.expiry_display,
    c.card_type,
    c.card_name,
    c.cardholder_name,
    c.is_active,
    c.is_default,
    c.usage_count,
    c.last_used,
    c.created_at,
    COUNT(h.id) as total_usage_history,
    COUNT(CASE WHEN h.success = TRUE THEN 1 END) as successful_usage,
    COUNT(CASE WHEN h.used_at > datetime('now', '-30 days') THEN 1 END) as usage_last_30_days
FROM payment_cards c
LEFT JOIN card_usage_history h ON c.id = h.card_id
GROUP BY c.id;

-- View untuk cards yang akan expired dalam 3 bulan
CREATE VIEW IF NOT EXISTS expiring_cards AS
SELECT 
    id,
    card_number_masked,
    expiry_display,
    card_type,
    card_name,
    (expiry_year + 2000) as full_year,
    expiry_month
FROM payment_cards 
WHERE is_active = TRUE
  AND (
    (expiry_year + 2000 = CAST(strftime('%Y', 'now') AS INTEGER) AND expiry_month <= CAST(strftime('%m', 'now') AS INTEGER) + 3) OR
    (expiry_year + 2000 = CAST(strftime('%Y', 'now') AS INTEGER) + 1 AND CAST(strftime('%m', 'now') AS INTEGER) + 3 > 12)
  )
ORDER BY expiry_year, expiry_month;

-- View untuk statistik per card type
CREATE VIEW IF NOT EXISTS card_type_stats AS
SELECT 
    card_type,
    COUNT(*) as total_cards,
    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_cards,
    COUNT(CASE WHEN is_default = TRUE THEN 1 END) as default_cards,
    AVG(usage_count) as avg_usage,
    MAX(last_used) as last_usage
FROM payment_cards 
GROUP BY card_type
ORDER BY total_cards DESC;

-- ==========================================
-- FUNCTIONS untuk data validation (via CHECK constraints)
-- ==========================================

-- Constraint untuk memastikan expiry month valid
ALTER TABLE payment_cards ADD CONSTRAINT check_expiry_month 
CHECK (expiry_month >= 1 AND expiry_month <= 12);

-- Constraint untuk memastikan expiry year reasonable (next 10 years)
ALTER TABLE payment_cards ADD CONSTRAINT check_expiry_year 
CHECK (expiry_year >= CAST(strftime('%y', 'now') AS INTEGER) 
   AND expiry_year <= CAST(strftime('%y', 'now') AS INTEGER) + 10);

-- Constraint untuk memastikan CVC format
ALTER TABLE payment_cards ADD CONSTRAINT check_cvc_format 
CHECK (LENGTH(cvc) >= 3 AND LENGTH(cvc) <= 4 AND cvc GLOB '[0-9]*');

-- ==========================================
-- INITIAL DATA - App Settings
-- ==========================================

-- Insert default app settings
INSERT OR IGNORE INTO app_settings (key, value, type, description) VALUES
('storage_version', '1.0', 'string', 'Version of database schema'),
('auto_fill_enabled', 'true', 'boolean', 'Enable auto-fill functionality'),
('security_level', 'medium', 'string', 'Security level: low, medium, high'),
('default_cardholder_name', 'John Doe', 'string', 'Default cardholder name'),
('mask_card_numbers', 'true', 'boolean', 'Mask card numbers in UI'),
('track_usage_history', 'true', 'boolean', 'Track card usage history'),
('cleanup_old_history_days', '90', 'number', 'Days to keep usage history'),
('max_cards_limit', '50', 'number', 'Maximum number of cards allowed'),
('allow_duplicate_cards', 'false', 'boolean', 'Allow duplicate card numbers'),
('export_format', 'pipe_separated', 'string', 'Default export format: pipe_separated, csv, json');

-- Insert default categories
INSERT OR IGNORE INTO card_categories (name, description, color) VALUES
('Personal', 'Personal payment cards', '#4CAF50'),
('Business', 'Business payment cards', '#2196F3'),
('Test Cards', 'Test cards for development', '#FF9800'),
('Backup Cards', 'Backup payment methods', '#9C27B0');

-- ==========================================
-- SAMPLE QUERIES untuk referensi
-- ==========================================

/*
-- Get all active cards with stats
SELECT * FROM cards_with_stats WHERE is_active = TRUE ORDER BY usage_count DESC;

-- Get cards by type
SELECT * FROM payment_cards WHERE card_type = 'Visa' AND is_active = TRUE;

-- Get expiring cards
SELECT * FROM expiring_cards;

-- Get card usage for specific domain
SELECT c.card_name, c.card_number_masked, COUNT(h.id) as usage_count
FROM payment_cards c
JOIN card_usage_history h ON c.id = h.card_id
WHERE h.domain = 'cursor.com'
GROUP BY c.id
ORDER BY usage_count DESC;

-- Get import statistics
SELECT 
    filename,
    total_cards,
    successful_imports,
    failed_imports,
    duplicate_skipped,
    imported_at
FROM card_import_batches 
ORDER BY imported_at DESC;

-- Search cards by masked number
SELECT * FROM payment_cards 
WHERE card_number_masked LIKE '%1234%' 
  AND is_active = TRUE;

-- Get card type statistics
SELECT * FROM card_type_stats;

-- Clean up old usage history
DELETE FROM card_usage_history 
WHERE used_at < datetime('now', '-90 days');

-- Get most used cards
SELECT card_name, card_number_masked, usage_count, last_used
FROM payment_cards 
WHERE is_active = TRUE
ORDER BY usage_count DESC, last_used DESC
LIMIT 10;
*/



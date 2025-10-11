/**
 * 💳 Payment Cards Database Service
 * Mengelola operasi database untuk payment cards
 *
 * Features:
 * - CRUD operations untuk payment cards
 * - Card validation dan duplicate detection
 * - Usage history tracking
 * - Import/export functionality
 */

class CardsDatabaseService extends BaseDatabaseService {
  constructor() {
    super("cursor_payment_cards");
    this.SCHEMA_VERSION = 1.0;
  }

  /**
   * Get target schema version
   */
  async getTargetSchemaVersion() {
    return this.SCHEMA_VERSION;
  }

  /**
   * Execute migrations for cards database
   */
  async executeMigrations(fromVersion, toVersion) {
    console.log(`Migrating cards database from ${fromVersion} to ${toVersion}`);

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
      -- Create payment_cards table
      CREATE TABLE IF NOT EXISTS payment_cards (
        id TEXT PRIMARY KEY,
        card_number TEXT NOT NULL,
        card_number_hash TEXT NOT NULL,
        card_number_masked TEXT NOT NULL,
        expiry_month INTEGER NOT NULL,
        expiry_year INTEGER NOT NULL,
        expiry_display TEXT NOT NULL,
        cvc TEXT NOT NULL,
        card_type TEXT NOT NULL,
        card_name TEXT,
        cardholder_name TEXT DEFAULT 'John Doe',
        is_active BOOLEAN DEFAULT TRUE,
        is_default BOOLEAN DEFAULT FALSE,
        usage_count INTEGER DEFAULT 0,
        last_used DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CHECK (expiry_month >= 1 AND expiry_month <= 12),
        CHECK (expiry_year >= CAST(strftime('%y', 'now') AS INTEGER) 
           AND expiry_year <= CAST(strftime('%y', 'now') AS INTEGER) + 10),
        CHECK (LENGTH(cvc) >= 3 AND LENGTH(cvc) <= 4 AND cvc GLOB '[0-9]*')
      );

      -- Create card_categories table
      CREATE TABLE IF NOT EXISTS card_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        color TEXT DEFAULT '#4CAF50',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create card_category_mappings table
      CREATE TABLE IF NOT EXISTS card_category_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (card_id) REFERENCES payment_cards(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES card_categories(id) ON DELETE CASCADE,
        UNIQUE(card_id, category_id)
      );

      -- Create card_usage_history table
      CREATE TABLE IF NOT EXISTS card_usage_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id TEXT NOT NULL,
        domain TEXT,
        url TEXT,
        fields_filled INTEGER DEFAULT 0,
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (card_id) REFERENCES payment_cards(id) ON DELETE CASCADE
      );

      -- Create card_import_batches table
      CREATE TABLE IF NOT EXISTS card_import_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        source_type TEXT DEFAULT 'text',
        total_cards INTEGER DEFAULT 0,
        successful_imports INTEGER DEFAULT 0,
        failed_imports INTEGER DEFAULT 0,
        duplicate_skipped INTEGER DEFAULT 0,
        notes TEXT,
        imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create card_import_details table
      CREATE TABLE IF NOT EXISTS card_import_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER NOT NULL,
        card_id TEXT,
        raw_data TEXT,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES card_import_batches(id) ON DELETE CASCADE,
        FOREIGN KEY (card_id) REFERENCES payment_cards(id) ON DELETE SET NULL
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

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_cards_type ON payment_cards(card_type);
      CREATE INDEX IF NOT EXISTS idx_cards_active ON payment_cards(is_active) WHERE is_active = TRUE;
      CREATE INDEX IF NOT EXISTS idx_cards_masked ON payment_cards(card_number_masked);
      CREATE INDEX IF NOT EXISTS idx_cards_hash ON payment_cards(card_number_hash);
      CREATE INDEX IF NOT EXISTS idx_cards_expiry ON payment_cards(expiry_year, expiry_month);
      CREATE INDEX IF NOT EXISTS idx_cards_usage ON payment_cards(usage_count DESC, last_used DESC);
      CREATE INDEX IF NOT EXISTS idx_usage_card ON card_usage_history(card_id);
      CREATE INDEX IF NOT EXISTS idx_usage_domain ON card_usage_history(domain);
      CREATE INDEX IF NOT EXISTS idx_usage_date ON card_usage_history(used_at);
      CREATE INDEX IF NOT EXISTS idx_import_date ON card_import_batches(imported_at);
      CREATE INDEX IF NOT EXISTS idx_import_details_batch ON card_import_details(batch_id);

      -- Create triggers
      CREATE TRIGGER IF NOT EXISTS cards_updated_at 
      AFTER UPDATE ON payment_cards
      BEGIN
        UPDATE payment_cards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TRIGGER IF NOT EXISTS settings_updated_at 
      AFTER UPDATE ON app_settings
      BEGIN
        UPDATE app_settings SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
      END;

      CREATE TRIGGER IF NOT EXISTS increment_usage_count
      AFTER INSERT ON card_usage_history
      WHEN NEW.success = TRUE
      BEGIN
        UPDATE payment_cards 
        SET usage_count = usage_count + 1,
            last_used = CURRENT_TIMESTAMP
        WHERE id = NEW.card_id;
      END;

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

      CREATE TRIGGER IF NOT EXISTS auto_generate_card_name
      AFTER INSERT ON payment_cards
      WHEN NEW.card_name IS NULL OR NEW.card_name = ''
      BEGIN
        UPDATE payment_cards 
        SET card_name = NEW.card_type || ' ending in ' || SUBSTR(NEW.card_number_masked, -4)
        WHERE id = NEW.id;
      END;

      -- Create views
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
    `;

    // Execute schema creation in transaction
    const statements = schema.split(";").filter((stmt) => stmt.trim());
    await this.transaction(statements.map((sql) => ({ sql })));

    // Insert default settings and categories
    await this.insertDefaultData();
  }

  /**
   * Insert default app settings and categories
   */
  async insertDefaultData() {
    // Default settings
    const defaultSettings = [
      ["storage_version", "1.0", "string", "Version of database schema"],
      [
        "auto_fill_enabled",
        "true",
        "boolean",
        "Enable auto-fill functionality",
      ],
      [
        "security_level",
        "medium",
        "string",
        "Security level: low, medium, high",
      ],
      [
        "default_cardholder_name",
        "John Doe",
        "string",
        "Default cardholder name",
      ],
      ["mask_card_numbers", "true", "boolean", "Mask card numbers in UI"],
      ["track_usage_history", "true", "boolean", "Track card usage history"],
      [
        "cleanup_old_history_days",
        "90",
        "number",
        "Days to keep usage history",
      ],
      ["max_cards_limit", "50", "number", "Maximum number of cards allowed"],
      [
        "allow_duplicate_cards",
        "false",
        "boolean",
        "Allow duplicate card numbers",
      ],
      ["export_format", "pipe_separated", "string", "Default export format"],
    ];

    for (const [key, value, type, description] of defaultSettings) {
      await this.query(
        "INSERT OR IGNORE INTO app_settings (key, value, type, description) VALUES (?, ?, ?, ?)",
        [key, value, type, description]
      );
    }

    // Default categories
    const defaultCategories = [
      ["Personal", "Personal payment cards", "#4CAF50"],
      ["Business", "Business payment cards", "#2196F3"],
      ["Test Cards", "Test cards for development", "#FF9800"],
      ["Backup Cards", "Backup payment methods", "#9C27B0"],
    ];

    for (const [name, description, color] of defaultCategories) {
      await this.query(
        "INSERT OR IGNORE INTO card_categories (name, description, color) VALUES (?, ?, ?)",
        [name, description, color]
      );
    }
  }

  // ===========================================
  // CARD MANAGEMENT METHODS
  // ===========================================

  /**
   * Get all payment cards with statistics
   */
  async getAllCards() {
    try {
      const cards = await this.query(`
        SELECT * FROM cards_with_stats 
        WHERE is_active = TRUE
        ORDER BY usage_count DESC, last_used DESC, created_at DESC
      `);

      return cards.map((card) => ({
        ...card,
        is_active: Boolean(card.is_active),
        is_default: Boolean(card.is_default),
        usage_count: Number(card.usage_count) || 0,
        total_usage_history: Number(card.total_usage_history) || 0,
        successful_usage: Number(card.successful_usage) || 0,
        usage_last_30_days: Number(card.usage_last_30_days) || 0,
        created_at: card.created_at ? new Date(card.created_at) : null,
        last_used: card.last_used ? new Date(card.last_used) : null,
      }));
    } catch (error) {
      console.error("Error getting all cards:", error);
      throw error;
    }
  }

  /**
   * Get card by ID
   */
  async getCard(cardId) {
    try {
      const cards = await this.query(
        "SELECT * FROM cards_with_stats WHERE id = ?",
        [cardId]
      );

      if (cards.length === 0) {
        return null;
      }

      const card = cards[0];
      return {
        ...card,
        is_active: Boolean(card.is_active),
        is_default: Boolean(card.is_default),
        usage_count: Number(card.usage_count) || 0,
        created_at: card.created_at ? new Date(card.created_at) : null,
        last_used: card.last_used ? new Date(card.last_used) : null,
      };
    } catch (error) {
      console.error("Error getting card:", error);
      throw error;
    }
  }

  /**
   * Add new payment card
   */
  async addCard(cardData) {
    try {
      const {
        number,
        expiry,
        cvc,
        cardholderName = "John Doe",
        customName = null,
      } = cardData;

      // Validate card data
      if (!this.validateCardNumber(number)) {
        throw new Error("Invalid card number");
      }

      if (!this.validateExpiry(expiry)) {
        throw new Error("Invalid expiry date");
      }

      if (!this.validateCVC(cvc)) {
        throw new Error("Invalid CVC");
      }

      // Parse expiry
      const [month, year] = expiry.split("/");
      const expiryMonth = parseInt(month, 10);
      const expiryYear = parseInt(year, 10);

      // Generate card details
      const cardId = this.generateCardId();
      const cardType = this.getCardType(number);
      const maskedNumber = this.maskCardNumber(number);
      const cardHash = await this.hashCardNumber(number);
      const cardName =
        customName || `${cardType} ending in ${number.slice(-4)}`;

      // Check for duplicates
      if (!(await this.getSetting("allow_duplicate_cards"))) {
        const duplicate = await this.findDuplicateCard(cardHash);
        if (duplicate) {
          throw new Error(`Card already exists: ${duplicate.card_name}`);
        }
      }

      // Insert card
      await this.query(
        `
        INSERT INTO payment_cards (
          id, card_number, card_number_hash, card_number_masked,
          expiry_month, expiry_year, expiry_display, cvc, card_type,
          card_name, cardholder_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
        [
          cardId,
          number,
          cardHash,
          maskedNumber,
          expiryMonth,
          expiryYear,
          expiry,
          cvc,
          cardType,
          cardName,
          cardholderName,
        ]
      );

      console.log(`Card added successfully: ${cardId}`);
      return await this.getCard(cardId);
    } catch (error) {
      console.error("Error adding card:", error);
      throw error;
    }
  }

  /**
   * Update payment card
   */
  async updateCard(cardId, updates) {
    try {
      const updateFields = [];
      const updateValues = [];

      // Handle allowed updates
      const allowedFields = [
        "card_name",
        "cardholder_name",
        "is_active",
        "is_default",
      ];

      for (const field of allowedFields) {
        if (updates.hasOwnProperty(field)) {
          updateFields.push(`${field} = ?`);
          updateValues.push(updates[field]);
        }
      }

      if (updateFields.length === 0) {
        throw new Error("No valid fields to update");
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(cardId);

      await this.query(
        `
        UPDATE payment_cards 
        SET ${updateFields.join(", ")}
        WHERE id = ?
      `,
        updateValues
      );

      console.log(`Card updated successfully: ${cardId}`);
      return await this.getCard(cardId);
    } catch (error) {
      console.error("Error updating card:", error);
      throw error;
    }
  }

  /**
   * Remove payment card
   */
  async removeCard(cardId) {
    try {
      await this.query("DELETE FROM payment_cards WHERE id = ?", [cardId]);
      console.log(`Card removed successfully: ${cardId}`);
      return true;
    } catch (error) {
      console.error("Error removing card:", error);
      throw error;
    }
  }

  // ===========================================
  // CARD VALIDATION METHODS
  // ===========================================

  /**
   * Validate card number (13-19 digits)
   */
  validateCardNumber(cardNumber) {
    const cleanNumber = cardNumber.replace(/[\s-]/g, "");
    return /^\d{13,19}$/.test(cleanNumber);
  }

  /**
   * Validate expiry format (MM/YY)
   */
  validateExpiry(expiry) {
    return /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry);
  }

  /**
   * Validate CVC (3-4 digits)
   */
  validateCVC(cvc) {
    return /^\d{3,4}$/.test(cvc);
  }

  /**
   * Detect card type based on number
   */
  getCardType(cardNumber) {
    const cleanNumber = cardNumber.replace(/[\s-]/g, "");
    const firstDigit = cleanNumber.charAt(0);
    const firstTwoDigits = cleanNumber.substring(0, 2);
    const firstFourDigits = cleanNumber.substring(0, 4);

    if (firstDigit === "4") {
      return "Visa";
    } else if (firstTwoDigits >= "51" && firstTwoDigits <= "55") {
      return "MasterCard";
    } else if (firstTwoDigits === "34" || firstTwoDigits === "37") {
      return "American Express";
    } else if (
      firstFourDigits === "6011" ||
      (firstTwoDigits >= "64" && firstTwoDigits <= "65")
    ) {
      return "Discover";
    } else {
      return "Unknown";
    }
  }

  /**
   * Mask card number for display
   */
  maskCardNumber(cardNumber) {
    const cleanNumber = cardNumber.replace(/[\s-]/g, "");
    if (cleanNumber.length === 16) {
      return `${cleanNumber.slice(0, 4)} **** **** ${cleanNumber.slice(-4)}`;
    }
    return `**** **** **** ${cleanNumber.slice(-4)}`;
  }

  /**
   * Generate unique card ID
   */
  generateCardId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `card_${timestamp}_${random}`;
  }

  // ===========================================
  // SECURITY METHODS
  // ===========================================

  /**
   * Hash card number for duplicate detection
   */
  async hashCardNumber(cardNumber) {
    try {
      const cleanNumber = cardNumber.replace(/[\s-]/g, "");
      const encoder = new TextEncoder();
      const data = encoder.encode(cleanNumber);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch (error) {
      console.error("Error hashing card number:", error);
      throw error;
    }
  }

  // ===========================================
  // DUPLICATE DETECTION METHODS
  // ===========================================

  /**
   * Find duplicate card by hash
   */
  async findDuplicateCard(cardHash) {
    try {
      const result = await this.query(
        "SELECT id, card_name, card_type, card_number_masked FROM payment_cards WHERE card_number_hash = ?",
        [cardHash]
      );

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error finding duplicate card:", error);
      return null;
    }
  }

  // ===========================================
  // USAGE TRACKING METHODS
  // ===========================================

  /**
   * Record card usage
   */
  async recordUsage(
    cardId,
    domain,
    url,
    fieldsFilledCount,
    success = true,
    errorMessage = null
  ) {
    try {
      await this.query(
        `
        INSERT INTO card_usage_history (
          card_id, domain, url, fields_filled, success, error_message, used_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
        [cardId, domain, url, fieldsFilledCount, success ? 1 : 0, errorMessage]
      );

      console.log(`Usage recorded for card: ${cardId}`);
    } catch (error) {
      console.error("Error recording card usage:", error);
    }
  }

  /**
   * Get usage history for a card
   */
  async getCardUsageHistory(cardId, limit = 50) {
    try {
      const history = await this.query(
        `
        SELECT domain, url, fields_filled, success, error_message, used_at
        FROM card_usage_history
        WHERE card_id = ?
        ORDER BY used_at DESC
        LIMIT ?
      `,
        [cardId, limit]
      );

      return history.map((entry) => ({
        ...entry,
        success: Boolean(entry.success),
        used_at: new Date(entry.used_at),
      }));
    } catch (error) {
      console.error("Error getting card usage history:", error);
      throw error;
    }
  }

  // ===========================================
  // IMPORT/EXPORT METHODS
  // ===========================================

  /**
   * Import cards from text data
   */
  async importCards(cardText, filename = null, replaceExisting = false) {
    try {
      // Create import batch record
      const batchResult = await this.query(
        `
        INSERT INTO card_import_batches (filename, source_type, imported_at)
        VALUES (?, 'text', CURRENT_TIMESTAMP)
      `,
        [filename]
      );

      const batchId = batchResult.lastInsertRowid;

      const cards = this.parseCardData(cardText);
      const importResults = {
        total: cards.length,
        successful: 0,
        failed: 0,
        duplicates: 0,
        errors: [],
      };

      for (const cardData of cards) {
        try {
          // Check for duplicates
          const cardHash = await this.hashCardNumber(cardData.number);
          const duplicate = await this.findDuplicateCard(cardHash);

          if (duplicate && !replaceExisting) {
            importResults.duplicates++;
            await this.query(
              `
              INSERT INTO card_import_details (batch_id, raw_data, status, error_message)
              VALUES (?, ?, 'duplicate', ?)
            `,
              [
                batchId,
                JSON.stringify(cardData),
                `Duplicate of ${duplicate.card_name}`,
              ]
            );
            continue;
          }

          // Add the card
          const newCard = await this.addCard(cardData);
          importResults.successful++;

          await this.query(
            `
            INSERT INTO card_import_details (batch_id, card_id, raw_data, status)
            VALUES (?, ?, ?, 'success')
          `,
            [batchId, newCard.id, JSON.stringify(cardData)]
          );
        } catch (error) {
          importResults.failed++;
          importResults.errors.push({
            cardData,
            error: error.message,
          });

          await this.query(
            `
            INSERT INTO card_import_details (batch_id, raw_data, status, error_message)
            VALUES (?, ?, 'failed', ?)
          `,
            [batchId, JSON.stringify(cardData), error.message]
          );
        }
      }

      // Update batch totals
      await this.query(
        `
        UPDATE card_import_batches 
        SET total_cards = ?, successful_imports = ?, failed_imports = ?, duplicate_skipped = ?
        WHERE id = ?
      `,
        [
          importResults.total,
          importResults.successful,
          importResults.failed,
          importResults.duplicates,
          batchId,
        ]
      );

      console.log("Import completed:", importResults);
      return importResults;
    } catch (error) {
      console.error("Error importing cards:", error);
      throw error;
    }
  }

  /**
   * Parse card data from text format
   */
  parseCardData(cardText) {
    const lines = cardText.split("\n").filter((line) => line.trim());
    const cards = [];

    for (const line of lines) {
      // Skip comments and empty lines
      if (!line.trim() || line.startsWith("#") || line.startsWith("F K,")) {
        continue;
      }

      const parts = line.split("|");
      let cardNumber, expiry, cvc;

      if (parts.length === 4) {
        // New format: number|month|year|CVC
        cardNumber = parts[0].trim();
        const month = parts[1].trim();
        const year = parts[2].trim();
        cvc = parts[3].trim();
        expiry = this.formatExpiry(month, year);
        if (!expiry) continue;
      } else if (parts.length === 3) {
        // Legacy format: number|MM/YY|CVC
        cardNumber = parts[0].trim();
        expiry = parts[1].trim();
        cvc = parts[2].trim();
      } else {
        console.warn(`Skipping invalid card format: ${line}`);
        continue;
      }

      // Clean and validate
      const cleanNumber = cardNumber.replace(/[\s-]/g, "");
      if (
        this.validateCardNumber(cleanNumber) &&
        this.validateExpiry(expiry) &&
        this.validateCVC(cvc)
      ) {
        cards.push({
          number: cleanNumber,
          expiry: expiry,
          cvc: cvc,
        });
      }
    }

    return cards;
  }

  /**
   * Format month and year to MM/YY
   */
  formatExpiry(month, year) {
    const monthNum = parseInt(month, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return null;
    }

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) {
      return null;
    }

    const paddedMonth = monthNum.toString().padStart(2, "0");
    let shortYear;

    if (yearNum >= 2000) {
      shortYear = yearNum.toString().slice(-2);
    } else if (yearNum >= 0 && yearNum <= 99) {
      shortYear = yearNum.toString().padStart(2, "0");
    } else {
      return null;
    }

    return `${paddedMonth}/${shortYear}`;
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
      if (!type) {
        if (typeof value === "boolean") type = "boolean";
        else if (typeof value === "number") type = "number";
        else if (typeof value === "object") type = "json";
        else type = "string";
      }

      const stringValue =
        type === "json" ? JSON.stringify(value) : String(value);

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

      console.log(`Setting ${key} updated`);
    } catch (error) {
      console.error("Error setting app setting:", error);
      throw error;
    }
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
          (SELECT COUNT(*) FROM payment_cards) as total_cards,
          (SELECT COUNT(*) FROM payment_cards WHERE is_active = TRUE) as active_cards,
          (SELECT COUNT(*) FROM card_usage_history) as total_usage_records,
          (SELECT COUNT(DISTINCT card_type) FROM payment_cards) as unique_card_types,
          (SELECT COUNT(*) FROM payment_cards WHERE last_used > datetime('now', '-30 days')) as recent_activity
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
      const { cleanupOldHistory = true, retentionDays = 90 } = options;

      const queries = [];

      if (cleanupOldHistory) {
        queries.push({
          sql: `DELETE FROM card_usage_history 
                WHERE used_at < datetime('now', '-${retentionDays} days')`,
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
  module.exports = CardsDatabaseService;
}

// For service worker context
if (typeof self !== "undefined") {
  self.CardsDatabaseService = CardsDatabaseService;
}

/**
 * 💳 Cards Migrator
 * Mengelola migrasi data payment cards dari Chrome Local Storage ke SQLite
 *
 * Features:
 * - Migrate payment cards from Chrome storage
 * - Validate and normalize card data
 * - Handle card encryption and security
 * - Error handling and recovery
 * - Progress tracking
 */

class CardsMigrator {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
    this.dbService = null;
  }

  /**
   * Initialize cards migrator
   */
  async initialize() {
    this.dbService = this.databaseManager.getCardsDB();
  }

  /**
   * Migrate all payment cards data
   */
  async migrate() {
    console.log("💳 Starting payment cards migration...");

    if (!this.dbService) {
      await this.initialize();
    }

    const startTime = Date.now();
    let migratedCount = 0;
    const errors = [];
    const results = {
      totalCards: 0,
      migratedCards: 0,
      skippedCards: 0,
      errors: [],
      migrationTime: 0,
    };

    try {
      // Get existing payment cards from Chrome storage
      const cardsData = await chrome.storage.local.get("cursor_payment_cards");
      const cards = cardsData.cursor_payment_cards || [];

      results.totalCards = Array.isArray(cards) ? cards.length : 0;

      if (results.totalCards === 0) {
        console.log("ℹ️ No payment cards to migrate");
        return results;
      }

      console.log(`📊 Found ${results.totalCards} payment cards to migrate`);

      // Migrate each card
      for (const [index, card] of cards.entries()) {
        try {
          await this.migrateCard(card, index);
          migratedCount++;
          console.log(`✅ Migrated card ${index + 1}/${results.totalCards}`);
        } catch (error) {
          console.error(`❌ Failed to migrate card ${index}:`, error);
          errors.push({
            cardIndex: index,
            cardData: this.sanitizeCardForLogging(card),
            error: error.message,
            timestamp: Date.now(),
          });
          results.skippedCards++;
        }
      }

      const migrationTime = Date.now() - startTime;

      results.migratedCards = migratedCount;
      results.errors = errors;
      results.migrationTime = migrationTime;

      console.log(
        `✅ Cards migration completed: ${migratedCount}/${results.totalCards} in ${migrationTime}ms`
      );

      return results;
    } catch (error) {
      console.error("❌ Payment cards migration failed:", error);
      throw new Error(`Cards migration failed: ${error.message}`);
    }
  }

  /**
   * Migrate single payment card
   */
  async migrateCard(cardData, index) {
    try {
      // Validate card data structure
      if (!cardData || typeof cardData !== "object") {
        throw new Error("Invalid card data structure");
      }

      // Extract and validate card information
      const cardInfo = this.extractCardInfo(cardData);

      // Validate required fields
      this.validateCardInfo(cardInfo);

      // Create new card in SQLite database
      const newCard = await this.dbService.addCard({
        number: cardInfo.number,
        expiry: cardInfo.expiry,
        cvc: cardInfo.cvc,
        cardholderName: cardInfo.cardholderName,
        customName: cardInfo.customName,
      });

      console.log(`📦 Card migrated successfully: ${newCard.id}`);
      return newCard;
    } catch (error) {
      console.error(`❌ Error migrating card at index ${index}:`, error);
      throw error;
    }
  }

  /**
   * Extract card information from legacy format
   */
  extractCardInfo(cardData) {
    const cardInfo = {
      id: cardData.id || null,
      number: cardData.number || cardData.cardNumber || "",
      expiry: cardData.expiry || cardData.expiryDate || "",
      cvc: cardData.cvc || cardData.cvv || cardData.securityCode || "",
      cardholderName: cardData.cardholderName || cardData.name || "John Doe",
      customName: cardData.customName || cardData.cardName || null,
      type: cardData.type || cardData.cardType || null,
    };

    // Clean up card number (remove spaces and dashes)
    if (cardInfo.number) {
      cardInfo.number = cardInfo.number.replace(/[\s-]/g, "");
    }

    // Normalize expiry format
    if (cardInfo.expiry && !cardInfo.expiry.includes("/")) {
      // Handle MMYY format -> MM/YY
      if (cardInfo.expiry.length === 4) {
        cardInfo.expiry = `${cardInfo.expiry.slice(
          0,
          2
        )}/${cardInfo.expiry.slice(2)}`;
      }
    }

    return cardInfo;
  }

  /**
   * Validate card information
   */
  validateCardInfo(cardInfo) {
    const errors = [];

    // Validate card number
    if (!cardInfo.number) {
      errors.push("Card number is required");
    } else if (!this.dbService.validateCardNumber(cardInfo.number)) {
      errors.push("Invalid card number format");
    }

    // Validate expiry
    if (!cardInfo.expiry) {
      errors.push("Expiry date is required");
    } else if (!this.dbService.validateExpiry(cardInfo.expiry)) {
      errors.push("Invalid expiry date format (expected MM/YY)");
    }

    // Validate CVC
    if (!cardInfo.cvc) {
      errors.push("CVC is required");
    } else if (!this.dbService.validateCVC(cardInfo.cvc)) {
      errors.push("Invalid CVC format");
    }

    if (errors.length > 0) {
      throw new Error(`Card validation failed: ${errors.join(", ")}`);
    }
  }

  /**
   * Sanitize card data for safe logging (remove sensitive information)
   */
  sanitizeCardForLogging(card) {
    if (!card || typeof card !== "object") {
      return card;
    }

    const sanitized = { ...card };

    // Remove or mask sensitive fields
    if (sanitized.number) {
      sanitized.number = `****${sanitized.number.slice(-4)}`;
    }
    if (sanitized.cvc) {
      sanitized.cvc = "***";
    }

    // Keep safe fields
    return {
      id: sanitized.id,
      number: sanitized.number,
      expiry: sanitized.expiry,
      cvc: sanitized.cvc,
      type: sanitized.type,
      name: sanitized.name,
    };
  }

  /**
   * Get migration statistics from Chrome storage
   */
  async getPreMigrationStats() {
    try {
      const cardsData = await chrome.storage.local.get("cursor_payment_cards");
      const cards = cardsData.cursor_payment_cards || [];

      if (!Array.isArray(cards)) {
        return {
          totalCards: 0,
          cardsByType: {},
          hasValidData: false,
        };
      }

      const stats = {
        totalCards: cards.length,
        cardsByType: {},
        hasValidData: true,
        validCards: 0,
        invalidCards: 0,
      };

      // Analyze card data
      for (const card of cards) {
        try {
          const cardInfo = this.extractCardInfo(card);
          this.validateCardInfo(cardInfo);

          stats.validCards++;

          // Count by type
          const cardType = this.dbService.getCardType(cardInfo.number);
          stats.cardsByType[cardType] = (stats.cardsByType[cardType] || 0) + 1;
        } catch (error) {
          stats.invalidCards++;
        }
      }

      return stats;
    } catch (error) {
      console.error("❌ Error getting pre-migration stats:", error);
      return {
        totalCards: 0,
        cardsByType: {},
        hasValidData: false,
        validCards: 0,
        invalidCards: 0,
      };
    }
  }

  /**
   * Verify migration success
   */
  async verifyMigration() {
    try {
      console.log("🔍 Verifying payment cards migration...");

      // Get pre-migration stats
      const preStats = await this.getPreMigrationStats();

      // Get post-migration stats from SQLite
      const postStats = await this.dbService.getDatabaseStats();

      const verification = {
        success: true,
        issues: [],
        preMigration: preStats,
        postMigration: {
          totalCards: postStats.total_cards || 0,
          activeCards: postStats.active_cards || 0,
        },
      };

      // Check if valid card counts match
      if (preStats.validCards !== verification.postMigration.totalCards) {
        verification.issues.push(
          `Valid card count mismatch: expected ${preStats.validCards}, got ${verification.postMigration.totalCards}`
        );
      }

      // Check if we have any cards when we expected them
      if (
        preStats.validCards > 0 &&
        verification.postMigration.totalCards === 0
      ) {
        verification.issues.push("No cards found in migrated data");
      }

      if (verification.issues.length > 0) {
        verification.success = false;
        console.warn("⚠️ Migration verification issues:", verification.issues);
      } else {
        console.log("✅ Payment cards migration verification passed");
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

  /**
   * Clean up legacy card data (optional)
   */
  async cleanupLegacyData() {
    try {
      console.log("🧹 Cleaning up legacy payment cards data...");

      // Remove the old Chrome storage key
      await chrome.storage.local.remove("cursor_payment_cards");

      console.log("✅ Legacy payment cards data cleaned up");
    } catch (error) {
      console.warn("⚠️ Failed to clean up legacy card data:", error);
      // Not critical - don't throw
    }
  }

  /**
   * Create import batch record for migration tracking
   */
  async createMigrationBatch(totalCards) {
    try {
      const batchResult = await this.dbService.query(
        `
        INSERT INTO card_import_batches (
          filename, source_type, total_cards, notes, imported_at
        ) VALUES (?, 'migration', ?, ?, CURRENT_TIMESTAMP)
      `,
        [
          "chrome_storage_migration",
          totalCards,
          "Migration from Chrome Local Storage to SQLite",
        ]
      );

      return batchResult.lastInsertRowid;
    } catch (error) {
      console.warn("⚠️ Failed to create migration batch record:", error);
      return null;
    }
  }

  /**
   * Update migration batch with final results
   */
  async updateMigrationBatch(batchId, results) {
    if (!batchId) return;

    try {
      await this.dbService.query(
        `
        UPDATE card_import_batches 
        SET 
          successful_imports = ?,
          failed_imports = ?,
          notes = ?
        WHERE id = ?
      `,
        [
          results.migratedCards,
          results.skippedCards,
          `Migration completed: ${results.migratedCards}/${results.totalCards} cards migrated`,
          batchId,
        ]
      );

      console.log("📊 Migration batch record updated");
    } catch (error) {
      console.warn("⚠️ Failed to update migration batch:", error);
    }
  }
}

// Export untuk digunakan di extension
if (typeof module !== "undefined") {
  module.exports = CardsMigrator;
}

// For service worker context
if (typeof self !== "undefined") {
  self.CardsMigrator = CardsMigrator;
}



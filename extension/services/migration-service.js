/**
 * Migration Service - Migrate data dari Chrome Storage ke Backend
 */

class MigrationService {
  constructor() {
    this.backend = new BackendService();
    this.isRunning = false;
    this.progress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "",
      errors: [],
    };
  }

  /**
   * Migrate accounts dari Chrome Storage ke Backend
   */
  async migrateAccounts() {
    console.log("[Migration] Starting account migration...");

    try {
      // Get accounts dari Chrome Storage
      const response = await chrome.runtime.sendMessage({
        type: "getAllAccounts",
      });

      if (!response.success) {
        throw new Error("Failed to get accounts from storage");
      }

      const accounts = response.data || [];
      this.progress.total = accounts.length;
      this.progress.completed = 0;
      this.progress.failed = 0;

      console.log(`[Migration] Found ${accounts.length} accounts to migrate`);

      // Migrate each account
      for (const account of accounts) {
        this.progress.current = account.email || account.name;

        try {
          // Check if account already exists in backend
          const existing = await this.backend.getAccountByEmail(
            account.email || account.name
          );

          if (existing) {
            console.log(
              `[Migration] Account ${account.email} already exists, skipping`
            );
            this.progress.completed++;
            continue;
          }

          // Create account in backend
          await this.backend.createAccount(
            account.email || account.name,
            "", // Password tidak ada di Chrome Storage
            account.cookies || []
          );

          this.progress.completed++;
          console.log(`[Migration] Migrated account ${account.email}`);
        } catch (error) {
          this.progress.failed++;
          this.progress.errors.push({
            account: account.email || account.name,
            error: error.message,
          });
          console.error(
            `[Migration] Failed to migrate ${account.email}:`,
            error
          );
        }
      }

      console.log(
        `[Migration] Account migration complete: ${this.progress.completed} success, ${this.progress.failed} failed`
      );

      return {
        success: true,
        total: this.progress.total,
        completed: this.progress.completed,
        failed: this.progress.failed,
        errors: this.progress.errors,
      };
    } catch (error) {
      console.error("[Migration] Account migration error:", error);
      throw error;
    }
  }

  /**
   * Migrate payment cards dari Chrome Storage ke Backend
   */
  async migrateCards() {
    console.log("[Migration] Starting card migration...");

    try {
      // Get cards dari Chrome Storage
      const response = await chrome.runtime.sendMessage({
        type: "getPaymentCards",
      });

      if (!response.success) {
        throw new Error("Failed to get cards from storage");
      }

      const cards = response.data || [];
      this.progress.total = cards.length;
      this.progress.completed = 0;
      this.progress.failed = 0;

      console.log(`[Migration] Found ${cards.length} cards to migrate`);

      // Migrate each card
      for (const card of cards) {
        this.progress.current = `Card ${card.number.slice(-4)}`;

        try {
          // Create card in backend
          await this.backend.createCard(
            card.number,
            card.holder || "Card Holder",
            card.expiry,
            card.cvc || card.cvv || "123"
          );

          this.progress.completed++;
          console.log(`[Migration] Migrated card ****${card.number.slice(-4)}`);
        } catch (error) {
          this.progress.failed++;
          this.progress.errors.push({
            card: `****${card.number.slice(-4)}`,
            error: error.message,
          });
          console.error(`[Migration] Failed to migrate card:`, error);
        }
      }

      console.log(
        `[Migration] Card migration complete: ${this.progress.completed} success, ${this.progress.failed} failed`
      );

      return {
        success: true,
        total: this.progress.total,
        completed: this.progress.completed,
        failed: this.progress.failed,
        errors: this.progress.errors,
      };
    } catch (error) {
      console.error("[Migration] Card migration error:", error);
      throw error;
    }
  }

  /**
   * Import dari JSON file (cookies.json format)
   */
  async importFromJSON(jsonText) {
    console.log("[Migration] Starting JSON import...");

    try {
      const data = JSON.parse(jsonText);

      // Detect format
      if (Array.isArray(data)) {
        // Array of accounts
        return await this.importAccountsArray(data);
      } else if (data.accounts) {
        // Object with accounts property
        return await this.importAccountsArray(data.accounts);
      } else if (data.cookies) {
        // Single account with cookies
        return await this.importSingleAccount(data);
      } else {
        throw new Error("Unknown JSON format");
      }
    } catch (error) {
      console.error("[Migration] JSON import error:", error);
      throw error;
    }
  }

  /**
   * Import array of accounts
   */
  async importAccountsArray(accounts) {
    this.progress.total = accounts.length;
    this.progress.completed = 0;
    this.progress.failed = 0;
    this.progress.errors = [];

    for (const account of accounts) {
      const email = account.email || account.name || "unknown@example.com";
      this.progress.current = email;

      try {
        await this.backend.createAccount(
          email,
          account.password || "",
          account.cookies || []
        );

        this.progress.completed++;
        console.log(`[Migration] Imported account ${email}`);
      } catch (error) {
        this.progress.failed++;
        this.progress.errors.push({
          account: email,
          error: error.message,
        });
        console.error(`[Migration] Failed to import ${email}:`, error);
      }
    }

    return {
      success: true,
      total: this.progress.total,
      completed: this.progress.completed,
      failed: this.progress.failed,
      errors: this.progress.errors,
    };
  }

  /**
   * Import single account
   */
  async importSingleAccount(data) {
    const email = data.email || data.name || "unknown@example.com";

    try {
      await this.backend.createAccount(
        email,
        data.password || "",
        data.cookies || []
      );

      return {
        success: true,
        total: 1,
        completed: 1,
        failed: 0,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        total: 1,
        completed: 0,
        failed: 1,
        errors: [
          {
            account: email,
            error: error.message,
          },
        ],
      };
    }
  }

  /**
   * Full migration (accounts + cards)
   */
  async migrateAll() {
    console.log("[Migration] Starting full migration...");

    this.isRunning = true;

    const results = {
      accounts: null,
      cards: null,
      success: false,
    };

    try {
      // Ensure backend is connected
      const isAvailable = await this.backend.isAvailable();
      if (!isAvailable) {
        throw new Error("Backend not available");
      }

      // Migrate accounts
      results.accounts = await this.migrateAccounts();

      // Migrate cards
      results.cards = await this.migrateCards();

      results.success = true;
    } catch (error) {
      console.error("[Migration] Full migration error:", error);
      results.error = error.message;
    } finally {
      this.isRunning = false;
    }

    return results;
  }

  /**
   * Get migration progress
   */
  getProgress() {
    return {
      ...this.progress,
      isRunning: this.isRunning,
      percentage:
        this.progress.total > 0
          ? Math.round((this.progress.completed / this.progress.total) * 100)
          : 0,
    };
  }

  /**
   * Reset progress
   */
  resetProgress() {
    this.progress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "",
      errors: [],
    };
  }

  /**
   * Verify migration (compare data)
   */
  async verifyMigration() {
    console.log("[Migration] Verifying migration...");

    try {
      // Get data dari kedua sources
      const [storageResponse, backendAccounts] = await Promise.all([
        chrome.runtime.sendMessage({ type: "getAllAccounts" }),
        this.backend.getAllAccounts(),
      ]);

      const storageAccounts = storageResponse.data || [];

      const verification = {
        storageCount: storageAccounts.length,
        backendCount: backendAccounts.length,
        missing: [],
        extra: [],
      };

      // Check for missing accounts
      for (const storageAccount of storageAccounts) {
        const email = storageAccount.email || storageAccount.name;
        const found = backendAccounts.find((ba) => ba.email === email);

        if (!found) {
          verification.missing.push(email);
        }
      }

      // Check for extra accounts
      for (const backendAccount of backendAccounts) {
        const found = storageAccounts.find(
          (sa) => (sa.email || sa.name) === backendAccount.email
        );

        if (!found) {
          verification.extra.push(backendAccount.email);
        }
      }

      verification.isComplete = verification.missing.length === 0;

      console.log("[Migration] Verification result:", verification);

      return verification;
    } catch (error) {
      console.error("[Migration] Verification error:", error);
      throw error;
    }
  }
}

// Export
if (typeof window !== "undefined") {
  window.MigrationService = MigrationService;
}

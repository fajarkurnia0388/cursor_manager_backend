/**
 * Backend Adapter - Wrapper untuk transisi dari SQLite WASM ke Native Backend
 *
 * Service ini provides backward compatibility dengan existing code
 * sambil mem-proxy requests ke Python backend ketika available
 */

class BackendAdapter {
  constructor() {
    this.backendAvailable = false;
    this.backendService = null;
    this.fallbackService = null; // accountService atau paymentService lama
    this.useBackend = false;
  }

  /**
   * Initialize adapter dengan backend service
   */
  async initialize() {
    try {
      // Check if backend is configured
      const config = await chrome.storage.local.get("backend_config");
      this.useBackend = config.backend_config?.enabled || false;

      if (this.useBackend) {
        // Lazy load BackendService jika belum di-load
        if (!this.backendService) {
          this.backendService = new BackendService();
        }

        // Test backend connection
        this.backendAvailable = await this.backendService.isAvailable();

        if (this.backendAvailable) {
          console.log("[Adapter] Backend available, using native backend");
        } else {
          console.log(
            "[Adapter] Backend configured but not available, using fallback"
          );
        }
      } else {
        console.log("[Adapter] Backend not configured, using local storage");
      }
    } catch (error) {
      console.error("[Adapter] Initialization error:", error);
      this.backendAvailable = false;
    }
  }

  /**
   * Set fallback service (existing accountService atau paymentService)
   */
  setFallback(fallbackService) {
    this.fallbackService = fallbackService;
  }

  /**
   * Enable backend mode
   */
  async enableBackend() {
    await chrome.storage.local.set({
      backend_config: { enabled: true },
    });
    await this.initialize();
  }

  /**
   * Disable backend mode
   */
  async disableBackend() {
    await chrome.storage.local.set({
      backend_config: { enabled: false },
    });
    this.useBackend = false;
    this.backendAvailable = false;
  }

  /**
   * Get backend status
   */
  getStatus() {
    return {
      enabled: this.useBackend,
      available: this.backendAvailable,
      mode: this.backendAvailable ? "native" : "fallback",
    };
  }

  // ===========================================
  // Proxy Methods - Account Operations
  // ===========================================

  async getAllAccounts(status = null) {
    if (this.backendAvailable) {
      return await this.backendService.getAllAccounts(status);
    } else if (this.fallbackService) {
      return await this.fallbackService.getAll();
    }
    throw new Error("No backend or fallback service available");
  }

  async getAccountById(id) {
    if (this.backendAvailable) {
      return await this.backendService.getAccountById(id);
    } else if (this.fallbackService) {
      // Fallback tidak support getById, simulate it
      const all = await this.fallbackService.getAll();
      return all.find((acc) => acc.id === id);
    }
    throw new Error("No backend or fallback service available");
  }

  async createAccount(email, password, cookies = null) {
    if (this.backendAvailable) {
      return await this.backendService.createAccount(email, password, cookies);
    } else if (this.fallbackService) {
      // Fallback service uses different API
      await this.fallbackService.upsert(email, cookies);
      return { email, cookies };
    }
    throw new Error("No backend or fallback service available");
  }

  async updateAccount(id, updates) {
    if (this.backendAvailable) {
      return await this.backendService.updateAccount(id, updates);
    } else if (this.fallbackService) {
      // Fallback service doesn't support updateAccount directly
      // Would need to implement this based on the actual fallback service API
      throw new Error("Update not supported in fallback mode");
    }
    throw new Error("No backend or fallback service available");
  }

  async deleteAccount(id, soft = true) {
    if (this.backendAvailable) {
      return await this.backendService.deleteAccount(id, soft);
    } else if (this.fallbackService) {
      return await this.fallbackService.remove(id, !soft);
    }
    throw new Error("No backend or fallback service available");
  }

  async searchAccounts(keyword) {
    if (this.backendAvailable) {
      return await this.backendService.searchAccounts(keyword);
    } else if (this.fallbackService) {
      // Implement search on fallback
      const all = await this.fallbackService.getAll();
      return all.filter(
        (acc) =>
          acc.email?.toLowerCase().includes(keyword.toLowerCase()) ||
          acc.name?.toLowerCase().includes(keyword.toLowerCase())
      );
    }
    throw new Error("No backend or fallback service available");
  }

  async getAccountStats() {
    if (this.backendAvailable) {
      return await this.backendService.getAccountStats();
    } else if (this.fallbackService) {
      // Calculate stats from all accounts
      const all = await this.fallbackService.getAll();
      return {
        total: all.length,
        active: all.filter((a) => a.active).length,
        inactive: all.filter((a) => !a.active).length,
      };
    }
    throw new Error("No backend or fallback service available");
  }

  // ===========================================
  // Proxy Methods - Card Operations
  // ===========================================

  async getAllCards(status = null) {
    if (this.backendAvailable) {
      return await this.backendService.getAllCards(status);
    } else if (this.fallbackService) {
      return await this.fallbackService.getCards();
    }
    throw new Error("No backend or fallback service available");
  }

  async getCardById(id) {
    if (this.backendAvailable) {
      return await this.backendService.getCardById(id);
    } else if (this.fallbackService) {
      return await this.fallbackService.getCard(id);
    }
    throw new Error("No backend or fallback service available");
  }

  async createCard(cardNumber, cardHolder, expiry, cvv) {
    if (this.backendAvailable) {
      return await this.backendService.createCard(
        cardNumber,
        cardHolder,
        expiry,
        cvv
      );
    } else if (this.fallbackService) {
      // Fallback service has different API
      throw new Error("Create card not supported in fallback mode");
    }
    throw new Error("No backend or fallback service available");
  }

  async deleteCard(id, soft = true) {
    if (this.backendAvailable) {
      return await this.backendService.deleteCard(id, soft);
    } else if (this.fallbackService) {
      return await this.fallbackService.removeCard(id);
    }
    throw new Error("No backend or fallback service available");
  }

  // ===========================================
  // System Methods
  // ===========================================

  async ping() {
    if (this.backendAvailable) {
      return await this.backendService.ping();
    }
    return { status: "fallback" };
  }

  async getVersion() {
    if (this.backendAvailable) {
      return await this.backendService.getVersion();
    }
    return {
      version: chrome.runtime.getManifest().version,
      mode: "fallback",
    };
  }

  async createBackup() {
    if (this.backendAvailable) {
      return await this.backendService.createBackup();
    } else if (this.fallbackService) {
      // Export current data as backup
      const accounts = await this.fallbackService.getAll();
      return {
        backup_path: "local_storage",
        data: accounts,
        timestamp: new Date().toISOString(),
      };
    }
    throw new Error("No backend or fallback service available");
  }

  /**
   * Migrate data dari local storage ke backend
   */
  async migrateToBackend() {
    if (!this.backendAvailable) {
      throw new Error("Backend not available");
    }

    if (!this.fallbackService) {
      throw new Error("No fallback service to migrate from");
    }

    console.log("[Adapter] Starting migration to backend...");

    try {
      // Get all data from fallback
      const accounts = await this.fallbackService.getAll();
      let migrated = 0;
      let failed = 0;

      // Migrate each account
      for (const account of accounts) {
        try {
          await this.backendService.createAccount(
            account.email || account.name,
            "", // Password tidak ada di fallback
            account.cookies
          );
          migrated++;
        } catch (error) {
          console.error(
            `[Adapter] Failed to migrate account ${account.email}:`,
            error
          );
          failed++;
        }
      }

      console.log(
        `[Adapter] Migration complete: ${migrated} migrated, ${failed} failed`
      );

      return {
        success: true,
        migrated: migrated,
        failed: failed,
        total: accounts.length,
      };
    } catch (error) {
      console.error("[Adapter] Migration error:", error);
      throw error;
    }
  }
}

// Export singleton instance
const backendAdapter = new BackendAdapter();

// Initialize on load
backendAdapter.initialize();

if (typeof module !== "undefined" && module.exports) {
  module.exports = BackendAdapter;
}

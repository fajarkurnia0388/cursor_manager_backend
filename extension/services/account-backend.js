/**
 * Account Service - Backend-Only Version (v2.0)
 *
 * Pure backend integration tanpa SQLite WASM
 * Menggunakan Chrome Storage untuk offline caching
 */

class AccountServiceBackend {
  constructor() {
    this.backendService = new BackendService();
    this.CACHE_KEY = "cursor_accounts_cache";
    this.ACTIVE_KEY = "cursor_active_account";
    this.CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
    this.isOnline = false;
  }

  /**
   * Initialize and connect to backend
   */
  async initialize() {
    try {
      await this.backendService.connect();
      this.isOnline = true;
      console.log("[AccountBackend] Connected to backend");

      // Sync cache from backend
      await this.syncCacheFromBackend();
    } catch (error) {
      console.warn("[AccountBackend] Backend unavailable, using cache:", error);
      this.isOnline = false;
    }
  }

  /**
   * Get all accounts (dari backend atau cache)
   */
  async getAll(status = null) {
    try {
      if (this.isOnline) {
        const response = await this.backendService.request("accounts.getAll", {
          status,
        });

        // Cache the result
        await this.updateCache(response);

        return response;
      } else {
        // Fallback ke cache
        return await this.getFromCache();
      }
    } catch (error) {
      console.error("[AccountBackend] getAll error:", error);
      // Fallback ke cache
      return await this.getFromCache();
    }
  }

  /**
   * Get account by ID
   */
  async getById(id) {
    try {
      if (this.isOnline) {
        return await this.backendService.request("accounts.getById", { id });
      } else {
        const accounts = await this.getFromCache();
        return accounts.find((acc) => acc.id === id);
      }
    } catch (error) {
      console.error("[AccountBackend] getById error:", error);
      return null;
    }
  }

  /**
   * Get account by email
   */
  async getByEmail(email) {
    try {
      if (this.isOnline) {
        return await this.backendService.request("accounts.getByEmail", {
          email,
        });
      } else {
        const accounts = await this.getFromCache();
        return accounts.find((acc) => acc.email === email);
      }
    } catch (error) {
      console.error("[AccountBackend] getByEmail error:", error);
      return null;
    }
  }

  /**
   * Create new account
   */
  async create(email, password, cookies = null) {
    try {
      const response = await this.backendService.request("accounts.create", {
        email,
        password,
        cookies: cookies ? JSON.stringify(cookies) : null,
      });

      // Invalidate cache
      await this.invalidateCache();

      return response;
    } catch (error) {
      console.error("[AccountBackend] create error:", error);
      throw error;
    }
  }

  /**
   * Update account
   */
  async update(id, updates) {
    try {
      const response = await this.backendService.request("accounts.update", {
        id,
        ...updates,
      });

      // Invalidate cache
      await this.invalidateCache();

      return response;
    } catch (error) {
      console.error("[AccountBackend] update error:", error);
      throw error;
    }
  }

  /**
   * Delete account
   */
  async delete(id, soft = true) {
    try {
      const response = await this.backendService.request("accounts.delete", {
        id,
        soft,
      });

      // Invalidate cache
      await this.invalidateCache();

      return response;
    } catch (error) {
      console.error("[AccountBackend] delete error:", error);
      throw error;
    }
  }

  /**
   * Get active account
   */
  async getActiveAccount() {
    try {
      const result = await chrome.storage.local.get(this.ACTIVE_KEY);
      return result[this.ACTIVE_KEY] || null;
    } catch (error) {
      console.error("[AccountBackend] getActiveAccount error:", error);
      return null;
    }
  }

  /**
   * Set active account
   */
  async setActiveAccount(accountId) {
    try {
      await chrome.storage.local.set({
        [this.ACTIVE_KEY]: accountId,
      });
    } catch (error) {
      console.error("[AccountBackend] setActiveAccount error:", error);
    }
  }

  /**
   * Switch to account (Browser operation - tidak bisa di backend)
   */
  async switchTo(accountId) {
    try {
      // Get account dari backend
      const account = await this.getById(accountId);
      if (!account) {
        throw new Error("Account not found");
      }

      // Clear existing cookies
      await this.clearCursorCookies();

      // Restore account cookies
      const cookies = account.cookies
        ? typeof account.cookies === "string"
          ? JSON.parse(account.cookies)
          : account.cookies
        : [];

      for (const cookie of cookies) {
        await chrome.cookies.set({
          url: `https://${cookie.domain}`,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path || "/",
          secure: cookie.secure || false,
          httpOnly: cookie.httpOnly || false,
          sameSite: cookie.sameSite || "lax",
          expirationDate: cookie.expirationDate,
        });
      }

      // Set as active
      await this.setActiveAccount(accountId);

      // Update last used
      await this.update(accountId, { last_used: new Date().toISOString() });

      // Reload Cursor tabs
      await this.reloadCursorTabs();

      return true;
    } catch (error) {
      console.error("[AccountBackend] switchTo error:", error);
      throw error;
    }
  }

  /**
   * Get current cookies (Browser operation)
   */
  async getCurrentCookies() {
    try {
      const cookies = await chrome.cookies.getAll({
        domain: ".cursor.com",
      });
      return cookies;
    } catch (error) {
      console.error("[AccountBackend] getCurrentCookies error:", error);
      return [];
    }
  }

  /**
   * Clear Cursor cookies (Browser operation)
   */
  async clearCursorCookies() {
    try {
      const cookies = await chrome.cookies.getAll({
        domain: ".cursor.com",
      });

      for (const cookie of cookies) {
        await chrome.cookies.remove({
          url: `https://${cookie.domain}${cookie.path}`,
          name: cookie.name,
        });
      }
    } catch (error) {
      console.error("[AccountBackend] clearCursorCookies error:", error);
    }
  }

  /**
   * Reload Cursor tabs (Browser operation)
   */
  async reloadCursorTabs() {
    try {
      const tabs = await chrome.tabs.query({ url: "*://*.cursor.com/*" });
      for (const tab of tabs) {
        chrome.tabs.reload(tab.id);
      }
    } catch (error) {
      console.error("[AccountBackend] reloadCursorTabs error:", error);
    }
  }

  /**
   * Search accounts
   */
  async search(query) {
    try {
      if (this.isOnline) {
        return await this.backendService.request("accounts.search", { query });
      } else {
        const accounts = await this.getFromCache();
        return accounts.filter(
          (acc) =>
            acc.email.toLowerCase().includes(query.toLowerCase()) ||
            (acc.password &&
              acc.password.toLowerCase().includes(query.toLowerCase()))
        );
      }
    } catch (error) {
      console.error("[AccountBackend] search error:", error);
      return [];
    }
  }

  /**
   * Get account statistics
   */
  async getStats() {
    try {
      if (this.isOnline) {
        return await this.backendService.request("accounts.getStats", {});
      } else {
        const accounts = await this.getFromCache();
        return {
          total: accounts.length,
          active: accounts.filter((a) => a.status === "active").length,
        };
      }
    } catch (error) {
      console.error("[AccountBackend] getStats error:", error);
      return { total: 0, active: 0 };
    }
  }

  /**
   * Import account from JSON
   */
  async importFromJSON(jsonText, customName = null) {
    try {
      const data = JSON.parse(jsonText);

      // Extract email dari cookies
      let email = customName;
      if (data.WorkOS && data.WorkOS.email) {
        email = data.WorkOS.email;
      }

      // Create account
      const response = await this.create(email || "Unknown", "imported", data);

      return response;
    } catch (error) {
      console.error("[AccountBackend] importFromJSON error:", error);
      throw error;
    }
  }

  /**
   * Export account to file
   */
  async exportToFile(accountId) {
    try {
      const account = await this.getById(accountId);
      if (!account) {
        throw new Error("Account not found");
      }

      // Download as JSON
      const blob = new Blob([JSON.stringify(account.cookies, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      await chrome.downloads.download({
        url: url,
        filename: `cursor_account_${account.email}_${Date.now()}.json`,
        saveAs: true,
      });

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[AccountBackend] exportToFile error:", error);
      throw error;
    }
  }

  // === Cache Management ===

  /**
   * Update cache dengan data dari backend
   */
  async updateCache(data) {
    try {
      await chrome.storage.local.set({
        [this.CACHE_KEY]: {
          data: data,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error("[AccountBackend] updateCache error:", error);
    }
  }

  /**
   * Get data dari cache
   */
  async getFromCache() {
    try {
      const result = await chrome.storage.local.get(this.CACHE_KEY);
      const cache = result[this.CACHE_KEY];

      if (!cache) {
        return [];
      }

      // Check if cache expired
      if (Date.now() - cache.timestamp > this.CACHE_EXPIRY) {
        console.warn("[AccountBackend] Cache expired");
        return [];
      }

      return cache.data || [];
    } catch (error) {
      console.error("[AccountBackend] getFromCache error:", error);
      return [];
    }
  }

  /**
   * Invalidate cache
   */
  async invalidateCache() {
    try {
      await chrome.storage.local.remove(this.CACHE_KEY);
    } catch (error) {
      console.error("[AccountBackend] invalidateCache error:", error);
    }
  }

  /**
   * Sync cache dari backend
   */
  async syncCacheFromBackend() {
    try {
      const accounts = await this.backendService.request("accounts.getAll", {});
      await this.updateCache(accounts);
    } catch (error) {
      console.error("[AccountBackend] syncCacheFromBackend error:", error);
    }
  }

  /**
   * Check backend connection status
   */
  isBackendAvailable() {
    return this.isOnline;
  }

  /**
   * Reconnect to backend
   */
  async reconnect() {
    try {
      await this.backendService.connect();
      this.isOnline = true;
      await this.syncCacheFromBackend();
      return true;
    } catch (error) {
      console.error("[AccountBackend] reconnect error:", error);
      this.isOnline = false;
      return false;
    }
  }
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountServiceBackend;
}

// Backward compatibility alias
const AccountService = AccountServiceBackend;

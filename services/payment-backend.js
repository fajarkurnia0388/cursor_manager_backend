/**
 * Payment Service - Backend-Only Version (v2.0)
 *
 * Pure backend integration untuk card management
 * Menggunakan Chrome Storage untuk offline caching
 */

class PaymentServiceBackend {
  constructor() {
    this.backendService = new BackendService();
    this.CACHE_KEY = "cursor_cards_cache";
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
      console.log("[PaymentBackend] Connected to backend");

      // Sync cache from backend
      await this.syncCacheFromBackend();
    } catch (error) {
      console.warn("[PaymentBackend] Backend unavailable, using cache:", error);
      this.isOnline = false;
    }
  }

  /**
   * Get all cards (dari backend atau cache)
   */
  async getAll(status = null) {
    try {
      if (this.isOnline) {
        const response = await this.backendService.request("cards.getAll", {
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
      console.error("[PaymentBackend] getAll error:", error);
      // Fallback ke cache
      return await this.getFromCache();
    }
  }

  /**
   * Get card by ID
   */
  async getById(id) {
    try {
      if (this.isOnline) {
        return await this.backendService.request("cards.getById", { id });
      } else {
        const cards = await this.getFromCache();
        return cards.find((card) => card.id === id);
      }
    } catch (error) {
      console.error("[PaymentBackend] getById error:", error);
      return null;
    }
  }

  /**
   * Create new card
   */
  async create(cardNumber, cardHolder, expiry, cvv) {
    try {
      const response = await this.backendService.request("cards.create", {
        card_number: cardNumber,
        card_holder: cardHolder,
        expiry: expiry,
        cvv: cvv,
      });

      // Invalidate cache
      await this.invalidateCache();

      return response;
    } catch (error) {
      console.error("[PaymentBackend] create error:", error);
      throw error;
    }
  }

  /**
   * Update card
   */
  async update(id, updates) {
    try {
      const response = await this.backendService.request("cards.update", {
        id,
        ...updates,
      });

      // Invalidate cache
      await this.invalidateCache();

      return response;
    } catch (error) {
      console.error("[PaymentBackend] update error:", error);
      throw error;
    }
  }

  /**
   * Delete card
   */
  async delete(id, soft = true) {
    try {
      const response = await this.backendService.request("cards.delete", {
        id,
        soft,
      });

      // Invalidate cache
      await this.invalidateCache();

      return response;
    } catch (error) {
      console.error("[PaymentBackend] delete error:", error);
      throw error;
    }
  }

  /**
   * Search cards
   */
  async search(query) {
    try {
      if (this.isOnline) {
        return await this.backendService.request("cards.search", { query });
      } else {
        const cards = await this.getFromCache();
        return cards.filter(
          (card) =>
            card.card_number.includes(query) ||
            card.card_holder.toLowerCase().includes(query.toLowerCase())
        );
      }
    } catch (error) {
      console.error("[PaymentBackend] search error:", error);
      return [];
    }
  }

  /**
   * Get card statistics
   */
  async getStats() {
    try {
      if (this.isOnline) {
        return await this.backendService.request("cards.getStats", {});
      } else {
        const cards = await this.getFromCache();
        return {
          total: cards.length,
          active: cards.filter((c) => c.status === "active").length,
        };
      }
    } catch (error) {
      console.error("[PaymentBackend] getStats error:", error);
      return { total: 0, active: 0 };
    }
  }

  /**
   * Auto-fill payment form (Browser operation)
   */
  async autoFill(cardId, tabId = null) {
    try {
      // Get card data
      const card = await this.getById(cardId);
      if (!card) {
        throw new Error("Card not found");
      }

      // Get active tab if not provided
      if (!tabId) {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        tabId = tabs[0]?.id;
      }

      if (!tabId) {
        throw new Error("No active tab");
      }

      // Inject and fill form
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (cardData) => {
          // Find card number fields
          const cardNumberFields = document.querySelectorAll(
            'input[name*="card"], input[id*="card"], input[placeholder*="card number"], input[autocomplete="cc-number"]'
          );
          for (const field of cardNumberFields) {
            field.value = cardData.card_number;
            field.dispatchEvent(new Event("input", { bubbles: true }));
          }

          // Find cardholder fields
          const cardHolderFields = document.querySelectorAll(
            'input[name*="name"], input[id*="name"], input[placeholder*="name"], input[autocomplete="cc-name"]'
          );
          for (const field of cardHolderFields) {
            field.value = cardData.card_holder;
            field.dispatchEvent(new Event("input", { bubbles: true }));
          }

          // Find expiry fields
          const expiryFields = document.querySelectorAll(
            'input[name*="expir"], input[id*="expir"], input[placeholder*="expir"], input[autocomplete="cc-exp"]'
          );
          for (const field of expiryFields) {
            field.value = cardData.expiry;
            field.dispatchEvent(new Event("input", { bubbles: true }));
          }

          // Find CVV fields
          const cvvFields = document.querySelectorAll(
            'input[name*="cvv"], input[name*="cvc"], input[id*="cvv"], input[id*="cvc"], input[autocomplete="cc-csc"]'
          );
          for (const field of cvvFields) {
            field.value = cardData.cvv;
            field.dispatchEvent(new Event("input", { bubbles: true }));
          }
        },
        args: [card],
      });

      // Update last used
      await this.update(cardId, { last_used: new Date().toISOString() });

      return true;
    } catch (error) {
      console.error("[PaymentBackend] autoFill error:", error);
      throw error;
    }
  }

  /**
   * Detect payment fields on page (Browser operation)
   */
  async detectPaymentFields(tabId = null) {
    try {
      // Get active tab if not provided
      if (!tabId) {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        tabId = tabs[0]?.id;
      }

      if (!tabId) {
        throw new Error("No active tab");
      }

      // Inject detection script
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          const fields = {
            cardNumber: !!document.querySelector(
              'input[name*="card"], input[id*="card"], input[autocomplete="cc-number"]'
            ),
            cardHolder: !!document.querySelector(
              'input[name*="name"], input[id*="name"], input[autocomplete="cc-name"]'
            ),
            expiry: !!document.querySelector(
              'input[name*="expir"], input[id*="expir"], input[autocomplete="cc-exp"]'
            ),
            cvv: !!document.querySelector(
              'input[name*="cvv"], input[name*="cvc"], input[autocomplete="cc-csc"]'
            ),
          };

          return {
            hasPaymentForm: fields.cardNumber || fields.expiry || fields.cvv,
            fields: fields,
          };
        },
      });

      return results[0]?.result || { hasPaymentForm: false, fields: {} };
    } catch (error) {
      console.error("[PaymentBackend] detectPaymentFields error:", error);
      return { hasPaymentForm: false, fields: {} };
    }
  }

  /**
   * Import cards from text
   */
  async importFromText(text) {
    try {
      const lines = text.split("\n").filter((line) => line.trim());
      const results = { success: 0, failed: 0 };

      for (const line of lines) {
        try {
          // Parse format: number|expiry|cvv atau number|holder|expiry|cvv
          const parts = line.split("|").map((p) => p.trim());

          if (parts.length >= 3) {
            const cardNumber = parts[0];
            const cardHolder = parts.length === 4 ? parts[1] : "Imported Card";
            const expiry = parts.length === 4 ? parts[2] : parts[1];
            const cvv = parts.length === 4 ? parts[3] : parts[2];

            await this.create(cardNumber, cardHolder, expiry, cvv);
            results.success++;
          } else {
            results.failed++;
          }
        } catch (error) {
          results.failed++;
        }
      }

      return results;
    } catch (error) {
      console.error("[PaymentBackend] importFromText error:", error);
      throw error;
    }
  }

  /**
   * Export cards to file
   */
  async exportToFile() {
    try {
      const cards = await this.getAll();

      // Format as text
      const text = cards
        .map(
          (card) =>
            `${card.card_number}|${card.card_holder}|${card.expiry}|${card.cvv}`
        )
        .join("\n");

      // Download as text file
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      await chrome.downloads.download({
        url: url,
        filename: `cursor_cards_${Date.now()}.txt`,
        saveAs: true,
      });

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[PaymentBackend] exportToFile error:", error);
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
      console.error("[PaymentBackend] updateCache error:", error);
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
        console.warn("[PaymentBackend] Cache expired");
        return [];
      }

      return cache.data || [];
    } catch (error) {
      console.error("[PaymentBackend] getFromCache error:", error);
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
      console.error("[PaymentBackend] invalidateCache error:", error);
    }
  }

  /**
   * Sync cache dari backend
   */
  async syncCacheFromBackend() {
    try {
      const cards = await this.backendService.request("cards.getAll", {});
      await this.updateCache(cards);
    } catch (error) {
      console.error("[PaymentBackend] syncCacheFromBackend error:", error);
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
      console.error("[PaymentBackend] reconnect error:", error);
      this.isOnline = false;
      return false;
    }
  }
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = PaymentServiceBackend;
}

// Backward compatibility alias
const PaymentService = PaymentServiceBackend;

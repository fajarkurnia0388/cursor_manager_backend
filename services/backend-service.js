/**
 * Backend Service - Native Messaging Communication Layer
 *
 * Service untuk komunikasi dengan Python backend via Native Messaging
 */

class BackendService {
  constructor() {
    this.port = null;
    this.isConnected = false;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.hostName = "com.cursor.manager";
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  /**
   * Connect ke native messaging host
   */
  connect() {
    if (this.isConnected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Connect to native messaging host
        this.port = chrome.runtime.connectNative(this.hostName);

        // Check for immediate connection error
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError;
          const errorMsg = error.message || JSON.stringify(error);
          console.warn("[Backend] Connection failed:", errorMsg);
          reject(new Error("Backend not available: " + errorMsg));
          return;
        }

        // Handle messages from backend
        this.port.onMessage.addListener((message) => {
          this._handleMessage(message);
        });

        // Handle disconnect
        this.port.onDisconnect.addListener(() => {
          const lastError = chrome.runtime.lastError;
          if (lastError && !this.isConnected) {
            // Connection failed immediately
            const errorMsg = lastError.message || JSON.stringify(lastError);
            console.warn("[Backend] Connection failed:", errorMsg);
            reject(new Error("Backend not available: " + errorMsg));
          } else {
            // Normal disconnect after successful connection
            this._handleDisconnect();
          }
        });

        // Connection successful
        this.isConnected = true;
        this.reconnectAttempts = 0;

        console.log("[Backend] Connected to native host");
        resolve();
      } catch (error) {
        console.error("[Backend] Connection error:", error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect dari backend
   */
  disconnect() {
    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }
    this.isConnected = false;
  }

  /**
   * Send JSON-RPC 2.0 request ke backend
   */
  async request(method, params = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    const id = ++this.requestId;
    const request = {
      jsonrpc: "2.0",
      id: id,
      method: method,
      params: params,
    };

    return new Promise((resolve, reject) => {
      // Store pending request
      this.pendingRequests.set(id, { resolve, reject });

      // Send request
      try {
        this.port.postMessage(request);
        console.log("[Backend] Request:", method, params);
      } catch (error) {
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  /**
   * Handle message dari backend
   */
  _handleMessage(message) {
    console.log("[Backend] Response:", message);

    const id = message.id;
    const pending = this.pendingRequests.get(id);

    if (!pending) {
      console.warn("[Backend] Unknown response ID:", id);
      return;
    }

    this.pendingRequests.delete(id);

    if (message.error) {
      pending.reject(new Error(message.error.message));
    } else {
      pending.resolve(message.result);
    }
  }

  /**
   * Handle disconnect
   */
  _handleDisconnect() {
    const lastError = chrome.runtime.lastError;
    const errorMessage = lastError
      ? lastError.message || JSON.stringify(lastError)
      : "Unknown error";

    console.warn("[Backend] Disconnected:", errorMessage);

    this.isConnected = false;
    this.port = null;

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error("Backend disconnected: " + errorMessage));
    }
    this.pendingRequests.clear();

    // Try reconnect only if not first connection attempt
    if (
      this.reconnectAttempts < this.maxReconnectAttempts &&
      this.reconnectAttempts > 0
    ) {
      this.reconnectAttempts++;
      console.log(
        `[Backend] Reconnecting (attempt ${this.reconnectAttempts})...`
      );

      setTimeout(() => {
        this.connect().catch((err) => {
          console.error("[Backend] Reconnect failed:", err.message);
        });
      }, 1000 * this.reconnectAttempts);
    } else if (this.reconnectAttempts === 0) {
      // First connection failed - backend probably not installed
      console.log(
        "[Backend] Backend not available (not installed or not running). Extension will use fallback mode."
      );
    }
  }

  // ===========================================
  // Account Methods
  // ===========================================

  async getAllAccounts(status = null) {
    const params = status ? { status } : {};
    return this.request("accounts.getAll", params);
  }

  async getAccountById(id) {
    return this.request("accounts.getById", { id });
  }

  async getAccountByEmail(email) {
    return this.request("accounts.getByEmail", { email });
  }

  async createAccount(email, password, cookies = null) {
    return this.request("accounts.create", { email, password, cookies });
  }

  async updateAccount(id, updates) {
    return this.request("accounts.update", { id, ...updates });
  }

  async deleteAccount(id, soft = true) {
    return this.request("accounts.delete", { id, soft });
  }

  async updateAccountLastUsed(id) {
    return this.request("accounts.updateLastUsed", { id });
  }

  async searchAccounts(keyword) {
    return this.request("accounts.search", { keyword });
  }

  async getAccountStats() {
    return this.request("accounts.getStats");
  }

  // ===========================================
  // Card Methods
  // ===========================================

  async getAllCards(status = null) {
    const params = status ? { status } : {};
    return this.request("cards.getAll", params);
  }

  async getCardById(id) {
    return this.request("cards.getById", { id });
  }

  async createCard(cardNumber, cardHolder, expiry, cvv) {
    return this.request("cards.create", {
      card_number: cardNumber,
      card_holder: cardHolder,
      expiry: expiry,
      cvv: cvv,
    });
  }

  async updateCard(id, updates) {
    return this.request("cards.update", { id, ...updates });
  }

  async deleteCard(id, soft = true) {
    return this.request("cards.delete", { id, soft });
  }

  async updateCardLastUsed(id) {
    return this.request("cards.updateLastUsed", { id });
  }

  async searchCards(keyword) {
    return this.request("cards.search", { keyword });
  }

  async getCardStats() {
    return this.request("cards.getStats");
  }

  // ===========================================
  // System Methods
  // ===========================================

  async ping() {
    return this.request("system.ping");
  }

  async getVersion() {
    return this.request("system.version");
  }

  async createBackup() {
    return this.request("system.backup");
  }

  async restoreBackup(backupPath) {
    return this.request("system.restore", { backup_path: backupPath });
  }

  /**
   * Check if backend is available
   */
  async isAvailable() {
    try {
      await this.connect();
      const result = await this.ping();
      return result.status === "ok";
    } catch (error) {
      return false;
    }
  }

  /**
   * Get backend status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      pendingRequests: this.pendingRequests.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Export singleton instance
if (typeof module !== "undefined" && module.exports) {
  module.exports = BackendService;
}

// Simplified Account Service for testing
console.log("Account service loaded successfully");

class AccountService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.STORAGE_KEY = "cursor_accounts";
    this.AVATARS_KEY = "cursor_accounts:avatars";
    this.ACTIVE_KEY = "cursor_active_account";
    this.ACCOUNT_INFO_KEY = "cursor_accounts:info";
  }

  // Initialize SQLite database
  async initializeDB() {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log("Initializing SQLite database...");
      this.isInitialized = true;
      console.log("SQLite database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize SQLite:", error);
      this.isInitialized = true;
      this.db = null;
    }
  }

  // Mock methods for testing
  async getAll() {
    console.log("Mock getAll called");
    return [];
  }

  async getActiveAccount() {
    console.log("Mock getActiveAccount called");
    return null;
  }

  async switchTo(account) {
    console.log("Mock switchTo called with:", account);
    return true;
  }

  async remove(email, deleteFile) {
    console.log("Mock remove called with:", email, deleteFile);
    return true;
  }

  async upsert(name, cookies) {
    console.log("Mock upsert called with:", name, cookies);
    return true;
  }

  async autoDetectAccount() {
    console.log("Mock autoDetectAccount called");
    return null;
  }

  async updateBadge(username) {
    console.log("Mock updateBadge called with:", username);
    return true;
  }

  async getCurrentCookies() {
    console.log("Mock getCurrentCookies called");
    return [];
  }

  async getAccountDetails(email) {
    console.log("Mock getAccountDetails called with:", email);
    return null;
  }

  async exportAccountToFile(account) {
    console.log("Mock exportAccountToFile called with:", account);
    return true;
  }

  async revealAccountFile(account) {
    console.log("Mock revealAccountFile called with:", account);
    return true;
  }

  async clearAllData() {
    console.log("Mock clearAllData called");
    return true;
  }

  async getAllStoredData() {
    console.log("Mock getAllStoredData called");
    return {};
  }

  async findDuplicateAccount(cookies) {
    console.log("Mock findDuplicateAccount called with:", cookies);
    return null;
  }

  async consolidateDuplicates() {
    console.log("Mock consolidateDuplicates called");
    return { success: true };
  }

  async saveAccountInfo(account, email, status) {
    console.log("Mock saveAccountInfo called with:", account, email, status);
    return true;
  }

  async getAccountDatabaseInfo(account) {
    console.log("Mock getAccountDatabaseInfo called with:", account);
    return {};
  }

  async scanDownloadsForAccounts() {
    console.log("Mock scanDownloadsForAccounts called");
    return [];
  }

  async importAccountFromJSON(jsonText, customName, overrideExisting) {
    console.log(
      "Mock importAccountFromJSON called with:",
      jsonText,
      customName,
      overrideExisting
    );
    return "mock-account";
  }
}

// Create global instance
const accountService = new AccountService();

console.log("Account service mock loaded");

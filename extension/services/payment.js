// Simplified Payment Service for testing
console.log("Payment service loaded successfully");

class PaymentService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  // Initialize SQLite database
  async initializeDB() {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log("Initializing Payment SQLite database...");
      this.isInitialized = true;
      console.log("Payment SQLite database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Payment SQLite:", error);
      this.isInitialized = true;
      this.db = null;
    }
  }

  // Mock methods for testing
  async importCards(cardData, replace) {
    console.log("Mock importCards called with:", cardData, replace);
    return 0;
  }

  async exportCards() {
    console.log("Mock exportCards called");
    return [];
  }

  async getCards() {
    console.log("Mock getCards called");
    return [];
  }

  async removeCard(cardId) {
    console.log("Mock removeCard called with:", cardId);
    return true;
  }

  async clearAllCards() {
    console.log("Mock clearAllCards called");
    return true;
  }

  async getCard(cardId) {
    console.log("Mock getCard called with:", cardId);
    return null;
  }
}

// Create global instance
const paymentService = new PaymentService();

console.log("Payment service mock loaded");

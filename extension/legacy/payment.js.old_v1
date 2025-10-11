// Payment Auto-fill Service untuk Cursor Account Manager
class PaymentService {
  constructor() {
    this.CARDS_DATA_KEY = "cursor_payment_cards";
    this.cards = [];
    this.init();
  }

  async init() {
    await this.loadCards();
  }

  // Load cards from storage
  async loadCards() {
    try {
      const stored = await chrome.storage.local.get(this.CARDS_DATA_KEY);
      this.cards = stored[this.CARDS_DATA_KEY] || [];
      console.log(`Loaded ${this.cards.length} payment cards`);
    } catch (error) {
      console.error("Error loading payment cards:", error);
    }
  }

  // Parse card data from text format (card.md format)
  // Supports both formats:
  // - Legacy (3 parts): number|MM/YY|CVC
  // - New (4 parts): number|month|year|CVC
  parseCardData(cardText) {
    const lines = cardText.split("\n").filter((line) => line.trim());
    const cards = [];

    for (const line of lines) {
      // Skip empty lines and comments
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

        // Convert to MM/YY format with validation
        expiry = this.formatExpiry(month, year);
        if (!expiry) {
          console.warn(
            `Invalid month/year format: ${month}/${year} in line: ${line}`
          );
          continue;
        }
      } else if (parts.length === 3) {
        // Legacy format: number|MM/YY|CVC (exact match for backward compatibility)
        cardNumber = parts[0].trim();
        expiry = parts[1].trim();
        cvc = parts[2].trim();
      } else {
        console.warn(
          `Skipping invalid card format (expected 3 or 4 parts): ${line}`
        );
        continue;
      }

      // Clean card number (remove spaces and dashes)
      const cleanNumber = cardNumber.replace(/[\s-]/g, "");

      // Enhanced validation
      if (
        this.validateCardNumber(cleanNumber) &&
        this.validateExpiry(expiry) &&
        this.validateCVC(cvc)
      ) {
        cards.push({
          id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          number: cleanNumber,
          expiry: expiry,
          cvc: cvc,
          name: `Card ending in ${cleanNumber.slice(-4)}`,
          type: this.getCardType(cleanNumber),
        });

        // Small delay to ensure unique IDs - use random factor instead of await
        // to avoid making this function async
      } else {
        console.warn(`Invalid card data in line: ${line}`);
      }
    }

    return cards;
  }

  // Helper function to format month and year into MM/YY format
  formatExpiry(month, year) {
    // Validate month (1-12)
    const monthNum = parseInt(month, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return null;
    }

    // Validate year
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) {
      return null;
    }

    // Pad month to 2 digits
    const paddedMonth = monthNum.toString().padStart(2, "0");

    // Get last 2 digits of year
    let shortYear;
    if (yearNum >= 2000) {
      // 4-digit year (e.g., 2030 -> 30)
      shortYear = yearNum.toString().slice(-2);
    } else if (yearNum >= 0 && yearNum <= 99) {
      // 2-digit year (e.g., 30 -> 30)
      shortYear = yearNum.toString().padStart(2, "0");
    } else {
      return null;
    }

    return `${paddedMonth}/${shortYear}`;
  }

  // Validate card number (13-19 digits)
  validateCardNumber(cardNumber) {
    return /^\d{13,19}$/.test(cardNumber);
  }

  // Validate expiry format (MM/YY)
  validateExpiry(expiry) {
    return /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry);
  }

  // Validate CVC (3-4 digits)
  validateCVC(cvc) {
    return /^\d{3,4}$/.test(cvc);
  }

  // Detect card type based on number
  getCardType(cardNumber) {
    const firstDigit = cardNumber.charAt(0);
    const firstTwoDigits = cardNumber.substring(0, 2);
    const firstFourDigits = cardNumber.substring(0, 4);

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

  // Import cards from text data
  async importCards(cardText, replace = false) {
    const newCards = this.parseCardData(cardText);

    if (replace) {
      this.cards = newCards;
    } else {
      // Add new cards, avoiding duplicates
      for (const newCard of newCards) {
        const exists = this.cards.some(
          (card) => card.number === newCard.number
        );
        if (!exists) {
          this.cards.push(newCard);
        }
      }
    }

    await this.saveCards();
    return newCards.length;
  }

  // Export cards to text format
  async exportCards() {
    const exportData = [];

    for (const card of this.cards) {
      // Export in the format: number|MM/YY|CVC
      const line = `${card.number}|${card.expiry}|${card.cvc}`;
      exportData.push(line);
    }

    return exportData;
  }

  // Save cards to storage
  async saveCards() {
    try {
      await chrome.storage.local.set({
        [this.CARDS_DATA_KEY]: this.cards,
      });
      console.log(`Saved ${this.cards.length} payment cards`);
    } catch (error) {
      console.error("Error saving payment cards:", error);
    }
  }

  // Get all cards
  async getCards() {
    await this.loadCards(); // Ensure cards are loaded
    return [...this.cards];
  }

  // Get card by ID
  async getCard(cardId) {
    await this.loadCards(); // Ensure cards are loaded
    return this.cards.find((card) => card.id === cardId);
  }

  // Remove card
  async removeCard(cardId) {
    this.cards = this.cards.filter((card) => card.id !== cardId);
    await this.saveCards();
  }

  // Clear all cards
  async clearAllCards() {
    this.cards = [];
    await this.saveCards();
  }

  // Format card number for display (mask middle digits)
  formatCardNumber(cardNumber, maskMiddle = true) {
    if (!cardNumber) return "";

    if (maskMiddle && cardNumber.length === 16) {
      return `${cardNumber.slice(0, 4)} **** **** ${cardNumber.slice(-4)}`;
    } else {
      return cardNumber.replace(/(\d{4})/g, "$1 ").trim();
    }
  }

  // Find payment form fields on current page
  findPaymentFields() {
    const fields = {
      cardNumber: null,
      expiry: null,
      expiryMonth: null,
      expiryYear: null,
      cvc: null,
      name: null,
    };

    // Common selectors for card number
    const cardNumberSelectors = [
      // Stripe specific selectors
      "#cardNumber",
      'input[name="cardNumber"]',
      'input[id="cardNumber"]',
      // Generic selectors
      'input[autocomplete="cc-number"]',
      'input[name*="card"]',
      'input[name*="number"]',
      'input[placeholder*="card"]',
      'input[placeholder*="number"]',
      'input[data-testid*="card"]',
      "#card-number",
      "#cardnumber",
      ".card-number input",
      'input[type="tel"][maxlength="19"]',
      // Additional Stripe patterns
      'input.CheckoutInput[autocomplete="cc-number"]',
      'input[aria-label*="Card number"]',
    ];

    // Common selectors for expiry
    const expirySelectors = [
      // Stripe specific selectors
      "#cardExpiry",
      'input[name="cardExpiry"]',
      'input[id="cardExpiry"]',
      // Generic selectors
      'input[autocomplete="cc-exp"]',
      'input[name*="expir"]',
      'input[name*="exp"]',
      'input[placeholder*="MM/YY"]',
      'input[placeholder*="MM / YY"]',
      'input[placeholder*="expiry"]',
      "#expiry",
      "#exp-date",
      ".expiry input",
      // Additional Stripe patterns
      'input.CheckoutInput[autocomplete="cc-exp"]',
      'input[aria-label*="Expiration"]',
    ];

    // Common selectors for CVC
    const cvcSelectors = [
      // Stripe specific selectors
      "#cardCvc",
      'input[name="cardCvc"]',
      'input[id="cardCvc"]',
      // Generic selectors
      'input[autocomplete="cc-csc"]',
      'input[name*="cvc"]',
      'input[name*="cvv"]',
      'input[name*="security"]',
      'input[placeholder*="CVC"]',
      'input[placeholder*="CVV"]',
      "#cvc",
      "#cvv",
      ".cvc input",
      'input[maxlength="3"][type="tel"]',
      // Additional Stripe patterns
      'input.CheckoutInput[autocomplete="cc-csc"]',
      'input[aria-label*="CVC"]',
    ];

    // Find card number field
    for (const selector of cardNumberSelectors) {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) {
        fields.cardNumber = element;
        break;
      }
    }

    // Find expiry field
    for (const selector of expirySelectors) {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) {
        fields.expiry = element;
        break;
      }
    }

    // Find separate month/year fields if combined expiry not found
    if (!fields.expiry) {
      fields.expiryMonth = document.querySelector(
        'select[name*="month"], input[name*="month"]'
      );
      fields.expiryYear = document.querySelector(
        'select[name*="year"], input[name*="year"]'
      );
    }

    // Find CVC field
    for (const selector of cvcSelectors) {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) {
        fields.cvc = element;
        break;
      }
    }

    // Find cardholder name field
    const nameSelectors = [
      'input[name*="name"]',
      'input[placeholder*="name"]',
      'input[autocomplete="cc-name"]',
      "#cardholder-name",
    ];

    for (const selector of nameSelectors) {
      const element = document.querySelector(selector);
      if (
        element &&
        element.offsetParent !== null &&
        !element.name.includes("user") &&
        !element.name.includes("first") &&
        !element.name.includes("last")
      ) {
        fields.name = element;
        break;
      }
    }

    return fields;
  }

  // Auto-fill payment form with card data
  async autoFillCard(cardId) {
    const card = this.getCard(cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    const fields = this.findPaymentFields();
    let filledCount = 0;

    // Fill card number
    if (fields.cardNumber) {
      this.fillInput(fields.cardNumber, card.number);
      filledCount++;
    }

    // Fill expiry date
    if (fields.expiry) {
      this.fillInput(fields.expiry, card.expiry);
      filledCount++;
    } else if (fields.expiryMonth && fields.expiryYear) {
      const [month, year] = card.expiry.split("/");
      this.fillInput(fields.expiryMonth, month);
      this.fillInput(fields.expiryYear, year);
      filledCount += 2;
    }

    // Fill CVC
    if (fields.cvc) {
      this.fillInput(fields.cvc, card.cvc);
      filledCount++;
    }

    // Fill cardholder name if field exists (but we don't have name data)
    if (fields.name) {
      this.fillInput(fields.name, "John Doe"); // Default name
      filledCount++;
    }

    return filledCount;
  }

  // Helper function to fill input field
  fillInput(element, value) {
    if (!element || !value) return;

    // Focus the element
    element.focus();

    // Clear existing value first
    element.value = "";

    // For Stripe and other React-based forms, we need to simulate typing
    this.simulateTyping(element, value);

    // Set the value directly as fallback
    element.value = value;

    // Trigger comprehensive events to simulate user input
    const events = ["input", "change", "blur", "keyup", "keydown"];
    events.forEach((eventType) => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      if (eventType === "keyup" || eventType === "keydown") {
        Object.defineProperty(event, "key", { value: "Unidentified" });
        Object.defineProperty(event, "keyCode", { value: 0 });
      }
      element.dispatchEvent(event);
    });

    // React-specific events
    const reactEvent = new Event("input", { bubbles: true });
    Object.defineProperty(reactEvent, "target", {
      writable: false,
      value: element,
    });
    Object.defineProperty(reactEvent, "currentTarget", {
      writable: false,
      value: element,
    });
    element.dispatchEvent(reactEvent);

    // Also try triggering React's synthetic events
    if (element._valueTracker) {
      element._valueTracker.setValue("");
    }
  }

  // Simulate typing for better compatibility with React forms
  simulateTyping(element, value) {
    for (let i = 0; i < value.length; i++) {
      const char = value[i];

      // KeyDown event
      const keyDownEvent = new KeyboardEvent("keydown", {
        key: char,
        keyCode: char.charCodeAt(0),
        which: char.charCodeAt(0),
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(keyDownEvent);

      // Update value progressively
      element.value = value.substring(0, i + 1);

      // Input event after each character
      const inputEvent = new Event("input", { bubbles: true });
      Object.defineProperty(inputEvent, "data", { value: char });
      element.dispatchEvent(inputEvent);

      // KeyUp event
      const keyUpEvent = new KeyboardEvent("keyup", {
        key: char,
        keyCode: char.charCodeAt(0),
        which: char.charCodeAt(0),
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(keyUpEvent);
    }
  }

  // Get payment form info for debugging
  getPaymentFormInfo() {
    const fields = this.findPaymentFields();
    const info = {
      fieldsFound: 0,
      fields: {},
    };

    Object.keys(fields).forEach((key) => {
      if (fields[key]) {
        info.fieldsFound++;
        info.fields[key] = {
          tag: fields[key].tagName,
          name: fields[key].name,
          id: fields[key].id,
          placeholder: fields[key].placeholder,
          type: fields[key].type,
        };
      }
    });

    return info;
  }
}

// Export instance
const paymentService = new PaymentService();

// For service worker context
if (typeof self !== "undefined") {
  self.paymentService = paymentService;
}

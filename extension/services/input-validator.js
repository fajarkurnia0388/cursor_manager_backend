/**
 * 🛡️ Input Validator Service
 * Provides comprehensive input validation for SQLite-only architecture
 *
 * Features:
 * - Account data validation
 * - Payment card data validation
 * - SQL injection prevention
 * - Data sanitization
 * - Business rule validation
 */

class InputValidator {
  constructor() {
    // ✅ Fix: Use centralized configuration
    const config = typeof Config !== "undefined" ? Config.VALIDATION : {};

    this.validationRules = {
      account: {
        name: {
          required: true,
          minLength: config.ACCOUNT_NAME?.MIN_LENGTH || 1,
          maxLength: config.ACCOUNT_NAME?.MAX_LENGTH || 100,
          pattern: config.ACCOUNT_NAME?.PATTERN || /^[a-zA-Z0-9._@-]+$/,
          sanitize: true,
        },
        email: {
          required: false,
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          maxLength: 255,
        },
        status: {
          required: false,
          allowedValues: ["free", "pro", "business", "enterprise", ""],
          maxLength: 20,
        },
      },
      card: {
        number: {
          required: true,
          pattern: /^\d{13,19}$/,
          sanitize: true,
        },
        expiry: {
          required: true,
          pattern: /^(0[1-9]|1[0-2])\/\d{2}$/,
        },
        cvc: {
          required: true,
          pattern: /^\d{3,4}$/,
        },
        cardholderName: {
          required: false,
          maxLength: 100,
          pattern: /^[a-zA-Z\s.-]+$/,
          sanitize: true,
        },
      },
      cookie: {
        name: {
          required: true,
          maxLength: 100,
          pattern: /^[a-zA-Z0-9._-]+$/,
        },
        value: {
          required: true,
          maxLength: 4096,
        },
        domain: {
          required: true,
          maxLength: 255,
          pattern: /^[a-zA-Z0-9.-]+$/,
        },
      },
    };
  }

  /**
   * Validate account data
   */
  validateAccount(accountData) {
    const errors = [];
    const sanitized = {};

    // Validate name
    const nameValidation = this.validateField(
      accountData.name,
      this.validationRules.account.name,
      "Account name"
    );
    if (nameValidation.isValid) {
      sanitized.name = nameValidation.value;
    } else {
      errors.push(...nameValidation.errors);
    }

    // Validate email (optional)
    if (accountData.email) {
      const emailValidation = this.validateField(
        accountData.email,
        this.validationRules.account.email,
        "Email"
      );
      if (emailValidation.isValid) {
        sanitized.email = emailValidation.value;
      } else {
        errors.push(...emailValidation.errors);
      }
    }

    // Validate status (optional)
    if (accountData.status !== undefined) {
      const statusValidation = this.validateField(
        accountData.status,
        this.validationRules.account.status,
        "Status"
      );
      if (statusValidation.isValid) {
        sanitized.status = statusValidation.value;
      } else {
        errors.push(...statusValidation.errors);
      }
    }

    // Validate cookies
    if (accountData.cookies && Array.isArray(accountData.cookies)) {
      sanitized.cookies = [];
      accountData.cookies.forEach((cookie, index) => {
        const cookieValidation = this.validateCookie(cookie);
        if (cookieValidation.isValid) {
          sanitized.cookies.push(cookieValidation.value);
        } else {
          errors.push(
            `Cookie ${index + 1}: ${cookieValidation.errors.join(", ")}`
          );
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized,
    };
  }

  /**
   * Validate payment card data
   */
  validateCard(cardData) {
    const errors = [];
    const sanitized = {};

    // Validate card number
    const numberValidation = this.validateField(
      cardData.number,
      this.validationRules.card.number,
      "Card number"
    );
    if (numberValidation.isValid) {
      sanitized.number = numberValidation.value;
      // Additional Luhn algorithm check
      if (!this.validateLuhn(sanitized.number)) {
        errors.push("Card number fails Luhn algorithm validation");
      }
    } else {
      errors.push(...numberValidation.errors);
    }

    // Validate expiry
    const expiryValidation = this.validateField(
      cardData.expiry,
      this.validationRules.card.expiry,
      "Expiry date"
    );
    if (expiryValidation.isValid) {
      sanitized.expiry = expiryValidation.value;
      // Check if not expired
      if (this.isCardExpired(sanitized.expiry)) {
        errors.push("Card has expired");
      }
    } else {
      errors.push(...expiryValidation.errors);
    }

    // Validate CVC
    const cvcValidation = this.validateField(
      cardData.cvc,
      this.validationRules.card.cvc,
      "CVC"
    );
    if (cvcValidation.isValid) {
      sanitized.cvc = cvcValidation.value;
    } else {
      errors.push(...cvcValidation.errors);
    }

    // Validate cardholder name (optional)
    if (cardData.cardholderName) {
      const nameValidation = this.validateField(
        cardData.cardholderName,
        this.validationRules.card.cardholderName,
        "Cardholder name"
      );
      if (nameValidation.isValid) {
        sanitized.cardholderName = nameValidation.value;
      } else {
        errors.push(...nameValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized,
    };
  }

  /**
   * Validate cookie data
   */
  validateCookie(cookieData) {
    const errors = [];
    const sanitized = {};

    // Validate name
    const nameValidation = this.validateField(
      cookieData.name,
      this.validationRules.cookie.name,
      "Cookie name"
    );
    if (nameValidation.isValid) {
      sanitized.name = nameValidation.value;
    } else {
      errors.push(...nameValidation.errors);
    }

    // Validate value
    const valueValidation = this.validateField(
      cookieData.value,
      this.validationRules.cookie.value,
      "Cookie value"
    );
    if (valueValidation.isValid) {
      sanitized.value = valueValidation.value;
    } else {
      errors.push(...valueValidation.errors);
    }

    // Validate domain
    const domainValidation = this.validateField(
      cookieData.domain,
      this.validationRules.cookie.domain,
      "Cookie domain"
    );
    if (domainValidation.isValid) {
      sanitized.domain = domainValidation.value;
    } else {
      errors.push(...domainValidation.errors);
    }

    // Copy other optional fields
    ["path", "secure", "httpOnly", "sameSite", "expirationDate"].forEach(
      (field) => {
        if (cookieData[field] !== undefined) {
          sanitized[field] = cookieData[field];
        }
      }
    );

    return {
      isValid: errors.length === 0,
      errors,
      sanitized,
    };
  }

  /**
   * Validate individual field against rules
   */
  validateField(value, rules, fieldName) {
    const errors = [];
    let sanitizedValue = value;

    // Check required
    if (
      rules.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors, value: sanitizedValue };
    }

    // Skip further validation if optional and empty
    if (
      !rules.required &&
      (value === undefined || value === null || value === "")
    ) {
      return { isValid: true, errors: [], value: sanitizedValue };
    }

    // Convert to string for validation
    const stringValue = String(value);

    // Sanitize if needed
    if (rules.sanitize) {
      sanitizedValue = this.sanitizeString(stringValue);
    }

    // Check pattern
    if (rules.pattern && !rules.pattern.test(sanitizedValue)) {
      errors.push(`${fieldName} format is invalid`);
    }

    // Check length constraints
    if (rules.minLength && sanitizedValue.length < rules.minLength) {
      errors.push(
        `${fieldName} must be at least ${rules.minLength} characters`
      );
    }

    if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
      errors.push(`${fieldName} must be at most ${rules.maxLength} characters`);
    }

    // Check allowed values
    if (rules.allowedValues && !rules.allowedValues.includes(sanitizedValue)) {
      errors.push(
        `${fieldName} must be one of: ${rules.allowedValues.join(", ")}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: sanitizedValue,
    };
  }

  /**
   * Sanitize string to prevent SQL injection and XSS
   */
  sanitizeString(str) {
    if (typeof str !== "string") return str;

    // Remove dangerous characters and trim
    return str
      .replace(/[<>\"'%;()&+]/g, "") // Remove potentially dangerous chars
      .trim()
      .substring(0, 1000); // Limit length as safety measure
  }

  /**
   * Validate credit card number using Luhn algorithm
   */
  validateLuhn(cardNumber) {
    const digits = cardNumber.replace(/\D/g, "");
    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Check if card is expired
   */
  isCardExpired(expiry) {
    const [month, year] = expiry.split("/").map((num) => parseInt(num, 10));
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100; // Get last 2 digits
    const currentMonth = currentDate.getMonth() + 1;

    if (year < currentYear) return true;
    if (year === currentYear && month < currentMonth) return true;

    return false;
  }

  /**
   * Validate SQL query parameters to prevent injection
   */
  validateSqlParams(params) {
    const errors = [];
    const sanitized = {};

    Object.keys(params).forEach((key) => {
      const value = params[key];

      // Check for SQL injection patterns
      if (typeof value === "string") {
        const dangerousPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
          /(\-\-)|(\;)/,
          /(\bOR\b.*\=.*\=)|(\bAND\b.*\=.*\=)/i,
          /(\'.*\;.*\')/,
        ];

        const isDangerous = dangerousPatterns.some((pattern) =>
          pattern.test(value)
        );
        if (isDangerous) {
          errors.push(
            `Parameter "${key}" contains potentially dangerous SQL patterns`
          );
        } else {
          sanitized[key] = this.sanitizeString(value);
        }
      } else {
        sanitized[key] = value;
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      sanitized,
    };
  }

  /**
   * Get card type from number
   */
  getCardType(cardNumber) {
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/,
      diners: /^3[0689]/,
      jcb: /^35/,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(cardNumber)) {
        return type;
      }
    }

    return "unknown";
  }
}

// Create singleton instance
const inputValidator = new InputValidator();

// Export for use in other services
if (typeof module !== "undefined") {
  module.exports = InputValidator;
}

// For browser context
if (typeof window !== "undefined") {
  window.InputValidator = InputValidator;
  window.inputValidator = inputValidator;
}

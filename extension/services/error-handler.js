/**
 * 🚨 Error Handler Service
 * Provides standardized error handling for SQLite-only architecture
 *
 * Features:
 * - Consistent error formatting
 * - Error logging and tracking
 * - User-friendly error messages
 * - Error recovery suggestions
 */

class ErrorHandler {
  constructor() {
    this.errorLog = [];
    // ✅ Fix: Use centralized configuration
    this.maxLogSize =
      typeof Config !== "undefined" ? Config.STORAGE.MAX_ERROR_LOG_SIZE : 50;
  }

  /**
   * Handle database operation errors with consistent formatting
   */
  handleDatabaseError(operation, error, context = {}) {
    const errorInfo = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      operation,
      originalError: error.message,
      context,
      severity: this.determineSeverity(error),
      userMessage: this.generateUserMessage(operation, error),
      recoveryActions: this.getRecoveryActions(operation, error),
    };

    // Log error
    this.logError(errorInfo);

    // Console output based on severity
    switch (errorInfo.severity) {
      case "critical":
        console.error(`🔥 CRITICAL ERROR in ${operation}:`, errorInfo);
        break;
      case "high":
        console.error(`❌ ERROR in ${operation}:`, errorInfo);
        break;
      case "medium":
        console.warn(`⚠️ WARNING in ${operation}:`, errorInfo);
        break;
      case "low":
        console.info(`ℹ️ INFO in ${operation}:`, errorInfo);
        break;
    }

    // Create standardized error object
    const standardError = new Error(errorInfo.userMessage);
    standardError.errorInfo = errorInfo;
    standardError.code = this.getErrorCode(error);

    return standardError;
  }

  /**
   * Determine error severity based on error type and context
   */
  determineSeverity(error) {
    const message = error.message.toLowerCase();

    if (message.includes("database") && message.includes("corrupt"))
      return "critical";
    if (message.includes("out of memory")) return "critical";
    if (message.includes("permission denied")) return "high";
    if (message.includes("database is locked")) return "high";
    if (message.includes("constraint")) return "medium";
    if (message.includes("not found")) return "low";

    return "medium"; // Default
  }

  /**
   * Generate user-friendly error messages
   */
  generateUserMessage(operation, error) {
    const message = error.message.toLowerCase();

    if (message.includes("database") && message.includes("corrupt")) {
      return "Database corruption detected. Please restart the extension or contact support.";
    }
    if (message.includes("out of memory")) {
      return "Insufficient memory to complete operation. Please close other tabs and try again.";
    }
    if (message.includes("permission denied")) {
      return "Access denied. Please check extension permissions.";
    }
    if (message.includes("database is locked")) {
      return "Database is busy. Please wait a moment and try again.";
    }
    if (message.includes("constraint")) {
      return "Data validation failed. Please check your input and try again.";
    }
    if (message.includes("not found")) {
      return "Requested data not found.";
    }

    return `Operation "${operation}" failed. Please try again.`;
  }

  /**
   * Get recovery actions based on error type
   */
  getRecoveryActions(operation, error) {
    const message = error.message.toLowerCase();
    const actions = [];

    if (message.includes("database") && message.includes("corrupt")) {
      actions.push("restart_extension", "contact_support", "restore_backup");
    } else if (message.includes("out of memory")) {
      actions.push("close_tabs", "restart_browser", "clear_cache");
    } else if (message.includes("permission denied")) {
      actions.push("check_permissions", "restart_extension");
    } else if (message.includes("database is locked")) {
      actions.push("wait_and_retry", "restart_extension");
    } else if (message.includes("constraint")) {
      actions.push("validate_input", "check_data_format");
    } else {
      actions.push("retry_operation", "refresh_page");
    }

    return actions;
  }

  /**
   * Get standardized error code
   */
  getErrorCode(error) {
    const message = error.message.toLowerCase();

    if (message.includes("constraint")) return "CONSTRAINT_VIOLATION";
    if (message.includes("not found")) return "NOT_FOUND";
    if (message.includes("permission")) return "PERMISSION_DENIED";
    if (message.includes("memory")) return "OUT_OF_MEMORY";
    if (message.includes("corrupt")) return "DATABASE_CORRUPT";
    if (message.includes("locked")) return "DATABASE_LOCKED";

    return "UNKNOWN_ERROR";
  }

  /**
   * Log error to internal log and Chrome storage
   */
  logError(errorInfo) {
    // Add to internal log
    this.errorLog.push(errorInfo);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.splice(0, this.errorLog.length - this.maxLogSize);
    }

    // Store in Chrome storage for debugging
    try {
      chrome.storage.local.get("error_log", (result) => {
        const errors = result.error_log || [];
        errors.push(errorInfo);

        // Keep only last 50 errors
        if (errors.length > 50) {
          errors.splice(0, errors.length - 50);
        }

        chrome.storage.local.set({ error_log: errors });
      });
    } catch (storageError) {
      console.warn("Failed to store error in Chrome storage:", storageError);
    }
  }

  /**
   * Create error tracking wrapper for async operations
   */
  wrapAsyncOperation(operation, operationName, context = {}) {
    return async (...args) => {
      try {
        return await operation(...args);
      } catch (error) {
        throw this.handleDatabaseError(operationName, error, context);
      }
    };
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(limit = 10) {
    return this.errorLog.slice(-limit);
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
    chrome.storage.local.remove("error_log");
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      bySeverity: {},
      byOperation: {},
      byCode: {},
      recent24h: 0,
    };

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    this.errorLog.forEach((error) => {
      // By severity
      stats.bySeverity[error.severity] =
        (stats.bySeverity[error.severity] || 0) + 1;

      // By operation
      stats.byOperation[error.operation] =
        (stats.byOperation[error.operation] || 0) + 1;

      // Recent 24h
      if (new Date(error.timestamp).getTime() > oneDayAgo) {
        stats.recent24h++;
      }
    });

    return stats;
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Export for use in other services
if (typeof module !== "undefined") {
  module.exports = ErrorHandler;
}

// For browser context
if (typeof window !== "undefined") {
  window.ErrorHandler = ErrorHandler;
  window.errorHandler = errorHandler;
}

// For service worker context
if (
  typeof self !== "undefined" &&
  self.constructor.name === "ServiceWorkerGlobalScope"
) {
  self.ErrorHandler = ErrorHandler;
  self.errorHandler = errorHandler;
}

// For maximum compatibility
if (typeof globalThis !== "undefined") {
  globalThis.ErrorHandler = ErrorHandler;
  globalThis.errorHandler = errorHandler;
}

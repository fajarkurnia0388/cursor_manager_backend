/**
 * 📊 Logger Service
 * Provides standardized logging for SQLite-only architecture
 *
 * Features:
 * - Conditional logging based on environment
 * - Consistent log formatting
 * - Performance tracking
 * - Chrome storage integration
 * - Log level management
 */

class Logger {
  constructor() {
    // ✅ Use centralized configuration
    this.config = {
      levels:
        typeof Config !== "undefined"
          ? Config.LOGGING.LEVELS
          : {
              ERROR: "error",
              WARN: "warn",
              INFO: "info",
              DEBUG: "debug",
            },
      debugMode:
        typeof Config !== "undefined" ? Config.FEATURES.DEBUG_MODE : false,
      enableChromeStorage:
        typeof Config !== "undefined"
          ? Config.LOGGING.ENABLE_CHROME_STORAGE_LOGS
          : true,
      logPerformance:
        typeof Config !== "undefined"
          ? Config.LOGGING.LOG_PERFORMANCE_METRICS
          : true,
      maxConsoleLogs:
        typeof Config !== "undefined" ? Config.LOGGING.MAX_CONSOLE_LOGS : 1000,
    };

    this.logBuffer = [];
    this.performanceMetrics = [];
  }

  /**
   * Log error message
   */
  error(service, operation, message, data = {}) {
    this._log(this.config.levels.ERROR, service, operation, message, data);
    console.error(`🔥 [${service}] ${operation}: ${message}`, data);
  }

  /**
   * Log warning message
   */
  warn(service, operation, message, data = {}) {
    this._log(this.config.levels.WARN, service, operation, message, data);
    if (this.config.debugMode || this._shouldLog("warn")) {
      console.warn(`⚠️ [${service}] ${operation}: ${message}`, data);
    }
  }

  /**
   * Log info message
   */
  info(service, operation, message, data = {}) {
    this._log(this.config.levels.INFO, service, operation, message, data);
    if (this.config.debugMode || this._shouldLog("info")) {
      console.info(`ℹ️ [${service}] ${operation}: ${message}`, data);
    }
  }

  /**
   * Log debug message (only in debug mode)
   */
  debug(service, operation, message, data = {}) {
    if (this.config.debugMode) {
      this._log(this.config.levels.DEBUG, service, operation, message, data);
      console.debug(`🔍 [${service}] ${operation}: ${message}`, data);
    }
  }

  /**
   * Log performance metric
   */
  performance(service, operation, duration, data = {}) {
    if (this.config.logPerformance) {
      const metric = {
        timestamp: new Date().toISOString(),
        service,
        operation,
        duration,
        ...data,
      };

      this.performanceMetrics.push(metric);

      // Keep only recent metrics
      if (this.performanceMetrics.length > 100) {
        this.performanceMetrics.shift();
      }

      if (this.config.debugMode) {
        console.time(`⏱️ [${service}] ${operation}`);
        console.timeEnd(`⏱️ [${service}] ${operation}`);
      }

      // Store in Chrome storage
      this._storeMetric(metric);
    }
  }

  /**
   * Log database operation
   */
  database(operation, query, duration, rows = 0) {
    const shouldLogDb =
      this.config.debugMode ||
      (typeof Config !== "undefined" && Config.LOGGING.LOG_DATABASE_OPERATIONS);

    if (shouldLogDb) {
      const message = `${operation} (${duration}ms, ${rows} rows)`;
      this.debug("Database", operation, message, { query, duration, rows });
    }
  }

  /**
   * Create timing wrapper for async operations
   */
  time(service, operation) {
    const startTime = performance.now();

    return {
      end: (additionalData = {}) => {
        const duration = performance.now() - startTime;
        this.performance(service, operation, duration, additionalData);
        return duration;
      },
    };
  }

  /**
   * Log service initialization
   */
  serviceInit(serviceName, duration, success = true, error = null) {
    if (success) {
      this.info(
        "System",
        "ServiceInit",
        `${serviceName} initialized successfully`,
        {
          duration,
          serviceName,
        }
      );
    } else {
      this.error(
        "System",
        "ServiceInit",
        `${serviceName} initialization failed`,
        {
          duration,
          serviceName,
          error: error?.message,
        }
      );
    }
  }

  /**
   * Log user action
   */
  userAction(action, data = {}) {
    this.info("UserAction", action, `User performed: ${action}`, data);
  }

  /**
   * Internal logging method
   */
  _log(level, service, operation, message, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service,
      operation,
      message,
      data: this._sanitizeData(data),
    };

    this.logBuffer.push(logEntry);

    // Keep buffer size manageable
    if (this.logBuffer.length > this.config.maxConsoleLogs) {
      this.logBuffer.shift();
    }

    // Store in Chrome storage if enabled
    if (this.config.enableChromeStorage && typeof chrome !== "undefined") {
      this._storeLog(logEntry);
    }
  }

  /**
   * Determine if log should be shown in console
   */
  _shouldLog(level) {
    // Always show errors and warnings
    if (level === "error" || level === "warn") return true;

    // Show info and debug based on config
    return this.config.debugMode;
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  _sanitizeData(data) {
    if (!data || typeof data !== "object") return data;

    const sanitized = { ...data };

    // Remove sensitive fields
    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "key",
      "cookies",
      "cvc",
    ];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = "[REDACTED]";
      }
    });

    // Truncate long strings
    Object.keys(sanitized).forEach((key) => {
      if (typeof sanitized[key] === "string" && sanitized[key].length > 500) {
        sanitized[key] = sanitized[key].substring(0, 500) + "...";
      }
    });

    return sanitized;
  }

  /**
   * Store log entry in Chrome storage
   */
  _storeLog(logEntry) {
    try {
      chrome.storage.local.get("application_logs", (result) => {
        const logs = result.application_logs || [];
        logs.push(logEntry);

        // Keep only last 200 logs
        if (logs.length > 200) {
          logs.splice(0, logs.length - 200);
        }

        chrome.storage.local.set({ application_logs: logs });
      });
    } catch (error) {
      // Fallback to console if Chrome storage fails
      console.warn("Failed to store log in Chrome storage:", error);
    }
  }

  /**
   * Store performance metric in Chrome storage
   */
  _storeMetric(metric) {
    try {
      chrome.storage.local.get("performance_metrics", (result) => {
        const metrics = result.performance_metrics || [];
        metrics.push(metric);

        // Keep only last 100 metrics
        if (metrics.length > 100) {
          metrics.splice(0, metrics.length - 100);
        }

        chrome.storage.local.set({ performance_metrics: metrics });
      });
    } catch (error) {
      // Silent fail for metrics
    }
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(limit = 50) {
    return this.logBuffer.slice(-limit);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      recent: this.performanceMetrics.slice(-20),
      averages: this._calculateAverages(),
      summary: this._getPerformanceSummary(),
    };
  }

  /**
   * Calculate performance averages
   */
  _calculateAverages() {
    const byOperation = {};

    this.performanceMetrics.forEach((metric) => {
      const key = `${metric.service}.${metric.operation}`;
      if (!byOperation[key]) {
        byOperation[key] = { total: 0, count: 0, min: Infinity, max: 0 };
      }

      byOperation[key].total += metric.duration;
      byOperation[key].count += 1;
      byOperation[key].min = Math.min(byOperation[key].min, metric.duration);
      byOperation[key].max = Math.max(byOperation[key].max, metric.duration);
    });

    // Calculate averages
    Object.keys(byOperation).forEach((key) => {
      const stats = byOperation[key];
      stats.average = stats.total / stats.count;
    });

    return byOperation;
  }

  /**
   * Get performance summary
   */
  _getPerformanceSummary() {
    if (this.performanceMetrics.length === 0) return {};

    const durations = this.performanceMetrics.map((m) => m.duration);

    return {
      totalOperations: this.performanceMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      slowOperations: this.performanceMetrics
        .filter((m) => m.duration > 1000) // Operations > 1s
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10),
    };
  }

  /**
   * Clear all logs and metrics
   */
  clear() {
    this.logBuffer = [];
    this.performanceMetrics = [];

    if (typeof chrome !== "undefined") {
      chrome.storage.local.remove(["application_logs", "performance_metrics"]);
    }
  }

  /**
   * Enable debug mode
   */
  enableDebugMode() {
    this.config.debugMode = true;
    this.info("Logger", "Config", "Debug mode enabled");
  }

  /**
   * Disable debug mode
   */
  disableDebugMode() {
    this.config.debugMode = false;
    console.info("ℹ️ [Logger] Config: Debug mode disabled");
  }
}

// Create singleton instance
const logger = new Logger();

// Export for use in other services
if (typeof module !== "undefined") {
  module.exports = Logger;
}

// For browser context
if (typeof window !== "undefined") {
  window.Logger = Logger;
  window.logger = logger;
}

// For service worker context
if (typeof self !== "undefined") {
  self.Logger = Logger;
  self.logger = logger;
}

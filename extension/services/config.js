/**
 * 🔧 Configuration Constants
 * Centralized configuration for SQLite-only architecture
 *
 * Features:
 * - Database configuration
 * - Validation rules
 * - Performance settings
 * - Feature flags
 * - Error handling settings
 */

const Config = {
  // Database Configuration
  DATABASE: {
    ACCOUNTS_DB_NAME: "cursor_accounts.db",
    CARDS_DB_NAME: "cursor_payment_cards.db",
    HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
    MAX_INIT_RETRIES: 3,
    INIT_RETRY_DELAY: 1000, // 1 second
    CONNECTION_TIMEOUT: 10000, // 10 seconds
    QUERY_TIMEOUT: 5000, // 5 seconds
  },

  // Storage Configuration
  STORAGE: {
    CHROME_STORAGE_KEYS: {
      ACCOUNTS: "cursor_accounts",
      AVATARS: "cursor_accounts:avatars",
      ACCOUNT_INFO: "cursor_accounts:info",
      ACTIVE_ACCOUNT: "cursor_active_account",
      PAYMENT_CARDS: "cursor_payment_cards",
      ACCOUNT_DOWNLOADS: "account_downloads",
      DATABASE_EVENTS: "database_events",
      ERROR_LOG: "error_log",
      MIGRATION_EVENTS: "migration_events",
      MIGRATION_COMPLETED: "migration_completed",
      USE_SQLITE_STORAGE: "use_sqlite_storage",
      SQLITE_PREFIX: "sqlite_",
    },
    MAX_LOG_SIZE: 100,
    MAX_ERROR_LOG_SIZE: 50,
    MAX_MIGRATION_EVENTS: 50,
  },

  // Performance Settings
  PERFORMANCE: {
    INITIALIZATION_TIMEOUT: 500, // Target: <500ms
    QUERY_PERFORMANCE_TARGET: 100, // Target: <100ms
    MEMORY_LIMIT: 100 * 1024 * 1024, // 100MB
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    BATCH_SIZE: 50, // For bulk operations
    PAGE_SIZE: 25, // For pagination
  },

  // Validation Rules
  VALIDATION: {
    ACCOUNT_NAME: {
      MIN_LENGTH: 1,
      MAX_LENGTH: 100,
      PATTERN: /^[a-zA-Z0-9._@-]+$/,
    },
    EMAIL: {
      MAX_LENGTH: 255,
      PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    STATUS: {
      MAX_LENGTH: 20,
      ALLOWED_VALUES: ["free", "pro", "business", "enterprise", ""],
    },
    CARD_NUMBER: {
      MIN_LENGTH: 13,
      MAX_LENGTH: 19,
      PATTERN: /^\d{13,19}$/,
    },
    CARD_EXPIRY: {
      PATTERN: /^(0[1-9]|1[0-2])\/\d{2}$/,
    },
    CARD_CVC: {
      PATTERN: /^\d{3,4}$/,
    },
    CARDHOLDER_NAME: {
      MAX_LENGTH: 100,
      PATTERN: /^[a-zA-Z\s.-]+$/,
    },
    COOKIE_NAME: {
      MAX_LENGTH: 100,
      PATTERN: /^[a-zA-Z0-9._-]+$/,
    },
    COOKIE_VALUE: {
      MAX_LENGTH: 4096,
    },
    COOKIE_DOMAIN: {
      MAX_LENGTH: 255,
      PATTERN: /^[a-zA-Z0-9.-]+$/,
    },
  },

  // Error Handling
  ERROR: {
    SEVERITY_LEVELS: {
      CRITICAL: "critical",
      HIGH: "high",
      MEDIUM: "medium",
      LOW: "low",
    },
    CODES: {
      CONSTRAINT_VIOLATION: "CONSTRAINT_VIOLATION",
      NOT_FOUND: "NOT_FOUND",
      PERMISSION_DENIED: "PERMISSION_DENIED",
      OUT_OF_MEMORY: "OUT_OF_MEMORY",
      DATABASE_CORRUPT: "DATABASE_CORRUPT",
      DATABASE_LOCKED: "DATABASE_LOCKED",
      VALIDATION_FAILED: "VALIDATION_FAILED",
      UNKNOWN_ERROR: "UNKNOWN_ERROR",
    },
    RECOVERY_ACTIONS: {
      RESTART_EXTENSION: "restart_extension",
      CONTACT_SUPPORT: "contact_support",
      RESTORE_BACKUP: "restore_backup",
      CLOSE_TABS: "close_tabs",
      RESTART_BROWSER: "restart_browser",
      CLEAR_CACHE: "clear_cache",
      CHECK_PERMISSIONS: "check_permissions",
      WAIT_AND_RETRY: "wait_and_retry",
      VALIDATE_INPUT: "validate_input",
      CHECK_DATA_FORMAT: "check_data_format",
      RETRY_OPERATION: "retry_operation",
      REFRESH_PAGE: "refresh_page",
    },
  },

  // Feature Flags
  FEATURES: {
    ENABLE_ERROR_HANDLER: true,
    ENABLE_INPUT_VALIDATION: true,
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_HEALTH_CHECKS: true,
    ENABLE_BACKUP_ON_MIGRATION: true,
    ENABLE_CLEANUP_OLD_DATA: true,
    ENABLE_TRANSACTION_SUPPORT: false, // To be implemented
    ENABLE_QUERY_CACHING: false, // To be implemented
    ENABLE_CONNECTION_POOLING: false, // To be implemented
    DEBUG_MODE: false,
  },

  // Security Settings
  SECURITY: {
    ENABLE_INPUT_SANITIZATION: true,
    ENABLE_SQL_INJECTION_PROTECTION: true,
    ENABLE_XSS_PROTECTION: true,
    MAX_INPUT_LENGTH: 1000,
    DANGEROUS_SQL_PATTERNS: [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(\-\-)|(\;)/,
      /(\bOR\b.*\=.*\=)|(\bAND\b.*\=.*\=)/i,
      /(\'.*\;.*\')/,
    ],
    DANGEROUS_CHARS: /[<>\"'%;()&+]/g,
  },

  // Migration Settings
  MIGRATION: {
    BACKUP_DIRECTORY: "cursor_backups",
    FILENAME_PREFIX: "cursor_migration_backup_",
    VERSION: "1.0",
    STEPS: {
      BACKUP: { name: "backup", weight: 10 },
      ACCOUNTS: { name: "accounts", weight: 40 },
      CARDS: { name: "cards", weight: 30 },
      VALIDATION: { name: "validation", weight: 15 },
      CLEANUP: { name: "cleanup", weight: 5 },
    },
  },

  // File Paths and URLs
  PATHS: {
    SQL_JS_LIB: "libs/sql.js",
    SQL_WASM_LIB: "libs/sql-wasm.wasm",
    DATABASE_SERVICES: "services/database/",
    MIGRATION_SERVICES: "services/migration/",
    TEST_FILES: "tests/",
    OUTPUT_DIR: "output/",
    DOCS_DIR: "docs/",
  },

  // Logging Configuration
  LOGGING: {
    LEVELS: {
      ERROR: "error",
      WARN: "warn",
      INFO: "info",
      DEBUG: "debug",
    },
    MAX_CONSOLE_LOGS: 1000,
    ENABLE_CHROME_STORAGE_LOGS: true,
    LOG_PERFORMANCE_METRICS: true,
    LOG_DATABASE_OPERATIONS: false, // Only in debug mode
  },

  // Testing Configuration
  TESTING: {
    MOCK_CHROME_APIS: true,
    TEST_DATA: {
      SAMPLE_ACCOUNT_NAME: "test_account",
      SAMPLE_EMAIL: "test@example.com",
      SAMPLE_STATUS: "free",
      SAMPLE_CARDS: [
        "4111111111111111|12|25|123",
        "5555555555554444|06|26|456",
        "378282246310005|03|27|789",
      ],
    },
    PERFORMANCE_BENCHMARKS: {
      INIT_TIME_TARGET: 500, // ms
      QUERY_TIME_TARGET: 50, // ms
      BATCH_SIZE: 10,
    },
  },

  // UI Configuration
  UI: {
    EXTENSION_NAME: "Cursor Account Manager",
    VERSION: "2.0.0",
    DESCRIPTION: "SQLite-Only Account Manager",
    DEFAULT_AVATAR: "icons/icon64.png",
    NOTIFICATION_TIMEOUT: 5000, // ms
    ANIMATION_DURATION: 300, // ms
  },

  // Development Settings
  DEVELOPMENT: {
    VERBOSE_LOGGING: false,
    ENABLE_STACK_TRACES: true,
    MOCK_DELAYS: false,
    SIMULATE_ERRORS: false,
    BYPASS_VALIDATION: false,
  },
};

// Helper functions for accessing config
Config.getStorageKey = (keyName) => {
  return Config.STORAGE.CHROME_STORAGE_KEYS[keyName] || keyName;
};

Config.getValidationRule = (entity, field) => {
  return Config.VALIDATION[`${entity.toUpperCase()}_${field.toUpperCase()}`];
};

Config.isFeatureEnabled = (featureName) => {
  return Config.FEATURES[`ENABLE_${featureName.toUpperCase()}`] === true;
};

Config.getErrorCode = (errorType) => {
  return (
    Config.ERROR.CODES[errorType.toUpperCase()] ||
    Config.ERROR.CODES.UNKNOWN_ERROR
  );
};

Config.getSecurity = () => {
  return {
    encryption: {
      algorithm: "AES-GCM",
      keyLength: 256,
      ivLength: 12,
      enabled: true,
    },
    accessControl: {
      enabled: true,
      defaultDeny: true,
      roleBasedAccess: true,
    },
    auditLogging: {
      enabled: true,
      maxEntries: 1000,
      retentionDays: 90,
      logSensitiveOperations: true,
    },
    threatDetection: {
      enabled: true,
      maxFailedAttempts: 5,
      lockoutDuration: 300000, // 5 minutes
      suspiciousActivityDetection: true,
    },
    compliance: {
      gdprCompliant: true,
      dataMinimization: true,
      rightToForget: true,
      dataPortability: true,
    },
  };
};

/**
 * Get threat detection configuration
 * @returns {Object} Threat detection configuration
 */
Config.getThreatDetection = () => {
  return {
    enabled: true,
    realTimeMonitoring: true,
    attackPatterns: {
      sqlInjection: true,
      xssAttacks: true,
      commandInjection: true,
      dataExfiltration: true,
    },
    behavioralAnalysis: {
      enabled: true,
      rapidRequestsThreshold: 100,
      timeWindow: 60000, // 1 minute
      failedAttemptsThreshold: 5,
      lockoutDuration: 300000, // 5 minutes
    },
    responseActions: {
      autoBlock: true,
      quarantine: true,
      alerting: true,
      escalation: true,
    },
    threatIntelligence: {
      enabled: true,
      updateInterval: 86400000, // 24 hours
      sources: ["internal", "patterns"],
    },
  };
};

/**
 * Get compliance management configuration
 * @returns {Object} Compliance configuration
 */
Config.getCompliance = () => {
  return {
    gdprCompliance: {
      enabled: true,
      strictMode: true,
      periodicAssessment: true,
      assessmentInterval: 604800000, // 7 days
    },
    dataProtection: {
      dataMinimization: true,
      purposeLimitation: true,
      accuracyRequirement: true,
      storageLimitation: true,
      integrityConfidentiality: true,
      accountability: true,
    },
    auditLogging: {
      enabled: true,
      retention: 90, // days
      detailedLogging: true,
      complianceEvents: true,
    },
    reporting: {
      automated: true,
      frequency: "weekly",
      format: "comprehensive",
      recipients: ["security_team"],
    },
    dpia: {
      required: true,
      autoGeneration: true,
      reviewInterval: 365, // days
      highRiskProcessing: true,
    },
  };
};

/**
 * Get performance optimization configuration
 * @returns {Object} Performance optimization configuration
 */
Config.getPerformanceOptimization = () => {
  return {
    enabled: true,
    autoOptimization: true,
    aggressiveMode: false,
    techniques: {
      caching: {
        enabled: true,
        maxSize: 100 * 1024 * 1024, // 100MB
        ttl: 3600000, // 1 hour
        strategies: ["lru", "ttl", "compression"],
      },
      memoryManagement: {
        enabled: true,
        autoGC: true,
        threshold: 80, // percent
        interval: 300000, // 5 minutes
      },
      resourceOptimization: {
        enabled: true,
        compression: true,
        minification: true,
        bundling: true,
      },
      queryOptimization: {
        enabled: true,
        indexing: true,
        batching: true,
        caching: true,
        preparedStatements: true,
      },
      codeSplitting: {
        enabled: true,
        lazyLoading: true,
        dynamicImports: true,
      },
    },
    monitoring: {
      enabled: true,
      interval: 60000, // 1 minute
      metrics: ["memory", "cache", "queries", "resources"],
    },
    optimization: {
      interval: 120000, // 2 minutes
      rules: [
        "memory_threshold",
        "cache_miss_rate",
        "slow_queries",
        "large_payload",
      ],
    },
  };
};

// Freeze configuration to prevent accidental modification (after attaching helpers)
Object.freeze(Config);

// Export for use in other services
if (typeof module !== "undefined") {
  module.exports = Config;
}

// For browser context
if (typeof window !== "undefined") {
  window.Config = Config;
  console.log("✅ Config exported to window context");
}

// For service worker context (strict detection)
if (
  typeof ServiceWorkerGlobalScope !== "undefined" &&
  self instanceof ServiceWorkerGlobalScope
) {
  self.Config = Config;
  console.log("✅ Config exported to service worker context");

  // Ensure getSecurity is available
  if (typeof Config.getSecurity === "function") {
    console.log("✅ Config.getSecurity is available in service worker");
  } else {
    console.error("❌ Config.getSecurity is NOT available in service worker");
  }
}

// Also assign to global scope for compatibility
try {
  globalThis.Config = Config;
  console.log("✅ Config exported to globalThis");
} catch (e) {
  console.warn("⚠️ Could not export Config to globalThis:", e);
}

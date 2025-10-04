/**
 * 🌐 Namespace Manager
 * Manages global namespace to prevent pollution and conflicts
 */

class NamespaceManager {
  constructor() {
    this.namespaces = new Map();
    this.globalRefs = new Map();
    this.initialized = false;

    this.init();
  }

  /**
   * Initialize namespace management
   */
  init() {
    if (this.initialized) return;

    // Create main app namespace
    this.createNamespace("CursorAccountManager", {
      version: "1.0.0",
      services: {},
      utils: {},
      config: {},
      state: {},
    });

    this.initialized = true;
    console.log("🌐 Namespace Manager initialized");
  }

  /**
   * Create a new namespace
   * @param {string} name - Namespace name
   * @param {object} initialData - Initial data for namespace
   * @returns {object} Created namespace
   */
  createNamespace(name, initialData = {}) {
    if (this.namespaces.has(name)) {
      console.warn(`Namespace '${name}' already exists`);
      return this.namespaces.get(name);
    }

    const namespace = {
      ...initialData,
      __namespace__: name,
      __created__: new Date().toISOString(),
    };

    this.namespaces.set(name, namespace);

    // Add to global safely
    if (!window[name]) {
      window[name] = namespace;
      this.globalRefs.set(name, namespace);
    }

    console.log(`📦 Created namespace: ${name}`);
    return namespace;
  }

  /**
   * Get namespace
   * @param {string} name - Namespace name
   * @returns {object|null} Namespace or null
   */
  getNamespace(name) {
    return this.namespaces.get(name) || null;
  }

  /**
   * Register service in namespace
   * @param {string} serviceName - Service name
   * @param {object} service - Service object
   * @param {string} namespace - Target namespace (default: main)
   */
  registerService(serviceName, service, namespace = "CursorAccountManager") {
    const ns = this.getNamespace(namespace);
    if (!ns) {
      console.error(`Namespace '${namespace}' not found`);
      return false;
    }

    if (!ns.services) {
      ns.services = {};
    }

    ns.services[serviceName] = service;
    console.log(`🔧 Registered service '${serviceName}' in '${namespace}'`);
    return true;
  }

  /**
   * Register utility function in namespace
   * @param {string} utilName - Utility name
   * @param {Function} utilFunction - Utility function
   * @param {string} namespace - Target namespace
   */
  registerUtil(utilName, utilFunction, namespace = "CursorAccountManager") {
    const ns = this.getNamespace(namespace);
    if (!ns) {
      console.error(`Namespace '${namespace}' not found`);
      return false;
    }

    if (!ns.utils) {
      ns.utils = {};
    }

    ns.utils[utilName] = utilFunction;
    console.log(`⚙️ Registered utility '${utilName}' in '${namespace}'`);
    return true;
  }

  /**
   * Set configuration in namespace
   * @param {string} key - Config key
   * @param {any} value - Config value
   * @param {string} namespace - Target namespace
   */
  setConfig(key, value, namespace = "CursorAccountManager") {
    const ns = this.getNamespace(namespace);
    if (!ns) {
      console.error(`Namespace '${namespace}' not found`);
      return false;
    }

    if (!ns.config) {
      ns.config = {};
    }

    ns.config[key] = value;
    return true;
  }

  /**
   * Get configuration from namespace
   * @param {string} key - Config key
   * @param {string} namespace - Target namespace
   * @returns {any} Config value
   */
  getConfig(key, namespace = "CursorAccountManager") {
    const ns = this.getNamespace(namespace);
    return ns?.config?.[key];
  }

  /**
   * Clean up global namespace
   */
  cleanupGlobals() {
    const globalVarsToClean = [
      "lazyLoader",
      "cacheService",
      "domOptimizer",
      "errorHandler",
      "performanceUtils",
      "performanceControls",
      "performanceStats",
    ];

    const cleaned = [];

    globalVarsToClean.forEach((varName) => {
      if (window[varName]) {
        // Move to namespace
        this.registerService(varName, window[varName]);

        // Remove from global
        delete window[varName];
        cleaned.push(varName);
      }
    });

    console.log(`🧹 Cleaned global variables: ${cleaned.join(", ")}`);
    return cleaned;
  }

  /**
   * Create safe global accessor
   * @param {string} serviceName - Service name to access
   * @returns {Function} Accessor function
   */
  createAccessor(serviceName) {
    return () => {
      const ns = this.getNamespace("CursorAccountManager");
      return ns?.services?.[serviceName];
    };
  }

  /**
   * Setup safe global accessors
   */
  setupGlobalAccessors() {
    const services = [
      "lazyLoader",
      "cacheService",
      "domOptimizer",
      "errorHandler",
    ];

    services.forEach((service) => {
      // Create safe accessor
      window[`get${service.charAt(0).toUpperCase() + service.slice(1)}`] =
        this.createAccessor(service);
    });

    // Convenience functions
    window.CAM = this.getNamespace("CursorAccountManager");

    console.log("🔗 Global accessors created");
  }

  /**
   * Migrate existing globals to namespace
   */
  migrateExistingGlobals() {
    const migrations = {
      lazyLoader: window.lazyLoader,
      cacheService: window.cacheService,
      domOptimizer: window.domOptimizer,
      errorHandler: window.errorHandler,
      performanceUtils: window.performanceUtils,
      performanceControls: window.performanceControls,
    };

    Object.entries(migrations).forEach(([name, service]) => {
      if (service) {
        this.registerService(name, service);
      }
    });

    console.log("📦 Migrated existing globals to namespace");
  }

  /**
   * Get namespace statistics
   * @returns {object} Statistics
   */
  getStats() {
    const stats = {
      totalNamespaces: this.namespaces.size,
      namespaces: {},
      globalRefs: this.globalRefs.size,
    };

    this.namespaces.forEach((ns, name) => {
      stats.namespaces[name] = {
        services: Object.keys(ns.services || {}).length,
        utils: Object.keys(ns.utils || {}).length,
        config: Object.keys(ns.config || {}).length,
        created: ns.__created__,
      };
    });

    return stats;
  }

  /**
   * Debug namespace contents
   * @param {string} namespaceName - Namespace to debug
   */
  debug(namespaceName = "CursorAccountManager") {
    const ns = this.getNamespace(namespaceName);
    if (!ns) {
      console.error(`Namespace '${namespaceName}' not found`);
      return;
    }

    console.group(`🔍 Namespace Debug: ${namespaceName}`);
    console.log("Services:", Object.keys(ns.services || {}));
    console.log("Utils:", Object.keys(ns.utils || {}));
    console.log("Config:", ns.config || {});
    console.log("Created:", ns.__created__);
    console.groupEnd();
  }
}

// Initialize namespace manager
window.namespaceManager = new NamespaceManager();

// Auto-setup after DOM loaded
document.addEventListener("DOMContentLoaded", () => {
  // Wait a bit for other services to load
  setTimeout(() => {
    window.namespaceManager.migrateExistingGlobals();
    window.namespaceManager.setupGlobalAccessors();
    // Clean up after migration
    window.namespaceManager.cleanupGlobals();
  }, 1000);
});

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = NamespaceManager;
}

/**
 * 🚀 Lazy Loading Service
 * Handles dynamic loading of heavy modules to improve initial load time
 */

class LazyLoader {
  constructor() {
    this.loadedModules = new Set();
    this.loadingPromises = new Map();
  }

  /**
   * Load a script dynamically
   * @param {string} src - Script source path
   * @param {string} moduleId - Unique module identifier
   * @returns {Promise} Loading promise
   */
  async loadScript(src, moduleId) {
    // Return immediately if already loaded
    if (this.loadedModules.has(moduleId)) {
      return Promise.resolve();
    }

    // Return existing promise if currently loading
    if (this.loadingPromises.has(moduleId)) {
      return this.loadingPromises.get(moduleId);
    }

    // Create new loading promise
    const loadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;

      script.onload = () => {
        this.loadedModules.add(moduleId);
        this.loadingPromises.delete(moduleId);
        console.log(`✅ Lazy loaded: ${moduleId}`);
        resolve();
      };

      script.onerror = () => {
        this.loadingPromises.delete(moduleId);
        console.error(`❌ Failed to load: ${moduleId}`);
        reject(new Error(`Failed to load ${moduleId}`));
      };

      document.head.appendChild(script);
    });

    this.loadingPromises.set(moduleId, loadingPromise);
    return loadingPromise;
  }

  /**
   * Load module when user interacts with specific feature
   * @param {string} feature - Feature name (e.g., 'generator', 'bypass')
   * @returns {Promise} Loading promise
   */
  async loadFeature(feature) {
    const featureMap = {
      generator: {
        src: "services/generator.js",
        id: "generator-service",
      },
      bypass: {
        src: "modules/bypass/bypass-handler.js",
        id: "bypass-handler",
      },
      console: {
        src: "services/console-service.js",
        id: "console-service",
      },
      "account-deletion": {
        src: "services/account-deletion.js",
        id: "account-deletion",
      },
    };

    const config = featureMap[feature];
    if (!config) {
      throw new Error(`Unknown feature: ${feature}`);
    }

    try {
      await this.loadScript(config.src, config.id);
      return true;
    } catch (error) {
      console.error(`Failed to load feature ${feature}:`, error);
      return false;
    }
  }

  /**
   * Preload critical modules in background
   */
  async preloadCritical() {
    const criticalModules = [
      { src: "services/payment.js", id: "payment-service" },
    ];

    // Load critical modules with delay to not block initial render
    setTimeout(async () => {
      for (const module of criticalModules) {
        try {
          await this.loadScript(module.src, module.id);
        } catch (error) {
          console.warn(`Failed to preload ${module.id}:`, error);
        }
      }
    }, 100);
  }

  /**
   * Check if module is loaded
   * @param {string} moduleId - Module identifier
   * @returns {boolean} Loading status
   */
  isLoaded(moduleId) {
    return this.loadedModules.has(moduleId);
  }

  /**
   * Get loading statistics
   * @returns {object} Loading stats
   */
  getStats() {
    return {
      loadedCount: this.loadedModules.size,
      loadedModules: Array.from(this.loadedModules),
      currentlyLoading: Array.from(this.loadingPromises.keys()),
    };
  }
}

// Global instance
window.lazyLoader = new LazyLoader();

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = LazyLoader;
}

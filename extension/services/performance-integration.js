/**
 * 🚀 Performance Integration
 * Integrates lazy loading and caching into the main sidepanel functionality
 */

// Wait for DOM and performance services to be ready
document.addEventListener("DOMContentLoaded", () => {
  initializePerformanceFeatures();
});

function initializePerformanceFeatures() {
  // 1. Setup lazy loading for tab interactions
  setupLazyTabLoading();

  // 2. Setup cached data fetching
  setupCachedDataFetching();

  // 3. Setup optimized DOM updates
  setupOptimizedDOMUpdates();

  // 4. Setup performance monitoring
  setupPerformanceMonitoring();

  console.log("🚀 Performance features initialized");
}

/**
 * Setup lazy loading for different tabs
 */
function setupLazyTabLoading() {
  const tabButtons = {
    generatorTab: "generator",
    accountsTab: "account-deletion",
    paymentsTab: null, // Already loaded
    debugTab: "console",
  };

  Object.entries(tabButtons).forEach(([tabId, feature]) => {
    const tab = document.getElementById(tabId);
    if (tab && feature) {
      // Load feature when tab is first clicked
      tab.addEventListener(
        "click",
        async () => {
          // Safe access to lazyLoader service
          const lazyLoader =
            window.lazyLoader || window.CAM?.services?.lazyLoader;
          if (lazyLoader && !lazyLoader.isLoaded(`${feature}-service`)) {
            showLoadingIndicator(tabId);

            try {
              await lazyLoader.loadFeature(feature);
              hideLoadingIndicator(tabId);
            } catch (error) {
              console.error(`Failed to load ${feature}:`, error);
              showErrorIndicator(tabId, feature);
            }
          }
        },
        { once: false }
      ); // Don't use once, so we can show loading states
    }
  });
}

/**
 * Setup cached data fetching
 */
function setupCachedDataFetching() {
  // Override original fetch functions with cached versions

  // Cache account list
  window.getCachedAccounts = async () => {
    const cacheService =
      window.cacheService || window.CAM?.services?.cacheService;
    if (!cacheService) {
      console.warn(
        "CacheService not available, falling back to direct storage"
      );
      return await chrome.storage.local.get(["accounts"]);
    }

    return await cacheService.getOrFetch(
      "accounts:list",
      async () => {
        // Original account fetching logic
        return await chrome.storage.local.get(["accounts"]);
      },
      5 * 60 * 1000 // 5 minutes cache
    );
  };

  // Cache payment cards
  window.getCachedPaymentCards = async () => {
    const cacheService =
      window.cacheService || window.CAM?.services?.cacheService;
    if (!cacheService) {
      console.warn(
        "CacheService not available, falling back to direct storage"
      );
      return await chrome.storage.local.get(["paymentCards"]);
    }

    return await cacheService.getOrFetch(
      "payment:cards",
      async () => {
        // Original payment cards fetching logic
        return await chrome.storage.local.get(["paymentCards"]);
      },
      10 * 60 * 1000 // 10 minutes cache
    );
  };

  // Cache user profile
  window.getCachedUserProfile = async () => {
    const cacheService =
      window.cacheService || window.CAM?.services?.cacheService;
    if (!cacheService) {
      console.warn(
        "CacheService not available, falling back to direct message"
      );
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs[0];

      if (activeTab?.url?.includes("cursor.com")) {
        return await chrome.tabs.sendMessage(activeTab.id, {
          action: "getCurrentUser",
        });
      }
      return null;
    }

    return await cacheService.getOrFetch(
      "user:profile",
      async () => {
        // Original profile fetching logic
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const activeTab = tabs[0];

        if (activeTab?.url?.includes("cursor.com")) {
          return await chrome.tabs.sendMessage(activeTab.id, {
            action: "getCurrentUser",
          });
        }
        return null;
      },
      2 * 60 * 1000 // 2 minutes cache for frequently changing data
    );
  };
}

/**
 * Setup optimized DOM updates
 */
function setupOptimizedDOMUpdates() {
  // Override list update functions
  window.updateAccountsList = (accounts) => {
    const domOptimizer =
      window.domOptimizer || window.CAM?.services?.domOptimizer;
    if (!domOptimizer) {
      console.warn("DOMOptimizer not available, using direct DOM manipulation");
      const container = document.getElementById("accountsList");
      if (container) {
        container.innerHTML = accounts
          .map(
            (account) => `
          <li class="account-item">
            <div class="account-info">
              <span class="account-email">${account.email}</span>
              <span class="account-status">${account.status}</span>
            </div>
            <div class="account-actions">
              <button class="btn btn-sm" onclick="switchAccount('${account.email}')">Switch</button>
              <button class="btn btn-sm btn-danger" onclick="deleteAccount('${account.email}')">Delete</button>
            </div>
          </li>
        `
          )
          .join("");
      }
      return;
    }

    domOptimizer.updateList("accountsList", accounts, (account, index) => {
      const li = document.createElement("li");
      li.className = "account-item";
      li.innerHTML = `
          <div class="account-info">
            <span class="account-email">${account.email}</span>
            <span class="account-status">${account.status}</span>
          </div>
          <div class="account-actions">
            <button class="btn btn-sm" onclick="switchAccount('${account.email}')">Switch</button>
            <button class="btn btn-sm btn-danger" onclick="deleteAccount('${account.email}')">Delete</button>
          </div>
        `;
      return li;
    });
  };

  window.updatePaymentCardsList = (cards) => {
    const domOptimizer =
      window.domOptimizer || window.CAM?.services?.domOptimizer;
    if (!domOptimizer) {
      console.warn("DOMOptimizer not available, using direct DOM manipulation");
      const container = document.getElementById("paymentCardsList");
      if (container) {
        container.innerHTML = cards
          .map(
            (card) => `
          <li class="card-item">
            <div class="card-info">
              <span class="card-number">**** **** **** ${card.number.slice(
                -4
              )}</span>
              <span class="card-expiry">${card.expiry}</span>
            </div>
            <div class="card-actions">
              <button class="btn btn-sm" onclick="useCard('${
                card.id
              }')">Use</button>
              <button class="btn btn-sm btn-danger" onclick="deleteCard('${
                card.id
              }')">Delete</button>
            </div>
          </li>
        `
          )
          .join("");
      }
      return;
    }

    domOptimizer.updateList("paymentCardsList", cards, (card, index) => {
      const li = document.createElement("li");
      li.className = "card-item";
      li.innerHTML = `
          <div class="card-info">
            <span class="card-number">**** **** **** ${card.number.slice(
              -4
            )}</span>
            <span class="card-expiry">${card.expiry}</span>
          </div>
          <div class="card-actions">
            <button class="btn btn-sm" onclick="useCard('${
              card.id
            }')">Use</button>
            <button class="btn btn-sm btn-danger" onclick="deleteCard('${
              card.id
            }')">Delete</button>
          </div>
        `;
      return li;
    });
  };
}

/**
 * Setup performance monitoring
 */
function setupPerformanceMonitoring() {
  // Monitor performance every 30 seconds
  setInterval(() => {
    // Safe access to services
    const lazyLoader = window.lazyLoader || window.CAM?.services?.lazyLoader;
    const cacheService =
      window.cacheService || window.CAM?.services?.cacheService;
    const domOptimizer =
      window.domOptimizer || window.CAM?.services?.domOptimizer;

    const stats = {
      lazyLoader: lazyLoader?.getStats?.() || {
        error: "LazyLoader not available",
      },
      cache: cacheService?.getStats?.() || {
        error: "CacheService not available",
      },
      dom: domOptimizer?.getStats?.() || {
        error: "DOMOptimizer not available",
      },
    };

    console.log("📊 Performance Stats:", stats);

    // Store stats for debug panel
    window.performanceStats = stats;
  }, 30000);

  // Expose performance controls for debug panel
  window.performanceControls = {
    clearCache: () => {
      const cacheService =
        window.cacheService || window.CAM?.services?.cacheService;
      if (cacheService?.clear) {
        cacheService.clear();
      } else {
        console.warn("CacheService.clear not available");
      }
    },
    getStats: () => window.performanceStats,
    preloadAll: async () => {
      const lazyLoader = window.lazyLoader || window.CAM?.services?.lazyLoader;
      if (lazyLoader?.loadFeature) {
        try {
          await lazyLoader.loadFeature("generator");
          await lazyLoader.loadFeature("console");
          await lazyLoader.loadFeature("account-deletion");
        } catch (error) {
          console.error("Error preloading features:", error);
        }
      } else {
        console.warn("LazyLoader.loadFeature not available");
      }
    },
  };
}

/**
 * Loading indicators
 */
function showLoadingIndicator(tabId) {
  const tab = document.getElementById(tabId);
  if (tab) {
    const spinner = document.createElement("span");
    spinner.className = "loading-spinner";
    spinner.innerHTML = "⏳";
    spinner.id = `${tabId}-loading`;
    tab.appendChild(spinner);
  }
}

function hideLoadingIndicator(tabId) {
  const spinner = document.getElementById(`${tabId}-loading`);
  if (spinner) {
    spinner.remove();
  }
}

function showErrorIndicator(tabId, feature) {
  hideLoadingIndicator(tabId);
  const tab = document.getElementById(tabId);
  if (tab) {
    const error = document.createElement("span");
    error.className = "error-indicator";
    error.innerHTML = "❌";
    error.title = `Failed to load ${feature}`;
    tab.appendChild(error);

    // Remove after 3 seconds
    setTimeout(() => error.remove(), 3000);
  }
}

/**
 * Performance utilities for external use
 */
window.performanceUtils = {
  // Preload a specific feature
  preload: async (feature) => {
    const lazyLoader = window.lazyLoader || window.CAM?.services?.lazyLoader;
    if (lazyLoader?.loadFeature) {
      return await lazyLoader.loadFeature(feature);
    } else {
      console.warn("LazyLoader.loadFeature not available for preload");
      return false;
    }
  },

  // Invalidate cache for specific pattern
  invalidateCache: (pattern) => {
    const cacheService =
      window.cacheService || window.CAM?.services?.cacheService;
    if (cacheService?.invalidatePattern) {
      cacheService.invalidatePattern(pattern);
    } else {
      console.warn("CacheService.invalidatePattern not available");
    }
  },

  // Batch DOM updates
  batchUpdate: (elementId, updateFn, priority = 5) => {
    const domOptimizer =
      window.domOptimizer || window.CAM?.services?.domOptimizer;
    if (domOptimizer?.scheduleUpdate) {
      domOptimizer.scheduleUpdate(elementId, updateFn, priority);
    } else {
      console.warn(
        "DOMOptimizer.scheduleUpdate not available, using direct update"
      );
      const element = document.getElementById(elementId);
      if (element && updateFn) {
        try {
          updateFn(element);
        } catch (error) {
          console.error("Direct DOM update failed:", error);
        }
      }
    }
  },

  // Get current performance metrics
  getMetrics: () => {
    return {
      memory: performance.memory
        ? {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit,
          }
        : null,
      timing: performance.timing,
      navigation: performance.navigation,
    };
  },
};

// Safe initialization with retry logic
function safeInitialize() {
  // Check if essential services are available
  const hasEssentialServices =
    (window.lazyLoader || window.CAM?.services?.lazyLoader) &&
    (window.cacheService || window.CAM?.services?.cacheService) &&
    (window.domOptimizer || window.CAM?.services?.domOptimizer);

  if (hasEssentialServices) {
    console.log(
      "🚀 All essential services available, initializing performance features"
    );
    initializePerformanceFeatures();
  } else {
    console.log("⏳ Waiting for essential services to load...");
    // Retry in 500ms
    setTimeout(safeInitialize, 500);
  }
}

// Auto-initialize performance features when script loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    // Give services time to load
    setTimeout(safeInitialize, 100);
  });
} else {
  setTimeout(safeInitialize, 100);
}

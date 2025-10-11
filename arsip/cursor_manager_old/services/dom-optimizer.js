/**
 * 🎭 DOM Optimizer Service
 * Optimizes DOM manipulation for better performance
 */

class DOMOptimizer {
  constructor() {
    this.pendingUpdates = new Map();
    this.updateQueue = [];
    this.isProcessing = false;
    this.batchSize = 10;

    // Process updates in next animation frame
    this.scheduleUpdate = this.debounce(() => {
      this.processBatchUpdates();
    }, 16); // ~60fps
  }

  /**
   * Batch DOM updates to prevent layout thrashing
   * @param {string} elementId - Target element ID
   * @param {Function} updateFn - Update function
   * @param {number} priority - Update priority (1-10, 10 = highest)
   */
  scheduleUpdate(elementId, updateFn, priority = 5) {
    const update = {
      elementId,
      updateFn,
      priority,
      timestamp: Date.now(),
    };

    // Replace existing update for same element
    const existingIndex = this.updateQueue.findIndex(
      (u) => u.elementId === elementId
    );
    if (existingIndex !== -1) {
      this.updateQueue[existingIndex] = update;
    } else {
      this.updateQueue.push(update);
    }

    this.scheduleUpdate();
  }

  /**
   * Process batched updates
   */
  processBatchUpdates() {
    if (this.isProcessing || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Sort by priority (highest first)
    this.updateQueue.sort((a, b) => b.priority - a.priority);

    // Process in batches to avoid blocking
    const batch = this.updateQueue.splice(0, this.batchSize);

    requestAnimationFrame(() => {
      try {
        // Group reads and writes to minimize reflow
        const elements = new Map();

        // Batch DOM reads first
        for (const update of batch) {
          const element = document.getElementById(update.elementId);
          if (element) {
            elements.set(update.elementId, element);
          }
        }

        // Batch DOM writes
        for (const update of batch) {
          const element = elements.get(update.elementId);
          if (element) {
            try {
              update.updateFn(element);
            } catch (error) {
              console.error(
                `DOM update failed for ${update.elementId}:`,
                error
              );
            }
          }
        }

        this.isProcessing = false;

        // Continue processing if more updates pending
        if (this.updateQueue.length > 0) {
          this.processBatchUpdates();
        }
      } catch (error) {
        console.error("Batch update processing failed:", error);
        this.isProcessing = false;
      }
    });
  }

  /**
   * Efficiently update list elements
   * @param {string} containerId - Container element ID
   * @param {Array} items - Array of items to render
   * @param {Function} renderFn - Function to render each item
   */
  updateList(containerId, items, renderFn) {
    this.scheduleUpdate(
      containerId,
      (container) => {
        // Use DocumentFragment for efficient DOM manipulation
        const fragment = document.createDocumentFragment();

        // Clear existing content
        container.innerHTML = "";

        // Render items into fragment
        items.forEach((item, index) => {
          try {
            const element = renderFn(item, index);
            if (element) {
              fragment.appendChild(element);
            }
          } catch (error) {
            console.error(`Failed to render item ${index}:`, error);
          }
        });

        // Single DOM update
        container.appendChild(fragment);
      },
      8
    ); // High priority for list updates
  }

  /**
   * Virtual scrolling for large lists
   * @param {string} containerId - Container element ID
   * @param {Array} items - All items
   * @param {Function} renderFn - Render function
   * @param {number} itemHeight - Height of each item
   * @param {number} visibleCount - Number of visible items
   */
  createVirtualList(
    containerId,
    items,
    renderFn,
    itemHeight = 50,
    visibleCount = 10
  ) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let scrollTop = 0;
    const totalHeight = items.length * itemHeight;

    // Create viewport
    container.style.height = `${visibleCount * itemHeight}px`;
    container.style.overflow = "auto";
    container.style.position = "relative";

    const updateVisible = () => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleCount + 2, items.length);

      const visibleItems = items.slice(startIndex, endIndex);

      // Create wrapper with proper height
      const wrapper = document.createElement("div");
      wrapper.style.height = `${totalHeight}px`;
      wrapper.style.position = "relative";

      // Render visible items
      visibleItems.forEach((item, index) => {
        const element = renderFn(item, startIndex + index);
        element.style.position = "absolute";
        element.style.top = `${(startIndex + index) * itemHeight}px`;
        element.style.width = "100%";
        element.style.height = `${itemHeight}px`;
        wrapper.appendChild(element);
      });

      container.innerHTML = "";
      container.appendChild(wrapper);
    };

    // Handle scroll
    container.addEventListener(
      "scroll",
      this.throttle((e) => {
        scrollTop = e.target.scrollTop;
        updateVisible();
      }, 16)
    );

    // Initial render
    updateVisible();
  }

  /**
   * Optimize form updates
   * @param {string} formId - Form element ID
   * @param {object} data - Form data
   */
  updateForm(formId, data) {
    this.scheduleUpdate(
      formId,
      (form) => {
        // Batch form field updates
        const updates = [];

        for (const [key, value] of Object.entries(data)) {
          const field = form.querySelector(`[name="${key}"]`);
          if (field) {
            updates.push(() => {
              if (field.type === "checkbox" || field.type === "radio") {
                field.checked = value;
              } else {
                field.value = value;
              }
            });
          }
        }

        // Apply all updates at once
        updates.forEach((update) => update());
      },
      7
    );
  }

  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in ms
   * @returns {Function} Throttled function
   */
  throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Cleanup event listeners to prevent memory leaks
   * @param {Element} element - Element to cleanup
   */
  cleanup(element) {
    if (element && element.parentNode) {
      // Clone element to remove all event listeners
      const clone = element.cloneNode(true);
      element.parentNode.replaceChild(clone, element);
    }
  }

  /**
   * Get performance statistics
   * @returns {object} Performance stats
   */
  getStats() {
    return {
      pendingUpdates: this.updateQueue.length,
      isProcessing: this.isProcessing,
      batchSize: this.batchSize,
      memoryUsage: this.getMemoryUsage(),
    };
  }

  /**
   * Get approximate memory usage
   * @returns {string} Memory usage
   */
  getMemoryUsage() {
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      return `${(used / 1024 / 1024).toFixed(2)} MB`;
    }
    return "N/A";
  }
}

// Global instance
window.domOptimizer = new DOMOptimizer();

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = DOMOptimizer;
}

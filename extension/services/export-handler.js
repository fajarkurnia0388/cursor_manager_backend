// Export Handler for Bypass Testing Results
// Saves results to the extension's result folder

class ExportHandler {
  constructor() {
    this.resultPath = "result/";
  }

  /**
   * Export results to JSON file
   * @param {Object} results - Test results to export
   * @returns {Promise<Object>} Export status
   */
  async exportResults(results) {
    try {
      // Add metadata
      const exportData = {
        ...results,
        exportedAt: new Date().toISOString(),
        version: "1.0.0",
        status: "Under Development",
        environment: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        },
      };

      // Generate filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .slice(0, -5);

      const domain = this.extractDomain(results.targetUrl || "unknown");
      const filename = `bypass-test_${domain}_${timestamp}.json`;

      // Create blob
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      // For Chrome extensions, we need to use the downloads API
      // to save to a specific folder
      if (chrome && chrome.downloads) {
        // Use Chrome downloads API (requires permission)
        const url = URL.createObjectURL(blob);

        try {
          const downloadId = await chrome.downloads.download({
            url: url,
            filename: `Sidebar_C_Manager/result/${filename}`,
            saveAs: false,
            conflictAction: "uniquify",
          });

          console.log(`✅ Results exported to: result/${filename}`);
          URL.revokeObjectURL(url);

          return {
            success: true,
            filename: filename,
            downloadId: downloadId,
            path: `result/${filename}`,
          };
        } catch (downloadError) {
          // If downloads API fails, fall back to regular download
          console.warn(
            "Chrome downloads API failed, using fallback:",
            downloadError
          );
          URL.revokeObjectURL(url);
        }
      }

      // Fallback: Regular download (will go to default Downloads folder)
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`📥 Results downloaded as: ${filename}`);
      console.log(
        "ℹ️ Note: File saved to default Downloads folder. Move to project/result/ folder if needed."
      );

      return {
        success: true,
        filename: filename,
        method: "fallback",
        note: "Saved to Downloads folder",
      };
    } catch (error) {
      console.error("❌ Export failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract domain from URL
   * @param {string} url - Full URL
   * @returns {string} Domain name
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/\./g, "_");
    } catch {
      return "unknown";
    }
  }

  /**
   * Save results to IndexedDB for persistence
   * @param {Object} results - Test results
   * @returns {Promise<boolean>} Save status
   */
  async saveToStorage(results) {
    try {
      const storageKey = `bypass_results_${Date.now()}`;

      // Save to chrome.storage.local
      await chrome.storage.local.set({
        [storageKey]: {
          ...results,
          savedAt: new Date().toISOString(),
        },
      });

      // Keep only last 10 results
      await this.cleanupOldResults();

      return true;
    } catch (error) {
      console.error("Failed to save to storage:", error);
      return false;
    }
  }

  /**
   * Clean up old results from storage
   */
  async cleanupOldResults() {
    try {
      const storage = await chrome.storage.local.get();
      const resultKeys = Object.keys(storage)
        .filter((key) => key.startsWith("bypass_results_"))
        .sort()
        .reverse();

      // Keep only last 10 results
      if (resultKeys.length > 10) {
        const keysToRemove = resultKeys.slice(10);
        await chrome.storage.local.remove(keysToRemove);
        console.log(`Cleaned up ${keysToRemove.length} old results`);
      }
    } catch (error) {
      console.error("Cleanup failed:", error);
    }
  }

  /**
   * Get all saved results
   * @returns {Promise<Array>} Array of saved results
   */
  async getSavedResults() {
    try {
      const storage = await chrome.storage.local.get();
      const results = [];

      for (const [key, value] of Object.entries(storage)) {
        if (key.startsWith("bypass_results_")) {
          results.push({
            id: key,
            ...value,
          });
        }
      }

      // Sort by saved date (newest first)
      results.sort((a, b) => {
        const dateA = new Date(a.savedAt || 0);
        const dateB = new Date(b.savedAt || 0);
        return dateB - dateA;
      });

      return results;
    } catch (error) {
      console.error("Failed to get saved results:", error);
      return [];
    }
  }

  /**
   * Generate CSV export
   * @param {Object} results - Test results
   * @returns {string} CSV content
   */
  generateCSV(results) {
    const rows = [
      ["Bypass Security Test Results"],
      ["Generated:", new Date().toISOString()],
      ["Status:", "Under Development"],
      ["Target URL:", results.targetUrl || "N/A"],
      [""],
      ["Technique", "Status", "Tests Run", "Success", "Failed", "Description"],
    ];

    if (results.techniques) {
      results.techniques.forEach((tech) => {
        rows.push([
          tech.name || "Unknown",
          tech.status || "N/A",
          tech.testsRun || 0,
          tech.success || 0,
          tech.failed || 0,
          tech.description || "",
        ]);
      });
    }

    rows.push([""]);
    rows.push(["Summary"]);
    rows.push(["Total Tests:", results.summary?.total || 0]);
    rows.push(["Successful:", results.summary?.successful || 0]);
    rows.push(["Failed:", results.summary?.failed || 0]);
    rows.push(["Success Rate:", `${results.summary?.successRate || 0}%`]);

    // Convert to CSV string
    return rows
      .map((row) =>
        row
          .map((cell) => {
            // Escape quotes and wrap in quotes if contains comma
            const str = String(cell);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      )
      .join("\n");
  }

  /**
   * Export results as CSV
   * @param {Object} results - Test results
   * @returns {Promise<Object>} Export status
   */
  async exportAsCSV(results) {
    try {
      const csvContent = this.generateCSV(results);
      const blob = new Blob([csvContent], { type: "text/csv" });

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .slice(0, -5);

      const domain = this.extractDomain(results.targetUrl || "unknown");
      const filename = `bypass-test_${domain}_${timestamp}.csv`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return {
        success: true,
        filename: filename,
        format: "CSV",
      };
    } catch (error) {
      console.error("CSV export failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = ExportHandler;
} else {
  // Works in both window and service worker contexts
  const globalThis = (function () {
    if (typeof window !== "undefined") return window;
    if (typeof self !== "undefined") return self;
    if (typeof global !== "undefined") return global;
    throw new Error("Unable to locate global object");
  })();
  globalThis.ExportHandler = ExportHandler;
}

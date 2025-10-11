/**
 * Backend UI Component - Status indicator dan controls
 */

class BackendUI {
  constructor() {
    this.backend = new BackendService();
    this.adapter = null; // Will be set externally
    this.statusCheckInterval = null;
    this.isInitialized = false;
  }

  /**
   * Initialize backend UI
   */
  async initialize() {
    if (this.isInitialized) return;

    // Create status panel
    this.createStatusPanel();

    // Start status monitoring
    await this.updateStatus();
    this.startStatusMonitoring();

    this.isInitialized = true;
    console.log("[Backend UI] Initialized");
  }

  /**
   * Create status panel HTML
   */
  createStatusPanel() {
    // Check if panel already exists
    if (document.getElementById("backend-status-panel")) {
      return;
    }

    const panel = document.createElement("div");
    panel.id = "backend-status-panel";
    panel.className = "backend-status-panel";
    panel.innerHTML = `
            <div class="backend-status-header">
                <span class="backend-status-icon">●</span>
                <span class="backend-status-text">Checking backend...</span>
                <button class="backend-status-toggle" title="Toggle backend details">▼</button>
            </div>
            <div class="backend-status-details" style="display: none;">
                <div class="backend-status-info">
                    <div class="status-row">
                        <span class="label">Mode:</span>
                        <span class="value" id="backend-mode">-</span>
                    </div>
                    <div class="status-row">
                        <span class="label">Version:</span>
                        <span class="value" id="backend-version">-</span>
                    </div>
                    <div class="status-row">
                        <span class="label">Requests:</span>
                        <span class="value" id="backend-requests">0</span>
                    </div>
                    <div class="status-row">
                        <span class="label">Database:</span>
                        <span class="value" id="backend-database">-</span>
                    </div>
                </div>
                <div class="backend-status-actions">
                    <button class="btn-small" id="backend-reconnect">Reconnect</button>
                    <button class="btn-small" id="backend-migrate">Migrate Data</button>
                    <button class="btn-small" id="backend-settings">Settings</button>
                </div>
            </div>
        `;

    // Add to page
    const container =
      document.querySelector(".sidebar-container") || document.body;
    container.insertBefore(panel, container.firstChild);

    // Add styles
    this.addStyles();

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Add CSS styles
   */
  addStyles() {
    if (document.getElementById("backend-ui-styles")) return;

    const style = document.createElement("style");
    style.id = "backend-ui-styles";
    style.textContent = `
            .backend-status-panel {
                background: #1e1e1e;
                border-bottom: 1px solid #333;
                padding: 8px 12px;
                font-size: 12px;
            }

            .backend-status-header {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                user-select: none;
            }

            .backend-status-icon {
                font-size: 10px;
                transition: color 0.3s;
            }

            .backend-status-icon.connected {
                color: #4caf50;
            }

            .backend-status-icon.disconnected {
                color: #f44336;
            }

            .backend-status-icon.fallback {
                color: #ff9800;
            }

            .backend-status-text {
                flex: 1;
                color: #ccc;
            }

            .backend-status-toggle {
                background: none;
                border: none;
                color: #888;
                cursor: pointer;
                padding: 4px;
                font-size: 10px;
                transition: transform 0.2s;
            }

            .backend-status-toggle.expanded {
                transform: rotate(180deg);
            }

            .backend-status-details {
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid #333;
            }

            .backend-status-info {
                margin-bottom: 8px;
            }

            .status-row {
                display: flex;
                justify-content: space-between;
                padding: 2px 0;
                color: #999;
            }

            .status-row .label {
                font-weight: 500;
            }

            .status-row .value {
                color: #ccc;
            }

            .backend-status-actions {
                display: flex;
                gap: 4px;
                margin-top: 8px;
            }

            .btn-small {
                flex: 1;
                padding: 4px 8px;
                font-size: 11px;
                background: #333;
                border: 1px solid #444;
                color: #ccc;
                border-radius: 3px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .btn-small:hover {
                background: #444;
            }

            .btn-small:active {
                background: #222;
            }
            
            /* Spinner animation for install progress */
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
    document.head.appendChild(style);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Toggle details
    const header = document.querySelector(".backend-status-header");
    const toggle = document.querySelector(".backend-status-toggle");
    const details = document.querySelector(".backend-status-details");

    if (header && toggle && details) {
      header.addEventListener("click", () => {
        const isExpanded = details.style.display !== "none";
        details.style.display = isExpanded ? "none" : "block";
        toggle.classList.toggle("expanded", !isExpanded);
      });
    }

    // Reconnect button
    const reconnectBtn = document.getElementById("backend-reconnect");
    if (reconnectBtn) {
      reconnectBtn.addEventListener("click", async () => {
        reconnectBtn.disabled = true;
        reconnectBtn.textContent = "Reconnecting...";

        try {
          await this.backend.disconnect();
          await this.backend.connect();
          await this.updateStatus();
          this.showNotification("Reconnected successfully", "success");
        } catch (error) {
          // Check if backend is not installed
          if (
            error.message.includes("not found") ||
            error.message.includes("not available")
          ) {
            this.showBackendNotInstalledDialog();
          } else {
            this.showNotification(
              "Reconnection failed: " + error.message,
              "error"
            );
          }
        }

        reconnectBtn.disabled = false;
        reconnectBtn.textContent = "Reconnect";
      });
    }

    // Migrate button
    const migrateBtn = document.getElementById("backend-migrate");
    if (migrateBtn) {
      migrateBtn.addEventListener("click", () => {
        this.showMigrationDialog();
      });
    }

    // Settings button
    const settingsBtn = document.getElementById("backend-settings");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        this.showSettingsDialog();
      });
    }
  }

  /**
   * Update status display
   */
  async updateStatus() {
    try {
      const statusIcon = document.querySelector(".backend-status-icon");
      const statusText = document.querySelector(".backend-status-text");

      if (!statusIcon || !statusText) {
        console.warn("[Backend UI] Status elements not found");
        return;
      }

      // Try to connect and ping
      let isAvailable = false;
      try {
        isAvailable = await this.backend.isAvailable();
      } catch (error) {
        console.log("[Backend UI] Backend not available:", error.message);
        isAvailable = false;
      }

      const backendStatus = this.backend.getStatus();

      if (isAvailable && backendStatus.connected) {
        // Connected to backend
        statusIcon.className = "backend-status-icon connected";
        statusText.textContent = "Backend: Connected";

        // Get version info
        try {
          const version = await this.backend.getVersion();
          const modeEl = document.getElementById("backend-mode");
          const versionEl = document.getElementById("backend-version");
          const dbEl = document.getElementById("backend-database");

          if (modeEl) modeEl.textContent = "Native Backend";
          if (versionEl) versionEl.textContent = version.version || "-";
          if (dbEl) dbEl.textContent = `Schema v${version.schema_version || 0}`;
        } catch (error) {
          console.error("[Backend UI] Error getting version:", error);
        }
      } else {
        // Fallback to local storage
        statusIcon.className = "backend-status-icon fallback";
        statusText.textContent = "Backend: Local Storage";

        const modeEl = document.getElementById("backend-mode");
        const versionEl = document.getElementById("backend-version");
        const dbEl = document.getElementById("backend-database");

        if (modeEl) modeEl.textContent = "Chrome Storage (Fallback)";
        if (versionEl) versionEl.textContent = "N/A";
        if (dbEl) dbEl.textContent = "Browser Storage";
      }

      // Update request count
      const requestsEl = document.getElementById("backend-requests");
      if (requestsEl) {
        requestsEl.textContent = backendStatus.pendingRequests || 0;
      }
    } catch (error) {
      // Error state
      const statusIcon = document.querySelector(".backend-status-icon");
      const statusText = document.querySelector(".backend-status-text");

      if (statusIcon) statusIcon.className = "backend-status-icon disconnected";
      if (statusText) statusText.textContent = "Backend: Error";

      console.error("[Backend UI] Status update error:", error);
    }
  }

  /**
   * Start periodic status monitoring
   */
  startStatusMonitoring() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }

    // Update every 10 seconds
    this.statusCheckInterval = setInterval(() => {
      this.updateStatus();
    }, 10000);
  }

  /**
   * Stop status monitoring
   */
  stopStatusMonitoring() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  /**
   * Show migration dialog
   */
  showMigrationDialog() {
    // Create modal
    const modal = document.createElement("div");
    modal.className = "backend-modal";
    modal.innerHTML = `
            <div class="backend-modal-content">
                <h3>Migrate to Backend</h3>
                <p>This will copy all accounts and cards from Chrome Storage to the Python backend.</p>
                <div class="migration-options">
                    <label>
                        <input type="checkbox" id="migration-accounts" checked>
                        Migrate Accounts
                    </label>
                    <label>
                        <input type="checkbox" id="migration-cards" checked>
                        Migrate Payment Cards
                    </label>
                </div>
                <div class="modal-actions">
                    <button class="btn-cancel" id="migration-cancel">Cancel</button>
                    <button class="btn-primary" id="migration-start">Start Migration</button>
                </div>
                <div class="migration-progress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <p class="progress-text">Preparing...</p>
                </div>
                <div class="migration-results" style="display: none;">
                    <div class="results-content"></div>
                    <button class="btn-primary" id="migration-close" style="margin-top: 12px; width: 100%;">Close</button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Event listeners
    document
      .getElementById("migration-cancel")
      .addEventListener("click", () => {
        modal.remove();
      });

    document
      .getElementById("migration-start")
      .addEventListener("click", async () => {
        await this.startMigration(modal);
      });
  }

  /**
   * Start migration process
   */
  async startMigration(modal) {
    const migrateAccounts =
      document.getElementById("migration-accounts").checked;
    const migrateCards = document.getElementById("migration-cards").checked;

    if (!migrateAccounts && !migrateCards) {
      this.showNotification("Please select at least one option", "error");
      return;
    }

    // Hide options, show progress
    modal.querySelector(".migration-options").style.display = "none";
    modal.querySelector(".modal-actions").style.display = "none";
    modal.querySelector(".migration-progress").style.display = "block";

    const progressBar = modal.querySelector(".progress-fill");
    const progressText = modal.querySelector(".progress-text");

    try {
      const migrationService = new MigrationService();
      const results = {
        accounts: null,
        cards: null,
      };

      // Migrate accounts
      if (migrateAccounts) {
        progressText.textContent = "Migrating accounts...";
        progressBar.style.width = "25%";

        results.accounts = await migrationService.migrateAccounts();

        progressBar.style.width = "50%";
      }

      // Migrate cards
      if (migrateCards) {
        progressText.textContent = "Migrating payment cards...";
        progressBar.style.width = "75%";

        results.cards = await migrationService.migrateCards();

        progressBar.style.width = "100%";
      }

      // Show results
      progressText.textContent = "Migration complete!";

      setTimeout(() => {
        this.showMigrationResults(modal, results);
      }, 500);
    } catch (error) {
      progressText.textContent = "Migration failed!";
      this.showNotification("Migration error: " + error.message, "error");

      setTimeout(() => {
        modal.remove();
      }, 2000);
    }
  }

  /**
   * Show migration results
   */
  showMigrationResults(modal, results) {
    // Hide progress
    modal.querySelector(".migration-progress").style.display = "none";

    // Build results HTML
    let html =
      '<h4 style="margin-top: 0; color: #4caf50;">Migration Complete!</h4>';

    if (results.accounts) {
      html += `
                <div class="result-section">
                    <strong>Accounts:</strong>
                    <ul>
                        <li>Total: ${results.accounts.total}</li>
                        <li style="color: #4caf50;">Success: ${
                          results.accounts.completed
                        }</li>
                        ${
                          results.accounts.failed > 0
                            ? `<li style="color: #f44336;">Failed: ${results.accounts.failed}</li>`
                            : ""
                        }
                    </ul>
                </div>
            `;
    }

    if (results.cards) {
      html += `
                <div class="result-section">
                    <strong>Payment Cards:</strong>
                    <ul>
                        <li>Total: ${results.cards.total}</li>
                        <li style="color: #4caf50;">Success: ${
                          results.cards.completed
                        }</li>
                        ${
                          results.cards.failed > 0
                            ? `<li style="color: #f44336;">Failed: ${results.cards.failed}</li>`
                            : ""
                        }
                    </ul>
                </div>
            `;
    }

    // Show errors if any
    const allErrors = [
      ...(results.accounts?.errors || []),
      ...(results.cards?.errors || []),
    ];

    if (allErrors.length > 0) {
      html += `
                <div class="result-section" style="color: #f44336;">
                    <strong>Errors:</strong>
                    <ul style="max-height: 150px; overflow-y: auto; font-size: 11px;">
                        ${allErrors
                          .map(
                            (e) => `<li>${e.account || e.card}: ${e.error}</li>`
                          )
                          .join("")}
                    </ul>
                </div>
            `;
    }

    html +=
      '<p style="margin-top: 12px; color: #4caf50; font-size: 12px;">✓ Data successfully migrated to backend database</p>';

    // Show results
    const resultsDiv = modal.querySelector(".migration-results");
    resultsDiv.querySelector(".results-content").innerHTML = html;
    resultsDiv.style.display = "block";

    // Close button
    document.getElementById("migration-close").addEventListener("click", () => {
      modal.remove();
      this.showNotification("Migration complete!", "success");
      // Refresh UI
      if (window.location.reload) {
        window.location.reload();
      }
    });
  }

  /**
   * Show backend not installed dialog
   */
  showBackendNotInstalledDialog() {
    const modal = document.createElement("div");
    modal.className = "backend-modal";
    modal.innerHTML = `
            <div class="backend-modal-content" style="max-width: 600px;">
                <h3>⚠️ Backend Not Installed</h3>
                <p>Python backend belum terinstall atau tidak running.</p>
                
                <div class="installation-methods" style="margin: 16px 0;">
                    <h4 style="margin: 0 0 12px 0; color: #4caf50;">🚀 Quick Installation:</h4>
                    
                    <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                        <button class="btn-primary" id="btn-auto-install" style="flex: 1;">
                            📦 Auto Install Backend
                        </button>
                        <button class="btn-secondary" id="btn-open-installer" style="flex: 1;">
                            📂 Open Install Folder
                        </button>
                    </div>
                    
                    <div id="install-progress" style="display: none; background: #1e1e1e; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <div class="spinner" style="width: 16px; height: 16px; border: 2px solid #333; border-top-color: #4caf50; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                            <span id="install-status-text">Installing backend...</span>
                        </div>
                        <pre id="install-log" style="background: #000; color: #0f0; padding: 8px; border-radius: 4px; max-height: 150px; overflow-y: auto; font-size: 11px; margin: 0;"></pre>
                    </div>
                </div>
                
                <details style="background: #1e1e1e; padding: 12px; border-radius: 4px; margin: 16px 0;">
                    <summary style="cursor: pointer; color: #4caf50; font-weight: bold; user-select: none;">
                        📖 Manual Installation Steps
                    </summary>
                    <ol style="margin: 12px 0 0 0; padding-left: 20px; line-height: 1.8;">
                        <li>Ensure Python 3.8+ is installed: <code style="background: #333; padding: 2px 6px; border-radius: 2px;">python --version</code></li>
                        <li>Navigate to extension folder (right-click extension → "Manage extension" → "Details" → check "Extension ID")</li>
                        <li>Open terminal/command prompt in extension folder</li>
                        <li>Run: <code style="background: #333; padding: 2px 6px; border-radius: 2px;">cd backend && python install.py</code></li>
                        <li>Follow the installer prompts (enter extension ID when asked)</li>
                        <li>Reload this extension</li>
                        <li>Click "Reconnect" button</li>
                    </ol>
                </details>
                
                <div style="background: #2a2a2a; padding: 12px; border-radius: 4px; margin: 16px 0; border-left: 3px solid #ff9800;">
                    <p style="margin: 0; color: #ff9800; font-size: 13px;">
                        <strong>Note:</strong> Extension tetap berfungsi normal menggunakan Chrome Storage sebagai fallback.
                    </p>
                </div>
                
                <div style="background: #1e3a1e; padding: 12px; border-radius: 4px; margin: 16px 0; border-left: 3px solid #4caf50;">
                    <p style="margin: 0; color: #4caf50; font-size: 12px;">
                        <strong>Extension ID:</strong> <code style="background: #333; padding: 2px 6px; border-radius: 2px;" id="copy-ext-id">${chrome.runtime.id}</code>
                        <button class="btn-small" id="btn-copy-id" style="margin-left: 8px; padding: 2px 8px;">Copy</button>
                    </p>
                </div>
                
                <div class="modal-actions" style="gap: 8px;">
                    <button class="btn-primary" id="notinstalled-retry">🔄 Retry Connection</button>
                    <button class="btn-secondary" id="notinstalled-close">Close</button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Event listeners
    document
      .getElementById("notinstalled-close")
      .addEventListener("click", () => {
        modal.remove();
      });

    // Retry connection button
    document
      .getElementById("notinstalled-retry")
      .addEventListener("click", async () => {
        const retryBtn = document.getElementById("notinstalled-retry");
        retryBtn.disabled = true;
        retryBtn.textContent = "🔄 Connecting...";

        try {
          await this.backend.connect();
          await this.updateStatus();

          if (this.backend.isConnected) {
            this.showNotification(
              "✅ Backend connected successfully!",
              "success"
            );
            modal.remove();
          } else {
            throw new Error("Connection failed");
          }
        } catch (error) {
          this.showNotification(
            "❌ Connection failed: " + error.message,
            "error"
          );
        }

        retryBtn.disabled = false;
        retryBtn.textContent = "🔄 Retry Connection";
      });

    // Copy extension ID button
    document.getElementById("btn-copy-id").addEventListener("click", () => {
      const extId = chrome.runtime.id;
      navigator.clipboard.writeText(extId).then(() => {
        const btn = document.getElementById("btn-copy-id");
        const originalText = btn.textContent;
        btn.textContent = "✓ Copied!";
        btn.style.background = "#4caf50";
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = "";
        }, 2000);
      });
    });

    // Auto-install button
    document
      .getElementById("btn-auto-install")
      .addEventListener("click", () => {
        this.autoInstallBackend();
      });

    // Open installer folder button
    document
      .getElementById("btn-open-installer")
      .addEventListener("click", () => {
        this.openInstallerFolder();
      });
  }

  /**
   * Auto-install backend (generates install script and downloads it)
   */
  async autoInstallBackend() {
    const progressDiv = document.getElementById("install-progress");
    const statusText = document.getElementById("install-status-text");
    const logPre = document.getElementById("install-log");
    const installBtn = document.getElementById("btn-auto-install");

    // Show progress UI
    progressDiv.style.display = "block";
    installBtn.disabled = true;
    installBtn.textContent = "⏳ Generating installer...";

    const log = (msg) => {
      logPre.textContent += msg + "\n";
      logPre.scrollTop = logPre.scrollHeight;
    };

    try {
      log("[1/4] Generating installation script...");

      const extensionId = chrome.runtime.id;
      const extensionPath = chrome.runtime.getURL("");

      // Create a batch/shell script that user can run
      const isWindows = navigator.platform.toLowerCase().includes("win");
      const scriptContent = isWindows
        ? this.generateWindowsInstallScript(extensionId, extensionPath)
        : this.generateUnixInstallScript(extensionId, extensionPath);

      const filename = isWindows ? "install_backend.bat" : "install_backend.sh";

      log("[2/4] ✓ Script generated: " + filename);
      log("[3/4] Downloading installer...");

      // Create blob and download
      const blob = new Blob([scriptContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      // Use Chrome downloads API
      chrome.downloads.download(
        {
          url: url,
          filename: filename,
          saveAs: true,
        },
        (downloadId) => {
          if (downloadId) {
            log("[4/4] ✓ Download complete!");
            log("\n📖 Next Steps:");
            log("1. Open the downloaded file: " + filename);
            if (isWindows) {
              log("2. Right-click → 'Run as Administrator'");
            } else {
              log("2. Run: chmod +x " + filename + " && ./" + filename);
            }
            log("3. Follow the prompts");
            log("4. Reload this extension");
            log("5. Click 'Retry Connection' button");

            statusText.textContent = "✅ Installer Downloaded!";
            statusText.style.color = "#4caf50";

            this.showNotification(
              "✅ Installation script downloaded!\n" +
                "Please run the script and reload the extension.",
              "success"
            );

            // Clean up blob URL
            setTimeout(() => URL.revokeObjectURL(url), 100);
          } else {
            throw new Error("Download failed");
          }
        }
      );
    } catch (error) {
      log("❌ Error: " + error.message);
      statusText.textContent = "❌ Generation Failed";
      statusText.style.color = "#f44336";

      log("\n📖 Manual Installation:");
      log("1. Navigate to extension folder");
      log("2. Right-click extension icon → 'Manage extension'");
      log("3. Check 'Extension path' in details");
      log("4. Open terminal in that folder");
      log("5. Run: cd backend && python install.py");
      log("6. Enter Extension ID: " + chrome.runtime.id);
      log("7. Reload extension and retry");

      this.showNotification(
        "❌ Script generation failed. Please install manually.",
        "error"
      );
    } finally {
      installBtn.disabled = false;
      installBtn.textContent = "📦 Auto Install Backend";
    }
  }

  /**
   * Generate Windows batch install script
   */
  generateWindowsInstallScript(extensionId, extensionPath) {
    return `@echo off
echo ========================================
echo  Cursor Manager Backend Installer
echo ========================================
echo.
echo Extension ID: ${extensionId}
echo Extension Path: ${extensionPath}
echo.

REM Check Python installation
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found!
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    pause
    exit /b 1
)
echo OK: Python found
echo.

REM Navigate to extension backend folder
echo [2/5] Navigating to backend folder...
echo Please enter the full path to your extension folder:
echo (Example: C:\\Users\\YourName\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions\\${extensionId}\\...)
set /p EXTENSION_PATH="Extension path: "

if not exist "%EXTENSION_PATH%\\backend" (
    echo ERROR: Backend folder not found at: %EXTENSION_PATH%\\backend
    pause
    exit /b 1
)

cd /d "%EXTENSION_PATH%\\backend"
echo OK: Backend folder found
echo.

REM Run installer
echo [3/5] Running install.py...
python install.py --auto --extension-id="${extensionId}"
if %errorlevel% neq 0 (
    echo ERROR: Installation failed
    pause
    exit /b 1
)
echo.

echo [4/5] Verifying installation...
if exist "%USERPROFILE%\\.cursor_manager\\native_host.bat" (
    echo OK: Native host installed
) else (
    echo WARNING: Native host not found, please check installation
)
echo.

echo [5/5] Installation complete!
echo.
echo ========================================
echo  Installation Successful!
echo ========================================
echo.
echo Next steps:
echo 1. Reload the Chrome extension
echo 2. Click "Retry Connection" in the extension
echo 3. You should see "Backend Connected" status
echo.
pause
`;
  }

  /**
   * Generate Unix (macOS/Linux) shell install script
   */
  generateUnixInstallScript(extensionId, extensionPath) {
    return `#!/bin/bash
echo "========================================"
echo "  Cursor Manager Backend Installer"
echo "========================================"
echo ""
echo "Extension ID: ${extensionId}"
echo "Extension Path: ${extensionPath}"
echo ""

# Check Python installation
echo "[1/5] Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 not found!"
    echo "Please install Python 3.8+ from https://www.python.org/downloads/"
    exit 1
fi
echo "OK: Python found"
echo ""

# Navigate to extension backend folder
echo "[2/5] Navigating to backend folder..."
echo "Please enter the full path to your extension folder:"
read -p "Extension path: " EXTENSION_PATH

if [ ! -d "$EXTENSION_PATH/backend" ]; then
    echo "ERROR: Backend folder not found at: $EXTENSION_PATH/backend"
    exit 1
fi

cd "$EXTENSION_PATH/backend"
echo "OK: Backend folder found"
echo ""

# Run installer
echo "[3/5] Running install.py..."
python3 install.py --auto --extension-id="${extensionId}"
if [ $? -ne 0 ]; then
    echo "ERROR: Installation failed"
    exit 1
fi
echo ""

echo "[4/5] Verifying installation..."
if [ -f "$HOME/.cursor_manager/native_host.sh" ]; then
    echo "OK: Native host installed"
else
    echo "WARNING: Native host not found, please check installation"
fi
echo ""

echo "[5/5] Installation complete!"
echo ""
echo "========================================"
echo "  Installation Successful!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Reload the Chrome extension"
echo "2. Click 'Retry Connection' in the extension"
echo "3. You should see 'Backend Connected' status"
echo ""
`;
  }

  /**
   * Open installer folder in file explorer
   */
  openInstallerFolder() {
    // Use Native Messaging to open folder
    chrome.runtime.sendMessage(
      {
        type: "OPEN_FOLDER",
        payload: {
          path: "backend",
        },
      },
      (response) => {
        if (response && response.success) {
          this.showNotification("📂 Opened backend folder", "success");
        } else {
          // Fallback: show instructions
          this.showNotification(
            "Please navigate to the extension folder manually.\n" +
              "Right-click extension → Manage → Details → Check path",
            "info"
          );
        }
      }
    );
  }

  /**
   * Show settings dialog
   */
  showSettingsDialog() {
    // Create modal
    const modal = document.createElement("div");
    modal.className = "backend-modal";
    modal.innerHTML = `
            <div class="backend-modal-content">
                <h3>Backend Settings</h3>
                <div class="settings-group">
                    <label>
                        <input type="checkbox" id="setting-auto-connect" checked>
                        Auto-connect on startup
                    </label>
                    <label>
                        <input type="checkbox" id="setting-auto-backup">
                        Enable auto-backup (daily)
                    </label>
                </div>
                <div class="settings-info">
                    <p><strong>Database Location:</strong></p>
                    <code>~/cursor_manager/data.db</code>
                    <p><strong>Logs Location:</strong></p>
                    <code>~/cursor_manager/logs/backend.log</code>
                </div>
                <div class="modal-actions">
                    <button class="btn-cancel" id="settings-cancel">Cancel</button>
                    <button class="btn-primary" id="settings-save">Save</button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Event listeners
    document.getElementById("settings-cancel").addEventListener("click", () => {
      modal.remove();
    });

    document.getElementById("settings-save").addEventListener("click", () => {
      // TODO: Save settings
      this.showNotification("Settings saved", "success");
      modal.remove();
    });
  }

  /**
   * Show notification
   */
  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `backend-notification backend-notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.classList.add("fade-out");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopStatusMonitoring();
    this.isInitialized = false;
  }
}

// Export for use in sidepanel
if (typeof window !== "undefined") {
  window.BackendUI = BackendUI;
}

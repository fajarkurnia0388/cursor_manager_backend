// Cursor Account Manager - Sidebar Script

class CursorAccountSidebar {
  constructor() {
    this.accounts = [];
    this.activeAccount = null;
    this.infoUpdated = false;
    this.paymentCards = [];
    this.currentTab = "accounts";
    this.selectedCards = new Set();
    this.cardFilters = {
      search: "",
      type: "",
    };
    this.accountFilters = {
      search: "",
      status: "",
    };
    // Database viewer properties
    this.databaseAccounts = [];
    this.currentDbView = "table";
    this.isDatabaseViewActive = false;
    this.isCardsTableViewActive = false;
    this.init();
  }

  async init() {
    try {
      console.log("🔥 CursorAccountSidebar initializing...");

      // Setup event listeners first
      this.setupEventListeners();
      console.log("✅ Event listeners setup completed");

      // Setup database viewer listeners
      this.setupDatabaseViewerListeners();
      console.log("✅ Database viewer listeners setup completed");

      // Setup message listener for bypass results
      this.setupMessageListener();
      console.log("✅ Message listener setup completed");

      // Load accounts and active account
      await this.loadAccounts();
      console.log("✅ Accounts loaded");

      // Update UI
      this.updateUI();
      console.log("✅ UI updated");

      // Check auto-sync status
      await this.updateAutoSyncStatus();
      console.log("✅ Auto-sync status checked");

      console.log(
        "🎉 CursorAccountSidebar initialization completed successfully!"
      );
    } catch (error) {
      console.error("❌ Error during initialization:", error);
      // Still try to setup basic event listeners even if other parts fail
      try {
        this.setupEventListeners();
        console.log("🔧 Basic event listeners setup as fallback");
      } catch (setupError) {
        console.error(
          "❌ Critical error: Cannot setup event listeners:",
          setupError
        );
      }
    }
  }

  setupMessageListener() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "displayBypassJSON" && request.data) {
        console.log("Received bypass JSON results to display");
        this.displayBypassJSON(request.data);
        sendResponse({ success: true });
      }
      return false;
    });
  }

  setupEventListeners() {
    console.log("🔧 Setting up event listeners...");

    // Helper function to safely add event listeners
    const safeAddListener = (elementId, event, handler, description) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.addEventListener(event, handler);
        console.log(`✅ ${description} listener added`);
        return true;
      } else {
        console.error(`❌ ${description} element (${elementId}) not found`);
        return false;
      }
    };

    // Test if basic elements exist
    const accountsTab = document.getElementById("accountsTab");
    const paymentsTab = document.getElementById("paymentsTab");
    const generatorTab = document.getElementById("generatorTab");
    const bypassTab = document.getElementById("bypassTab");

    console.log("Tab elements found:", {
      accountsTab: !!accountsTab,
      paymentsTab: !!paymentsTab,
      generatorTab: !!generatorTab,
      bypassTab: !!bypassTab,
    });

    // Tab navigation with error handling
    if (accountsTab) {
      accountsTab.addEventListener("click", () => {
        console.log("Accounts tab clicked");
        this.switchTab("accounts");
      });
      console.log("✅ Accounts tab listener added");
    } else {
      console.error("❌ Accounts tab not found");
    }

    if (paymentsTab) {
      paymentsTab.addEventListener("click", () => {
        console.log("Payments tab clicked");
        this.switchTab("payments");
      });
      console.log("✅ Payments tab listener added");
    } else {
      console.error("❌ Payments tab not found");
    }

    // Generator tab navigation
    if (generatorTab) {
      generatorTab.addEventListener("click", () => {
        console.log("Generator tab clicked");
        this.switchTab("generator");
      });
      console.log("✅ Generator tab listener added");
    } else {
      console.error("❌ Generator tab not found");
    }

    // NEW: Bypass tab navigation
    if (bypassTab) {
      bypassTab.addEventListener("click", () => {
        console.log("Bypass tab clicked");
        this.switchTab("bypass");
      });
      console.log("✅ Bypass tab listener added");
    } else {
      console.error("❌ Bypass tab not found");
    }

    // Add account button - import from JSON
    safeAddListener(
      "addAccountBtn",
      "click",
      () => {
        this.showAddAccountModal();
      },
      "Add account button"
    );

    // Add current session button
    safeAddListener(
      "addCurrentBtn",
      "click",
      () => {
        this.addCurrentAccount();
      },
      "Add current session button"
    );

    // Export current button
    safeAddListener(
      "exportCurrentBtn",
      "click",
      () => {
        this.exportCurrentAccount();
      },
      "Export current button"
    );

    // Import from Downloads button
    safeAddListener(
      "importFromDownloadsBtn",
      "click",
      () => {
        this.importFromDownloads();
      },
      "Import from downloads button"
    );

    // Import Folder button
    safeAddListener(
      "importFolderBtn",
      "click",
      () => {
        this.importFromFolder();
      },
      "Import folder button"
    );

    // Import Multiple Files button (alternative to folder)
    safeAddListener(
      "importMultipleBtn",
      "click",
      () => {
        this.importMultipleFiles();
      },
      "Import multiple files button"
    );

    // Downloads file input change
    safeAddListener(
      "downloadsFileInput",
      "change",
      (e) => {
        this.handleDownloadsImport(e.target.files);
      },
      "Downloads file input"
    );

    // Folder input change
    safeAddListener(
      "folderInput",
      "change",
      (e) => {
        this.handleFolderImport(e.target.files);
      },
      "Folder input"
    );

    // Advanced tools toggle
    safeAddListener(
      "toggleAdvancedBtn",
      "click",
      () => {
        this.toggleAdvancedPanel();
      },
      "Toggle advanced button"
    );

    // Refresh status button
    safeAddListener(
      "refreshStatusBtn",
      "click",
      () => {
        this.forceRefreshStatus();
      },
      "Refresh status button"
    );

    // Generator tab buttons
    const generateCardsBtn = document.getElementById("generateCardsBtn");
    if (generateCardsBtn) {
      generateCardsBtn.addEventListener("click", () => this.generateCards());
    }

    const generateAddressBtn = document.getElementById("generateAddressBtn");
    if (generateAddressBtn) {
      generateAddressBtn.addEventListener("click", () =>
        this.generateAddress()
      );
    }

    const activateProTrialBtn = document.getElementById("activateProTrialBtn");
    if (activateProTrialBtn) {
      activateProTrialBtn.addEventListener("click", () =>
        this.activateProTrialWithDebounce()
      );
    }

    const activateProTrialGeneratorBtn = document.getElementById(
      "activateProTrialGeneratorBtn"
    );
    if (activateProTrialGeneratorBtn) {
      activateProTrialGeneratorBtn.addEventListener("click", () =>
        this.activateProTrialWithDebounce()
      );
    }

    // Initialize BIN history
    this.initBinHistory();

    // Consolidate duplicates button
    safeAddListener(
      "consolidateDuplicatesBtn",
      "click",
      () => {
        this.consolidateDuplicates();
      },
      "Consolidate duplicates button"
    );

    // Clear all data button
    safeAddListener(
      "clearAllDataBtn",
      "click",
      () => {
        this.clearAllData();
      },
      "Clear all data button"
    );

    // Payment functionality
    safeAddListener(
      "importCardsBtn",
      "click",
      () => {
        this.showImportCardsModal();
      },
      "Import cards button"
    );

    safeAddListener(
      "exportCardsBtn",
      "click",
      () => {
        this.exportCards();
      },
      "Export cards button"
    );

    safeAddListener(
      "findPaymentFieldsBtn",
      "click",
      () => {
        this.findPaymentFields();
      },
      "Find payment fields button"
    );

    safeAddListener(
      "clearCardsBtn",
      "click",
      () => {
        this.clearAllCards();
      },
      "Clear cards button"
    );

    // NEW: Bypass Testing Event Listeners
    this.setupBypassEventListeners();

    // Initialize Bypass Settings Manager
    if (window.BypassSettingsManager) {
      this.bypassSettings = new window.BypassSettingsManager();
    }

    // Initialize Bypass Testing Handler
    if (window.BypassTestingHandler) {
      this.bypassHandler = new window.BypassTestingHandler();
    }

    // Card filter and selection functionality
    const cardFilterInput = document.getElementById("cardFilterInput");
    if (cardFilterInput) {
      cardFilterInput.addEventListener("input", (e) => {
        this.cardFilters.search = e.target.value.toLowerCase();
        this.filterCards();
      });
    }

    const cardTypeFilter = document.getElementById("cardTypeFilter");
    if (cardTypeFilter) {
      cardTypeFilter.addEventListener("change", (e) => {
        this.cardFilters.type = e.target.value.toLowerCase();
        this.filterCards();
      });
    }

    const selectAllCards = document.getElementById("selectAllCards");
    if (selectAllCards) {
      selectAllCards.addEventListener("change", (e) => {
        this.selectAllCards(e.target.checked);
      });
    }

    const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
    if (deleteSelectedBtn) {
      deleteSelectedBtn.addEventListener("click", () => {
        this.deleteSelectedCards();
      });
    }

    const clearSelectionBtn = document.getElementById("clearSelectionBtn");
    if (clearSelectionBtn) {
      clearSelectionBtn.addEventListener("click", () => {
        this.clearSelection();
      });
    }

    // Account filter functionality - Fixed Event Listeners
    setTimeout(() => {
      const accountFilterInput = document.getElementById("accountFilterInput");
      if (accountFilterInput) {
        accountFilterInput.addEventListener("input", (e) => {
          this.accountFilters.search = e.target.value.toLowerCase();
          this.filterAccounts();
        });
        console.log("Account filter input listener added");
      } else {
        console.log("Account filter input not found");
      }

      const accountStatusFilter = document.getElementById(
        "accountStatusFilter"
      );
      if (accountStatusFilter) {
        accountStatusFilter.addEventListener("change", (e) => {
          this.accountFilters.status = e.target.value.toLowerCase();
          this.filterAccounts();
        });
        console.log("Account status filter listener added");
      } else {
        console.log("Account status filter not found");
      }
    }, 100);

    // Remove manual detect info button event listener if exists
    const detectInfoBtn = document.getElementById("detectAccountInfoBtn");
    if (detectInfoBtn) {
      detectInfoBtn.style.display = "none";
      detectInfoBtn.replaceWith(detectInfoBtn.cloneNode(true)); // Remove all listeners
    }

    // Card filter and selection functionality (duplicate removed - already handled above)

    // Cards modal controls
    safeAddListener(
      "closeCardsModal",
      "click",
      () => {
        this.hideImportCardsModal();
      },
      "Close cards modal button"
    );

    safeAddListener(
      "cancelImportCardsBtn",
      "click",
      () => {
        this.hideImportCardsModal();
      },
      "Cancel import cards button"
    );

    safeAddListener(
      "confirmImportCardsBtn",
      "click",
      () => {
        this.importCardsFromText();
      },
      "Confirm import cards button"
    );

    // Cards file input
    safeAddListener(
      "cardsFileInput",
      "change",
      (e) => {
        this.handleCardsFileImport(e.target.files);
      },
      "Cards file input"
    );

    // Debug panel controls (enable with Ctrl+Shift+D)
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        this.toggleDebugPanel();
      }
    });

    safeAddListener(
      "showStoredDataBtn",
      "click",
      () => {
        this.showStoredData();
      },
      "Show stored data button"
    );

    // Account deletion functionality
    safeAddListener(
      "deleteFreeAccountBtn",
      "click",
      () => {
        this.deleteFreeAccount();
      },
      "Delete free account button"
    );

    safeAddListener(
      "deleteProTrialAccountBtn",
      "click",
      () => {
        this.deleteProTrialAccount();
      },
      "Delete pro trial account button"
    );

    // Refresh button
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this.loadAccounts();
      });
      console.log("✅ Refresh button listener added");
    } else {
      console.error("❌ Refresh button not found");
    }

    // Dark mode toggle
    const darkModeToggle = document.getElementById("darkModeToggle");
    if (darkModeToggle) {
      darkModeToggle.addEventListener("click", () => {
        this.toggleDarkMode();
      });
      console.log("✅ Dark mode toggle listener added");
    } else {
      console.error("❌ Dark mode toggle not found");
    }

    // Database sync controls
    safeAddListener(
      "exportDatabaseBtn",
      "click",
      () => {
        this.exportDatabase();
      },
      "Export database button"
    );

    safeAddListener(
      "importDatabaseBtn",
      "click",
      () => {
        this.importDatabase();
      },
      "Import database button"
    );

    safeAddListener(
      "openDatabaseLocationBtn",
      "click",
      () => {
        this.openDatabaseLocation();
      },
      "Open database location button"
    );

    safeAddListener(
      "autoSyncToggleBtn",
      "click",
      () => {
        this.toggleAutoSync();
      },
      "Auto sync toggle button"
    );

    // Modal controls
    safeAddListener(
      "closeModal",
      "click",
      () => {
        this.hideModal();
      },
      "Close modal button"
    );

    safeAddListener(
      "cancelAddBtn",
      "click",
      () => {
        this.hideModal();
      },
      "Cancel add button"
    );

    safeAddListener(
      "confirmAddBtn",
      "click",
      () => {
        this.addAccountFromJSON();
      },
      "Confirm add button"
    );
  }

  async loadAccounts(skipInfoUpdate = false) {
    try {
      console.log("📡 Loading accounts...");
      this.showLoading(true);

      // Check if background script is ready
      console.log("🔍 Checking background script...");
      const ping = await chrome.runtime
        .sendMessage({ type: "ping" })
        .catch((error) => {
          console.error("Background script ping failed:", error);
          return null;
        });

      if (!ping) {
        console.error("❌ Background script not responding, retrying...");
        setTimeout(() => this.loadAccounts(skipInfoUpdate), 500);
        return;
      }
      console.log("✅ Background script is responding");

      // Get accounts from background
      const response = await chrome.runtime.sendMessage({
        type: "getAccounts",
      });

      if (response && response.success) {
        this.accounts = response.data || [];

        // Get active account
        const activeResponse = await chrome.runtime.sendMessage({
          type: "getActiveAccount",
        });
        this.activeAccount = activeResponse?.data || null;

        // Try to update account info if needed (skip jika dari force refresh)
        if (this.activeAccount && !skipInfoUpdate) {
          this.updateAccountInfo();
        }

        this.updateUI();
      } else {
        this.showNotification("Failed to load accounts", "error");
        this.accounts = [];
        this.updateUI();
      }
    } catch (error) {
      console.error("❌ Error loading accounts:", error);
      this.showNotification(
        "Extension error - Working in offline mode",
        "warning"
      );
      this.accounts = [];
      // Still try to update UI in case of error
      try {
        this.updateUI();
      } catch (uiError) {
        console.error("❌ Error updating UI:", uiError);
        // Fallback to basic UI
        this.updateBasicUI();
      }
    } finally {
      this.showLoading(false);
    }
  }

  // Fallback basic UI update
  updateBasicUI() {
    try {
      console.log("🔧 Updating basic UI...");
      const accountsList = document.getElementById("accountsList");
      if (accountsList) {
        accountsList.innerHTML =
          '<div class="empty-state">Extension loading...</div>';
      }

      const accountsCount = document.getElementById("accountsCount");
      if (accountsCount) {
        accountsCount.textContent = "(0)";
      }

      console.log("✅ Basic UI updated");
    } catch (error) {
      console.error("❌ Error in basic UI update:", error);
    }
  }

  async updateAccountInfo(force = false) {
    if (this.activeAccount) {
      // Check if this account already has proper email info
      const currentAccount = this.accounts.find(
        (acc) => acc.name === this.activeAccount
      );

      // Skip if we already have proper account info (unless force refresh)
      if (
        !force &&
        currentAccount &&
        currentAccount.email &&
        currentAccount.email !== this.activeAccount &&
        (currentAccount.email.includes("@") || currentAccount.email.length > 10)
      ) {
        return;
      }

      try {
        const infoResponse = await chrome.runtime.sendMessage({
          type: "getAccountInfo",
        });

        if (infoResponse && infoResponse.success && infoResponse.data) {
          const { username, email, status } = infoResponse.data;
          // Use email for account info, or fallback to username if no email
          const accountEmail = email || username;
          if (accountEmail) {
            await chrome.runtime.sendMessage({
              type: "updateAccountInfo",
              account: this.activeAccount,
              email: accountEmail,
              status: status || "free",
            });
            this.infoUpdated = true;
            // Hanya reload jika bukan force refresh untuk menghindari loop
            if (!force) {
              setTimeout(() => {
                this.loadAccounts(true); // Skip info update untuk avoid loop
              }, 500);
            }
          }
        }
      } catch (error) {
        console.log("Could not update account info:", error);
      }
    }
  }

  // Force refresh account status (called by refresh button)
  async forceRefreshStatus() {
    if (!this.activeAccount) {
      this.showNotification("No active account to refresh", "warning");
      return;
    }

    try {
      this.showLoading(true);
      this.showNotification("Refreshing account status...", "info");

      // Force update account info (bypass skip condition)
      await this.updateAccountInfo(true);

      // Reload accounts untuk update UI setelah refresh (skip info update untuk avoid loop)
      await this.loadAccounts(true);

      this.showNotification("Account status refreshed!", "success");
    } catch (error) {
      console.error("Error refreshing status:", error);
      this.showNotification("Failed to refresh status", "error");
    } finally {
      this.showLoading(false);
    }
  }

  updateUI() {
    // Update current account display
    this.updateCurrentAccount();

    // Update accounts list
    this.updateAccountsList();

    // Update accounts count
    document.getElementById(
      "accountsCount"
    ).textContent = `(${this.accounts.length})`;
  }

  updateCurrentAccount() {
    const currentAccountEl = document.getElementById("currentAccount");
    const activeAccount = this.accounts.find((acc) => acc.active);

    if (activeAccount) {
      currentAccountEl.innerHTML = `
        <span class="account-icon">🟢</span>
        <div class="account-details">
          <span class="account-name">${this.escapeHtml(
            activeAccount.email
          )}</span>
          <span class="account-status">${this.escapeHtml(
            activeAccount.status || ""
          )}</span>
        </div>
      `;
    } else {
      currentAccountEl.innerHTML = `
        <span class="account-icon">🔴</span>
        <div class="account-details">
          <span class="account-name">Not logged in</span>
          <span class="account-status"></span>
        </div>
      `;
    }
  }

  updateAccountsList() {
    const listEl = document.getElementById("accountsList");
    const emptyEl = document.getElementById("noAccounts");
    const countEl = document.getElementById("accountsCount");

    if (this.accounts.length === 0) {
      listEl.style.display = "none";
      emptyEl.style.display = "block";
      if (countEl) countEl.textContent = "(0)";

      // Hide filters when no accounts
      const filtersElement = document.querySelector(".account-filters");
      if (filtersElement) {
        filtersElement.style.display = "none";
      }
      return;
    }

    // Show filters when accounts exist
    const filtersElement = document.querySelector(".account-filters");
    if (filtersElement) {
      filtersElement.style.display = "block";
    }

    listEl.style.display = "block";
    emptyEl.style.display = "none";
    listEl.innerHTML = "";

    // Ensure scrollable class is applied
    if (!listEl.classList.contains("scrollable")) {
      listEl.classList.add("scrollable");
    }

    // Sort accounts - active first
    const sortedAccounts = [...this.accounts].sort((a, b) => {
      if (a.active) return -1;
      if (b.active) return 1;
      return a.email.localeCompare(b.email);
    });

    sortedAccounts.forEach((account) => {
      const accountEl = this.createAccountElement(account);
      listEl.appendChild(accountEl);
    });

    if (countEl) countEl.textContent = `(${this.accounts.length})`;

    // Apply current filters after DOM update
    setTimeout(() => {
      if (this.filterAccounts) {
        this.filterAccounts();
      }
    }, 50);

    // Also update table view if it's active
    if (this.isDatabaseViewActive) {
      this.renderDatabaseTable();
    }
  }

  createAccountElement(account) {
    const template = document.getElementById("sidebarAccountTemplate");
    const element = template.content.cloneNode(true);
    const container = element.querySelector(".sidebar-account-item");

    // Set account data - Fixed attribute name
    container.setAttribute("data-account-name", account.name);
    container.dataset.account = account.name;

    // Set email
    container.querySelector(".account-email").textContent = account.email;

    // Set status
    const statusEl = container.querySelector(".account-status");
    statusEl.textContent = account.status;
    statusEl.className = `account-status ${account.status}`;

    // Show/hide active indicator
    const activeIndicator = container.querySelector(".active-indicator");
    if (account.active) {
      activeIndicator.style.display = "block";
      container.classList.add("active");
    } else {
      activeIndicator.style.display = "none";

      // Make whole card clickable for switching
      container.addEventListener("click", (e) => {
        if (!e.target.closest(".delete-btn")) {
          this.switchAccount(account.name);
        }
      });
    }

    // Setup database info button
    container.querySelector(".reveal-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      this.showAccountDatabaseInfo(account.name);
    });

    // Setup delete button
    container.querySelector(".delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      this.deleteAccount(account.name);
    });

    return container;
  }

  showAddAccountModal() {
    document.getElementById("addAccountModal").style.display = "block";
    document.getElementById("cookiesInput").value = "";
    document.getElementById("accountNameInput").value = "";
    document.getElementById("cookiesInput").focus();

    // Clear any existing warnings
    const existingWarning = document.querySelector(".duplicate-warning");
    if (existingWarning) {
      existingWarning.remove();
    }
  }

  hideModal() {
    document.getElementById("addAccountModal").style.display = "none";
    // Clear any duplicate warnings
    const existingWarning = document.querySelector(".duplicate-warning");
    if (existingWarning) {
      existingWarning.remove();
    }
  }

  // Show duplicate account warning inside modal with replace option
  showDuplicateWarning(existingAccount) {
    // Remove any existing warning
    const existingWarning = document.querySelector(".duplicate-warning");
    if (existingWarning) {
      existingWarning.remove();
    }

    // Create warning element with replace option
    const warning = document.createElement("div");
    warning.className = "duplicate-warning";
    warning.style.cssText = `
      background: #fee2e2;
      border: 1px solid #fca5a5;
      border-radius: 6px;
      padding: 12px;
      margin: 12px 0;
      color: #dc2626;
      font-size: 14px;
    `;
    warning.innerHTML = `
      <div style="margin-bottom: 8px;">
        <strong>⚠️ Account Already Exists</strong><br>
        This account is already saved as: <strong>${
          existingAccount.email || existingAccount.name
        }</strong>
      </div>
      <button id="replaceAccountBtn" style="
        background: #dc2626;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-right: 8px;
      ">Replace Existing Account</button>
      <button id="cancelReplaceBtn" style="
        background: #6b7280;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">Cancel</button>
    `;

    // Insert warning after the textarea
    const textarea = document.getElementById("cookiesInput");
    textarea.parentNode.insertBefore(warning, textarea.nextSibling);

    // Add event listeners to the buttons
    warning
      .querySelector("#replaceAccountBtn")
      .addEventListener("click", () => {
        this.addAccountFromJSON(true); // Override existing
      });

    warning.querySelector("#cancelReplaceBtn").addEventListener("click", () => {
      warning.remove();
    });
  }

  // Check if account already exists - delegate to service
  async findExistingAccount(newCookies) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "checkDuplicateAccount",
        cookies: newCookies,
      });

      if (response.success && response.duplicate) {
        return response.duplicate.account;
      }
      return null;
    } catch (error) {
      console.error("Error checking for duplicates:", error);
      return null;
    }
  }

  // Add current active session as new account
  async addCurrentAccount() {
    try {
      this.showLoading(true);

      const response = await chrome.runtime.sendMessage({
        type: "addCurrentAccount",
      });

      if (response.success && response.data) {
        this.showNotification(`Account added: ${response.data}`, "success");
        await this.loadAccounts();
      } else if (response.success && !response.data) {
        this.showNotification(
          "No active session found. Please login to cursor.com first",
          "warning"
        );
      } else {
        this.showNotification(
          response.error || "Failed to add account",
          "error"
        );
      }
    } catch (error) {
      console.error("Error adding current account:", error);
      this.showNotification("Error adding current account", "error");
    } finally {
      this.showLoading(false);
    }
  }

  async addAccountFromJSON(overrideExisting = false) {
    const cookiesInput = document.getElementById("cookiesInput").value.trim();
    const accountName = document
      .getElementById("accountNameInput")
      .value.trim();

    if (!cookiesInput) {
      this.showNotification("Please paste cookies JSON", "error");
      return;
    }

    try {
      this.showLoading(true);

      // If not overriding, check for duplicates first
      if (!overrideExisting) {
        // Validate JSON
        const cookiesData = JSON.parse(cookiesInput);

        // Check if account already exists
        const existingAccount = await this.findExistingAccount(cookiesData);
        if (existingAccount) {
          this.showDuplicateWarning(existingAccount);
          return;
        }
      } else {
        // Remove duplicate warning when overriding
        const existingWarning = document.querySelector(".duplicate-warning");
        if (existingWarning) {
          existingWarning.remove();
        }
      }

      const response = await chrome.runtime.sendMessage({
        type: "importAccountJSON",
        jsonText: cookiesInput,
        customName: accountName || null,
        overrideExisting: overrideExisting,
      });

      if (response.success) {
        const actionText = overrideExisting ? "Updated" : "Added";
        this.showNotification(`${actionText}: ${response.data}`, "success");
        this.hideModal();
        await this.loadAccounts();
      } else {
        this.showNotification(response.error || "Failed to add", "error");
      }
    } catch (error) {
      console.error("Error adding account:", error);
      if (error.message && error.message.includes("JSON")) {
        this.showNotification("Invalid JSON format", "error");
      } else {
        this.showNotification("Error adding account", "error");
      }
    } finally {
      this.showLoading(false);
    }
  }

  async exportCurrentAccount() {
    if (!this.activeAccount) {
      this.showNotification("No active account", "error");
      return;
    }

    try {
      this.showLoading(true);

      const response = await chrome.runtime.sendMessage({
        type: "exportAccount",
        account: this.activeAccount,
      });

      if (response.success) {
        this.showNotification("Exported to Downloads", "success");
      } else {
        this.showNotification("Export failed", "error");
      }
    } catch (error) {
      console.error("Error exporting:", error);
      this.showNotification("Export error", "error");
    } finally {
      this.showLoading(false);
    }
  }

  async switchAccount(accountName) {
    try {
      this.showLoading(true);

      const response = await chrome.runtime.sendMessage({
        type: "switchAccount",
        account: accountName,
      });

      if (response.success) {
        this.showNotification(`Switching to ${accountName}...`, "success");
        // PERBAIKAN: Skip info update saat switch account untuk avoid data contamination
        // Account info sudah ada di database, tidak perlu extract dari page yang sedang reload
        setTimeout(() => this.loadAccounts(true), 2000); // Increase delay & skip info update
      } else {
        this.showNotification("Switch failed", "error");
      }
    } catch (error) {
      console.error("Error switching account:", error);
      this.showNotification("Switch error", "error");
    } finally {
      this.showLoading(false);
    }
  }

  // Show account database information
  // Convert JSON files to SQLite database
  async convertJsonFilesToDatabase(files) {
    console.log("Converting JSON files to database...");
    this.showLoading(true);

    try {
      // Prepare file data
      const fileData = [];
      for (const file of files) {
        const content = await file.text();
        fileData.push({
          name: file.name,
          content: content,
        });
      }

      // Ask user for export preference
      const exportToFile = confirm(
        "Database conversion ready.\n\n" +
          "Would you like to:\n" +
          "• OK = Export as .db file to Downloads\n" +
          "• Cancel = Save to extension storage"
      );

      // Send to background for conversion
      const response = await chrome.runtime.sendMessage({
        type: "convertJsonToDatabase",
        files: fileData,
        saveToStorage: !exportToFile,
        exportToFile: exportToFile,
      });

      if (response.success) {
        const summary = response.data.summary;
        const stats = response.data.stats;

        let message = `Conversion completed!\n\n`;
        message += `📊 Results:\n`;
        message += `• Processed: ${summary.processed} accounts\n`;
        message += `• Skipped: ${summary.skipped} duplicates\n`;
        message += `• Errors: ${summary.errors}\n\n`;
        message += `💾 Database contains:\n`;
        message += `• ${stats.accountCount} accounts\n`;
        message += `• ${stats.cookieCount} cookies\n`;

        if (response.data.exportedFile) {
          message += `\n📁 Exported to: ${response.data.exportedFile}`;
        } else {
          message += `\n✅ Saved to extension storage`;
        }

        // Show detailed results
        alert(message);

        // If saved to storage, reload accounts
        if (!exportToFile) {
          this.showNotification(
            "Database imported successfully! Reloading accounts...",
            "success"
          );
          setTimeout(() => {
            this.loadAccounts();
          }, 1000);
        } else {
          this.showNotification(
            `Database exported to Downloads folder`,
            "success"
          );
        }
      } else {
        this.showNotification(`Conversion failed: ${response.error}`, "error");
      }
    } catch (error) {
      console.error("Error converting files to database:", error);
      this.showNotification("Error converting files to database", "error");
    } finally {
      this.showLoading(false);
    }
  }

  // Export database to file
  async exportDatabase() {
    try {
      this.showLoading(true);

      const response = await chrome.runtime.sendMessage({
        type: "exportDatabaseToFile",
      });

      if (response.success) {
        this.showNotification(
          `Database exported to: ${response.data.filename}`,
          "success"
        );
      } else {
        this.showNotification(
          response.error || "Failed to export database",
          "error"
        );
      }
    } catch (error) {
      console.error("Error exporting database:", error);
      this.showNotification("Error exporting database", "error");
    } finally {
      this.showLoading(false);
    }
  }

  // Import database from file
  async importDatabase() {
    try {
      // Create file input
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".db,.sqlite,.sqlite3";

      fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        this.showLoading(true);

        try {
          // Read file
          const arrayBuffer = await file.arrayBuffer();

          // Send to background
          const response = await chrome.runtime.sendMessage({
            type: "importDatabaseFromFile",
            fileData: arrayBuffer,
          });

          if (response.success) {
            this.showNotification(
              "Database imported successfully! Reloading accounts...",
              "success"
            );
            // Reload accounts after import
            setTimeout(() => {
              this.loadAccounts();
            }, 1000);
          } else {
            this.showNotification(
              response.error || "Failed to import database",
              "error"
            );
          }
        } catch (error) {
          console.error("Error importing database:", error);
          this.showNotification("Error importing database file", "error");
        } finally {
          this.showLoading(false);
        }
      });

      fileInput.click();
    } catch (error) {
      console.error("Error opening file dialog:", error);
      this.showNotification("Error opening file dialog", "error");
    }
  }

  // Open database location
  async openDatabaseLocation() {
    try {
      this.showLoading(true);

      const response = await chrome.runtime.sendMessage({
        type: "openDatabaseLocation",
      });

      if (response.success) {
        const message =
          response.data?.message ||
          (response.data?.created
            ? "Database file created and location opened"
            : "Database location opened");
        this.showNotification(message, "success");
      } else {
        this.showNotification(
          response.error || "Failed to open location",
          "error"
        );
      }
    } catch (error) {
      console.error("Error opening database location:", error);
      this.showNotification("Error opening database location", "error");
    } finally {
      this.showLoading(false);
    }
  }

  // Toggle auto sync
  async toggleAutoSync() {
    try {
      // Get current status
      const statusResponse = await chrome.runtime.sendMessage({
        type: "getDatabaseSyncStatus",
      });

      if (statusResponse.success) {
        const isEnabled = statusResponse.data.autoSyncEnabled;

        if (isEnabled) {
          // Disable auto sync
          const response = await chrome.runtime.sendMessage({
            type: "disableDatabaseAutoSync",
          });

          if (response.success) {
            this.showNotification("Auto-sync disabled", "info");
            document
              .getElementById("autoSyncToggleBtn")
              .classList.remove("btn-success");
            document
              .getElementById("autoSyncToggleBtn")
              .classList.add("btn-secondary");
          }
        } else {
          // Show dialog to set interval
          const interval = prompt("Enter auto-sync interval in minutes:", "30");
          if (interval && !isNaN(interval)) {
            const response = await chrome.runtime.sendMessage({
              type: "enableDatabaseAutoSync",
              interval: parseInt(interval),
            });

            if (response.success) {
              this.showNotification(
                `Auto-sync enabled: every ${interval} minutes`,
                "success"
              );
              document
                .getElementById("autoSyncToggleBtn")
                .classList.remove("btn-secondary");
              document
                .getElementById("autoSyncToggleBtn")
                .classList.add("btn-success");
            }
          }
        }
      }
    } catch (error) {
      console.error("Error toggling auto-sync:", error);
      this.showNotification("Error toggling auto-sync", "error");
    }
  }

  // Check and update auto-sync button status
  async updateAutoSyncStatus() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "getDatabaseSyncStatus",
      });

      if (response.success && response.data.autoSyncEnabled) {
        document
          .getElementById("autoSyncToggleBtn")
          ?.classList.remove("btn-secondary");
        document
          .getElementById("autoSyncToggleBtn")
          ?.classList.add("btn-success");
      }
    } catch (error) {
      console.log("Could not get auto-sync status:", error);
    }
  }

  async showAccountDatabaseInfo(accountName) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "getAccountDatabaseInfo",
        account: accountName,
      });

      if (response.success && response.data) {
        const info = response.data;

        // Create modal to show database info
        const modal = document.createElement("div");
        modal.className = "modal";
        modal.style.cssText = `
          display: block;
          position: fixed;
          z-index: 9999;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.4);
        `;

        const modalContent = document.createElement("div");
        modalContent.style.cssText = `
          background-color: var(--bg-primary);
          margin: 10% auto;
          padding: 20px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          width: 80%;
          max-width: 600px;
          max-height: 70vh;
          overflow-y: auto;
          color: var(--text-primary);
        `;

        modalContent.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h2 style="margin: 0;">📊 Database Info: ${accountName}</h2>
            <button id="closeDatabaseInfo" style="
              background: none;
              border: none;
              font-size: 24px;
              cursor: pointer;
              color: var(--text-secondary);
            ">✕</button>
          </div>
          
          <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px; margin-bottom: 15px;">
            <h3 style="margin-top: 0; color: var(--text-primary);">Account Details</h3>
            <p><strong>Name:</strong> ${info.name}</p>
            <p><strong>Email:</strong> ${info.email || "Not set"}</p>
            <p><strong>Status:</strong> <span class="account-status ${
              info.status
            }">${info.status || "Unknown"}</span></p>
            <p><strong>Active:</strong> ${
              info.is_active ? "✅ Yes" : "❌ No"
            }</p>
            <p><strong>Created:</strong> ${info.created_at || "Unknown"}</p>
            <p><strong>Last Used:</strong> ${info.last_used || "Never"}</p>
          </div>
          
          <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px; margin-bottom: 15px;">
            <h3 style="margin-top: 0; color: var(--text-primary);">Storage Info</h3>
            <p><strong>Storage Type:</strong> ${info.storage_type}</p>
            <p><strong>Database Location:</strong> ${info.storage_location}</p>
            <p><strong>Table:</strong> ${info.table_name}</p>
            <p><strong>Cookie Count:</strong> ${info.cookie_count}</p>
            <p><strong>Earliest Expiry:</strong> ${
              info.earliest_expiry
                ? new Date(info.earliest_expiry * 1000).toLocaleDateString()
                : "No expiry"
            }</p>
          </div>
          
          <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
            <h3 style="margin-top: 0; color: var(--text-primary);">Cookies (${
              info.cookies?.length || 0
            })</h3>
            <div style="max-height: 200px; overflow-y: auto;">
              ${
                info.cookies
                  ? info.cookies
                      .map(
                        (cookie) => `
                <div style="margin-bottom: 10px; padding: 8px; background: var(--bg-primary); border-radius: 4px;">
                  <strong>${cookie.name}</strong>
                  <div style="font-size: 12px; color: var(--text-secondary);">
                    Domain: ${cookie.domain} | Path: ${cookie.path}
                    ${
                      cookie.expirationDate
                        ? `| Expires: ${new Date(
                            cookie.expirationDate * 1000
                          ).toLocaleDateString()}`
                        : ""
                    }
                  </div>
                </div>
              `
                      )
                      .join("")
                  : "<p>No cookies stored</p>"
              }
            </div>
          </div>
          
          <div style="margin-top: 20px; text-align: right;">
            <button id="exportAccountData" class="btn btn-secondary" style="margin-right: 10px;">Export JSON</button>
            <button id="closeDatabaseInfo2" class="btn btn-primary">Close</button>
          </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Add event listeners
        const closeModal = () => {
          document.body.removeChild(modal);
        };

        modal
          .querySelector("#closeDatabaseInfo")
          .addEventListener("click", closeModal);
        modal
          .querySelector("#closeDatabaseInfo2")
          .addEventListener("click", closeModal);

        modal
          .querySelector("#exportAccountData")
          .addEventListener("click", async () => {
            await this.exportSpecificAccount(accountName);
            closeModal();
          });

        // Close on outside click
        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            closeModal();
          }
        });
      } else {
        this.showNotification("Could not load database info", "error");
      }
    } catch (error) {
      console.error("Error showing database info:", error);
      this.showNotification("Error loading database info", "error");
    }
  }

  async revealAccountFile(accountName) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "revealAccountFile",
        account: accountName,
      });

      if (response.success) {
        this.showNotification(response.message || "File revealed", "success");
      } else if (response.canExport) {
        // File not found, offer to export
        const shouldExport = confirm(
          `File not found in Downloads folder.\n\nWould you like to export "${accountName}" now?`
        );

        if (shouldExport) {
          await this.exportSpecificAccount(accountName);
        }
      } else {
        this.showNotification(response.error || "File not found", "error");
      }
    } catch (error) {
      console.error("Error revealing file:", error);
      this.showNotification("Reveal error", "error");
    }
  }

  // Export specific account (helper method)
  async exportSpecificAccount(accountName) {
    try {
      this.showLoading(true);

      const response = await chrome.runtime.sendMessage({
        type: "exportAccount",
        account: accountName,
      });

      if (response.success) {
        this.showNotification(`Account exported: ${accountName}`, "success");

        // Try to reveal the newly exported file after a short delay
        setTimeout(() => {
          this.revealAccountFile(accountName);
        }, 1000);
      } else {
        this.showNotification("Export failed", "error");
      }
    } catch (error) {
      console.error("Error exporting account:", error);
      this.showNotification("Export error", "error");
    } finally {
      this.showLoading(false);
    }
  }

  async deleteAccount(accountName) {
    // First confirmation for basic deletion
    if (!confirm(`Delete account ${accountName}?`)) {
      return;
    }

    // Second confirmation for file deletion option
    const deleteFile = confirm(
      `Also delete the backup file in Downloads/cursor_accounts/?
      
✅ YES: Delete both account and file
❌ NO: Keep file, delete account only

Choose YES if you want complete removal.
Choose NO if you want to keep the backup file.`
    );

    try {
      this.showLoading(true);

      const response = await chrome.runtime.sendMessage({
        type: "removeAccount",
        account: accountName,
        deleteFile: deleteFile,
      });

      if (response.success) {
        const message = deleteFile
          ? `Deleted account and file: ${accountName}`
          : `Deleted account: ${accountName} (file kept)`;
        this.showNotification(message, "success");

        // Reload accounts dan update UI secara eksplisit
        await this.loadAccounts();
        this.updateUI();
      } else {
        this.showNotification("Delete failed", "error");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      this.showNotification("Delete error", "error");
    } finally {
      this.showLoading(false);
    }
  }

  toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");

    // Save preference
    chrome.storage.local.set({ darkMode: isDark });

    // Update button SVG
    const darkModeBtn = document.getElementById("darkModeToggle");
    const svg = darkModeBtn.querySelector("svg path");

    if (isDark) {
      // Sun icon (light mode) - From branch
      svg.setAttribute(
        "d",
        "M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z"
      );
    } else {
      // Moon icon (dark mode) - Clean and modern
      svg.setAttribute(
        "d",
        "M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.4 6.35,17.41C9.37,20.43 14,20.54 17.33,17.97Z"
      );
    }
  }

  showLoading(show) {
    const overlay = document.getElementById("loadingOverlay");
    if (show) {
      overlay.style.display = "flex";
      this.loadingTimeout = setTimeout(() => {
        overlay.style.display = "none";
      }, 2000);
    } else {
      overlay.style.display = "none";
      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout);
      }
    }
  }

  showNotification(message, type = "info") {
    const notification = document.getElementById("notification");
    const text = document.getElementById("notificationText");

    text.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = "block";

    setTimeout(() => {
      notification.style.display = "none";
    }, 3000);
  }

  // Toggle advanced panel
  toggleAdvancedPanel() {
    const panel = document.getElementById("advancedPanel");
    const button = document.getElementById("toggleAdvancedBtn");
    const tooltip = button.querySelector(".tooltip");
    const isVisible = panel.style.display !== "none";

    panel.style.display = isVisible ? "none" : "block";

    // Update tooltip text
    if (tooltip) {
      tooltip.textContent = isVisible ? "Show Tools" : "Hide Tools";
    }

    // Update title attribute as well
    button.title = isVisible ? "Show Advanced Tools" : "Hide Advanced Tools";
  }

  // Import from Downloads folder
  importFromDownloads() {
    document.getElementById("downloadsFileInput").click();
  }

  // Import from folder
  importFromFolder() {
    console.log("🚀 importFromFolder called");
    document.getElementById("folderInput").click();
  }

  // Import multiple files - SAFE ALTERNATIVE
  importMultipleFiles() {
    console.log("🚀 importMultipleFiles called");

    try {
      const multiInput = document.createElement("input");
      multiInput.type = "file";
      multiInput.multiple = true;
      multiInput.accept = ".json";
      multiInput.style.display = "none";

      multiInput.addEventListener("change", async (e) => {
        console.log("📁 Multiple file input changed");
        try {
          if (e.target.files && e.target.files.length > 0) {
            const fileArray = Array.from(e.target.files);
            console.log(`📋 Selected ${fileArray.length} files`);

            // Show initial message
            this.showNotification(
              `Selected ${fileArray.length} files. Starting import...`,
              "info"
            );

            await this.processFilesManually(fileArray);
          }
        } catch (processError) {
          console.error("❌ Error processing multiple files:", processError);
          this.showNotification("Error processing selected files", "error");
        }

        // Clean up
        try {
          document.body.removeChild(multiInput);
        } catch (cleanupError) {
          console.warn("⚠️ Could not clean up input element");
        }
      });

      document.body.appendChild(multiInput);
      multiInput.click();

      console.log("✅ Multiple file selector created");
    } catch (error) {
      console.error("❌ Error creating multiple file selector:", error);
      this.showNotification("Could not open file selector", "error");
    }
  }

  // Handle multiple file import from Downloads
  async handleDownloadsImport(files) {
    await this.processFileImport(files, "downloadsFileInput");
  }

  // Handle folder import - SIMPLIFIED SAFE VERSION
  async handleFolderImport(files) {
    console.log("🚀 handleFolderImport called with:", files);

    try {
      if (!files || files.length === 0) {
        this.showNotification("No files selected", "error");
        return;
      }

      // Convert to simple array and filter JSON files
      const fileArray = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file && file.name && file.name.toLowerCase().endsWith(".json")) {
          fileArray.push(file);
        }
      }

      console.log(`📁 Found ${fileArray.length} JSON files in folder`);

      if (fileArray.length === 0) {
        this.showNotification(
          "No JSON files found in the selected folder",
          "warning"
        );
        return;
      }

      // Show initial notification
      this.showNotification(
        `Found ${fileArray.length} JSON files. Starting import...`,
        "info"
      );

      // Process files one by one manually - AVOID COMPLEX BATCH PROCESSING
      await this.processFilesManually(fileArray);
    } catch (error) {
      console.error("💥 Error in handleFolderImport:", error);
      this.showNotification(`Folder import failed: ${error.message}`, "error");
    }
  }

  // Manual file processing with database conversion option
  async processFilesManually(files) {
    console.log("🔧 Processing files manually:", files.length);

    // Ask user for conversion preference
    const convertToDb = confirm(
      `Found ${files.length} JSON files.\n\n` +
        `Would you like to:\n` +
        `• OK = Convert to SQLite database file (.db)\n` +
        `• Cancel = Import to extension normally`
    );

    if (convertToDb) {
      // Convert JSON files to SQLite database
      await this.convertJsonFilesToDatabase(files);
      return;
    }

    // Original import logic
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    this.showLoading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          console.log(
            `📝 Processing file ${i + 1}/${files.length}: ${file.name}`
          );

          // Show progress
          this.showNotification(
            `Processing ${i + 1}/${files.length}: ${file.name}`,
            "info"
          );

          // Wait between files - PREVENT OVERLOAD
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
          }

          // Read file
          const text = await file.text();
          console.log(`📖 File read: ${text.length} characters`);

          // Size check
          if (text.length > 300 * 1024) {
            // 300KB limit - VERY CONSERVATIVE
            console.warn(`⚠️ File too large: ${file.name}`);
            errorCount++;
            continue;
          }

          // JSON validation
          try {
            JSON.parse(text);
          } catch (e) {
            console.error(`❌ Invalid JSON: ${file.name}`);
            errorCount++;
            continue;
          }

          // Import using single file method - REUSE WORKING CODE
          try {
            const response = await chrome.runtime.sendMessage({
              type: "importAccountJSON",
              jsonText: text,
              customName: null,
            });

            if (response && response.success) {
              importedCount++;
              console.log(`✅ Imported: ${file.name}`);
            } else {
              const errorMsg = response?.error || "Unknown error";
              if (errorMsg.includes("already exists")) {
                skippedCount++;
                console.log(`⏭️ Skipped duplicate: ${file.name}`);
              } else {
                errorCount++;
                console.error(`❌ Import failed: ${file.name}`);
              }
            }
          } catch (msgError) {
            console.error(`❌ Message error for ${file.name}:`, msgError);
            errorCount++;
          }
        } catch (fileError) {
          console.error(`💥 Error processing ${file.name}:`, fileError);
          errorCount++;
        }
      }

      // Show results
      let message = `Import completed: ${importedCount} added`;
      if (skippedCount > 0) message += `, ${skippedCount} skipped`;
      if (errorCount > 0) message += `, ${errorCount} errors`;

      const type =
        errorCount > 0 ? "warning" : importedCount > 0 ? "success" : "info";
      this.showNotification(message, type);

      // Reload if successful imports
      if (importedCount > 0) {
        await this.loadAccounts();
      }
    } catch (error) {
      console.error("💥 Error in processFilesManually:", error);
      this.showNotification("Import process failed", "error");
    } finally {
      this.showLoading(false);
    }
  }

  // Process file import (shared by both methods) - ULTRA SAFE VERSION
  async processFileImport(files, inputId) {
    console.log("🚀 Starting processFileImport with", files?.length, "files");

    if (!files || files.length === 0) {
      console.log("❌ No files provided");
      return;
    }

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    this.showLoading(true);

    try {
      // Convert FileList to Array and filter JSON files - SAFE
      let jsonFiles = [];
      try {
        jsonFiles = Array.from(files).filter((file) => {
          const isJson =
            file && file.name && file.name.toLowerCase().endsWith(".json");
          console.log(`📁 File: ${file?.name}, isJSON: ${isJson}`);
          return isJson;
        });
        console.log(`✅ Found ${jsonFiles.length} JSON files`);
      } catch (error) {
        console.error("❌ Error filtering files:", error);
        throw new Error("Failed to process file list");
      }

      if (jsonFiles.length === 0) {
        this.showNotification("No JSON files found to import", "warning");
        return;
      }

      // ULTRA CONSERVATIVE SETTINGS - Process ONE file at a time
      console.log("🐌 Using ULTRA SAFE mode - processing one file at a time");

      for (let i = 0; i < jsonFiles.length; i++) {
        const file = jsonFiles[i];

        try {
          console.log(
            `📝 Processing file ${i + 1}/${jsonFiles.length}: ${file.name}`
          );

          // Show progress for each file
          this.showNotification(
            `Processing ${i + 1}/${jsonFiles.length}: ${file.name}`,
            "info"
          );

          // Add significant delay between files - PREVENT OVERLOAD
          if (i > 0) {
            console.log("⏳ Waiting 500ms before next file...");
            await this.delay(500);
          }

          // Read file with extended timeout - PREVENT HANGS
          console.log(`📖 Reading file: ${file.name}`);
          let text;
          try {
            text = await this.readFileWithTimeout(file, 10000); // 10s timeout
            console.log(`✅ File read successfully, length: ${text.length}`);
          } catch (readError) {
            console.error(`❌ Failed to read file ${file.name}:`, readError);
            errorCount++;
            continue;
          }

          // Validate JSON size - PREVENT MEMORY ISSUES
          if (text.length > 512 * 1024) {
            // 512KB limit - VERY CONSERVATIVE
            console.warn(
              `⚠️ File ${file.name} too large: ${text.length} bytes`
            );
            errorCount++;
            continue;
          }

          // Validate JSON format before sending - PREVENT BACKEND CRASH
          try {
            JSON.parse(text);
            console.log(`✅ JSON validation passed for ${file.name}`);
          } catch (parseError) {
            console.error(`❌ Invalid JSON in ${file.name}:`, parseError);
            errorCount++;
            continue;
          }

          // Send message with extended timeout - PREVENT HANGS
          console.log(`📤 Sending import message for ${file.name}`);
          let response;
          try {
            response = await this.sendMessageWithTimeout(
              {
                type: "importAccountJSON",
                jsonText: text,
                customName: null,
              },
              15000 // 15s timeout - VERY GENEROUS
            );
            console.log(
              `✅ Import response received for ${file.name}:`,
              response
            );
          } catch (messageError) {
            console.error(`❌ Message timeout for ${file.name}:`, messageError);
            errorCount++;
            continue;
          }

          // Process response - SAFE HANDLING
          if (response && response.success) {
            importedCount++;
            console.log(
              `🎉 Successfully imported: ${file.name} as ${response.data}`
            );
          } else {
            const errorMsg = response?.error || "Unknown error";
            if (errorMsg.includes("already exists")) {
              skippedCount++;
              console.log(`⏭️ Skipped duplicate: ${file.name}`);
            } else {
              errorCount++;
              console.error(`❌ Import failed: ${file.name} - ${errorMsg}`);
            }
          }
        } catch (fileError) {
          errorCount++;
          console.error(
            `💥 Critical error processing ${file.name}:`,
            fileError
          );
        }

        // Force garbage collection hint
        if (i % 5 === 0 && i > 0) {
          console.log("🗑️ Forcing garbage collection hint...");
          if (window.gc) {
            window.gc();
          }
          await this.delay(200); // Extra breathing room
        }
      }

      // Show final results
      let message = `Import completed: ${importedCount} added`;
      if (skippedCount > 0) {
        message += `, ${skippedCount} skipped`;
      }
      if (errorCount > 0) {
        message += `, ${errorCount} errors`;
      }

      const notificationType =
        errorCount > 0 ? "warning" : importedCount > 0 ? "success" : "info";
      this.showNotification(message, notificationType);
      console.log(`📊 Final results: ${message}`);

      // Reload accounts if any were imported
      if (importedCount > 0) {
        console.log("🔄 Reloading accounts...");
        await this.loadAccounts();
      }
    } catch (error) {
      console.error("💥💥💥 CRITICAL ERROR during bulk import:", error);
      this.showNotification(`Import failed: ${error.message}`, "error");
    } finally {
      console.log("🏁 Import process finished, cleaning up...");
      this.showLoading(false);

      // Clear the file input - SAFE
      try {
        const input = document.getElementById(inputId);
        if (input) {
          input.value = "";
          console.log("✅ File input cleared");
        }
      } catch (e) {
        console.warn("⚠️ Could not clear file input:", e);
      }
    }
  }

  // Helper: Read file with timeout to prevent hangs
  async readFileWithTimeout(file, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`File read timeout: ${file.name}`));
      }, timeout);

      file
        .text()
        .then((text) => {
          clearTimeout(timer);
          resolve(text);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  // Helper: Send message with timeout to prevent hangs
  async sendMessageWithTimeout(message, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Message timeout"));
      }, timeout);

      chrome.runtime
        .sendMessage(message)
        .then((response) => {
          clearTimeout(timer);
          resolve(response);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  // Helper: Delay function for throttling
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async clearAllData() {
    const confirmed = confirm(
      "⚠️ WARNING: Delete ALL accounts and data?\n\nThis cannot be undone!"
    );

    if (!confirmed) return;

    const doubleConfirm = confirm(
      "🚨 FINAL CONFIRMATION\n\nDelete all:\n- Accounts\n- Cookies\n- Settings\n\nContinue?"
    );

    if (!doubleConfirm) return;

    try {
      this.showLoading(true);

      const response = await chrome.runtime.sendMessage({
        type: "clearAllData",
      });

      if (response.success) {
        this.showNotification("All data cleared. Extension reset.", "success");

        // Reload the accounts
        setTimeout(() => {
          this.loadAccounts();
        }, 1000);
      } else {
        this.showNotification("Error clearing data", "error");
      }
    } catch (error) {
      console.error("Error clearing data:", error);
      this.showNotification("Error clearing data", "error");
    } finally {
      this.showLoading(false);
    }
  }

  async consolidateDuplicates() {
    const confirmed = confirm(
      "🔧 Fix Duplicate Accounts?\n\nThis will:\n- Find accounts with same session\n- Keep account with proper email\n- Remove duplicates\n\nContinue?"
    );

    if (!confirmed) return;

    try {
      this.showLoading(true);

      const response = await chrome.runtime.sendMessage({
        type: "consolidateDuplicates",
      });

      if (response.success) {
        this.showNotification(
          `Fixed ${response.removed} duplicate accounts`,
          response.removed > 0 ? "success" : "info"
        );

        // Reload accounts if duplicates were removed
        if (response.removed > 0) {
          setTimeout(() => {
            this.loadAccounts();
          }, 1000);
        }
      } else {
        this.showNotification("Error consolidating duplicates", "error");
      }
    } catch (error) {
      console.error("Error consolidating duplicates:", error);
      this.showNotification("Error consolidating duplicates", "error");
    } finally {
      this.showLoading(false);
    }
  }

  // Switch between tabs
  switchTab(tabName) {
    this.currentTab = tabName;

    // Update tab buttons
    document
      .querySelectorAll(".tab-btn")
      .forEach((btn) => btn.classList.remove("active"));
    document.getElementById(`${tabName}Tab`).classList.add("active");

    // Update content visibility
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.style.display = "none";
    });

    // Fix: use correct element ID
    const contentElement = document.getElementById(`${tabName}Content`);
    if (contentElement) {
      contentElement.style.display = "block";
    } else {
      console.error(`Tab content element not found: ${tabName}Content`);
    }

    // Load appropriate data
    if (tabName === "payments") {
      this.loadPaymentCards();
    } else if (tabName === "bypass") {
      this.initializeBypassTab();
    }
  }

  // Load payment cards
  async loadPaymentCards() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "getPaymentCards",
      });

      if (response.success) {
        this.paymentCards = response.data || [];
        this.updatePaymentCardsUI();
      } else {
        this.showNotification("Failed to load payment cards", "error");
      }
    } catch (error) {
      console.error("Error loading payment cards:", error);
      this.showNotification("Error loading payment cards", "error");
    }
  }

  // Update payment cards UI
  updatePaymentCardsUI() {
    const listEl = document.getElementById("cardsList");
    const emptyEl = document.getElementById("noCards");
    const countEl = document.getElementById("cardsCount");

    countEl.textContent = `(${this.paymentCards.length})`;

    if (this.paymentCards.length === 0) {
      listEl.style.display = "none";
      emptyEl.style.display = "block";
      return;
    }

    listEl.style.display = "block";
    emptyEl.style.display = "none";
    listEl.innerHTML = "";

    // Show/hide filters based on card count
    const filtersElement = document.querySelector(".card-filters");
    if (filtersElement) {
      filtersElement.style.display =
        this.paymentCards.length > 0 ? "block" : "none";
    }

    // Ensure scrollable class is applied to cards list
    if (!listEl.classList.contains("scrollable")) {
      listEl.classList.add("scrollable");
    }

    this.paymentCards.forEach((card) => {
      const cardEl = this.createCardElement(card);
      listEl.appendChild(cardEl);
    });

    // Apply current filters if they exist
    if (this.cardFilters) {
      this.filterCards();
    }

    // Update selection UI if it exists
    if (this.updateSelectionUI) {
      this.updateSelectionUI();
    }
  }

  // Create card element
  createCardElement(card) {
    const template = document.getElementById("sidebarCardTemplate");
    const element = template.content.cloneNode(true);
    const container = element.querySelector(".card-item");

    // Set card data
    container.dataset.cardId = card.id;

    // Card selection checkbox
    const cardSelect = container.querySelector(".card-select");
    if (cardSelect) {
      cardSelect.addEventListener("change", (e) => {
        e.stopPropagation();
        this.toggleCardSelection(card.id, e.target.checked);
      });
    }

    // Set card icon based on type
    const iconEl = container.querySelector(".card-type-icon");
    switch (card.type) {
      case "Visa":
        iconEl.textContent = "💳";
        break;
      case "MasterCard":
        iconEl.textContent = "💳";
        break;
      default:
        iconEl.textContent = "💳";
    }

    // Set card number (masked)
    container.querySelector(".card-number").textContent = this.formatCardNumber(
      card.number
    );

    // Set expiry and type
    container.querySelector(".card-expiry").textContent = card.expiry;
    container.querySelector(".card-type").textContent = card.type;

    // Setup fill button
    container.querySelector(".fill-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      this.autoFillCard(card.id);
    });

    // Setup remove button
    container
      .querySelector(".remove-card-btn")
      .addEventListener("click", (e) => {
        e.stopPropagation();
        this.removePaymentCard(card.id);
      });

    return container;
  }

  // Format card number for display
  formatCardNumber(cardNumber) {
    if (!cardNumber) return "";
    return `**** **** **** ${cardNumber.slice(-4)}`;
  }

  // Card filtering functionality
  filterCards() {
    if (!this.cardFilters) return;

    const cardsList = document.getElementById("cardsList");
    const cardItems = cardsList.querySelectorAll(".card-item");

    cardItems.forEach((cardItem) => {
      const cardId = cardItem.getAttribute("data-card-id");
      const card = this.paymentCards.find((c) => c.id === cardId);

      if (!card) {
        cardItem.style.display = "none";
        return;
      }

      const matchesSearch =
        !this.cardFilters.search ||
        card.number.includes(this.cardFilters.search) ||
        card.type.toLowerCase().includes(this.cardFilters.search) ||
        card.expiry.includes(this.cardFilters.search);

      const matchesType =
        !this.cardFilters.type ||
        card.type.toLowerCase() === this.cardFilters.type;

      const shouldShow = matchesSearch && matchesType;
      cardItem.style.display = shouldShow ? "flex" : "none";
    });
  }

  // Card selection functionality
  toggleCardSelection(cardId, selected) {
    if (!this.selectedCards) {
      this.selectedCards = new Set();
    }

    if (selected) {
      this.selectedCards.add(cardId);
    } else {
      this.selectedCards.delete(cardId);
    }

    // Update card visual state
    const cardItem = document.querySelector(`[data-card-id="${cardId}"]`);
    if (cardItem) {
      cardItem.classList.toggle("selected", selected);
    }

    this.updateSelectionUI();
  }

  selectAllCards(selectAll) {
    if (!this.selectedCards) {
      this.selectedCards = new Set();
    }

    const cardsList = document.getElementById("cardsList");
    const visibleCardItems = Array.from(
      cardsList.querySelectorAll(".card-item")
    ).filter((item) => item.style.display !== "none");

    visibleCardItems.forEach((cardItem) => {
      const cardId = cardItem.getAttribute("data-card-id");
      const checkbox = cardItem.querySelector(".card-select");

      if (checkbox) {
        checkbox.checked = selectAll;
        this.toggleCardSelection(cardId, selectAll);
      }
    });
  }

  updateSelectionUI() {
    if (!this.selectedCards) {
      this.selectedCards = new Set();
    }

    const selectedCount = this.selectedCards.size;
    const bulkActions = document.getElementById("bulkActions");
    const selectedCountSpan = document.getElementById("selectedCount");
    const selectAllCheckbox = document.getElementById("selectAllCards");

    if (bulkActions) {
      bulkActions.style.display = selectedCount > 0 ? "flex" : "none";
    }

    if (selectedCountSpan) {
      selectedCountSpan.textContent = selectedCount;
    }

    if (selectAllCheckbox) {
      const visibleCards = Array.from(
        document.querySelectorAll(".card-item")
      ).filter((item) => item.style.display !== "none").length;

      selectAllCheckbox.indeterminate =
        selectedCount > 0 && selectedCount < visibleCards;
      selectAllCheckbox.checked =
        selectedCount > 0 && selectedCount === visibleCards;
    }
  }

  clearSelection() {
    if (!this.selectedCards) {
      this.selectedCards = new Set();
    }

    this.selectedCards.clear();

    // Uncheck all checkboxes
    document.querySelectorAll(".card-select").forEach((checkbox) => {
      checkbox.checked = false;
    });

    // Remove selected class
    document.querySelectorAll(".card-item.selected").forEach((item) => {
      item.classList.remove("selected");
    });

    this.updateSelectionUI();
  }

  async deleteSelectedCards() {
    if (!this.selectedCards || this.selectedCards.size === 0) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${this.selectedCards.size} selected card(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      this.showLoading(true);

      // Delete cards one by one
      const selectedArray = Array.from(this.selectedCards);
      for (const cardId of selectedArray) {
        await this.removePaymentCard(cardId, false); // Don't reload after each deletion
      }

      // Clear selection
      this.clearSelection();

      // Reload cards once
      await this.loadPaymentCards();

      this.showNotification(
        `Successfully deleted ${selectedArray.length} card(s)`,
        "success"
      );
    } catch (error) {
      console.error("Error deleting selected cards:", error);
      this.showNotification("Error deleting selected cards", "error");
    } finally {
      this.showLoading(false);
    }
  }

  // Render database table
  async renderDatabaseTable() {
    const tableBody = document.getElementById("accountsTableBody");
    if (!tableBody) return;

    // Clear existing content
    tableBody.innerHTML = "";

    // Render each account as a table row
    for (const account of this.accounts) {
      const row = document.createElement("tr");

      // Get account info
      const accountInfo = await this.getAccountInfoFromStorage(account.name);
      const email = accountInfo?.email || account.name;
      const status = accountInfo?.status || "";
      // Use the active property from account object which is already synchronized
      const isActive = account.active === true;

      // Debug cookies data for this account
      console.log(`🍪 Account ${account.name} cookies:`, {
        cookiesFromAccount: account.cookies?.length || 0,
        cookiesFromInfo: accountInfo?.cookies?.length || 0,
        accountKeys: account ? Object.keys(account) : [],
        hasCookiesFromAccount: !!(
          account.cookies && account.cookies.length > 0
        ),
        firstCookieFromAccount: account.cookies?.[0] || null,
        cookieDataSample:
          account.cookies?.length > 0
            ? {
                domain: account.cookies[0].domain,
                name: account.cookies[0].name,
                expirationDate: account.cookies[0].expirationDate,
              }
            : null,
      });

      // Determine plan from status
      let plan = "Free";
      if (status) {
        const statusLower = status.toLowerCase();
        if (statusLower.includes("pro") && statusLower.includes("trial")) {
          plan = "Pro Trial";
        } else if (statusLower.includes("pro")) {
          plan = "Pro";
        } else if (statusLower.includes("business")) {
          plan = "Business";
        }
      }

      // Escape account name for onclick handlers (use account.name not email)
      const escapedName = account.name.replace(/'/g, "\\'");

      row.innerHTML = `
        <td>${this.escapeHtml(email)}</td>
        <td>${this.escapeHtml(status || "Unknown")}</td>
        <td>${this.escapeHtml(plan)}</td>
        <td>
          <span class="${isActive ? "active" : "inactive"}-badge">
            ${isActive ? "Active" : "Inactive"}
          </span>
        </td>
        <td class="action-buttons">
          <div style="font-size: 11px;">
            ${this.getCookieExpiryDisplay(account.cookies || [])}
          </div>
        </td>
      `;

      tableBody.appendChild(row);
    }
  }

  async getActiveAccountFromStorage() {
    const result = await chrome.storage.local.get("activeAccount");
    return result.activeAccount || null;
  }

  async getAccountInfoFromStorage(accountName) {
    const result = await chrome.storage.local.get("cursorAccountInfo");
    const infoData = result.cursorAccountInfo || {};
    return infoData[accountName] || null;
  }

  async showAccountDetails(accountName) {
    const modal = document.getElementById("accountInfoModal");
    const content = document.getElementById("accountInfoContent");

    if (!modal || !content) return;

    // Get account data
    const account = this.accounts.find((acc) => acc.name === accountName);
    if (!account) {
      this.showNotification("Account not found", "error");
      return;
    }

    // Get account info
    const accountInfo = await this.getAccountInfoFromStorage(accountName);
    const activeAccount = await this.getActiveAccountFromStorage();
    const isActive = activeAccount === accountName;

    // Format cookies info
    const cookieCount = account.cookies ? account.cookies.length : 0;

    // Build content
    content.innerHTML = `
      <div style="padding: 10px;">
        <h4 style="margin-top: 0;">${accountInfo?.email || accountName}</h4>
        
        <div style="margin-bottom: 15px;">
          <strong>Status:</strong> ${accountInfo?.status || "Unknown"}<br>
          <strong>Active:</strong> ${isActive ? "Yes" : "No"}<br>
          <strong>Cookies:</strong> ${cookieCount}
        </div>
        
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
          <div style="padding: 8px; background: #f8f9fa; border-radius: 4px; margin-top: 8px;">
            <div style="font-size: 12px; color: #495057;">
              ${
                !isActive
                  ? "💡 Click outside modal to return to account list"
                  : "✅ This is your active account"
              }
            </div>
          </div>
        </div>
      </div>
    `;

    // Show modal
    modal.style.display = "flex";

    // Setup close handlers
    const closeBtn = document.getElementById("closeAccountInfoModal");
    const closeBtn2 = document.getElementById("closeAccountInfoBtn");

    const closeHandler = () => {
      modal.style.display = "none";
    };

    if (closeBtn) closeBtn.onclick = closeHandler;
    if (closeBtn2) closeBtn2.onclick = closeHandler;

    // Close on overlay click
    modal.onclick = (e) => {
      if (e.target === modal) closeHandler();
    };
  }

  async loadDatabaseView() {
    try {
      // Get accounts from storage
      const response = await chrome.runtime.sendMessage({
        type: "getAllAccounts",
      });

      if (response.success) {
        this.databaseAccounts = response.data || [];

        console.log(
          "📊 Loaded database accounts with cookies:",
          this.databaseAccounts
        );

        // Debug: Check if cookies are loaded
        this.databaseAccounts.forEach((account, index) => {
          console.log(`Account ${index + 1} (${account.email}):`, {
            cookiesCount: account.cookies ? account.cookies.length : 0,
            cookies: account.cookies,
          });
        });

        // Update record count
        const recordCount = document.getElementById("dbRecordCount");
        if (recordCount) {
          recordCount.textContent = `${this.databaseAccounts.length} accounts`;
        }

        // Render current view
        if (this.currentDbView === "table") {
          this.renderTableView();
        } else {
          this.renderCardView();
        }
      } else {
        console.error("Failed to load accounts:", response.error);
        this.showNotification("Failed to load database", "error");
      }
    } catch (error) {
      console.error("Error loading database view:", error);
      this.showNotification("Error loading database", "error");
    }
  }

  renderTableView() {
    const tableBody = document.getElementById("dbTableBody");
    const emptyMessage = document.getElementById("dbTableEmpty");

    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (this.databaseAccounts.length === 0) {
      if (emptyMessage) emptyMessage.style.display = "block";
      return;
    }

    if (emptyMessage) emptyMessage.style.display = "none";

    this.databaseAccounts.forEach((account, index) => {
      const row = document.createElement("tr");

      // Parse account details - ensure email is a string
      const email = String(account.email || account.name || "Unknown");
      const escapedEmail = email.replace(/'/g, "\\'");
      const status = account.isActive ? "Active" : "Inactive";
      const plan = account.plan || "Free";
      const cookieCount = account.cookies ? account.cookies.length : 0;
      const addedDate = account.dateAdded
        ? new Date(account.dateAdded).toLocaleDateString()
        : "Unknown";

      row.innerHTML = `
        <td style="padding: 10px 12px; border-bottom: 1px solid var(--border-color);">${
          index + 1
        }</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid var(--border-color); font-weight: 500;">${email}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid var(--border-color);">
          <span class="status-badge ${status.toLowerCase()}">${status}</span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid var(--border-color);">${plan}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid var(--border-color);">${cookieCount} cookies</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid var(--border-color);">${addedDate}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid var(--border-color);">
          <div style="font-size: 11px;">
            ${this.getCookieExpiryDisplay(account.cookies || [])}
          </div>
        </td>
      `;

      tableBody.appendChild(row);
    });
  }

  /**
   * Get cookie expiry display information
   * @param {Array} cookies - Array of cookies
   * @returns {string} HTML string for displaying cookie expiry info
   */
  getCookieExpiryDisplay(cookies) {
    console.log("📊 getCookieExpiryDisplay called with cookies:", cookies);

    if (!cookies || cookies.length === 0) {
      return `<span style="color: #6c757d;">No cookies</span>`;
    }

    const now = Date.now() / 1000; // Current time in seconds
    const expiredCookies = [];
    const validCookies = [];
    const sessionCookies = [];

    cookies.forEach((cookie) => {
      const expirationDate = cookie.expirationDate || cookie.expiration_date;

      if (!expirationDate || cookie.session === true) {
        // Session cookie (no expiration)
        sessionCookies.push(cookie);
      } else if (expirationDate < now) {
        // Expired cookie
        expiredCookies.push(cookie);
      } else {
        // Valid cookie with expiration
        validCookies.push(cookie);
      }
    });

    console.log("📊 Cookie analysis:", {
      total: cookies.length,
      expired: expiredCookies.length,
      valid: validCookies.length,
      session: sessionCookies.length,
    });

    // Show expired cookies with priority
    if (expiredCookies.length > 0) {
      const totalActive = validCookies.length + sessionCookies.length;
      return `
        <span style="color: #dc3545; font-weight: 500;">❌ ${expiredCookies.length} expired</span>
        <div style="margin-top: 2px; color: #666; font-size: 10px;">
          ${totalActive} still valid
        </div>
      `;
    }

    // Show warning for cookies expiring soon
    if (validCookies.length > 0) {
      const earliestExpiry = Math.min(
        ...validCookies.map((c) => c.expirationDate || c.expiration_date)
      );
      const expiryDate = new Date(earliestExpiry * 1000);
      const now = new Date();
      const daysUntilExpiry = Math.ceil(
        (expiryDate - now) / (1000 * 60 * 60 * 24)
      );

      console.log("📅 Cookie expiry analysis:", {
        earliestExpiry: earliestExpiry,
        expiryDate: expiryDate,
        daysUntilExpiry: daysUntilExpiry,
      });

      if (daysUntilExpiry <= 0) {
        return `
          <span style="color: #dc3545; font-weight: 500;">❌ Expired today</span>
          <div style="margin-top: 2px; color: #666; font-size: 10px;">
            ${expiryDate.toLocaleDateString()}
          </div>
        `;
      } else if (daysUntilExpiry <= 7) {
        return `
          <span style="color: #ffc107; font-weight: 500;">⚠️ ${daysUntilExpiry} days left</span>
          <div style="margin-top: 2px; color: #666; font-size: 10px;">
            Expires ${expiryDate.toLocaleDateString()}
          </div>
        `;
      } else {
        return `
          <span style="color: #28a745; font-weight: 500;">✅ Valid</span>
          <div style="margin-top: 2px; color: #666; font-size: 10px;">
            Until ${expiryDate.toLocaleDateString()}
          </div>
        `;
      }
    }

    // Only session cookies (no expiration)
    if (sessionCookies.length > 0) {
      return `
        <span style="color: #28a745; font-weight: 500;">✅ Session (${sessionCookies.length})</span>
        <div style="margin-top: 2px; color: #666; font-size: 10px;">
          No expiration set
        </div>
      `;
    }

    return `<span style="color: #6c757d;">No valid cookies</span>`;
  }

  renderCardView() {
    const cardGrid = document.getElementById("dbCardGrid");
    const emptyMessage = document.getElementById("dbCardEmpty");

    if (!cardGrid) return;

    cardGrid.innerHTML = "";

    if (this.databaseAccounts.length === 0) {
      if (emptyMessage) emptyMessage.style.display = "block";
      return;
    }

    if (emptyMessage) emptyMessage.style.display = "none";

    this.databaseAccounts.forEach((account, index) => {
      const card = document.createElement("div");
      card.className = "db-card";

      // Ensure email is a string
      const email = String(account.email || account.name || "Unknown");
      const status = account.isActive ? "Active" : "Inactive";
      const plan = account.plan || "Free";
      const cookieCount = account.cookies ? account.cookies.length : 0;
      const addedDate = account.dateAdded
        ? new Date(account.dateAdded).toLocaleDateString()
        : "Unknown";
      // Safely get first character
      const avatar =
        email && email.length > 0 ? email.charAt(0).toUpperCase() : "?";
      // Escape email for use in onclick
      const escapedEmail = email.replace(/'/g, "\\'");

      card.innerHTML = `
        <div class="db-card-header">
          <div class="db-card-avatar">${avatar}</div>
          <div class="db-card-title">
            <div class="db-card-email">${email}</div>
            <div class="db-card-id">Account #${index + 1}</div>
          </div>
        </div>
        <div class="db-card-body">
          <div class="db-card-row">
            <span class="db-card-label">Status:</span>
            <span class="db-card-value"><span class="status-badge ${status.toLowerCase()}">${status}</span></span>
          </div>
          <div class="db-card-row">
            <span class="db-card-label">Plan:</span>
            <span class="db-card-value">${plan}</span>
          </div>
          <div class="db-card-row">
            <span class="db-card-label">Cookies:</span>
            <span class="db-card-value">${cookieCount}</span>
          </div>
          <div class="db-card-row">
            <span class="db-card-label">Added:</span>
            <span class="db-card-value">${addedDate}</span>
          </div>
        </div>
        <div class="db-card-footer">
          <div style="font-size: 11px; color: #666; margin-bottom: 8px;">
            ${this.getCookieExpiryDisplay(account.cookies || [])}
          </div>
          <div style="font-size: 10px; color: #999;">
            Click row for details
          </div>
        </div>
      `;

      cardGrid.appendChild(card);
    });
  }

  async deleteAccountFromDb(email) {
    const confirmed = confirm(
      `Are you sure you want to delete the account: ${email}?`
    );
    if (!confirmed) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: "deleteAccount",
        email: email,
      });

      if (response.success) {
        this.showNotification(
          `Account ${email} deleted successfully`,
          "success"
        );
        await this.loadDatabaseView();
        await this.loadAccounts();
        this.updateUI();
      } else {
        this.showNotification(
          `Failed to delete account: ${response.error}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      this.showNotification("Error deleting account", "error");
    }
  }

  async exportDatabaseView() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "exportDatabase",
      });

      if (response.success) {
        this.showNotification(
          `Database exported to: ${response.filename}`,
          "success"
        );
      } else {
        this.showNotification(`Export failed: ${response.error}`, "error");
      }
    } catch (error) {
      console.error("Error exporting database:", error);
      this.showNotification("Error exporting database", "error");
    }
  }

  async exportAccount(email) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "exportAccount",
        email: email,
      });

      if (response.success) {
        // Create a download for the account JSON
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cursor_account_${email.replace(/[@.]/g, "_")}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification(
          `Account ${email} exported successfully`,
          "success"
        );
      } else {
        this.showNotification(
          `Failed to export account: ${response.error}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error exporting account:", error);
      this.showNotification("Error exporting account", "error");
    }
  }

  // Account filtering functionality - FIXED
  filterAccounts() {
    console.log("filterAccounts called", this.accountFilters);

    if (!this.accountFilters) {
      console.log("No account filters initialized");
      return;
    }

    const accountsList = document.getElementById("accountsList");
    if (!accountsList) {
      console.log("Accounts list not found");
      return;
    }

    const accountItems = accountsList.querySelectorAll(".sidebar-account-item");
    console.log(`Found ${accountItems.length} account items to filter`);

    let visibleCount = 0;

    accountItems.forEach((accountItem) => {
      const accountName =
        accountItem.getAttribute("data-account-name") ||
        accountItem.getAttribute("data-account");
      const account = this.accounts.find((acc) => acc.name === accountName);

      console.log(
        `Processing account item with name: ${accountName}, found account:`,
        account
      );

      if (!account) {
        console.log(`Account not found for: ${accountName}`);
        accountItem.style.display = "none";
        return;
      }

      // Get account info from different sources
      const accountInfo = account.info || {};
      const accountStatus = (
        accountInfo.status ||
        account.status ||
        ""
      ).toLowerCase();
      const accountEmail = (
        accountInfo.email ||
        account.email ||
        account.name ||
        ""
      ).toLowerCase();

      console.log(
        `Filtering account: ${account.name}, status: ${accountStatus}, email: ${accountEmail}`
      );

      const matchesSearch =
        !this.accountFilters.search ||
        account.name.toLowerCase().includes(this.accountFilters.search) ||
        accountEmail.includes(this.accountFilters.search) ||
        accountStatus.includes(this.accountFilters.search);

      let matchesStatus = true;
      if (this.accountFilters.status && this.accountFilters.status !== "") {
        if (this.accountFilters.status === "empty") {
          // Filter for empty status
          matchesStatus = !accountStatus || accountStatus === "";
        } else {
          // Handle "pro plan" vs "pro" compatibility
          if (this.accountFilters.status === "pro plan") {
            matchesStatus =
              accountStatus === "pro plan" || accountStatus === "pro";
          } else {
            matchesStatus = accountStatus === this.accountFilters.status;
          }
        }
      }
      // If accountFilters.status is empty string (""), show all (matchesStatus = true)

      const shouldShow = matchesSearch && matchesStatus;
      accountItem.style.display = shouldShow ? "flex" : "none";

      console.log(
        `Account ${account.name}: matchesSearch=${matchesSearch}, matchesStatus=${matchesStatus}, shouldShow=${shouldShow}, display=${accountItem.style.display}`
      );

      if (shouldShow) {
        visibleCount++;
      }
    });

    // Update account count with filtered results
    const accountCount = document.getElementById("accountsCount");
    if (accountCount) {
      if (this.accountFilters.search || this.accountFilters.status) {
        accountCount.textContent = `(${visibleCount}/${this.accounts.length})`;
      } else {
        accountCount.textContent = `(${this.accounts.length})`;
      }
    }

    console.log(
      `Filter result: ${visibleCount}/${this.accounts.length} accounts visible`
    );
  }

  // Show import cards modal
  showImportCardsModal() {
    document.getElementById("importCardsModal").style.display = "block";
    document.getElementById("cardsInput").value = "";
    document.getElementById("replaceCardsCheck").checked = false;
    document.getElementById("cardsInput").focus();
  }

  // Hide import cards modal
  hideImportCardsModal() {
    document.getElementById("importCardsModal").style.display = "none";
  }

  // Import cards from text
  async importCardsFromText() {
    const cardsInput = document.getElementById("cardsInput").value.trim();
    const replaceCards = document.getElementById("replaceCardsCheck").checked;

    if (!cardsInput) {
      this.showNotification("Please paste card data", "error");
      return;
    }

    try {
      this.showLoading(true);

      const response = await chrome.runtime.sendMessage({
        type: "importPaymentCards",
        cardData: cardsInput,
        replace: replaceCards,
      });

      if (response.success) {
        this.showNotification(`Imported ${response.data} cards`, "success");
        this.hideImportCardsModal();
        await this.loadPaymentCards();
      } else {
        this.showNotification("Failed to import cards", "error");
      }
    } catch (error) {
      console.error("Error importing cards:", error);
      this.showNotification("Error importing cards", "error");
    } finally {
      this.showLoading(false);
    }
  }

  // Handle cards file import
  async handleCardsFileImport(files) {
    if (!files || files.length === 0) return;

    let importedTotal = 0;
    this.showLoading(true);

    try {
      for (const file of files) {
        const text = await file.text();

        const response = await chrome.runtime.sendMessage({
          type: "importPaymentCards",
          cardData: text,
          replace: false,
        });

        if (response.success) {
          importedTotal += response.data;
        }
      }

      this.showNotification(
        `Imported ${importedTotal} cards from ${files.length} files`,
        "success"
      );
      await this.loadPaymentCards();
    } catch (error) {
      console.error("Error importing card files:", error);
      this.showNotification("Error importing card files", "error");
    } finally {
      this.showLoading(false);
      document.getElementById("cardsFileInput").value = "";
    }
  }

  // Export cards to file
  async exportCards() {
    try {
      this.showLoading(true);

      const response = await chrome.runtime.sendMessage({
        type: "exportPaymentCards",
      });

      if (response.success) {
        if (response.data.length === 0) {
          this.showNotification("No cards to export", "warning");
          return;
        }

        // Create a blob with the card data
        const cardData = response.data.join("\n");
        const blob = new Blob([cardData], { type: "text/plain" });

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cursor_payment_cards_${new Date()
          .toISOString()
          .slice(0, 10)}.txt`;

        // Trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification(
          `Exported ${response.data.length} cards`,
          "success"
        );
      } else {
        this.showNotification("Failed to export cards", "error");
      }
    } catch (error) {
      console.error("Error exporting cards:", error);
      this.showNotification("Error exporting cards", "error");
    } finally {
      this.showLoading(false);
    }
  }

  // Auto-fill payment card
  async autoFillCard(cardId) {
    try {
      this.showLoading(true);

      const response = await chrome.runtime.sendMessage({
        type: "autoFillPayment",
        cardId: cardId,
      });

      if (response.success) {
        const { filled, cardType } = response.data;
        this.showNotification(
          `Auto-filled ${filled} fields (${cardType})`,
          "success"
        );
      } else {
        this.showNotification("Auto-fill failed: " + response.error, "error");
      }
    } catch (error) {
      console.error("Error auto-filling card:", error);
      this.showNotification("Error auto-filling card", "error");
    } finally {
      this.showLoading(false);
    }
  }

  // Find payment fields
  async findPaymentFields() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "findPaymentFields",
      });

      if (response.success) {
        const info = response.data;
        const infoEl = document.getElementById("paymentFormInfo");
        const fieldsEl = document.getElementById("formFieldsInfo");

        if (info.found > 0) {
          fieldsEl.innerHTML = `Found ${info.found} payment fields on this page`;
          infoEl.style.display = "block";
          this.showNotification(
            `Found ${info.found} payment fields`,
            "success"
          );
        } else {
          infoEl.style.display = "none";
          this.showNotification(
            "No payment fields detected on this page",
            "info"
          );
        }
      } else {
        this.showNotification("Could not scan page", "error");
      }
    } catch (error) {
      console.error("Error finding payment fields:", error);
      this.showNotification("Error scanning page", "error");
    }
  }

  // Remove card
  async removePaymentCard(cardId) {
    if (!confirm("Remove this payment card?")) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: "removePaymentCard",
        cardId: cardId,
      });

      if (response.success) {
        this.showNotification("Card removed", "success");
        await this.loadPaymentCards();
      } else {
        this.showNotification("Failed to remove card", "error");
      }
    } catch (error) {
      console.error("Error removing card:", error);
      this.showNotification("Error removing card", "error");
    }
  }

  // Clear all cards
  async clearAllCards() {
    if (!confirm("Clear all payment cards? This cannot be undone.")) {
      return;
    }

    try {
      this.showLoading(true);

      const response = await chrome.runtime.sendMessage({
        type: "clearPaymentCards",
      });

      if (response.success) {
        this.showNotification("All cards cleared", "success");
        await this.loadPaymentCards();
      } else {
        this.showNotification("Failed to clear cards", "error");
      }
    } catch (error) {
      console.error("Error clearing cards:", error);
      this.showNotification("Error clearing cards", "error");
    } finally {
      this.showLoading(false);
    }
  }

  // Debug Panel Methods
  toggleDebugPanel() {
    const debugBtn = document.getElementById("debugToggle");
    const debugPanel = document.getElementById("debugPanel");

    const isVisible = debugBtn.style.display !== "none";

    debugBtn.style.display = isVisible ? "none" : "inline-block";
    debugPanel.style.display = isVisible ? "none" : "block";

    if (!isVisible) {
      this.showNotification(
        "Debug mode enabled (Ctrl+Shift+D to toggle)",
        "info"
      );
    }
  }

  async showStoredData() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "getAllStoredData",
      });

      const debugOutput = document.getElementById("debugOutput");

      if (response.success) {
        debugOutput.textContent = JSON.stringify(response.data, null, 2);
        this.showNotification("Stored data loaded", "success");
      } else {
        debugOutput.textContent = "Error loading stored data";
        this.showNotification("Error loading stored data", "error");
      }
    } catch (error) {
      console.error("Error showing stored data:", error);
      this.showNotification("Error showing stored data", "error");
    }
  }

  // Account Deletion Methods
  async deleteFreeAccount() {
    const confirmed = confirm(
      "⚠️ DELETE FREE ACCOUNT\n\n" +
        "This will PERMANENTLY delete your Cursor account.\n" +
        "This action CANNOT be undone.\n\n" +
        "The process will:\n" +
        "1. Open Cursor dashboard settings\n" +
        "2. Automatically click delete\n" +
        "3. Fill confirmation text\n" +
        "4. Complete account deletion\n\n" +
        "Are you absolutely sure you want to continue?"
    );

    if (!confirmed) return;

    const doubleConfirm = confirm(
      "🚨 FINAL WARNING\n\n" +
        "This will permanently delete your FREE Cursor account.\n" +
        "All your settings, preferences, and data will be lost.\n\n" +
        "Type YES in the next prompt if you're sure."
    );

    if (!doubleConfirm) return;

    const finalConfirm = prompt(
      "Type 'DELETE FREE ACCOUNT' to confirm permanent deletion:"
    );

    if (finalConfirm !== "DELETE FREE ACCOUNT") {
      this.showNotification("Account deletion cancelled", "info");
      return;
    }

    try {
      this.showLoading(true);
      this.showNotification("Initiating free account deletion...", "info");

      const response = await chrome.runtime.sendMessage({
        type: "deleteFreeAccount",
      });

      if (response.success) {
        this.showNotification(
          "Free account deletion initiated! Check the opened tab.",
          "success"
        );

        // Monitor deletion status
        this.monitorDeletionStatus();
      } else {
        this.showNotification(
          "Failed to initiate account deletion: " + response.error,
          "error"
        );
      }
    } catch (error) {
      console.error("Error deleting free account:", error);
      this.showNotification("Error initiating account deletion", "error");
    } finally {
      this.showLoading(false);
    }
  }

  async deleteProTrialAccount() {
    const confirmed = confirm(
      "⚠️ DELETE PRO TRIAL ACCOUNT\n\n" +
        "This will PERMANENTLY delete your Cursor Pro Trial account.\n" +
        "This action CANNOT be undone.\n\n" +
        "The process will:\n" +
        "1. Open Cursor dashboard billing\n" +
        "2. Open Stripe billing portal\n" +
        "3. Cancel your subscription\n" +
        "4. Delete your account\n\n" +
        "Are you absolutely sure you want to continue?"
    );

    if (!confirmed) return;

    const doubleConfirm = confirm(
      "🚨 FINAL WARNING\n\n" +
        "This will permanently delete your PRO TRIAL Cursor account.\n" +
        "Your subscription will be cancelled and account deleted.\n" +
        "All your settings, preferences, and data will be lost.\n\n" +
        "Type YES in the next prompt if you're sure."
    );

    if (!doubleConfirm) return;

    const finalConfirm = prompt(
      "Type 'DELETE PRO TRIAL ACCOUNT' to confirm permanent deletion:"
    );

    if (finalConfirm !== "DELETE PRO TRIAL ACCOUNT") {
      this.showNotification("Account deletion cancelled", "info");
      return;
    }

    try {
      this.showLoading(true);
      this.showNotification("Initiating pro trial account deletion...", "info");

      const response = await chrome.runtime.sendMessage({
        type: "deleteProTrialAccount",
      });

      if (response.success) {
        this.showNotification(
          "Pro trial account deletion initiated! Check the opened tabs.",
          "success"
        );

        // Monitor deletion status
        this.monitorDeletionStatus();
      } else {
        this.showNotification(
          "Failed to initiate account deletion: " + response.error,
          "error"
        );
      }
    } catch (error) {
      console.error("Error deleting pro trial account:", error);
      this.showNotification("Error initiating account deletion", "error");
    } finally {
      this.showLoading(false);
    }
  }

  // Monitor deletion status
  async monitorDeletionStatus() {
    const maxChecks = 60; // Check for 1 minute
    let checks = 0;

    const checkStatus = async () => {
      checks++;

      try {
        const response = await chrome.runtime.sendMessage({
          type: "checkDeletionStatus",
        });

        if (response.success && response.inProgress) {
          if (checks < maxChecks) {
            setTimeout(checkStatus, 1000); // Check every second
          } else {
            this.showNotification(
              "Deletion process taking longer than expected. Please check manually.",
              "info"
            );
          }
        } else {
          this.showNotification(
            "Account deletion process completed.",
            "success"
          );
        }
      } catch (error) {
        console.error("Error checking deletion status:", error);
      }
    };

    setTimeout(checkStatus, 2000); // Start checking after 2 seconds
  }

  // ============= BYPASS TESTING FUNCTIONALITY =============

  setupDatabaseViewerListeners() {
    // Toggle database view button for accounts
    const toggleDbViewBtn = document.getElementById("toggleDatabaseView");
    if (toggleDbViewBtn) {
      toggleDbViewBtn.addEventListener("click", () =>
        this.toggleDatabaseView()
      );
    }

    // Toggle table view button for cards
    const toggleCardsBtn = document.getElementById("toggleCardsTableView");
    if (toggleCardsBtn) {
      toggleCardsBtn.addEventListener("click", () =>
        this.toggleCardsTableView()
      );
    }
  }

  toggleDatabaseView() {
    const tableView = document.getElementById("databaseTableView");
    const listView = document.getElementById("accountsList");
    const toggleBtn = document.getElementById("toggleDatabaseView");
    const toggleText = document.getElementById("dbViewToggleText");

    if (this.isDatabaseViewActive) {
      // Switch to simple list view
      tableView.style.display = "none";
      listView.style.display = "block";
      toggleText.textContent = "Table View";
      toggleBtn.classList.remove("btn-primary");
      toggleBtn.classList.add("btn-secondary");
      this.isDatabaseViewActive = false;
    } else {
      // Switch to database table view
      tableView.style.display = "block";
      listView.style.display = "none";
      toggleText.textContent = "Simple View";
      toggleBtn.classList.remove("btn-secondary");
      toggleBtn.classList.add("btn-primary");
      this.isDatabaseViewActive = true;
      this.renderDatabaseTable();
    }
  }

  toggleCardsTableView() {
    const tableView = document.getElementById("cardsTableView");
    const listView = document.getElementById("cardsList");
    const toggleBtn = document.getElementById("toggleCardsTableView");
    const toggleText = document.getElementById("cardsViewToggleText");

    if (this.isCardsTableViewActive) {
      // Switch to simple card view
      tableView.style.display = "none";
      listView.style.display = "block";
      toggleText.textContent = "Table View";
      toggleBtn.classList.remove("btn-primary");
      toggleBtn.classList.add("btn-secondary");
      this.isCardsTableViewActive = false;
    } else {
      // Switch to table view
      tableView.style.display = "block";
      listView.style.display = "none";
      toggleText.textContent = "Card View";
      toggleBtn.classList.remove("btn-secondary");
      toggleBtn.classList.add("btn-primary");
      this.isCardsTableViewActive = true;
      this.renderCardsTable();
    }
  }

  renderCardsTable() {
    const tableBody = document.getElementById("cardsTableBody");
    if (!tableBody) return;

    // Clear existing content
    tableBody.innerHTML = "";

    // Render each card as a table row
    this.paymentCards.forEach((card, index) => {
      const row = document.createElement("tr");

      // Format card number
      const maskedNumber = card.number
        ? `**** **** **** ${card.number.slice(-4)}`
        : "Unknown";

      row.innerHTML = `
        <td>${this.escapeHtml(maskedNumber)}</td>
        <td>${this.escapeHtml(card.type || "Unknown")}</td>
        <td>${this.escapeHtml(card.expiry || "Unknown")}</td>
        <td>${this.escapeHtml(card.cvv || "***")}</td>
        <td class="action-buttons">
          <div class="card-actions-info" style="font-size: 11px; color: #666;">
            <div>💳 Card ready for auto-fill</div>
            <div style="margin-top: 2px; color: #999;">Click 🔍 Find Fields first</div>
          </div>
        </td>
      `;

      tableBody.appendChild(row);
    });
  }

  setupBypassEventListeners() {
    // Detect URL button
    const detectUrlBtn = document.getElementById("bypassDetectUrl");
    if (detectUrlBtn) {
      detectUrlBtn.addEventListener("click", () => this.detectCurrentUrl());
    }

    // Select all techniques
    const selectAllBtn = document.getElementById("bypassSelectAll");
    if (selectAllBtn) {
      selectAllBtn.addEventListener("click", () => this.selectAllTechniques());
    }

    // Technique checkboxes
    document
      .querySelectorAll('.technique-item input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.addEventListener("change", () => this.updateTestCount());
      });

    // Start testing button
    const startBtn = document.getElementById("startBypassTest");
    if (startBtn) {
      startBtn.addEventListener("click", () => this.startBypassTesting());
    }

    // Stop testing button
    const stopBtn = document.getElementById("stopBypassTest");
    if (stopBtn) {
      stopBtn.addEventListener("click", () => this.stopBypassTesting());
    }

    // Export results button
    const exportBtn = document.getElementById("exportBypassResults");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportBypassResults());
    }

    // View results button
    const viewResultsBtn = document.getElementById("viewBypassResults");
    if (viewResultsBtn) {
      viewResultsBtn.addEventListener("click", () => this.viewBypassResults());
    }

    // Open console button
    const consoleBtn = document.getElementById("openBypassConsole");
    if (consoleBtn) {
      consoleBtn.addEventListener("click", () => this.openBypassConsole());
    }
  }

  initializeBypassTab() {
    // Reset UI when switching to bypass tab
    this.resetBypassUI();
    this.updateTestCount();
  }

  async detectCurrentUrl() {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab && tab.url) {
        // Check if it's a Cursor API endpoint
        if (tab.url.includes("cursor.com") || tab.url.includes("cursor.sh")) {
          document.getElementById("bypassTargetUrl").value = tab.url;
          this.showNotification("URL detected from current tab", "success");
        } else {
          // If not on cursor.com, try to use a default endpoint
          const defaultEndpoint =
            "https://cursor.com/api/dashboard/delete-account";
          document.getElementById("bypassTargetUrl").value = defaultEndpoint;
          this.showNotification("Using default Cursor API endpoint", "info");

          // Only try to send message if we're on a regular http/https page
          if (tab.url.startsWith("http://") || tab.url.startsWith("https://")) {
            try {
              const response = await chrome.tabs.sendMessage(tab.id, {
                type: "detectApiEndpoints",
              });

              if (
                response &&
                response.endpoints &&
                response.endpoints.length > 0
              ) {
                document.getElementById("bypassTargetUrl").value =
                  response.endpoints[0];
                this.showNotification(
                  `Found ${response.endpoints.length} API endpoints`,
                  "success"
                );
              }
            } catch (msgError) {
              // Ignore message error, use default endpoint
              console.log("Could not connect to tab, using default endpoint");
            }
          }
        }
      } else {
        // Use default endpoint if no tab available
        const defaultEndpoint =
          "https://cursor.com/api/dashboard/delete-account";
        document.getElementById("bypassTargetUrl").value = defaultEndpoint;
        this.showNotification("Using default Cursor API endpoint", "info");
      }
    } catch (error) {
      console.error("Error detecting URL:", error);
      // Use default endpoint on error
      const defaultEndpoint = "https://cursor.com/api/dashboard/delete-account";
      document.getElementById("bypassTargetUrl").value = defaultEndpoint;
      this.showNotification("Using default Cursor API endpoint", "info");
    }
  }

  selectAllTechniques() {
    const checkboxes = document.querySelectorAll(
      '.technique-item input[type="checkbox"]'
    );
    const allChecked = Array.from(checkboxes).every((cb) => cb.checked);

    checkboxes.forEach((checkbox) => {
      checkbox.checked = !allChecked;
    });

    this.updateTestCount();
  }

  updateTestCount() {
    const checkboxes = document.querySelectorAll(
      '.technique-item input[type="checkbox"]:checked'
    );
    const techniques = Array.from(checkboxes).map((cb) => cb.dataset.technique);

    // Calculate total tests based on selected techniques
    const testCounts = {
      parameter: 15,
      header: 15,
      method: 20,
      content: 9,
      auth: 6,
      storage: 20,
      frontend: 5,
      race: 10,
      encoding: 9,
      endpoint: 7,
    };

    let totalTests = 0;
    techniques.forEach((tech) => {
      totalTests += testCounts[tech] || 0;
    });

    const totalTestsEl = document.getElementById("bypassTotalTests");
    if (totalTestsEl) {
      totalTestsEl.textContent = `${totalTests} tests selected`;
    }
  }

  async startBypassTesting() {
    const targetUrl = document.getElementById("bypassTargetUrl").value.trim();

    if (!targetUrl) {
      this.showNotification("Please enter a target URL", "warning");
      return;
    }

    // Get selected techniques
    const checkboxes = document.querySelectorAll(
      '.technique-item input[type="checkbox"]:checked'
    );
    const techniques = Array.from(checkboxes).map((cb) => cb.dataset.technique);

    if (techniques.length === 0) {
      this.showNotification("Please select at least one technique", "warning");
      return;
    }

    // Update UI
    document.getElementById("startBypassTest").disabled = true;
    document.getElementById("stopBypassTest").disabled = false;
    document.getElementById("bypassProgressSection").style.display = "block";
    document.getElementById("bypassResultsSection").style.display = "none";

    // Get settings from bypass settings manager
    const settings = this.bypassSettings
      ? this.bypassSettings.getSettings()
      : {};

    // Use the bypass handler to start testing
    if (this.bypassHandler) {
      await this.bypassHandler.startTest(targetUrl, techniques, settings);
    } else {
      console.error("Bypass handler not initialized");
      this.showNotification("Failed to start bypass testing", "error");
      this.resetBypassUI();
    }
  }

  async monitorBypassProgress() {
    if (!this.bypassTestRunning) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: "getBypassProgress",
      });

      if (response.success) {
        const { progress, total, current, results } = response.data;

        // Update progress bar
        const progressPercent = (progress / total) * 100;
        document.getElementById(
          "bypassProgressFill"
        ).style.width = `${progressPercent}%`;
        document.getElementById("bypassProgressText").textContent = `Testing ${
          current || "..."
        }... (${progress}/${total})`;

        // Store results
        if (results) {
          this.bypassTestResults = results;
        }

        // Check if completed
        if (progress >= total) {
          this.completeBypassTesting();
        } else {
          // Continue monitoring
          setTimeout(() => this.monitorBypassProgress(), 500);
        }
      }
    } catch (error) {
      console.error("Error monitoring bypass progress:", error);
    }
  }

  completeBypassTesting() {
    this.bypassTestRunning = false;

    // Update UI
    document.getElementById("startBypassTest").disabled = false;
    document.getElementById("stopBypassTest").disabled = true;
    document.getElementById("bypassProgressSection").style.display = "none";
    document.getElementById("bypassResultsSection").style.display = "block";

    // Display results
    this.displayBypassResults();

    this.showNotification("Bypass testing completed!", "success");
  }

  async stopBypassTesting() {
    if (this.bypassHandler) {
      this.bypassHandler.stopTest();
      this.showNotification("Bypass testing stopped", "info");
    }
    this.resetBypassUI();
  }

  displayBypassResults() {
    if (!this.bypassTestResults || this.bypassTestResults.length === 0) {
      document.getElementById("bypassResultDetails").innerHTML =
        '<div class="empty-state">No results to display</div>';
      return;
    }

    // Count results by status
    let successCount = 0;
    let partialCount = 0;
    let failedCount = 0;

    this.bypassTestResults.forEach((result) => {
      if (result.status === "success") successCount++;
      else if (result.status === "partial") partialCount++;
      else failedCount++;
    });

    // Update summary
    document.getElementById("bypassSuccessCount").textContent = successCount;
    document.getElementById("bypassPartialCount").textContent = partialCount;
    document.getElementById("bypassFailedCount").textContent = failedCount;

    // Display detailed results
    const detailsHtml = this.bypassTestResults
      .filter((result) => result.status !== "failed") // Only show successful/partial
      .map(
        (result) => `
        <div class="result-item ${result.status}">
          <div class="result-header">
            <span class="result-technique">${result.technique}</span>
            <span class="result-status">${result.status}</span>
          </div>
          <div class="result-description">${result.description}</div>
          ${
            result.payload
              ? `<div class="result-payload"><code>${this.escapeHtml(
                  result.payload
                )}</code></div>`
              : ""
          }
        </div>
      `
      )
      .join("");

    document.getElementById("bypassResultDetails").innerHTML =
      detailsHtml ||
      '<div class="empty-state">No successful bypasses found</div>';
  }

  async exportBypassResults() {
    if (this.bypassHandler) {
      this.bypassHandler.exportResults();
    } else {
      this.showNotification("No bypass handler available", "error");
    }
  }

  resetBypassUI() {
    document.getElementById("startBypassTest").disabled = false;
    document.getElementById("stopBypassTest").disabled = true;
    document.getElementById("bypassProgressSection").style.display = "none";
    document.getElementById("bypassProgressFill").style.width = "0%";
    document.getElementById("bypassProgressText").textContent =
      "Initializing...";
  }

  // View bypass results
  viewBypassResults() {
    const resultsSection = document.getElementById("bypassResultsSection");

    if (resultsSection.style.display === "none") {
      // Show results if hidden
      if (this.bypassTestResults && this.bypassTestResults.length > 0) {
        resultsSection.style.display = "block";
        this.displayBypassResults();
        this.showNotification("Showing test results", "info");

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        this.showNotification(
          "No test results available. Run a test first!",
          "warning"
        );
      }
    } else {
      // Hide results if visible
      resultsSection.style.display = "none";
      this.showNotification("Results hidden", "info");
    }
  }

  // Open bypass console - Using advanced console service
  async openBypassConsole() {
    // Load console service if not loaded
    if (!window.consoleService) {
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("services/console-service.js");
      document.head.appendChild(script);

      // Wait for script to load
      await new Promise((resolve) => {
        script.onload = resolve;
        setTimeout(resolve, 1000); // Fallback timeout
      });
    }

    // Create or toggle console
    if (window.consoleService) {
      const console = window.consoleService.createConsoleUI();

      if (!console) {
        // Console was already open and got closed
        this.showNotification("Console closed", "info");
      } else {
        // Console opened
        window.consoleService.captureLog("success", [
          "Advanced console initialized",
        ]);
        window.consoleService.captureLog("info", [
          "Type :help for available commands",
        ]);

        // Log current context
        window.consoleService.captureLog("system", [
          `Context: ${this.currentTab} tab`,
          `Active account: ${this.activeAccount?.name || "None"}`,
          `URL: ${window.location.href}`,
        ]);
      }
    } else {
      // Fallback to simple console if service fails to load
      this.openSimpleConsole();
    }
  }

  // Fallback simple console
  openSimpleConsole() {
    // Create or show console panel
    let consolePanel = document.getElementById("bypassConsole");

    if (!consolePanel) {
      // Create console panel if it doesn't exist
      consolePanel = document.createElement("div");
      consolePanel.id = "bypassConsole";
      consolePanel.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 250px;
        background: #0f172a;
        border-top: 2px solid #334155;
        display: flex;
        flex-direction: column;
        z-index: 9999;
      `;

      consolePanel.innerHTML = `
        <div style="padding: 10px; background: #1e293b; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: white; font-size: 14px;">🖥️ Bypass Console</h3>
          <button 
            id="closeBypassConsole" 
            style="background: #ef4444; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer;">
            Close
          </button>
        </div>
        <div id="bypassConsoleOutput" style="flex: 1; padding: 10px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 12px; color: #94a3b8;">
          <div style="color: #10b981;">[Console] Bypass testing console initialized...</div>
        </div>
        <div style="padding: 10px; background: #1e293b;">
          <input 
            id="bypassCommandInput"
            type="text" 
            placeholder="Type command... (help for commands)"
            style="width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 4px;"
          />
        </div>
      `;

      document.body.appendChild(consolePanel);

      // Add event listeners to avoid CSP violation
      const closeBtn = document.getElementById("closeBypassConsole");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          const panel = document.getElementById("bypassConsole");
          if (panel) panel.remove();
        });
      }

      const commandInput = document.getElementById("bypassCommandInput");
      if (commandInput) {
        commandInput.addEventListener("keypress", (event) => {
          if (event.key === "Enter") {
            window.cursorSidebar.executeBypassCommand(commandInput.value);
            commandInput.value = "";
          }
        });
      }

      // Store reference for command execution
      window.cursorSidebar = this;

      this.logToConsole(
        "Console opened. Type 'help' for available commands.",
        "info"
      );
    } else {
      // Remove console if it exists
      consolePanel.remove();
    }
  }

  // Log to bypass console
  logToConsole(message, type = "log") {
    const output = document.getElementById("bypassConsoleOutput");
    if (output) {
      const colors = {
        log: "#94a3b8",
        info: "#3b82f6",
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444",
      };

      const timestamp = new Date().toLocaleTimeString();
      const logEntry = document.createElement("div");
      logEntry.style.color = colors[type] || colors.log;
      logEntry.innerHTML = `[${timestamp}] ${message}`;
      output.appendChild(logEntry);
      output.scrollTop = output.scrollHeight;
    }
  }

  // Execute bypass console command
  executeBypassCommand(command) {
    this.logToConsole(`> ${command}`, "info");

    const cmd = command.toLowerCase().trim();

    switch (cmd) {
      case "help":
        this.logToConsole(
          `
Available commands:
  start - Start bypass testing
  stop - Stop bypass testing
  clear - Clear console
  results - Show results summary
  export - Export results to file
  techniques - List available techniques
  status - Show current status
`,
          "success"
        );
        break;

      case "start":
        this.startBypassTesting();
        break;

      case "stop":
        this.stopBypassTesting();
        break;

      case "clear":
        const output = document.getElementById("bypassConsoleOutput");
        if (output) output.innerHTML = "";
        this.logToConsole("Console cleared", "info");
        break;

      case "results":
        if (this.bypassTestResults && this.bypassTestResults.length > 0) {
          const success = this.bypassTestResults.filter(
            (r) => r.status === "success"
          ).length;
          const partial = this.bypassTestResults.filter(
            (r) => r.status === "partial"
          ).length;
          const failed = this.bypassTestResults.filter(
            (r) => r.status === "failed"
          ).length;
          this.logToConsole(
            `Results: ${success} successful, ${partial} partial, ${failed} failed`,
            "success"
          );
        } else {
          this.logToConsole("No results available", "warning");
        }
        break;

      case "export":
        this.exportBypassResults();
        break;

      case "techniques":
        this.logToConsole(
          `
Available techniques:
  • Parameter Injection (15 tests)
  • Header Manipulation (15 tests)
  • Method Override (20 tests)
  • Content-Type Bypass (9 tests)
  • Authorization Bypass (6 tests)
  • Storage Manipulation (20 tests)
  • Frontend Override (5 tests)
  • Race Condition (10 tests)
  • Encoding Bypass (9 tests)
  • Alternative Endpoints (7 tests)
`,
          "success"
        );
        break;

      case "status":
        const running = this.bypassTestRunning ? "Running" : "Idle";
        const progress = this.bypassTestProgress || 0;
        const total = this.bypassTestTotal || 0;
        this.logToConsole(
          `Status: ${running}, Progress: ${progress}/${total}`,
          "info"
        );
        break;

      default:
        this.logToConsole(
          `Unknown command: ${command}. Type 'help' for available commands.`,
          "error"
        );
    }
  }

  escapeHtml(value) {
    if (value === null || value === undefined) return "";
    const str = String(value);
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "`": "&#96;",
    };
    return str.replace(/[&<>"'`]/g, (ch) => map[ch]);
  }

  // Handle bypass results JSON
  displayBypassJSON(jsonData) {
    // Create results display modal
    const modal = document.createElement("div");
    modal.id = "bypassResultsModal";
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      z-index: 10000;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    const jsonString = JSON.stringify(jsonData, null, 2);
    const successRate = jsonData.summary ? jsonData.summary.success_rate : "0%";

    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <h3 style="margin: 0; font-size: 18px;">🔍 Bypass Test Results</h3>
        <button id="closeResultsModal" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">×</button>
      </div>
      
      <div style="padding: 20px; overflow-y: auto; flex: 1;">
        <div style="
          background: #f3f4f6;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
        ">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #10b981;">
                ${jsonData.summary?.success || 0}
              </div>
              <div style="font-size: 12px; color: #6b7280;">Success</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">
                ${jsonData.summary?.partial || 0}
              </div>
              <div style="font-size: 12px; color: #6b7280;">Partial</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #ef4444;">
                ${jsonData.summary?.failed || 0}
              </div>
              <div style="font-size: 12px; color: #6b7280;">Failed</div>
            </div>
          </div>
          <div style="
            text-align: center;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
          ">
            <span style="font-size: 14px; color: #6b7280;">Success Rate:</span>
            <span style="font-size: 18px; font-weight: bold; color: #4b5563; margin-left: 5px;">
              ${successRate}
            </span>
          </div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <h4 style="margin: 0 0 10px 0; color: #374151;">JSON Data:</h4>
          <pre id="jsonResultsContent" style="
            background: #1e293b;
            color: #10b981;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            max-height: 300px;
            overflow-y: auto;
            margin: 0;
          ">${this.escapeHtml(jsonString)}</pre>
        </div>
      </div>
      
      <div style="
        padding: 15px 20px;
        background: #f9fafb;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      ">
        <button id="copyJSONBtn" style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          📋 Copy JSON
        </button>
        <button id="downloadJSONBtn" style="
          background: #10b981;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          💾 Download JSON
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // Add backdrop
    const backdrop = document.createElement("div");
    backdrop.id = "bypassResultsBackdrop";
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
    `;
    document.body.appendChild(backdrop);

    // Event listeners
    document.getElementById("closeResultsModal").onclick = () => {
      modal.remove();
      backdrop.remove();
    };

    backdrop.onclick = () => {
      modal.remove();
      backdrop.remove();
    };

    // Copy JSON button
    document.getElementById("copyJSONBtn").onclick = async () => {
      try {
        await navigator.clipboard.writeText(jsonString);
        const btn = document.getElementById("copyJSONBtn");
        const originalText = btn.innerHTML;
        btn.innerHTML = "✅ Copied!";
        btn.style.background = "#10b981";

        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background =
            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
        }, 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
        this.showNotification("Failed to copy to clipboard", "error");
      }
    };

    // Download JSON button
    document.getElementById("downloadJSONBtn").onclick = () => {
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bypass_results_${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const btn = document.getElementById("downloadJSONBtn");
      const originalText = btn.innerHTML;
      btn.innerHTML = "✅ Downloaded!";

      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 2000);
    };
  }

  // === GENERATOR FUNCTIONS ===

  // Generate Cards
  async generateCards() {
    try {
      const binInput = document.getElementById("binInput").value.trim();
      const quantity =
        parseInt(document.getElementById("cardQuantity").value) || 10;

      // Save BIN to history if it's provided and valid
      if (binInput && binInput.length >= 6) {
        this.addBinToHistory(binInput);
      }

      const response = await chrome.runtime.sendMessage({
        type: "generateCards",
        bin: binInput,
        quantity: quantity,
      });

      if (response && response.success) {
        const output = document.getElementById("cardOutput");
        if (output) {
          output.value = response.data.formatted;
          this.showNotification(`✅ Generated ${quantity} cards`, "success");
        }
      } else {
        this.showNotification("❌ Failed to generate cards", "error");
      }
    } catch (error) {
      console.error("Error generating cards:", error);
      this.showNotification("❌ Error generating cards", "error");
    }
  }

  async generateAddress() {
    try {
      const countrySelect = document.getElementById("countrySelect");
      const country = countrySelect ? countrySelect.value : "US";

      const response = await chrome.runtime.sendMessage({
        type: "generateAddress",
        country: country,
      });

      if (response && response.success) {
        const output = document.getElementById("personalOutput");
        if (output) {
          const formatted = `Name: ${response.data.name}\n${response.data.formatted}`;
          output.value = formatted;
          this.showNotification("✅ Address generated", "success");
        }
      } else {
        this.showNotification("❌ Failed to generate address", "error");
      }
    } catch (error) {
      console.error("Error generating address:", error);
      this.showNotification("❌ Error generating address", "error");
    }
  }

  // === PRO TRIAL ACTIVATION ===

  activateProTrialWithDebounce() {
    if (this.isActivatingTrial) {
      console.log(
        "⚠️ Pro Trial activation already in progress, ignoring click"
      );
      return;
    }

    this.isActivatingTrial = true;
    setTimeout(() => {
      this.isActivatingTrial = false;
    }, 5000);

    this.activateProTrial();
  }

  async activateProTrial() {
    try {
      this.showNotification("🚀 Activating Pro Trial...", "info");

      // Generate cards for trial activation
      const cards = await this.generateCardsForTrial();
      if (!cards || cards.length === 0) {
        this.showNotification("❌ Failed to generate cards", "error");
        this.isActivatingTrial = false;
        return;
      }

      const [currentTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!currentTab || !currentTab.url) {
        this.showNotification("❌ No active tab found", "error");
        this.isActivatingTrial = false;
        return;
      }

      if (
        !currentTab.url.includes("cursor.com") &&
        !currentTab.url.includes("checkout.stripe.com")
      ) {
        // Create new tab with trial page first
        console.log("🆕 Creating new tab for trial activation");
        const newTab = await chrome.tabs.create({
          url: "https://cursor.com/trial",
        });

        // Wait for page to load and try to activate
        setTimeout(async () => {
          await this.tryActivateWithCards(newTab.id, cards);
        }, 3000);
      } else if (currentTab.url.includes("checkout.stripe.com")) {
        // We're already on Stripe checkout - start activation directly
        console.log(
          "🎯 Detected Stripe checkout page, starting direct activation"
        );
        this.showNotification(
          `🎯 Starting activation with ${cards.length} cards...`,
          "info"
        );

        chrome.tabs.sendMessage(
          currentTab.id,
          {
            type: "startProTrialActivation",
            cards: cards,
          },
          (response) => {
            if (response && response.success) {
              this.showNotification(
                "✅ Pro Trial activation started!",
                "success"
              );
            } else {
              this.showNotification("❌ Failed to start activation", "error");
              this.isActivatingTrial = false;
            }
          }
        );
      } else {
        // We're on cursor.com, try to navigate to trial/checkout
        console.log(
          "🔍 On cursor.com, trying to find trial button or redirect"
        );
        await this.tryActivateOnCurrentTab(currentTab, cards);
      }
    } catch (error) {
      console.error("Error activating Pro Trial:", error);
      this.showNotification("❌ Error activating Pro Trial", "error");
      this.isActivatingTrial = false;
    }
  }

  async generateCardsForTrial() {
    try {
      const binInput = document.getElementById("binInput");
      const cardQuantity = document.getElementById("cardQuantity");

      const bin = binInput ? binInput.value.trim() || "552461" : "552461";
      const quantity = cardQuantity ? parseInt(cardQuantity.value) || 5 : 5;

      const response = await chrome.runtime.sendMessage({
        type: "generateCards",
        bin: bin,
        quantity: quantity,
      });

      if (response && response.success) {
        console.log(`✅ Generated ${quantity} cards for trial activation`);
        return response.data.cards;
      } else {
        console.error("❌ Failed to generate cards for trial");
        return null;
      }
    } catch (error) {
      console.error("Error generating cards for trial:", error);
      return null;
    }
  }

  async tryActivateOnCurrentTab(tab, cards) {
    console.log(
      `🎯 Trying Pro Trial activation on tab: ${tab.url.substring(0, 50)}...`
    );

    // Check if we're on Stripe checkout page and use direct activation
    if (tab.url.includes("checkout.stripe.com")) {
      console.log("🎯 Detected Stripe checkout, using direct card activation");
      this.showNotification(
        `🎯 Starting activation with ${cards.length} cards...`,
        "info"
      );

      chrome.tabs.sendMessage(
        tab.id,
        {
          type: "startProTrialActivation",
          cards: cards,
        },
        (response) => {
          if (response && response.success) {
            this.showNotification(
              "✅ Pro Trial activation started!",
              "success"
            );
            this.isActivatingTrial = false;
          } else {
            this.showNotification("❌ Failed to start activation", "error");
            this.isActivatingTrial = false;
          }
        }
      );
      return;
    }

    // If not on cursor.com, try different pages
    if (!tab.url.includes("cursor.com")) {
      console.log("🔄 Not on cursor.com, trying different pages");
      await this.tryDifferentPages(tab, cards);
      return;
    }

    // For cursor.com pages, try to find trial button first
    console.log("🔍 On cursor.com, looking for trial button or redirect");
    chrome.tabs.sendMessage(
      tab.id,
      {
        type: "activateProTrial",
      },
      async (response) => {
        if (chrome.runtime.lastError) {
          console.log("Content script not ready, reloading tab...");
          try {
            await chrome.tabs.reload(tab.id);
            setTimeout(() => this.tryActivateOnCurrentTab(tab, cards), 3000);
          } catch (reloadError) {
            console.error("Failed to reload tab:", reloadError);
            this.isActivatingTrial = false;
          }
          return;
        }

        if (response && response.success) {
          this.showNotification(
            "🎯 Pro Trial activation initiated! Looking for redirect...",
            "success"
          );

          // Wait for potential redirect to Stripe, then check if we need cards
          setTimeout(async () => {
            const [updatedTab] = await chrome.tabs.query({
              active: true,
              currentWindow: true,
            });
            if (updatedTab && updatedTab.url.includes("checkout.stripe.com")) {
              console.log("🎯 Redirected to Stripe, sending cards");
              chrome.tabs.sendMessage(updatedTab.id, {
                type: "startProTrialActivation",
                cards: cards,
              });
            }
          }, 2000);
        } else {
          console.log("🔄 Trial button not found, trying different pages");
          await this.tryDifferentPages(tab, cards);
        }
      }
    );
  }

  async tryDifferentPages(tab, cards) {
    const pages = [
      "https://cursor.com/dashboard", // Try dashboard first (most likely to have trial button)
      "https://cursor.com/trial", // Direct trial page
      "https://cursor.com", // Homepage fallback
    ];

    for (const url of pages) {
      try {
        console.log(`🔄 Trying ${url}...`);
        await chrome.tabs.update(tab.id, { url: url });
        await new Promise((resolve) => setTimeout(resolve, 4000)); // Longer wait for page load

        const success = await this.tryActivateWithCards(tab.id, cards);
        if (success) {
          this.showNotification("✅ Pro Trial activation started!", "success");
          this.isActivatingTrial = false;
          return;
        }
      } catch (error) {
        console.log(`❌ Failed on ${url}:`, error);
        continue;
      }
    }

    // Last resort: direct navigation to a known trial signup flow
    try {
      console.log("🆘 Last resort: trying direct trial signup");
      await chrome.tabs.update(tab.id, { url: "https://cursor.com/settings" });
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const finalAttempt = await this.tryActivateWithCards(tab.id, cards);
      if (finalAttempt) {
        this.showNotification("✅ Pro Trial activation started!", "success");
        this.isActivatingTrial = false;
        return;
      }
    } catch (lastError) {
      console.log("❌ Final attempt failed:", lastError);
    }

    this.showNotification(
      "❌ Could not activate trial automatically. Please try manually on cursor.com/trial",
      "error"
    );
    this.isActivatingTrial = false;
  }

  async tryActivateWithCards(tabId, cards) {
    return new Promise((resolve) => {
      console.log(`🎯 Trying activation with cards on tab ${tabId}`);

      // First check if we're already on Stripe checkout
      chrome.tabs.get(tabId, (tab) => {
        if (tab && tab.url && tab.url.includes("checkout.stripe.com")) {
          console.log("🎯 Already on Stripe checkout, sending cards directly");
          chrome.tabs.sendMessage(
            tabId,
            {
              type: "startProTrialActivation",
              cards: cards,
            },
            (response) => {
              resolve(response && response.success);
            }
          );
          return;
        }

        // Otherwise, try to find trial button first
        chrome.tabs.sendMessage(
          tabId,
          {
            type: "activateProTrial",
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.log("Content script not available on tab", tabId);
              resolve(false);
              return;
            }

            if (response && response.success) {
              this.showNotification(
                "🎯 Found trial button! Waiting for Stripe redirect...",
                "info"
              );

              // Wait longer for potential redirect to Stripe
              setTimeout(() => {
                chrome.tabs.get(tabId, (updatedTab) => {
                  if (
                    updatedTab &&
                    updatedTab.url &&
                    updatedTab.url.includes("checkout.stripe.com")
                  ) {
                    console.log("🎯 Redirected to Stripe, sending cards");
                    chrome.tabs.sendMessage(
                      tabId,
                      {
                        type: "startProTrialActivation",
                        cards: cards,
                      },
                      (activationResponse) => {
                        if (activationResponse && activationResponse.success) {
                          this.showNotification(
                            "🚀 Trial activation with cards started!",
                            "success"
                          );
                          resolve(true);
                        } else {
                          resolve(false);
                        }
                      }
                    );
                  } else {
                    console.log("🔄 No redirect to Stripe detected");
                    resolve(false);
                  }
                });
              }, 3000); // Wait 3 seconds for redirect
            } else {
              console.log("🔄 Trial button not found or activation failed");
              resolve(false);
            }
          }
        );
      });
    });
  }

  // === BIN HISTORY MANAGEMENT ===

  initBinHistory() {
    const binInput = document.getElementById("binInput");
    if (!binInput) return;

    binInput.addEventListener("focus", () => {
      this.showBinHistory();
    });

    binInput.addEventListener("blur", () => {
      setTimeout(() => {
        this.hideBinHistory();
      }, 200);
    });

    this.loadBinHistory();
  }

  getBinHistory() {
    const stored = localStorage.getItem("cursor_bin_history");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  saveBinHistory(history) {
    localStorage.setItem("cursor_bin_history", JSON.stringify(history));
  }

  addBinToHistory(binCode) {
    if (!binCode || binCode.length < 6) return;

    let history = this.getBinHistory();

    history = history.filter((item) => item.bin !== binCode);

    const binInfo = this.getBinInfo(binCode);
    history.unshift({
      bin: binCode,
      ...binInfo,
      lastUsed: new Date().toISOString(),
    });

    history = history.slice(0, 10);

    this.saveBinHistory(history);
  }

  getBinInfo(bin) {
    const cleanBin = bin.replace(/[x\s]/gi, "");

    if (/^4/.test(cleanBin))
      return { type: "Visa", description: "Visa Credit Card" };
    if (/^5[1-5]/.test(cleanBin) || /^2[2-7]/.test(cleanBin))
      return { type: "MasterCard", description: "MasterCard Credit Card" };
    if (/^3[47]/.test(cleanBin))
      return { type: "American Express", description: "Amex Credit Card" };
    if (/^6(?:011|5)/.test(cleanBin))
      return { type: "Discover", description: "Discover Credit Card" };
    if (/^3[0689]/.test(cleanBin))
      return { type: "Diners Club", description: "Diners Club Card" };
    if (/^35/.test(cleanBin))
      return { type: "JCB", description: "JCB Credit Card" };

    return { type: "Unknown", description: "Unknown Card Type" };
  }

  loadBinHistory() {
    this.renderBinHistory();
  }

  showBinHistory() {
    const dropdown = document.getElementById("binHistoryDropdown");
    if (dropdown) {
      this.renderBinHistory();
      dropdown.style.display = "block";
    }
  }

  hideBinHistory() {
    const dropdown = document.getElementById("binHistoryDropdown");
    if (dropdown) {
      dropdown.style.display = "none";
    }
  }

  renderBinHistory() {
    const dropdown = document.getElementById("binHistoryDropdown");
    if (!dropdown) return;

    const history = this.getBinHistory();

    if (history.length === 0) {
      dropdown.innerHTML =
        '<div class="bin-history-empty">No BIN history</div>';
      return;
    }

    dropdown.innerHTML = history
      .map(
        (item) => `
      <div class="bin-history-item" data-bin="${
        item.bin
      }" style="cursor: pointer;">
        <div>
          <div class="bin-code">${item.bin}</div>
          <div class="bin-desc">${item.type} - ${this.formatDate(
          item.lastUsed
        )}</div>
        </div>
        <button class="remove-bin" data-bin="${
          item.bin
        }" title="Remove" style="background: #e53e3e; color: white; border: none; padding: 2px 6px; border-radius: 2px; font-size: 10px; cursor: pointer;">×</button>
      </div>
    `
      )
      .join("");

    // Add event listeners for bin history items (avoid CSP violation)
    setTimeout(() => {
      const binHistoryItems = dropdown.querySelectorAll(".bin-history-item");
      binHistoryItems.forEach((item) => {
        const bin = item.dataset.bin;
        item.addEventListener("click", () => {
          this.selectBinFromHistory(bin);
        });
      });

      const removeButtons = dropdown.querySelectorAll(".remove-bin");
      removeButtons.forEach((btn) => {
        const bin = btn.dataset.bin;
        btn.addEventListener("click", (event) => {
          event.stopPropagation();
          this.removeBinFromHistory(bin);
        });
      });
    }, 0);
  }

  selectBinFromHistory(bin) {
    const binInput = document.getElementById("binInput");
    if (binInput) {
      binInput.value = bin;
      this.hideBinHistory();
    }
  }

  removeBinFromHistory(binCode) {
    let history = this.getBinHistory();
    history = history.filter((item) => item.bin !== binCode);
    this.saveBinHistory(history);
    this.renderBinHistory();
  }

  formatDate(dateString) {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return "Recently";
    }
  }
}

// Global variable for onclick handlers
let sidebarApp = null;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Load dark mode preference (default to dark)
  chrome.storage.local.get(["darkMode"], (result) => {
    // Default to dark mode if no preference is set
    const isDarkMode = result.darkMode !== undefined ? result.darkMode : true;

    if (isDarkMode) {
      document.body.classList.add("dark-mode");

      // Update dark mode toggle icon to sun
      const darkModeBtn = document.getElementById("darkModeToggle");
      const svg = darkModeBtn?.querySelector("svg path");
      if (svg) {
        svg.setAttribute(
          "d",
          "M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z"
        );
      }

      // Save default dark mode preference if not set
      if (result.darkMode === undefined) {
        chrome.storage.local.set({ darkMode: true });
      }
    }
  });

  // Initialize sidebar manager and set global variable
  sidebarApp = new CursorAccountSidebar();
});

/**
 * Backend Integration Script
 *
 * Inject this script ke sidepanel.html untuk add backend support
 * tanpa perlu modify existing sidepanel.js
 */

(function () {
  "use strict";

  console.log("[Backend Integration] Loading...");

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  async function init() {
    console.log("[Backend Integration] Initializing...");

    // Initialize backend UI
    try {
      const backendUI = new BackendUI();
      await backendUI.initialize();
      console.log("[Backend Integration] Backend UI initialized");

      // Store reference globally for debugging
      window.backendUI = backendUI;
    } catch (error) {
      console.error(
        "[Backend Integration] Error initializing backend UI:",
        error
      );
    }

    // Patch existing account loading to use backend adapter
    patchAccountLoading();

    // Patch card loading
    patchCardLoading();

    console.log("[Backend Integration] Integration complete");
  }

  /**
   * Patch account loading methods
   */
  function patchAccountLoading() {
    // Find CursorAccountSidebar instance
    const sidebar = window.sidebar || window.app;

    if (!sidebar) {
      console.log(
        "[Backend Integration] Sidebar instance not found yet, will retry..."
      );
      // Retry after a delay
      setTimeout(patchAccountLoading, 1000);
      return;
    }

    // Store original loadAccounts method
    const originalLoadAccounts = sidebar.loadAccounts;

    if (!originalLoadAccounts) {
      console.log(
        "[Backend Integration] loadAccounts method not found yet, will retry..."
      );
      // Retry after a delay
      setTimeout(patchAccountLoading, 1000);
      return;
    }

    // Wrap with backend support
    sidebar.loadAccounts = async function () {
      try {
        console.log("[Backend Integration] Loading accounts via backend...");

        // Try backend first
        const backend = new BackendService();
        const isAvailable = await backend.isAvailable();

        if (isAvailable) {
          // Load from backend
          const accounts = await backend.getAllAccounts();
          console.log(
            "[Backend Integration] Loaded",
            accounts.length,
            "accounts from backend"
          );

          // Transform to expected format
          this.accounts = accounts.map((acc) => ({
            name: acc.email || acc.name,
            email: acc.email,
            cookies: acc.cookies || [],
            active: acc.status === "active",
            status: acc.status,
            dateAdded: acc.created_at,
            info: {
              lastUsed: acc.last_used,
            },
          }));

          return;
        }
      } catch (error) {
        console.warn(
          "[Backend Integration] Backend not available, falling back:",
          error
        );
      }

      // Fallback to original method
      return originalLoadAccounts.call(this);
    };

    console.log("[Backend Integration] Account loading patched");
  }

  /**
   * Patch card loading methods
   */
  function patchCardLoading() {
    // Similar patching for payment cards
    const sidebar = window.sidebar || window.app;

    if (!sidebar) {
      console.log(
        "[Backend Integration] Sidebar instance not found for cards, will retry..."
      );
      setTimeout(patchCardLoading, 1000);
      return;
    }

    // Store original loadCards method (if exists)
    const originalLoadCards = sidebar.loadCards;

    if (!originalLoadCards) {
      console.log("[Backend Integration] loadCards method not found yet");
      return;
    }

    // Wrap with backend support
    sidebar.loadCards = async function () {
      try {
        console.log("[Backend Integration] Loading cards via backend...");

        // Try backend first
        const backend = new BackendService();
        const isAvailable = await backend.isAvailable();

        if (isAvailable) {
          // Load from backend
          const cards = await backend.getAllCards();
          console.log(
            "[Backend Integration] Loaded",
            cards.length,
            "cards from backend"
          );

          // Transform to expected format
          this.paymentCards = cards.map((card) => ({
            id: card.id,
            number: card.card_number,
            holder: card.card_holder,
            expiry: card.expiry,
            cvc: card.cvv,
            type: detectCardType(card.card_number),
            status: card.status,
          }));

          return;
        }
      } catch (error) {
        console.warn(
          "[Backend Integration] Backend not available for cards, falling back:",
          error
        );
      }

      // Fallback to original method
      return originalLoadCards.call(this);
    };

    console.log("[Backend Integration] Card loading patched");
  }

  /**
   * Detect card type from number
   */
  function detectCardType(cardNumber) {
    if (!cardNumber) return "unknown";

    const number = cardNumber.replace(/\s/g, "");

    if (/^4/.test(number)) return "visa";
    if (/^5[1-5]/.test(number)) return "mastercard";
    if (/^3[47]/.test(number)) return "amex";
    if (/^6(?:011|5)/.test(number)) return "discover";

    return "unknown";
  }

  /**
   * Add backend menu option
   */
  function addBackendMenuItem() {
    // Find settings/options menu
    const menu =
      document.querySelector(".menu-items") ||
      document.querySelector(".sidebar-menu");

    if (!menu) {
      console.warn("[Backend Integration] Menu not found");
      return;
    }

    // Add backend option
    const menuItem = document.createElement("div");
    menuItem.className = "menu-item";
    menuItem.innerHTML = `
            <span class="menu-icon">🔌</span>
            <span class="menu-text">Backend</span>
        `;

    menuItem.addEventListener("click", () => {
      // Show backend panel
      const backendUI = window.backendUI;
      if (backendUI) {
        const details = document.querySelector(".backend-status-details");
        if (details) {
          details.style.display = "block";
          details.scrollIntoView({ behavior: "smooth" });
        }
      }
    });

    menu.appendChild(menuItem);
  }

  /**
   * Add CSS for integration
   */
  function addIntegrationStyles() {
    const style = document.createElement("style");
    style.textContent = `
            /* Backend Modal */
            .backend-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }

            .backend-modal-content {
                background: #2a2a2a;
                border-radius: 8px;
                padding: 24px;
                max-width: 500px;
                width: 90%;
                color: #fff;
            }

            .backend-modal-content h3 {
                margin: 0 0 16px 0;
                color: #fff;
            }

            .migration-options,
            .settings-group {
                margin: 16px 0;
            }

            .migration-options label,
            .settings-group label {
                display: block;
                margin: 8px 0;
                cursor: pointer;
            }

            .migration-options input[type="checkbox"],
            .settings-group input[type="checkbox"] {
                margin-right: 8px;
            }

            .settings-info {
                background: #1e1e1e;
                padding: 12px;
                border-radius: 4px;
                margin: 16px 0;
            }

            .settings-info code {
                display: block;
                background: #333;
                padding: 4px 8px;
                border-radius: 3px;
                margin: 4px 0 12px 0;
                font-size: 11px;
                color: #4caf50;
            }

            .modal-actions {
                display: flex;
                gap: 8px;
                margin-top: 24px;
                justify-content: flex-end;
            }

            .btn-cancel {
                padding: 8px 16px;
                background: #444;
                border: 1px solid #555;
                color: #ccc;
                border-radius: 4px;
                cursor: pointer;
            }

            .btn-cancel:hover {
                background: #555;
            }

            .btn-primary {
                padding: 8px 16px;
                background: #4caf50;
                border: 1px solid #4caf50;
                color: #fff;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
            }

            .btn-primary:hover {
                background: #45a049;
            }

            .migration-progress {
                margin-top: 16px;
            }

            .progress-bar {
                width: 100%;
                height: 6px;
                background: #333;
                border-radius: 3px;
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                background: #4caf50;
                transition: width 0.3s;
            }

            .progress-text {
                margin-top: 8px;
                text-align: center;
                color: #999;
                font-size: 12px;
            }

            /* Backend Notification */
            .backend-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 16px;
                border-radius: 4px;
                color: #fff;
                font-size: 13px;
                z-index: 10001;
                animation: slideIn 0.3s ease;
            }

            .backend-notification-success {
                background: #4caf50;
            }

            .backend-notification-error {
                background: #f44336;
            }

            .backend-notification-info {
                background: #2196f3;
            }

            .backend-notification.fade-out {
                animation: fadeOut 0.3s ease forwards;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes fadeOut {
                to {
                    opacity: 0;
                    transform: translateY(-10px);
                }
            }
        `;
    document.head.appendChild(style);
  }

  // Initialize styles
  addIntegrationStyles();

  console.log("[Backend Integration] Script loaded");
})();

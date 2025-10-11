/**
 * Backend Connection Indicator
 * Shows real-time connection status to Python backend
 */

class BackendConnectionIndicator {
  constructor() {
    this.indicator = null;
    this.status = "disconnected";
    this.lastPing = null;
    this.pingInterval = null;

    // Create indicator element
    this.createIndicator();

    // Start monitoring
    this.startMonitoring();
  }

  createIndicator() {
    // Check if indicator already exists
    if (document.getElementById("backend-indicator")) {
      this.indicator = document.getElementById("backend-indicator");
      return;
    }

    // Create indicator container
    const indicator = document.createElement("div");
    indicator.id = "backend-indicator";
    indicator.className = "backend-indicator";
    indicator.innerHTML = `
            <div class="indicator-dot"></div>
            <span class="indicator-text">Backend</span>
            <div class="indicator-tooltip">
                <div class="tooltip-content">
                    <strong>Backend Status</strong>
                    <div class="status-info">
                        <div class="status-row">
                            <span>Connection:</span>
                            <span class="status-value" id="connection-status">Checking...</span>
                        </div>
                        <div class="status-row">
                            <span>Last Ping:</span>
                            <span class="status-value" id="last-ping">Never</span>
                        </div>
                        <div class="status-row">
                            <span>Version:</span>
                            <span class="status-value" id="backend-version">Unknown</span>
                        </div>
                    </div>
                    <button class="reconnect-btn" id="reconnect-backend">Reconnect</button>
                </div>
            </div>
        `;

    // Add styles
    this.addStyles();

    // Append to body
    document.body.appendChild(indicator);
    this.indicator = indicator;

    // Add event listeners
    const reconnectBtn = document.getElementById("reconnect-backend");
    if (reconnectBtn) {
      reconnectBtn.addEventListener("click", () => this.reconnect());
    }

    // Update status
    this.updateUI("disconnected");
  }

  addStyles() {
    if (document.getElementById("backend-indicator-styles")) return;

    const style = document.createElement("style");
    style.id = "backend-indicator-styles";
    style.textContent = `
            .backend-indicator {
                position: fixed;
                top: 10px;
                right: 10px;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                color: white;
                font-size: 12px;
                font-family: system-ui, -apple-system, sans-serif;
                cursor: pointer;
                z-index: 999999;
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
            }
            
            .backend-indicator:hover {
                background: rgba(0, 0, 0, 0.9);
                transform: scale(1.05);
            }
            
            .indicator-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #666;
                animation: pulse 2s infinite;
            }
            
            .backend-indicator.connected .indicator-dot {
                background: #4CAF50;
            }
            
            .backend-indicator.connecting .indicator-dot {
                background: #FFC107;
            }
            
            .backend-indicator.disconnected .indicator-dot {
                background: #F44336;
            }
            
            .indicator-text {
                font-weight: 500;
            }
            
            .indicator-tooltip {
                display: none;
                position: absolute;
                top: 100%;
                right: 0;
                margin-top: 8px;
                min-width: 250px;
                background: rgba(0, 0, 0, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                padding: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            
            .backend-indicator:hover .indicator-tooltip {
                display: block;
            }
            
            .tooltip-content strong {
                display: block;
                margin-bottom: 8px;
                font-size: 13px;
                color: #fff;
            }
            
            .status-info {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-bottom: 10px;
            }
            
            .status-row {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                color: #ccc;
            }
            
            .status-value {
                color: #fff;
                font-weight: 500;
            }
            
            .reconnect-btn {
                width: 100%;
                padding: 6px 12px;
                background: #2196F3;
                border: none;
                border-radius: 4px;
                color: white;
                font-size: 11px;
                font-weight: 500;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .reconnect-btn:hover {
                background: #1976D2;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        `;
    document.head.appendChild(style);
  }

  async startMonitoring() {
    // Initial ping
    await this.ping();

    // Ping every 30 seconds
    this.pingInterval = setInterval(() => {
      this.ping();
    }, 30000);
  }

  async ping() {
    try {
      this.updateUI("connecting");

      const response = await chrome.runtime.sendMessage({
        type: "backendRequest",
        method: "system.ping",
        params: {},
      });

      if (response && response.result) {
        this.updateUI("connected");
        this.lastPing = new Date();

        // Get version info
        const versionResponse = await chrome.runtime.sendMessage({
          type: "backendRequest",
          method: "system.version",
          params: {},
        });

        if (versionResponse && versionResponse.result) {
          this.updateVersionInfo(versionResponse.result);
        }
      } else {
        this.updateUI("disconnected");
      }
    } catch (error) {
      console.error("Backend ping failed:", error);
      this.updateUI("disconnected");
    }
  }

  updateUI(status) {
    this.status = status;

    if (!this.indicator) return;

    // Update class
    this.indicator.className = `backend-indicator ${status}`;

    // Update connection status text
    const statusEl = document.getElementById("connection-status");
    if (statusEl) {
      switch (status) {
        case "connected":
          statusEl.textContent = "✓ Connected";
          statusEl.style.color = "#4CAF50";
          break;
        case "connecting":
          statusEl.textContent = "⟳ Connecting...";
          statusEl.style.color = "#FFC107";
          break;
        case "disconnected":
          statusEl.textContent = "✗ Disconnected";
          statusEl.style.color = "#F44336";
          break;
      }
    }

    // Update last ping
    const lastPingEl = document.getElementById("last-ping");
    if (lastPingEl && this.lastPing) {
      const seconds = Math.floor((Date.now() - this.lastPing) / 1000);
      if (seconds < 60) {
        lastPingEl.textContent = `${seconds}s ago`;
      } else {
        const minutes = Math.floor(seconds / 60);
        lastPingEl.textContent = `${minutes}m ago`;
      }
    }
  }

  updateVersionInfo(versionData) {
    const versionEl = document.getElementById("backend-version");
    if (versionEl && versionData) {
      versionEl.textContent = `v${versionData.version} (schema ${versionData.schema_version})`;
    }
  }

  async reconnect() {
    console.log("[Backend Indicator] Reconnecting...");
    await this.ping();
  }

  destroy() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    if (this.indicator && this.indicator.parentNode) {
      this.indicator.parentNode.removeChild(this.indicator);
    }
  }
}

// Initialize indicator when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.backendIndicator = new BackendConnectionIndicator();
  });
} else {
  window.backendIndicator = new BackendConnectionIndicator();
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = BackendConnectionIndicator;
}

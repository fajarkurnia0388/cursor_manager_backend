# 🎮 Backend Control from Extension UI

**Tanggal:** Oktober 2025  
**Status:** Design Document  
**Purpose:** Start/Stop/Manage Python Backend dari Extension UI

---

## 🎯 Goals

1. **One-Click Start** - User klik tombol → backend langsung jalan
2. **Status Monitoring** - Extension tahu apakah backend running atau tidak
3. **Auto-Start Option** - Backend start otomatis saat browser/system startup
4. **Version Sync** - Detect version mismatch antara extension & backend
5. **Easy Installation** - Detect if backend not installed, provide install instructions

---

## 📊 Backend States

```
┌──────────────────────────────────────────┐
│  Backend State Machine                   │
├──────────────────────────────────────────┤
│                                          │
│  NOT_INSTALLED                           │
│       ↓                                  │
│  [Install Backend]                       │
│       ↓                                  │
│  INSTALLED_NOT_RUNNING                   │
│       ↓                                  │
│  [Start Backend]                         │
│       ↓                                  │
│  STARTING                                │
│       ↓                                  │
│  RUNNING                                 │
│       ↓                                  │
│  [Stop Backend]                          │
│       ↓                                  │
│  STOPPING                                │
│       ↓                                  │
│  INSTALLED_NOT_RUNNING                   │
│                                          │
└──────────────────────────────────────────┘
```

### State Definitions

**NOT_INSTALLED**

- Native host manifest tidak ditemukan
- Python backend tidak installed
- UI: Show "Install Backend" button + instructions

**INSTALLED_NOT_RUNNING**

- Backend installed tapi tidak running
- Connection test failed
- UI: Show "Start Backend" button

**STARTING**

- Backend sedang start (loading state)
- UI: Show spinner + "Starting backend..."

**RUNNING**

- Backend connected dan responsive
- Health check pass
- UI: Show green indicator + "Stop Backend" button

**STOPPING**

- Backend sedang shutdown
- UI: Show spinner + "Stopping backend..."

**ERROR**

- Backend crashed atau unresponsive
- UI: Show red indicator + error message + "Restart Backend" button

---

## 💻 Implementation

### Extension: Backend Controller Service

```javascript
// services/backend-controller.js
/**
 * Backend Controller
 * Manages backend lifecycle from extension UI
 */

class BackendController {
  constructor() {
    this.state = "UNKNOWN";
    this.process = null;
    this.healthCheckInterval = null;
    this.listeners = [];
  }

  /**
   * Initialize controller
   * Check backend status on startup
   */
  async init() {
    console.log("🔌 Initializing backend controller...");

    // Check if installed
    const installed = await this.checkInstalled();
    if (!installed) {
      this.setState("NOT_INSTALLED");
      return;
    }

    // Check if running
    const running = await this.checkRunning();
    if (running) {
      this.setState("RUNNING");
      this.startHealthCheck();
    } else {
      this.setState("INSTALLED_NOT_RUNNING");
    }
  }

  /**
   * Check if backend is installed
   */
  async checkInstalled() {
    try {
      // Try to get native host manifest path
      const response = await chrome.runtime.sendNativeMessage(
        "com.cursor.account_manager",
        { jsonrpc: "2.0", id: 1, method: "system.health", params: {} }
      );

      // If we get any response, it's installed
      return true;
    } catch (error) {
      // Check error message
      if (error.message.includes("Specified native messaging host not found")) {
        return false;
      }

      // Other error = installed but not running
      return true;
    }
  }

  /**
   * Check if backend is running and responsive
   */
  async checkRunning() {
    try {
      const response = await Promise.race([
        chrome.runtime.sendNativeMessage("com.cursor.account_manager", {
          jsonrpc: "2.0",
          id: 1,
          method: "system.health",
          params: {},
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 2000)
        ),
      ]);

      return response && response.result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Start backend process
   */
  async start() {
    console.log("▶️  Starting backend...");
    this.setState("STARTING");

    try {
      // Send message to background script to start process
      const result = await chrome.runtime.sendMessage({
        action: "startBackend",
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Wait for backend to be ready (max 10 seconds)
      for (let i = 0; i < 10; i++) {
        await this.sleep(1000);

        const running = await this.checkRunning();
        if (running) {
          this.setState("RUNNING");
          this.startHealthCheck();
          console.log("✅ Backend started successfully");
          return true;
        }
      }

      throw new Error("Backend failed to start (timeout)");
    } catch (error) {
      console.error("❌ Failed to start backend:", error);
      this.setState("ERROR", error.message);
      return false;
    }
  }

  /**
   * Stop backend process
   */
  async stop() {
    console.log("⏹️  Stopping backend...");
    this.setState("STOPPING");

    try {
      // Send shutdown request to backend
      await chrome.runtime.sendNativeMessage("com.cursor.account_manager", {
        jsonrpc: "2.0",
        id: 1,
        method: "system.shutdown",
        params: {},
      });

      // Wait for process to stop
      await this.sleep(2000);

      this.stopHealthCheck();
      this.setState("INSTALLED_NOT_RUNNING");
      console.log("✅ Backend stopped");
      return true;
    } catch (error) {
      console.error("❌ Failed to stop backend:", error);
      this.setState("ERROR", error.message);
      return false;
    }
  }

  /**
   * Restart backend
   */
  async restart() {
    console.log("🔄 Restarting backend...");

    await this.stop();
    await this.sleep(1000);
    await this.start();
  }

  /**
   * Get backend version
   */
  async getVersion() {
    try {
      const response = await chrome.runtime.sendNativeMessage(
        "com.cursor.account_manager",
        { jsonrpc: "2.0", id: 1, method: "system.version", params: {} }
      );

      return response.result?.data?.version || "unknown";
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * Check version compatibility
   */
  async checkVersion() {
    const backendVersion = await this.getVersion();
    const extensionVersion = chrome.runtime.getManifest().version;

    if (backendVersion !== extensionVersion) {
      console.warn(
        `⚠️  Version mismatch: Extension ${extensionVersion} vs Backend ${backendVersion}`
      );
      return false;
    }

    return true;
  }

  /**
   * Start health check interval
   */
  startHealthCheck() {
    if (this.healthCheckInterval) {
      return;
    }

    // Check every 10 seconds
    this.healthCheckInterval = setInterval(async () => {
      const running = await this.checkRunning();

      if (!running && this.state === "RUNNING") {
        console.error("❌ Backend health check failed");
        this.setState("ERROR", "Backend stopped responding");
        this.stopHealthCheck();
      }
    }, 10000);
  }

  /**
   * Stop health check interval
   */
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Set backend state
   */
  setState(state, error = null) {
    this.state = state;
    this.error = error;

    console.log(`🔄 Backend state: ${state}${error ? ` (${error})` : ""}`);

    // Notify listeners
    this.listeners.forEach((listener) => listener(state, error));
  }

  /**
   * Add state change listener
   */
  onStateChange(listener) {
    this.listeners.push(listener);
  }

  /**
   * Get current state
   */
  getState() {
    return {
      state: this.state,
      error: this.error,
    };
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton
export const backendController = new BackendController();
```

### Background Script: Process Management

```javascript
// background.js (add these handlers)

/**
 * Start backend process
 * Uses native messaging host which Chrome will start automatically
 */
async function startBackend() {
  try {
    // On Windows/Mac/Linux, Chrome automatically starts native host when we connect
    // We just need to trigger a connection

    const port = chrome.runtime.connectNative("com.cursor.account_manager");

    return new Promise((resolve, reject) => {
      // Wait for first message (indicates backend started)
      port.onMessage.addListener((msg) => {
        resolve({ success: true });
        port.disconnect();
      });

      // Error handler
      port.onDisconnect.addListener(() => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        }
      });

      // Send test message
      port.postMessage({
        jsonrpc: "2.0",
        id: 1,
        method: "system.health",
        params: {},
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error("Timeout waiting for backend to start"));
      }, 5000);
    });
  } catch (error) {
    console.error("Failed to start backend:", error);
    return { success: false, error: error.message };
  }
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startBackend") {
    startBackend()
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});
```

### UI: Backend Status Panel

```html
<!-- In sidepanel.html -->
<div class="backend-status-panel">
  <div class="status-header">
    <span class="status-icon" id="backend-status-icon">⚫</span>
    <span class="status-text" id="backend-status-text"
      >Checking backend...</span
    >
    <span class="status-version" id="backend-version"></span>
  </div>

  <div class="status-actions">
    <button id="start-backend-btn" class="btn-primary hidden">
      ▶️ Start Backend
    </button>

    <button id="stop-backend-btn" class="btn-secondary hidden">
      ⏹️ Stop Backend
    </button>

    <button id="restart-backend-btn" class="btn-secondary hidden">
      🔄 Restart Backend
    </button>

    <button id="install-backend-btn" class="btn-primary hidden">
      📥 Install Backend
    </button>
  </div>

  <div class="status-details hidden" id="backend-details">
    <div class="detail-row">
      <span class="label">Status:</span>
      <span class="value" id="detail-status">-</span>
    </div>
    <div class="detail-row">
      <span class="label">Version:</span>
      <span class="value" id="detail-version">-</span>
    </div>
    <div class="detail-row">
      <span class="label">Location:</span>
      <span class="value" id="detail-location">-</span>
    </div>
  </div>
</div>

<style>
  .backend-status-panel {
    background: #f5f5f5;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .status-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .status-icon {
    font-size: 12px;
  }

  .status-icon.running {
    color: #22c55e;
  } /* Green */
  .status-icon.stopped {
    color: #ef4444;
  } /* Red */
  .status-icon.starting {
    color: #f59e0b;
  } /* Orange */

  .status-text {
    font-weight: 500;
    flex: 1;
  }

  .status-version {
    font-size: 12px;
    color: #666;
  }

  .status-actions {
    display: flex;
    gap: 8px;
  }

  .status-actions button {
    flex: 1;
  }

  .status-details {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #ddd;
    font-size: 12px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    margin: 4px 0;
  }

  .detail-row .label {
    color: #666;
  }

  .detail-row .value {
    font-weight: 500;
  }
</style>
```

### UI: JavaScript Integration

```javascript
// In sidepanel.js
import { backendController } from "./services/backend-controller.js";

// Initialize backend controller
await backendController.init();

// Update UI based on state
backendController.onStateChange((state, error) => {
  updateBackendUI(state, error);
});

function updateBackendUI(state, error) {
  const icon = document.getElementById("backend-status-icon");
  const text = document.getElementById("backend-status-text");
  const startBtn = document.getElementById("start-backend-btn");
  const stopBtn = document.getElementById("stop-backend-btn");
  const restartBtn = document.getElementById("restart-backend-btn");
  const installBtn = document.getElementById("install-backend-btn");

  // Hide all buttons first
  [startBtn, stopBtn, restartBtn, installBtn].forEach((btn) => {
    btn.classList.add("hidden");
  });

  switch (state) {
    case "NOT_INSTALLED":
      icon.textContent = "⚫";
      icon.className = "status-icon stopped";
      text.textContent = "Backend not installed";
      installBtn.classList.remove("hidden");
      break;

    case "INSTALLED_NOT_RUNNING":
      icon.textContent = "⚫";
      icon.className = "status-icon stopped";
      text.textContent = "Backend stopped";
      startBtn.classList.remove("hidden");
      break;

    case "STARTING":
      icon.textContent = "🔄";
      icon.className = "status-icon starting";
      text.textContent = "Starting backend...";
      break;

    case "RUNNING":
      icon.textContent = "✅";
      icon.className = "status-icon running";
      text.textContent = "Backend running";
      stopBtn.classList.remove("hidden");
      restartBtn.classList.remove("hidden");
      break;

    case "STOPPING":
      icon.textContent = "🔄";
      icon.className = "status-icon starting";
      text.textContent = "Stopping backend...";
      break;

    case "ERROR":
      icon.textContent = "❌";
      icon.className = "status-icon stopped";
      text.textContent = `Backend error: ${error || "Unknown error"}`;
      restartBtn.classList.remove("hidden");
      break;
  }

  // Update version
  if (state === "RUNNING") {
    backendController.getVersion().then((version) => {
      document.getElementById("backend-version").textContent = `v${version}`;
    });
  }
}

// Button handlers
document
  .getElementById("start-backend-btn")
  .addEventListener("click", async () => {
    await backendController.start();
  });

document
  .getElementById("stop-backend-btn")
  .addEventListener("click", async () => {
    await backendController.stop();
  });

document
  .getElementById("restart-backend-btn")
  .addEventListener("click", async () => {
    await backendController.restart();
  });

document.getElementById("install-backend-btn").addEventListener("click", () => {
  // Show installation instructions
  showInstallDialog();
});
```

---

## 🔧 Auto-Start Configuration

### Windows: Auto-Start via Task Scheduler

```python
# install.py (add auto-start option)
def setup_auto_start_windows():
    """Setup auto-start on Windows"""
    import subprocess

    # Get Python path
    python_path = sys.executable
    script_path = Path(__file__).parent / 'src' / 'main.py'

    # Create scheduled task
    task_name = "CursorManagerBackend"

    # Task XML
    task_xml = f"""<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
    </LogonTrigger>
  </Triggers>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions>
    <Exec>
      <Command>{python_path}</Command>
      <Arguments>"{script_path}"</Arguments>
      <WorkingDirectory>{Path(__file__).parent}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>"""

    # Save XML to temp file
    temp_xml = Path(tempfile.gettempdir()) / 'cursor_task.xml'
    temp_xml.write_text(task_xml)

    # Create task
    try:
        subprocess.run([
            'schtasks', '/Create',
            '/TN', task_name,
            '/XML', str(temp_xml),
            '/F'  # Force overwrite
        ], check=True)

        print(f"✅ Auto-start enabled (Task: {task_name})")

    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to create scheduled task: {e}")
    finally:
        temp_xml.unlink(missing_ok=True)
```

### macOS: Auto-Start via LaunchAgent

```python
def setup_auto_start_mac():
    """Setup auto-start on macOS"""
    plist_path = Path.home() / 'Library' / 'LaunchAgents' / 'com.cursor.account_manager.plist'

    script_path = Path(__file__).parent / 'src' / 'main.py'
    python_path = sys.executable

    plist_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cursor.account_manager</string>
    <key>ProgramArguments</key>
    <array>
        <string>{python_path}</string>
        <string>{script_path}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>"""

    plist_path.parent.mkdir(parents=True, exist_ok=True)
    plist_path.write_text(plist_content)

    # Load launch agent
    subprocess.run(['launchctl', 'load', str(plist_path)])

    print(f"✅ Auto-start enabled (LaunchAgent: {plist_path})")
```

---

## ✅ Implementation Checklist

- [ ] Create `services/backend-controller.js`
- [ ] Update `background.js` with startBackend handler
- [ ] Add backend status panel to sidepanel.html
- [ ] Add button event handlers to sidepanel.js
- [ ] Test state transitions (NOT_INSTALLED → INSTALLED → RUNNING)
- [ ] Add version check functionality
- [ ] Add auto-start setup to installer
- [ ] Test health check interval
- [ ] Test restart functionality
- [ ] Add error recovery (auto-restart on crash)

---

**Prepared By:** AI Architect  
**Date:** Oktober 2025  
**Status:** Design Complete  
**Implementation Time:** 2 days (Week 3)

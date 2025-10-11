// Advanced Console Service for Sidebar Extension
// Provides a full-featured console similar to browser DevTools

class ConsoleService {
  constructor() {
    this.history = [];
    this.historyIndex = 0;
    this.commandHistory = [];
    this.tempCommand = '';
    this.logs = [];
    this.maxLogs = 1000;
    this.filters = {
      log: true,
      info: true,
      warn: true,
      error: true,
      debug: true,
      network: true,
      system: true
    };
    this.isMinimized = false;
    this.height = 350;
    this.autocompleteCommands = [];
    this.setupConsoleInterception();
  }

  // Intercept console methods to capture all logs
  setupConsoleInterception() {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };

    // Store original console
    window._originalConsole = originalConsole;

    // Override console methods
    ['log', 'info', 'warn', 'error', 'debug'].forEach(method => {
      console[method] = (...args) => {
        // Call original method
        originalConsole[method].apply(console, args);
        
        // Capture for our console
        this.captureLog(method, args);
      };
    });
  }

  // Capture log entry
  captureLog(type, args) {
    const logEntry = {
      id: Date.now() + Math.random(),
      type: type,
      timestamp: new Date(),
      message: this.formatLogArgs(args),
      args: args,
      stack: this.getCallStack(),
      expanded: false
    };

    this.logs.push(logEntry);
    
    // Trim logs if too many
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Update UI if console is open
    this.updateConsoleDisplay();
  }

  // Format log arguments for display
  formatLogArgs(args) {
    return args.map(arg => {
      if (arg === undefined) return 'undefined';
      if (arg === null) return 'null';
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'number') return arg.toString();
      if (typeof arg === 'boolean') return arg.toString();
      if (typeof arg === 'function') return '[Function: ' + (arg.name || 'anonymous') + ']';
      if (arg instanceof Error) return arg.toString();
      if (arg instanceof Date) return arg.toISOString();
      if (arg instanceof RegExp) return arg.toString();
      if (Array.isArray(arg)) return '[Array(' + arg.length + ')]';
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return '[Object]';
        }
      }
      return String(arg);
    }).join(' ');
  }

  // Get call stack for debugging
  getCallStack() {
    const stack = new Error().stack;
    const lines = stack.split('\n').slice(3, 6); // Skip console service frames
    return lines.map(line => line.trim()).filter(line => line);
  }

  // Create console UI
  createConsoleUI() {
    // Remove existing console if any
    const existing = document.getElementById('advancedConsole');
    if (existing) {
      existing.remove();
      return null;
    }

    const consoleContainer = document.createElement('div');
    consoleContainer.id = 'advancedConsole';
    consoleContainer.className = 'advanced-console';
    
    consoleContainer.innerHTML = `
      <style>
        .advanced-console {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: ${this.height}px;
          background: #1a1a1a;
          border-top: 1px solid #333;
          display: flex;
          flex-direction: column;
          z-index: 10000;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          transition: height 0.3s ease;
        }
        
        .advanced-console.minimized {
          height: 40px;
        }
        
        .console-header {
          background: #2a2a2a;
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #333;
          user-select: none;
        }
        
        .console-title {
          color: #e0e0e0;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .console-controls {
          display: flex;
          gap: 8px;
        }
        
        .console-btn {
          background: #404040;
          border: none;
          color: #b0b0b0;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }
        
        .console-btn:hover {
          background: #505050;
          color: #fff;
        }
        
        .console-btn.active {
          background: #0e639c;
          color: #fff;
        }
        
        .console-filters {
          display: flex;
          gap: 4px;
          padding: 6px 12px;
          background: #252525;
          border-bottom: 1px solid #333;
        }
        
        .filter-btn {
          background: transparent;
          border: 1px solid #444;
          color: #888;
          padding: 2px 8px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s;
        }
        
        .filter-btn.active {
          background: #404040;
          color: #fff;
          border-color: #666;
        }
        
        .filter-btn:hover {
          border-color: #666;
          color: #fff;
        }
        
        .console-output {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
          background: #1a1a1a;
        }
        
        .console-log-entry {
          padding: 4px 12px;
          border-bottom: 1px solid #282828;
          font-size: 12px;
          line-height: 1.4;
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        
        .console-log-entry:hover {
          background: #242424;
        }
        
        .log-icon {
          width: 14px;
          height: 14px;
          margin-top: 2px;
          flex-shrink: 0;
        }
        
        .log-content {
          flex: 1;
          word-break: break-word;
        }
        
        .log-timestamp {
          color: #666;
          font-size: 11px;
          margin-right: 8px;
        }
        
        .log-message {
          color: #d4d4d4;
        }
        
        .log-type-info .log-message { color: #58a6ff; }
        .log-type-warn .log-message { color: #ffa500; }
        .log-type-error .log-message { color: #f85149; }
        .log-type-debug .log-message { color: #8b949e; }
        .log-type-success .log-message { color: #3fb950; }
        .log-type-network .log-message { color: #a371f7; }
        
        .log-expandable {
          cursor: pointer;
        }
        
        .log-expanded-content {
          margin-top: 8px;
          padding: 8px;
          background: #0d0d0d;
          border-radius: 4px;
          font-size: 11px;
          color: #888;
        }
        
        .log-stack {
          margin-top: 4px;
          padding-left: 20px;
          font-size: 11px;
          color: #666;
        }
        
        .console-input-area {
          background: #252525;
          border-top: 1px solid #333;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .console-prompt {
          color: #58a6ff;
          font-weight: bold;
        }
        
        .console-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #e0e0e0;
          font-family: inherit;
          font-size: 12px;
          outline: none;
        }
        
        .console-input::placeholder {
          color: #666;
        }
        
        .autocomplete-popup {
          position: absolute;
          bottom: 100%;
          left: 0;
          right: 0;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 4px;
          max-height: 200px;
          overflow-y: auto;
          display: none;
        }
        
        .autocomplete-item {
          padding: 6px 12px;
          color: #d4d4d4;
          cursor: pointer;
          font-size: 12px;
        }
        
        .autocomplete-item:hover,
        .autocomplete-item.selected {
          background: #404040;
        }
        
        .autocomplete-item .hint {
          color: #888;
          font-size: 11px;
          margin-left: 8px;
        }
        
        .console-resize-handle {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          cursor: ns-resize;
          background: transparent;
        }
        
        .console-resize-handle:hover {
          background: #0e639c;
        }
        
        .log-count-badge {
          background: #404040;
          color: #888;
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 10px;
          margin-left: 4px;
        }
      </style>
      
      <div class="console-resize-handle" id="consoleResizeHandle"></div>
      
      <div class="console-header">
        <div class="console-title">
          <span>🖥️</span>
          <span>Developer Console</span>
          <span class="log-count-badge">${this.logs.length}</span>
        </div>
        <div class="console-controls">
          <button class="console-btn" id="consoleClearBtn">Clear</button>
          <button class="console-btn" id="consoleExportBtn">Export</button>
          <button class="console-btn" id="consoleMinimizeBtn">
            ${this.isMinimized ? '⬆' : '⬇'}
          </button>
          <button class="console-btn" id="consoleCloseBtn">✕</button>
        </div>
      </div>
      
      <div class="console-filters" id="consoleFilters" ${this.isMinimized ? 'style="display:none"' : ''}>
        <button class="filter-btn ${this.filters.log ? 'active' : ''}" data-type="log">Log</button>
        <button class="filter-btn ${this.filters.info ? 'active' : ''}" data-type="info">Info</button>
        <button class="filter-btn ${this.filters.warn ? 'active' : ''}" data-type="warn">Warn</button>
        <button class="filter-btn ${this.filters.error ? 'active' : ''}" data-type="error">Error</button>
        <button class="filter-btn ${this.filters.debug ? 'active' : ''}" data-type="debug">Debug</button>
        <button class="filter-btn ${this.filters.network ? 'active' : ''}" data-type="network">Network</button>
      </div>
      
      <div class="console-output" id="consoleOutput" ${this.isMinimized ? 'style="display:none"' : ''}>
        <!-- Logs will be inserted here -->
      </div>
      
      <div class="console-input-area" id="consoleInputArea" ${this.isMinimized ? 'style="display:none"' : ''}>
        <span class="console-prompt">❯</span>
        <input 
          type="text" 
          class="console-input" 
          id="consoleInput" 
          placeholder="Enter JavaScript expression or command..."
          autocomplete="off"
        />
        <div class="autocomplete-popup" id="autocompletePopup"></div>
      </div>
    `;

    document.body.appendChild(consoleContainer);
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Display existing logs
    this.updateConsoleDisplay();
    
    // Focus input
    document.getElementById('consoleInput').focus();
    
    return consoleContainer;
  }

  // Setup event listeners
  setupEventListeners() {
    const input = document.getElementById('consoleInput');
    const filters = document.getElementById('consoleFilters');
    const resizeHandle = document.getElementById('consoleResizeHandle');
    
    // Button event listeners
    const clearBtn = document.getElementById('consoleClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearLogs());
    }
    
    const exportBtn = document.getElementById('consoleExportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportLogs());
    }
    
    const minimizeBtn = document.getElementById('consoleMinimizeBtn');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    }
    
    const closeBtn = document.getElementById('consoleCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeConsole());
    }
    
    if (!input) return;

    // Input handling
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const command = input.value.trim();
        if (command) {
          this.executeCommand(command);
          input.value = '';
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateHistory(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateHistory(1);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.handleAutocomplete(input.value);
      } else if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        this.clearLogs();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        input.value = '';
        this.historyIndex = this.commandHistory.length;
      }
    });

    // Filter buttons
    if (filters) {
      filters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
          const type = e.target.dataset.type;
          this.filters[type] = !this.filters[type];
          e.target.classList.toggle('active');
          this.updateConsoleDisplay();
        }
      });
    }

    // Resize handling
    if (resizeHandle) {
      let isResizing = false;
      let startY = 0;
      let startHeight = this.height;

      resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startY = e.clientY;
        startHeight = this.height;
        document.body.style.cursor = 'ns-resize';
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const delta = startY - e.clientY;
        const newHeight = Math.min(Math.max(150, startHeight + delta), window.innerHeight - 100);
        this.height = newHeight;
        
        const console = document.getElementById('advancedConsole');
        if (console) {
          console.style.height = newHeight + 'px';
        }
      });

      document.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.style.cursor = '';
      });
    }
  }

  // Update console display
  updateConsoleDisplay() {
    const output = document.getElementById('consoleOutput');
    if (!output) return;

    // Filter logs
    const filteredLogs = this.logs.filter(log => this.filters[log.type]);

    // Generate HTML
    const html = filteredLogs.map(log => this.createLogHTML(log)).join('');
    output.innerHTML = html;
    
    // Add click handlers for expandable logs
    setTimeout(() => {
      const expandables = output.querySelectorAll('.log-expandable');
      expandables.forEach(el => {
        el.addEventListener('click', () => {
          const logId = el.getAttribute('data-log-id');
          this.toggleLogExpand(logId);
        });
      });
    }, 0);

    // Scroll to bottom
    output.scrollTop = output.scrollHeight;

    // Update count badge
    const badge = document.querySelector('.log-count-badge');
    if (badge) {
      badge.textContent = this.logs.length;
    }
  }

  // Create HTML for a log entry
  createLogHTML(log) {
    const timestamp = log.timestamp.toLocaleTimeString();
    const icon = this.getLogIcon(log.type);
    const isExpandable = typeof log.args[0] === 'object' && log.args[0] !== null;
    
    return `
      <div class="console-log-entry log-type-${log.type} ${isExpandable ? 'log-expandable' : ''}" 
           data-log-id="${log.id}">
        <span class="log-icon">${icon}</span>
        <div class="log-content">
          <span class="log-timestamp">${timestamp}</span>
          <span class="log-message">${this.escapeHtml(log.message)}</span>
          ${log.expanded && isExpandable ? `
            <div class="log-expanded-content">
              <pre>${this.escapeHtml(JSON.stringify(log.args[0], null, 2))}</pre>
            </div>
          ` : ''}
          ${log.type === 'error' && log.stack.length > 0 ? `
            <div class="log-stack">
              ${log.stack.map(line => `<div>${this.escapeHtml(line)}</div>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Get icon for log type
  getLogIcon(type) {
    const icons = {
      log: '📝',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🔍',
      network: '🌐',
      success: '✅',
      system: '⚙️'
    };
    return icons[type] || '📝';
  }

  // Toggle log expansion
  toggleLogExpand(logId) {
    const log = this.logs.find(l => l.id == logId);
    if (log) {
      log.expanded = !log.expanded;
      this.updateConsoleDisplay();
    }
  }

  // Execute command
  async executeCommand(command) {
    if (!command.trim()) return;

    // Add to history
    this.commandHistory.push(command);
    this.historyIndex = this.commandHistory.length;

    // Log the command
    this.captureLog('log', [`❯ ${command}`]);

    try {
      // Check for special commands
      if (command.startsWith(':')) {
        this.executeSpecialCommand(command.substring(1));
        return;
      }

      // Evaluate as JavaScript
      const result = await this.evaluateExpression(command);
      
      if (result !== undefined) {
        this.captureLog('log', [result]);
      }
    } catch (error) {
      this.captureLog('error', [error.toString()]);
    }
  }

  // Evaluate JavaScript expression
  async evaluateExpression(expression) {
    // Create a safe evaluation context
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    
    try {
      // Try to evaluate in the context of the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && tab.id) {
        // Execute in content script context
        const result = await chrome.tabs.sendMessage(tab.id, {
          type: 'evaluateExpression',
          expression: expression
        }).catch(() => null);
        
        if (result && result.success) {
          return result.value;
        }
      }
      
      // Fallback to local evaluation
      const func = new AsyncFunction('chrome', 'window', 'document', 'console', `return ${expression}`);
      return await func(chrome, window, document, window._originalConsole || console);
    } catch (error) {
      // Try as statement instead of expression
      try {
        const func = new AsyncFunction('chrome', 'window', 'document', 'console', expression);
        await func(chrome, window, document, window._originalConsole || console);
        return undefined;
      } catch (e) {
        throw error; // Throw original error
      }
    }
  }

  // Execute special commands
  executeSpecialCommand(command) {
    const [cmd, ...args] = command.split(' ');
    
    switch(cmd) {
      case 'help':
        this.showHelp();
        break;
      case 'clear':
        this.clearLogs();
        break;
      case 'export':
        this.exportLogs();
        break;
      case 'filter':
        if (args.length >= 2) {
          this.setFilter(args[0], args[1] === 'on');
        } else {
          this.captureLog('error', ['Usage: :filter <type> on/off']);
        }
        break;
      case 'history':
        this.showHistory();
        break;
      case 'inspect':
        this.inspectElement();
        break;
      case 'network':
        this.showNetworkActivity();
        break;
      case 'storage':
        this.showStorageInfo();
        break;
      case 'bypass':
        this.runBypassCommand(args.join(' '));
        break;
      default:
        this.captureLog('error', [`Unknown command: ${cmd}. Type :help for available commands.`]);
    }
  }

  // Show help
  showHelp() {
    const helpText = `
Available Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JavaScript Evaluation:
  - Type any valid JavaScript expression to evaluate it
  - Supports async/await, promises, and all browser APIs
  
Special Commands (prefix with :):
  :help              - Show this help message
  :clear             - Clear console output
  :export            - Export logs to file
  :filter <type> on/off - Toggle log filter
  :history           - Show command history
  :inspect           - Inspect page elements
  :network           - Show network activity
  :storage           - Show storage information
  :bypass <cmd>      - Run bypass commands
  
Keyboard Shortcuts:
  Enter              - Execute command
  ↑/↓               - Navigate command history
  Tab               - Autocomplete
  Ctrl+L            - Clear console
  
Examples:
  document.title
  window.location.href
  fetch('/api/data').then(r => r.json())
  chrome.storage.local.get()
  :filter error off
  :bypass start
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
    
    this.captureLog('info', [helpText]);
  }

  // Navigate history
  navigateHistory(direction) {
    const input = document.getElementById('consoleInput');
    if (!input) return;
    
    if (this.commandHistory.length === 0) return;
    
    // Save current input if we're at the end
    if (this.historyIndex === this.commandHistory.length && input.value.trim()) {
      this.tempCommand = input.value;
    }

    if (direction === -1) { // Up arrow - go back in history
      if (this.historyIndex === this.commandHistory.length) {
        // Starting from the end, go to last command
        this.historyIndex = this.commandHistory.length - 1;
      } else if (this.historyIndex > 0) {
        this.historyIndex--;
      }
    } else { // Down arrow - go forward in history
      if (this.historyIndex < this.commandHistory.length - 1) {
        this.historyIndex++;
      } else if (this.historyIndex === this.commandHistory.length - 1) {
        // At the last command, go to temp or clear
        this.historyIndex = this.commandHistory.length;
        input.value = this.tempCommand || '';
        this.tempCommand = '';
        return;
      }
    }

    if (this.historyIndex >= 0 && this.historyIndex < this.commandHistory.length) {
      input.value = this.commandHistory[this.historyIndex];
      // Move cursor to end
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = input.value.length;
      }, 0);
    }
  }

  // Handle autocomplete
  handleAutocomplete(text) {
    // Implement autocomplete logic
    // This would show suggestions based on the current text
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    const output = document.getElementById('consoleOutput');
    if (output) {
      output.innerHTML = '';
    }
    // Update badge
    const badge = document.querySelector('.log-count-badge');
    if (badge) {
      badge.textContent = '0';
    }
    // Add cleared message
    setTimeout(() => {
      this.captureLog('system', ['Console cleared']);
    }, 100);
  }

  // Export logs
  exportLogs() {
    const exportData = {
      timestamp: new Date().toISOString(),
      logs: this.logs.map(log => ({
        type: log.type,
        timestamp: log.timestamp.toISOString(),
        message: log.message,
        args: log.args
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.captureLog('success', ['Logs exported successfully']);
  }

  // Toggle minimize
  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    const console = document.getElementById('advancedConsole');
    
    if (console) {
      console.classList.toggle('minimized');
      
      ['consoleFilters', 'consoleOutput', 'consoleInputArea'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          element.style.display = this.isMinimized ? 'none' : '';
        }
      });
      
      // Update button
      const btn = document.getElementById('consoleMinimizeBtn');
      if (btn) {
        btn.textContent = this.isMinimized ? '⬆' : '⬇';
      }
    }
  }

  // Close console
  closeConsole() {
    const console = document.getElementById('advancedConsole');
    if (console) {
      console.remove();
    }
  }

  // Escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Show network activity
  async showNetworkActivity() {
    try {
      // Get network logs from chrome.devtools if available
      this.captureLog('network', ['Fetching network activity...']);
      
      // This would integrate with chrome.devtools.network if available
      // For now, show a placeholder
      this.captureLog('info', ['Network monitoring requires DevTools API access']);
    } catch (error) {
      this.captureLog('error', ['Failed to fetch network activity: ' + error.message]);
    }
  }

  // Show storage info
  async showStorageInfo() {
    try {
      const local = await chrome.storage.local.get();
      const session = await chrome.storage.session.get().catch(() => ({}));
      
      const info = {
        localStorage: Object.keys(local).length + ' items',
        sessionStorage: Object.keys(session).length + ' items',
        cookies: 'Access cookies via document.cookie',
        data: {
          local: local,
          session: session
        }
      };
      
      this.captureLog('info', ['Storage Information:', info]);
    } catch (error) {
      this.captureLog('error', ['Failed to fetch storage info: ' + error.message]);
    }
  }

  // Run bypass command
  runBypassCommand(args) {
    // Integrate with bypass testing
    chrome.runtime.sendMessage({
      type: 'consoleBypassCommand',
      command: args
    });
    
    this.captureLog('system', [`Bypass command sent: ${args}`]);
  }
  
  // Show command history
  showHistory() {
    if (this.commandHistory.length === 0) {
      this.captureLog('info', ['No command history available']);
      return;
    }
    
    const historyText = this.commandHistory
      .map((cmd, index) => `${index + 1}. ${cmd}`)
      .join('\n');
    
    this.captureLog('info', [`Command History (${this.commandHistory.length} commands):\n${historyText}`]);
  }
  
  // Set filter
  setFilter(type, enabled) {
    if (!this.filters.hasOwnProperty(type)) {
      this.captureLog('error', [`Unknown filter type: ${type}. Available: ${Object.keys(this.filters).join(', ')}`]);
      return;
    }
    
    this.filters[type] = enabled;
    this.updateConsoleDisplay();
    
    // Update UI button
    const filterBtn = document.querySelector(`.filter-btn[data-type="${type}"]`);
    if (filterBtn) {
      if (enabled) {
        filterBtn.classList.add('active');
      } else {
        filterBtn.classList.remove('active');
      }
    }
    
    this.captureLog('system', [`Filter '${type}' ${enabled ? 'enabled' : 'disabled'}`]);
  }
}

// Initialize console service
window.consoleService = new ConsoleService();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConsoleService;
}

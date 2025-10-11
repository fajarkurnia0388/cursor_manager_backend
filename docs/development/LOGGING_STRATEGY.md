# 📝 Logging Strategy (Non-Security)

**Tanggal:** Oktober 2025  
**Status:** Design Document  
**Purpose:** Debugging & Troubleshooting (NOT security/audit)

---

## 🎯 Logging Philosophy

### Purpose:

1. **Debugging** - Help developers find bugs
2. **Troubleshooting** - Help users solve problems
3. **Performance Monitoring** - Track slow operations
4. **Usage Understanding** - See which features are used

### NOT For:

- ❌ Security audit trails
- ❌ User activity surveillance
- ❌ Legal compliance
- ❌ Intrusion detection

### Principles:

- ✅ **Privacy-First** - Never log sensitive data (cookies, card CVCs, passwords)
- ✅ **Opt-In** - Debug logging only when user enables it
- ✅ **Local-Only** - Logs stay on user's machine
- ✅ **Rotation** - Old logs are cleaned up automatically
- ✅ **Clear** - Logs are human-readable

---

## 📊 Log Levels

### INFO (Default)

- ✅ Application startup/shutdown
- ✅ Configuration loaded
- ✅ Database initialized
- ✅ Operation completed successfully
- ✅ Important state changes

**Example:**

```
2025-10-04 10:30:15 - INFO - Database initialized: C:\Users\...\accounts.db
2025-10-04 10:30:15 - INFO - Native host started
2025-10-04 10:30:16 - INFO - Extension connected
```

### WARNING

- ⚠️ Deprecated feature used
- ⚠️ Recoverable errors
- ⚠️ Performance degradation
- ⚠️ Unexpected but handled situations

**Example:**

```
2025-10-04 10:31:20 - WARNING - Database size is large (50MB), consider cleanup
2025-10-04 10:31:25 - WARNING - Retry attempt 2/3 for operation getAccounts
```

### ERROR

- ❌ Operation failed
- ❌ Exceptions caught
- ❌ Data corruption detected
- ❌ External service unavailable

**Example:**

```
2025-10-04 10:32:10 - ERROR - Failed to load account: Account 'test' not found
2025-10-04 10:32:15 - ERROR - Database query failed: UNIQUE constraint failed
```

### DEBUG (Opt-In Only)

- 🔍 Detailed operation flow
- 🔍 Function parameters (sanitized)
- 🔍 Query details
- 🔍 Timing information

**Example:**

```
2025-10-04 10:33:00 - DEBUG - handle_request: method=accounts.getAll params={}
2025-10-04 10:33:00 - DEBUG - SQL: SELECT * FROM accounts (took 5ms)
2025-10-04 10:33:00 - DEBUG - Returned 12 accounts
```

---

## 💻 Python Backend Logging

### Configuration

```python
# src/logging_config.py
"""
Logging configuration for Python backend
Simple, privacy-respecting logging for debugging
"""
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from datetime import datetime

class PrivacyFilter(logging.Filter):
    """
    Filter to remove sensitive data from logs
    """
    SENSITIVE_KEYS = ['cookies', 'cookie', 'cvc', 'card_number', 'password', 'token']

    def filter(self, record):
        # Sanitize message
        if record.msg:
            record.msg = self.sanitize(str(record.msg))

        # Sanitize args
        if record.args:
            record.args = tuple(self.sanitize(str(arg)) for arg in record.args)

        return True

    def sanitize(self, text: str) -> str:
        """Replace sensitive values with [REDACTED]"""
        lower_text = text.lower()

        for key in self.SENSITIVE_KEYS:
            if key in lower_text:
                # Very simple sanitization - good enough for non-security use
                import re
                # Match patterns like: cookies='[...]' or "value": "abc123"
                pattern = rf'{key}["\']?\s*[:=]\s*["\']?([^,"\'}\]]+)'
                text = re.sub(pattern, f'{key}="[REDACTED]"', text, flags=re.IGNORECASE)

        return text


def setup_logging(debug: bool = False, log_to_file: bool = True):
    """
    Setup logging configuration

    Args:
        debug: Enable debug level logging
        log_to_file: Write logs to file (in addition to stderr)
    """
    # Determine log level
    log_level = logging.DEBUG if debug else logging.INFO

    # Log format
    if debug:
        # Detailed format for debugging
        log_format = '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
    else:
        # Simple format for normal use
        log_format = '%(asctime)s - %(levelname)s - %(message)s'

    formatter = logging.Formatter(log_format)

    # Handlers
    handlers = []

    # Console handler (stderr)
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(PrivacyFilter())
    handlers.append(console_handler)

    # File handler (optional)
    if log_to_file:
        log_dir = get_log_directory()
        log_dir.mkdir(parents=True, exist_ok=True)

        # Rotating file handler (max 5 files, 10MB each)
        log_file = log_dir / 'cursor-manager.log'
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        file_handler.addFilter(PrivacyFilter())
        handlers.append(file_handler)

        # Debug file (only in debug mode)
        if debug:
            debug_file = log_dir / f'debug-{datetime.now().strftime("%Y%m%d-%H%M%S")}.log'
            debug_handler = logging.FileHandler(debug_file, encoding='utf-8')
            debug_handler.setLevel(logging.DEBUG)
            debug_handler.setFormatter(formatter)
            debug_handler.addFilter(PrivacyFilter())
            handlers.append(debug_handler)

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        handlers=handlers,
        force=True
    )

    # Log startup
    logger = logging.getLogger(__name__)
    logger.info("=" * 60)
    logger.info(f"Cursor Account Manager Backend Starting")
    logger.info(f"Debug Mode: {'ON' if debug else 'OFF'}")
    logger.info(f"Log Level: {logging.getLevelName(log_level)}")
    if log_to_file:
        logger.info(f"Log Directory: {log_dir}")
    logger.info("=" * 60)

    return logger


def get_log_directory() -> Path:
    """Get log directory path (platform-specific)"""
    import os
    import sys

    if sys.platform == 'win32':
        # Windows: %LOCALAPPDATA%\CursorManager\logs
        base = Path(os.environ.get('LOCALAPPDATA', os.environ['APPDATA']))
    elif sys.platform == 'darwin':
        # macOS: ~/Library/Logs/CursorManager
        base = Path.home() / 'Library' / 'Logs'
    else:
        # Linux: ~/.local/share/CursorManager/logs
        base = Path.home() / '.local' / 'share'

    return base / 'CursorManager' / 'logs'


def cleanup_old_logs(days: int = 7):
    """
    Delete log files older than specified days

    Args:
        days: Number of days to keep logs
    """
    import time
    from datetime import timedelta

    log_dir = get_log_directory()
    if not log_dir.exists():
        return

    cutoff = time.time() - (days * 24 * 60 * 60)
    deleted = 0

    for log_file in log_dir.glob('*.log*'):
        if log_file.stat().st_mtime < cutoff:
            try:
                log_file.unlink()
                deleted += 1
            except Exception as e:
                logging.warning(f"Failed to delete old log: {log_file} - {e}")

    if deleted > 0:
        logging.info(f"Cleaned up {deleted} old log file(s)")


# Usage in main.py:
# from logging_config import setup_logging, cleanup_old_logs
#
# # Enable debug from command line: python main.py --debug
# import argparse
# parser = argparse.ArgumentParser()
# parser.add_argument('--debug', action='store_true', help='Enable debug logging')
# args = parser.parse_args()
#
# setup_logging(debug=args.debug)
# cleanup_old_logs(days=7)
```

### Usage in Services

```python
# src/services/account_service.py
import logging

logger = logging.getLogger(__name__)

class AccountService:
    def get_all(self):
        logger.info("Fetching all accounts")
        start_time = time.time()

        try:
            accounts = self.db.execute('SELECT * FROM accounts')
            elapsed = (time.time() - start_time) * 1000

            logger.info(f"Fetched {len(accounts)} accounts (took {elapsed:.2f}ms)")
            logger.debug(f"Accounts: {[a['name'] for a in accounts]}")  # Names only, no sensitive data

            return accounts

        except Exception as e:
            logger.error(f"Failed to fetch accounts: {e}", exc_info=True)
            raise

    def create(self, name: str, email: str, cookies: list = None):
        logger.info(f"Creating account: name='{name}', email='{email}', cookies_count={len(cookies or [])}")
        # Note: Don't log actual cookies!

        try:
            # ... create logic

            logger.info(f"✅ Account '{name}' created (ID: {account_id})")
            logger.debug(f"Account details: id={account_id}, name='{name}', email='{email}'")

            return account

        except Exception as e:
            logger.error(f"Failed to create account '{name}': {e}", exc_info=True)
            raise
```

### Performance Logging

```python
# src/utils/performance.py
"""
Simple performance timing decorator
"""
import logging
import time
import functools

logger = logging.getLogger(__name__)

def log_performance(threshold_ms: float = 100):
    """
    Log function execution time if it exceeds threshold

    Args:
        threshold_ms: Log warning if execution takes longer than this (milliseconds)
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()

            try:
                result = func(*args, **kwargs)
                return result
            finally:
                elapsed_ms = (time.time() - start) * 1000

                if elapsed_ms > threshold_ms:
                    logger.warning(
                        f"Slow operation: {func.__name__} took {elapsed_ms:.2f}ms "
                        f"(threshold: {threshold_ms}ms)"
                    )
                else:
                    logger.debug(f"{func.__name__} took {elapsed_ms:.2f}ms")

        return wrapper
    return decorator

# Usage:
@log_performance(threshold_ms=50)
def get_all_accounts(self):
    # ... implementation
    pass
```

---

## 🌐 Extension Logging (JavaScript)

### Console Logging

```javascript
// services/logger.js
/**
 * Simple logger for extension
 * Only logs to console, not to file (browser limitation)
 */

class Logger {
  constructor(name) {
    this.name = name;
    this.debugEnabled = false;

    // Check if debug mode enabled (from storage)
    chrome.storage.local.get("debug_mode", (result) => {
      this.debugEnabled = result.debug_mode || false;
    });
  }

  info(message, ...args) {
    console.log(`[${this.name}] INFO:`, message, ...args);
  }

  warn(message, ...args) {
    console.warn(`[${this.name}] WARN:`, message, ...args);
  }

  error(message, ...args) {
    console.error(`[${this.name}] ERROR:`, message, ...args);
  }

  debug(message, ...args) {
    if (this.debugEnabled) {
      console.log(`[${this.name}] DEBUG:`, message, ...args);
    }
  }

  // Sanitize sensitive data before logging
  sanitize(obj) {
    if (typeof obj !== "object") return obj;

    const sanitized = { ...obj };
    const sensitiveKeys = [
      "cookies",
      "cookie",
      "cvc",
      "card_number",
      "password",
      "token",
    ];

    for (const key in sanitized) {
      if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
        sanitized[key] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  // Log with timing
  time(label) {
    console.time(`[${this.name}] ${label}`);
  }

  timeEnd(label) {
    console.timeEnd(`[${this.name}] ${label}`);
  }
}

// Usage:
// const logger = new Logger('AccountManager');
// logger.info('Loading accounts...');
// logger.debug('Account data:', logger.sanitize(account));
```

### Performance Monitoring

```javascript
// services/performance-logger.js
/**
 * Track operation performance
 */

class PerformanceLogger {
  constructor() {
    this.metrics = [];
    this.enabled = false;

    // Check if enabled
    chrome.storage.local.get("performance_logging", (result) => {
      this.enabled = result.performance_logging || false;
    });
  }

  async measure(name, operation) {
    if (!this.enabled) {
      return operation();
    }

    const start = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - start;

      this.metrics.push({
        name,
        duration,
        timestamp: Date.now(),
        success: true,
      });

      if (duration > 100) {
        console.warn(`Slow operation: ${name} took ${duration.toFixed(2)}ms`);
      } else {
        console.log(`${name} took ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;

      this.metrics.push({
        name,
        duration,
        timestamp: Date.now(),
        success: false,
        error: error.message,
      });

      throw error;
    }
  }

  getStats() {
    const stats = {};

    for (const metric of this.metrics) {
      if (!stats[metric.name]) {
        stats[metric.name] = {
          count: 0,
          totalDuration: 0,
          minDuration: Infinity,
          maxDuration: -Infinity,
          failures: 0,
        };
      }

      const stat = stats[metric.name];
      stat.count++;
      stat.totalDuration += metric.duration;
      stat.minDuration = Math.min(stat.minDuration, metric.duration);
      stat.maxDuration = Math.max(stat.maxDuration, metric.duration);

      if (!metric.success) {
        stat.failures++;
      }
    }

    // Calculate averages
    for (const name in stats) {
      stats[name].avgDuration = stats[name].totalDuration / stats[name].count;
    }

    return stats;
  }

  clear() {
    this.metrics = [];
  }
}

// Usage:
// const perfLogger = new PerformanceLogger();
//
// const accounts = await perfLogger.measure('getAccounts', async () => {
//   return nativeClient.getAccounts();
// });
```

---

## 🔍 Debug Mode UI

### Settings Panel

```html
<!-- In sidepanel.html -->
<div class="settings-section">
  <h3>🐛 Debug Settings</h3>

  <div class="setting-item">
    <label>
      <input type="checkbox" id="debug-mode-toggle" />
      Enable Debug Logging
    </label>
    <p class="hint">
      Logs detailed information to help troubleshoot issues. May impact
      performance.
    </p>
  </div>

  <div class="setting-item">
    <label>
      <input type="checkbox" id="performance-logging-toggle" />
      Enable Performance Logging
    </label>
    <p class="hint">Track operation timings to identify slow operations.</p>
  </div>

  <div class="setting-item">
    <button id="show-logs-btn" class="btn-secondary">📋 View Logs</button>
    <button id="export-logs-btn" class="btn-secondary">💾 Export Logs</button>
    <p class="hint">Backend logs are saved to: <code id="log-path"></code></p>
  </div>

  <div class="setting-item">
    <button id="clear-logs-btn" class="btn-danger">🗑️ Clear Logs</button>
  </div>
</div>
```

### JavaScript Handler

```javascript
// In sidepanel.js
document
  .getElementById("debug-mode-toggle")
  .addEventListener("change", async (e) => {
    const enabled = e.target.checked;

    // Save to storage
    await chrome.storage.local.set({ debug_mode: enabled });

    // Notify backend
    await nativeClient.call("system.setDebugMode", { enabled });

    showSuccess(`Debug mode ${enabled ? "enabled" : "disabled"}`);
  });

document.getElementById("show-logs-btn").addEventListener("click", async () => {
  // Get log file path from backend
  const logInfo = await nativeClient.call("system.getLogInfo");

  // Open log file in default editor
  chrome.runtime.sendMessage({
    action: "openFile",
    path: logInfo.log_file,
  });
});

document
  .getElementById("export-logs-btn")
  .addEventListener("click", async () => {
    // Get logs from backend
    const logs = await nativeClient.call("system.getLogs", { lines: 1000 });

    // Download as file
    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `cursor-manager-logs-${Date.now()}.log`;
    a.click();

    URL.revokeObjectURL(url);
  });
```

---

## 📦 Backend: System Commands for Logging

```python
# src/native_host.py (add to handle_system)
def handle_system(self, action: str, params: dict):
    """Handle system operations including logging"""

    if action == 'setDebugMode':
        enabled = params.get('enabled', False)

        # Reconfigure logging
        level = logging.DEBUG if enabled else logging.INFO
        logging.getLogger().setLevel(level)

        for handler in logging.getLogger().handlers:
            handler.setLevel(level)

        logger.info(f"Debug mode {'enabled' if enabled else 'disabled'}")

        return {'debug_mode': enabled}

    elif action == 'getLogInfo':
        from logging_config import get_log_directory
        log_dir = get_log_directory()
        log_file = log_dir / 'cursor-manager.log'

        return {
            'log_directory': str(log_dir),
            'log_file': str(log_file),
            'exists': log_file.exists(),
            'size': log_file.stat().st_size if log_file.exists() else 0
        }

    elif action == 'getLogs':
        lines = params.get('lines', 100)

        from logging_config import get_log_directory
        log_file = get_log_directory() / 'cursor-manager.log'

        if not log_file.exists():
            return ''

        # Read last N lines
        with open(log_file, 'r', encoding='utf-8') as f:
            all_lines = f.readlines()
            last_lines = all_lines[-lines:]
            return ''.join(last_lines)

    elif action == 'clearLogs':
        from logging_config import get_log_directory
        log_dir = get_log_directory()

        deleted = 0
        for log_file in log_dir.glob('*.log*'):
            try:
                log_file.unlink()
                deleted += 1
            except Exception as e:
                logger.warning(f"Failed to delete log: {log_file} - {e}")

        return {'deleted': deleted}

    else:
        # ... (other system actions)
        pass
```

---

## 📊 Log Rotation & Cleanup

### Automatic Cleanup (Python)

```python
# src/main.py (add to startup)
def main():
    # Parse args
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--debug', action='store_true')
    args = parser.parse_args()

    # Setup logging
    from logging_config import setup_logging, cleanup_old_logs
    setup_logging(debug=args.debug)

    # Cleanup old logs (keep 7 days)
    cleanup_old_logs(days=7)

    # Start native host
    host = NativeHost()
    host.run()
```

### Manual Cleanup (CLI)

```python
# cli.py (add new command)
@cli.command('clean-logs')
@click.option('--days', default=7, help='Delete logs older than this many days')
def clean_logs(days):
    """Clean up old log files"""
    from logging_config import cleanup_old_logs

    cleanup_old_logs(days=days)
    console.print(f"[green]✓[/green] Cleaned up logs older than {days} days")
```

---

## 🧪 Testing Logging

```python
# tests/test_logging.py
import logging
from logging_config import setup_logging, PrivacyFilter

def test_privacy_filter():
    """Test that sensitive data is redacted"""
    filter = PrivacyFilter()

    # Test cookie redaction
    message = "Setting cookie='abc123' for user"
    sanitized = filter.sanitize(message)
    assert '[REDACTED]' in sanitized
    assert 'abc123' not in sanitized

    # Test CVC redaction
    message = "Card cvc: 123"
    sanitized = filter.sanitize(message)
    assert '[REDACTED]' in sanitized
    assert '123' not in sanitized

def test_log_file_created():
    """Test that log file is created"""
    from logging_config import get_log_directory

    setup_logging(debug=True, log_to_file=True)

    log_dir = get_log_directory()
    log_file = log_dir / 'cursor-manager.log'

    assert log_file.exists()

    # Write test log
    logger = logging.getLogger(__name__)
    logger.info("Test log message")

    # Check file contains message
    with open(log_file, 'r') as f:
        contents = f.read()
        assert 'Test log message' in contents
```

---

## ✅ Logging Best Practices

### DO:

- ✅ Log important operations (create, update, delete)
- ✅ Log errors with context
- ✅ Use appropriate log levels
- ✅ Sanitize sensitive data
- ✅ Include timing for performance tracking
- ✅ Use structured log messages

### DON'T:

- ❌ Log passwords, cookies, CVCs, tokens
- ❌ Log in tight loops (performance impact)
- ❌ Log entire objects (may contain sensitive data)
- ❌ Use logging for business logic
- ❌ Ignore log file size
- ❌ Log to remote servers (privacy concern)

### Good Examples:

```python
# ✅ Good
logger.info(f"Account '{name}' created (ID: {account_id})")
logger.debug(f"Found {len(accounts)} accounts matching query '{query}'")
logger.error(f"Failed to save account: {error}", exc_info=True)

# ❌ Bad
logger.info(f"Account created: {account}")  # May contain sensitive data
logger.debug(cookies)  # Logs actual cookie values!
logger.info(f"Card: {card_number} {cvc}")  # Logs sensitive card data!
```

---

## 📋 Implementation Checklist

- [ ] Create `src/logging_config.py` with PrivacyFilter
- [ ] Add logging to all services
- [ ] Add performance decorator
- [ ] Create extension logger (logger.js)
- [ ] Add debug mode toggle in UI
- [ ] Add system commands for log management
- [ ] Add log viewer/export buttons
- [ ] Add automatic log cleanup
- [ ] Add CLI command for log management
- [ ] Test privacy filter
- [ ] Test log rotation
- [ ] Document log locations in README

---

**Prepared By:** AI Architect  
**Date:** Oktober 2025  
**Status:** Design Complete  
**Implementation Time:** 1 day

# ❌ Error Handling Strategy

**Tanggal:** Oktober 2025  
**Status:** Design Document  
**Approach:** Simple, User-Friendly, Debuggable

---

## 🎯 Error Handling Philosophy

### Principles:

1. **User-Friendly** - Clear, actionable error messages
2. **Developer-Friendly** - Detailed logs for debugging
3. **Fail Gracefully** - Never crash, always recover
4. **Contextual** - Show where error happened
5. **Actionable** - Tell user what to do next

---

## 📋 Error Categories & Codes

### 1000-1999: Connection Errors

| Code | Error                | User Message                                                                      | Developer Action          |
| ---- | -------------------- | --------------------------------------------------------------------------------- | ------------------------- |
| 1001 | Backend Not Found    | "Backend not installed. Click 'Install Backend' button."                          | Show install instructions |
| 1002 | Connection Failed    | "Cannot connect to backend. Click 'Start Backend' button."                        | Try to start backend      |
| 1003 | Backend Disconnected | "Backend disconnected. Reconnecting..."                                           | Auto-reconnect            |
| 1004 | Connection Timeout   | "Backend is not responding. Please restart backend."                              | Show restart button       |
| 1005 | Version Mismatch     | "Backend version {backend_ver} doesn't match extension {ext_ver}. Please update." | Show update button        |

### 2000-2999: Account Errors

| Code | Error                  | User Message                                                     | Developer Action            |
| ---- | ---------------------- | ---------------------------------------------------------------- | --------------------------- |
| 2001 | Account Not Found      | "Account '{name}' not found."                                    | Refresh account list        |
| 2002 | Account Already Exists | "Account '{name}' already exists. Choose different name."        | Focus on name input         |
| 2003 | Invalid Account Name   | "Account name cannot be empty or contain special characters."    | Show validation             |
| 2004 | No Cookies             | "Account has no cookies. Cannot switch to this account."         | Offer to re-capture cookies |
| 2005 | Cookie Expired         | "Account cookies expired. Please re-login to Cursor."            | Show re-login button        |
| 2006 | Cannot Delete Active   | "Cannot delete active account. Switch to another account first." | Disable delete button       |

### 3000-3999: Card Errors

| Code | Error               | User Message                                       | Developer Action            |
| ---- | ------------------- | -------------------------------------------------- | --------------------------- |
| 3001 | Invalid Card Number | "Invalid card number. Please check and try again." | Highlight card number field |
| 3002 | Invalid CVC         | "CVC must be 3-4 digits."                          | Highlight CVC field         |
| 3003 | Invalid Expiry      | "Card is expired."                                 | Highlight expiry fields     |
| 3004 | Card Not Found      | "Card not found."                                  | Refresh card list           |

### 4000-4999: Database Errors

| Code | Error              | User Message                                      | Developer Action             |
| ---- | ------------------ | ------------------------------------------------- | ---------------------------- |
| 4001 | Database Locked    | "Database is busy. Please try again."             | Retry automatically          |
| 4002 | Database Corrupted | "Database is corrupted. Restore from backup?"     | Show restore dialog          |
| 4003 | Disk Full          | "Disk is full. Cannot save data."                 | Show disk space warning      |
| 4004 | Permission Denied  | "Cannot access database file. Check permissions." | Show permission instructions |

### 5000-5999: Backup/Import Errors

| Code | Error          | User Message                           | Developer Action      |
| ---- | -------------- | -------------------------------------- | --------------------- |
| 5001 | Invalid JSON   | "Backup file is invalid or corrupted." | Show file format help |
| 5002 | File Not Found | "Backup file not found."               | Show file picker      |
| 5003 | Export Failed  | "Cannot save backup file."             | Check disk space      |
| 5004 | Import Failed  | "Cannot import backup: {reason}"       | Show error details    |

### 9000-9999: System Errors

| Code | Error             | User Message                                    | Developer Action                   |
| ---- | ----------------- | ----------------------------------------------- | ---------------------------------- |
| 9001 | Unknown Error     | "Something went wrong. Please try again."       | Show error details + report button |
| 9002 | Python Not Found  | "Python is not installed or not in PATH."       | Show Python install guide          |
| 9003 | Permission Denied | "Extension does not have required permissions." | Show permissions help              |

---

## 💻 Implementation

### Python Backend: Error Response Format

```python
# src/errors.py
"""
Error handling for Python backend
Simple error classes with codes and messages
"""

class AppError(Exception):
    """Base application error"""
    def __init__(self, code: int, message: str, details: dict = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self):
        return {
            'code': self.code,
            'message': self.message,
            'details': self.details
        }

# Connection Errors (1000-1999)
class ConnectionError(AppError):
    def __init__(self, message: str, details: dict = None):
        super().__init__(1003, message, details)

# Account Errors (2000-2999)
class AccountNotFoundError(AppError):
    def __init__(self, account_name: str):
        super().__init__(
            2001,
            f"Account '{account_name}' not found",
            {'account_name': account_name}
        )

class AccountExistsError(AppError):
    def __init__(self, account_name: str):
        super().__init__(
            2002,
            f"Account '{account_name}' already exists",
            {'account_name': account_name}
        )

class InvalidAccountNameError(AppError):
    def __init__(self, name: str, reason: str):
        super().__init__(
            2003,
            f"Invalid account name: {reason}",
            {'name': name, 'reason': reason}
        )

# Card Errors (3000-3999)
class InvalidCardNumberError(AppError):
    def __init__(self):
        super().__init__(3001, "Invalid card number")

class InvalidCVCError(AppError):
    def __init__(self):
        super().__init__(3002, "CVC must be 3-4 digits")

# Database Errors (4000-4999)
class DatabaseLockedError(AppError):
    def __init__(self):
        super().__init__(4001, "Database is busy, please try again")

class DatabaseCorruptedError(AppError):
    def __init__(self):
        super().__init__(4002, "Database is corrupted")

# Backup Errors (5000-5999)
class InvalidBackupError(AppError):
    def __init__(self, reason: str):
        super().__init__(5001, f"Invalid backup file: {reason}")

# System Errors (9000-9999)
class UnknownError(AppError):
    def __init__(self, message: str):
        super().__init__(9001, message)
```

### Python Backend: Error Handler Decorator

```python
# src/error_handler.py
"""
Decorator for handling errors in services
"""
import functools
import logging
from errors import AppError, UnknownError

logger = logging.getLogger(__name__)

def handle_errors(func):
    """Decorator to catch and format errors"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except AppError as e:
            # Known application error
            logger.error(f"AppError: {e.message}", extra={
                'code': e.code,
                'details': e.details
            })
            raise
        except Exception as e:
            # Unknown error
            logger.exception(f"Unexpected error: {str(e)}")
            raise UnknownError(f"Unexpected error: {str(e)}")

    return wrapper
```

### Python Backend: Using Error Handling

```python
# src/services/account_service.py
from errors import AccountNotFoundError, AccountExistsError, InvalidAccountNameError
from error_handler import handle_errors

class AccountService:
    @handle_errors
    def get_by_name(self, name: str):
        """Get account by name with error handling"""
        # Validate name
        if not name or not name.strip():
            raise InvalidAccountNameError(name, "Name cannot be empty")

        if len(name) > 100:
            raise InvalidAccountNameError(name, "Name too long (max 100 chars)")

        # Query database
        account = self.db.execute_one(
            'SELECT * FROM accounts WHERE name = ?',
            (name,)
        )

        if not account:
            raise AccountNotFoundError(name)

        return account

    @handle_errors
    def create(self, name: str, email: str, **kwargs):
        """Create account with validation"""
        # Validate name
        if not name or not name.strip():
            raise InvalidAccountNameError(name, "Name cannot be empty")

        # Check if exists
        existing = self.db.execute_one(
            'SELECT * FROM accounts WHERE name = ?',
            (name,)
        )

        if existing:
            raise AccountExistsError(name)

        # Create account
        # ... (rest of create logic)
```

### Python Backend: Native Host Error Response

```python
# src/native_host.py (updated handle_request)
def handle_request(self, request: dict) -> dict:
    """Handle request with proper error formatting"""
    try:
        method = request.get('method', '')
        params = request.get('params', {})
        request_id = request.get('id')

        # Route to service
        # ... (routing logic)

        # Success response
        return {
            'jsonrpc': '2.0',
            'id': request_id,
            'result': {
                'success': True,
                'data': result
            }
        }

    except AppError as e:
        # Known application error
        return {
            'jsonrpc': '2.0',
            'id': request.get('id'),
            'error': {
                'code': e.code,
                'message': e.message,
                'details': e.details
            }
        }

    except Exception as e:
        # Unknown error
        logger.exception("Unhandled error")
        return {
            'jsonrpc': '2.0',
            'id': request.get('id'),
            'error': {
                'code': 9001,
                'message': 'Internal server error',
                'details': {'error': str(e)}
            }
        }
```

---

## 🌐 Extension: Error Handling

### Extension: Error Display Component

```javascript
// services/error-display.js
/**
 * User-friendly error display
 */

class ErrorDisplay {
  constructor() {
    this.container = null;
  }

  init() {
    // Create error container
    this.container = document.createElement("div");
    this.container.id = "error-container";
    this.container.className = "error-container hidden";
    document.body.appendChild(this.container);
  }

  show(error) {
    const { code, message, details } = error;

    // Get user-friendly message
    const displayMessage = this.getUserMessage(code, message, details);
    const actionButton = this.getActionButton(code, details);

    // Build error UI
    this.container.innerHTML = `
      <div class="error-card">
        <div class="error-icon">${this.getIcon(code)}</div>
        <div class="error-message">${displayMessage}</div>
        ${
          actionButton
            ? `<button class="error-action" data-action="${actionButton.action}">${actionButton.label}</button>`
            : ""
        }
        <button class="error-close">×</button>
      </div>
    `;

    this.container.classList.remove("hidden");

    // Setup event listeners
    this.container.querySelector(".error-close").onclick = () => this.hide();

    const actionBtn = this.container.querySelector(".error-action");
    if (actionBtn) {
      actionBtn.onclick = () =>
        this.handleAction(actionBtn.dataset.action, details);
    }

    // Auto-hide after 10 seconds (except for critical errors)
    if (!this.isCritical(code)) {
      setTimeout(() => this.hide(), 10000);
    }
  }

  hide() {
    this.container.classList.add("hidden");
  }

  getUserMessage(code, message, details) {
    // Map error codes to user-friendly messages
    const messages = {
      1001: "Backend not installed. Click 'Install Backend' button.",
      1002: "Cannot connect to backend. Click 'Start Backend' button.",
      1003: "Backend disconnected. Reconnecting...",
      1004: "Backend is not responding. Please restart backend.",
      1005: `Backend version ${details.backend_ver} doesn't match extension ${details.ext_ver}. Please update.`,
      2001: `Account '${details.account_name}' not found.`,
      2002: `Account '${details.account_name}' already exists. Choose different name.`,
      2003: "Account name cannot be empty or contain special characters.",
      2004: "Account has no cookies. Cannot switch to this account.",
      2005: "Account cookies expired. Please re-login to Cursor.",
      3001: "Invalid card number. Please check and try again.",
      3002: "CVC must be 3-4 digits.",
      3003: "Card is expired.",
      4001: "Database is busy. Please try again.",
      4002: "Database is corrupted. Restore from backup?",
      5001: "Backup file is invalid or corrupted.",
      9001: "Something went wrong. Please try again.",
    };

    return messages[code] || message;
  }

  getActionButton(code, details) {
    const actions = {
      1001: { action: "install", label: "📥 Install Backend" },
      1002: { action: "start", label: "▶️ Start Backend" },
      1004: { action: "restart", label: "🔄 Restart Backend" },
      1005: { action: "update", label: "⬆️ Update" },
      2004: { action: "recapture", label: "🔄 Re-capture Cookies" },
      2005: { action: "relogin", label: "🔓 Re-login" },
      4002: { action: "restore", label: "♻️ Restore Backup" },
      9001: { action: "report", label: "📧 Report Error" },
    };

    return actions[code];
  }

  handleAction(action, details) {
    switch (action) {
      case "install":
        window.open("https://github.com/your-repo/releases/latest");
        break;

      case "start":
        this.startBackend();
        break;

      case "restart":
        this.restartBackend();
        break;

      case "update":
        window.open("https://github.com/your-repo/releases/latest");
        break;

      case "recapture":
        // Trigger cookie re-capture
        document.getElementById("capture-cookies-btn").click();
        break;

      case "relogin":
        window.open("https://cursor.sh/login");
        break;

      case "restore":
        document.getElementById("import-backup-btn").click();
        break;

      case "report":
        this.openBugReport(details);
        break;
    }

    this.hide();
  }

  async startBackend() {
    // Send message to background script to start backend
    await chrome.runtime.sendMessage({ action: "startBackend" });
  }

  async restartBackend() {
    // Send message to background script to restart backend
    await chrome.runtime.sendMessage({ action: "restartBackend" });
  }

  openBugReport(details) {
    const body = `
Error Code: ${details.code}
Error Message: ${details.message}
Details: ${JSON.stringify(details, null, 2)}

Steps to reproduce:
1. 
2. 
3. 
    `.trim();

    const url = `https://github.com/your-repo/issues/new?title=Error ${
      details.code
    }&body=${encodeURIComponent(body)}`;
    window.open(url);
  }

  getIcon(code) {
    if (code >= 1000 && code < 2000) return "🔌"; // Connection
    if (code >= 2000 && code < 3000) return "👤"; // Account
    if (code >= 3000 && code < 4000) return "💳"; // Card
    if (code >= 4000 && code < 5000) return "💾"; // Database
    if (code >= 5000 && code < 6000) return "📦"; // Backup
    return "⚠️"; // Default
  }

  isCritical(code) {
    // Critical errors that need user attention
    return [1001, 1005, 4002, 4003, 4004].includes(code);
  }
}

// Export singleton
export const errorDisplay = new ErrorDisplay();
```

### Extension: Native Client with Error Handling

```javascript
// services/native-client.js (updated)
class NativeClient {
  async call(method, params = {}) {
    try {
      if (!this.connected) {
        throw { code: 1002, message: "Not connected to backend" };
      }

      const id = ++this.requestId;

      const response = await new Promise((resolve, reject) => {
        this.pendingRequests.set(id, { resolve, reject });

        this.port.postMessage({
          jsonrpc: "2.0",
          id,
          method,
          params,
        });

        // Timeout
        setTimeout(() => {
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id);
            reject({ code: 1004, message: "Request timeout" });
          }
        }, 5000);
      });

      return response;
    } catch (error) {
      // Show error to user
      errorDisplay.show(error);
      throw error;
    }
  }

  handleResponse(response) {
    const { id, result, error } = response;

    const pending = this.pendingRequests.get(id);
    if (!pending) return;

    this.pendingRequests.delete(id);

    if (error) {
      // Format error
      const formattedError = {
        code: error.code,
        message: error.message,
        details: error.details || {},
      };

      pending.reject(formattedError);
    } else {
      pending.resolve(result.data);
    }
  }
}
```

### Extension: Retry Logic

```javascript
// services/retry.js
/**
 * Automatic retry for recoverable errors
 */

async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    retryableErrors = [1003, 1004, 4001], // Connection lost, timeout, db locked
  } = options;

  let lastError;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!retryableErrors.includes(error.code)) {
        throw error;
      }

      // Last attempt?
      if (i === maxRetries) {
        throw error;
      }

      // Wait before retry
      const waitTime = delay * Math.pow(backoff, i);
      console.log(`Retry ${i + 1}/${maxRetries} in ${waitTime}ms...`);
      await sleep(waitTime);
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Usage:
async function getAccounts() {
  return withRetry(() => nativeClient.getAccounts(), {
    maxRetries: 3,
    delay: 1000,
  });
}
```

---

## 🎨 Error UI Styles

```css
/* error-display.css */
.error-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  max-width: 400px;
}

.error-container.hidden {
  display: none;
}

.error-card {
  background: #fee;
  border: 2px solid #c33;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;
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

.error-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.error-message {
  color: #333;
  margin-bottom: 12px;
  line-height: 1.5;
}

.error-action {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 8px;
}

.error-action:hover {
  background: #2563eb;
}

.error-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  float: right;
  margin-top: -32px;
  color: #666;
}

.error-close:hover {
  color: #333;
}
```

---

## 📝 Error Logging (for Debugging)

```python
# src/logging_config.py
"""
Simple logging configuration
Logs to file for debugging, not for security
"""
import logging
import sys
from pathlib import Path

def setup_logging(debug=False):
    """Setup logging configuration"""
    log_level = logging.DEBUG if debug else logging.INFO

    # Log format
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

    # Console handler (stderr)
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(logging.Formatter(log_format))

    # File handler (for debugging)
    if debug:
        log_dir = Path.home() / '.cursor-manager'
        log_dir.mkdir(exist_ok=True)
        log_file = log_dir / 'debug.log'

        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(logging.Formatter(log_format))

        handlers = [console_handler, file_handler]
    else:
        handlers = [console_handler]

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        handlers=handlers
    )

    # Log startup
    logger = logging.getLogger(__name__)
    logger.info(f"Logging initialized (debug={'ON' if debug else 'OFF'})")
    if debug:
        logger.debug(f"Log file: {log_file}")

# Usage in main.py:
# setup_logging(debug=True)  # Enable for debugging
```

---

## 🧪 Testing Error Handling

```python
# tests/test_error_handling.py
import pytest
from errors import AccountNotFoundError, AccountExistsError
from services.account_service import AccountService

def test_account_not_found_error():
    service = AccountService(db)

    with pytest.raises(AccountNotFoundError) as exc_info:
        service.get_by_name('nonexistent')

    assert exc_info.value.code == 2001
    assert 'nonexistent' in exc_info.value.message

def test_account_exists_error():
    service = AccountService(db)
    service.create('test', 'test@example.com')

    with pytest.raises(AccountExistsError) as exc_info:
        service.create('test', 'another@example.com')

    assert exc_info.value.code == 2002
    assert 'test' in exc_info.value.message
```

---

## ✅ Implementation Checklist

- [ ] Create `src/errors.py` with all error classes
- [ ] Create `src/error_handler.py` with decorator
- [ ] Update all services to use error handling
- [ ] Update `native_host.py` to format errors properly
- [ ] Create `services/error-display.js` in extension
- [ ] Add error display to sidepanel UI
- [ ] Add retry logic for transient errors
- [ ] Add error logging configuration
- [ ] Write tests for error scenarios
- [ ] Document all error codes in README

---

**Prepared By:** AI Architect  
**Date:** Oktober 2025  
**Status:** Design Complete  
**Implementation Time:** 2 days

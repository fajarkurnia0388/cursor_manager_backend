# Hybrid Architecture: Backend-First dengan Smart Extension

**Version:** 2.0  
**Last Updated:** 2025-10-04  
**Status:** ✅ Active - Approved Architecture

---

## Executive Summary

Arsitektur hybrid dimana **Python Backend** menangani semua business logic dan data storage, sementara **Chrome Extension** menangani browser-specific operations yang tidak bisa dilakukan oleh backend (cookies, DOM, WebRequest, tabs).

### Key Principle

> **Backend = Brain (Logic & Data)**  
> **Extension = Hands (Browser Operations)**

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                           │
├───────────────────────────────┬───────────────────────────────────────┤
│    Python GUI (tkinter)       │    Chrome Extension (Sidepanel)       │
│    - Direct DB access         │    - Browser integration             │
│    - All features available   │    - Cookie management               │
│    - Standalone app           │    - Auto-fill forms                 │
└───────────────┬───────────────┴────────────┬──────────────────────────┘
                │                            │
                │                            │ Browser APIs
                │                            │ (cookies, tabs,
                │                            │  webRequest, DOM)
                │                            │
┌───────────────▼────────────────────────────▼──────────────────────────┐
│                   PYTHON BACKEND (Core Logic)                         │
│                                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Account    │  │   Cards     │  │  Generator  │  │   Bypass    │ │
│  │  Service    │  │  Service    │  │  Service    │  │   Service   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Pro Trial   │  │   Export    │  │   Status    │  │    Batch    │ │
│  │  Service    │  │  Service    │  │  Service    │  │   Service   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                      SQLite Database                             │ │
│  │  - Accounts  - Cards  - Bypass Tests  - Pro Trials              │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │              Native Messaging Host (JSON-RPC 2.0)                │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Responsibility Matrix

### 🔵 Backend Only (Python)

| Feature             | Service                | Responsibility                     | Reason               |
| ------------------- | ---------------------- | ---------------------------------- | -------------------- |
| Account CRUD        | `account_service.py`   | Create/Read/Update/Delete accounts | Pure data operations |
| Card CRUD           | `cards_service.py`     | Create/Read/Update/Delete cards    | Pure data operations |
| Card Generation     | `card_generator.py`    | Generate valid card numbers (Luhn) | Pure algorithm       |
| Export Data         | `export_service.py`    | Export to JSON/CSV                 | File operations      |
| Import Data         | `import_service.py`    | Parse & validate imports           | File operations      |
| Batch Operations    | `batch_service.py`     | Bulk operations                    | Data operations      |
| Bypass Test Storage | `bypass_service.py`    | Store test results                 | Database operations  |
| Pro Trial Tracking  | `pro_trial_service.py` | Track trial status                 | Database operations  |
| CLI Tools           | `cli.py`               | Command-line interface             | Independent tooling  |
| Desktop GUI         | `gui.py`               | Desktop application                | Independent UI       |

### 🟢 Extension Only (JavaScript)

| Feature               | File                         | Responsibility               | Reason                |
| --------------------- | ---------------------------- | ---------------------------- | --------------------- |
| Cookie Management     | `background.js`              | Get/Set/Delete cookies       | Chrome API only       |
| Form Auto-Fill        | `auto-fill.js`, `content.js` | Fill Stripe/login forms      | DOM access needed     |
| DOM Manipulation      | `content.js`                 | Inject scripts, modify pages | Content script needed |
| WebRequest Monitoring | `background.js`              | Intercept HTTP requests      | WebRequest API only   |
| Tab Management        | `background.js`              | Create/manage tabs           | Tabs API only         |
| OAuth Handling        | `content.js`                 | Handle OAuth redirects       | Page access needed    |
| Side Panel UI         | `sidepanel.js`               | Extension UI                 | Extension-specific    |
| Badge Updates         | `background.js`              | Update extension badge       | Extension API only    |
| Chrome Storage        | Various                      | Fallback/cache storage       | Extension API only    |

### 🟡 Hybrid (Both)

| Feature                    | Backend Part                                                                          | Extension Part                                                                        | Communication                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Pro Trial Activation**   | `pro_trial_service.py`<br>- Generate trial token<br>- Track status<br>- Store history | `auto-fill.js`<br>- Inject cookies<br>- Fill Stripe form<br>- Submit payment          | Backend → Extension: token & card data<br>Extension → Backend: success/failure status |
| **Bypass Testing**         | `bypass_service.py`<br>- Test definitions<br>- Result storage<br>- Analytics          | `bypass-handler.js`<br>- Execute tests<br>- DOM manipulation<br>- WebRequest tricks   | Backend → Extension: test config<br>Extension → Backend: test results                 |
| **Account Status Refresh** | `status_service.py`<br>- Parse API responses<br>- Update database<br>- Health checks  | `background.js`<br>- Make authenticated requests (with cookies)<br>- Handle API calls | Backend → Extension: refresh request<br>Extension → Backend: API response data        |
| **Account Activation**     | `account_service.py`<br>- Retrieve account data<br>- Mark as active                   | `background.js`<br>- Inject cookies into browser<br>- Clear old cookies               | Backend → Extension: account cookies<br>Extension → Backend: activation status        |

---

## Detailed Feature Implementation

### 1. Account Management (Backend-Heavy)

#### Backend (`account_service.py`)

```python
class AccountService:
    def create(self, email, password, cookies=None):
        """Store account in database"""
        # Validation
        # Duplicate check
        # Insert to DB
        return account_id

    def get_all(self, status=None):
        """Retrieve accounts"""
        # Query DB
        # Return list
        return accounts

    def get_activation_data(self, account_id):
        """Get data needed for activation"""
        account = self.get_by_id(account_id)
        return {
            'account_id': account_id,
            'email': account['email'],
            'cookies': account['cookies']  # JSON string
        }
```

#### Extension (`background.js`)

```javascript
// Activate account (extension handles cookie injection)
async function activateAccount(accountId) {
  // 1. Get activation data from backend
  const data = await backendService.request("accounts.getActivationData", {
    accountId,
  });

  // 2. Clear existing cookies
  const existingCookies = await chrome.cookies.getAll({
    domain: ".cursor.com",
  });
  for (const cookie of existingCookies) {
    await chrome.cookies.remove({
      url: "https://cursor.com",
      name: cookie.name,
    });
  }

  // 3. Inject new cookies (MUST be in extension)
  const cookies = JSON.parse(data.cookies);
  for (const cookie of cookies) {
    await chrome.cookies.set({
      url: `https://${cookie.domain}`,
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || "/",
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      expirationDate: cookie.expirationDate,
    });
  }

  // 4. Notify backend of success
  await backendService.request("accounts.updateLastUsed", {
    accountId,
  });

  return { success: true };
}
```

---

### 2. Pro Trial Activation (Hybrid)

#### Backend (`pro_trial_service.py`)

```python
class ProTrialService:
    def __init__(self, db, cards_service):
        self.db = db
        self.cards_service = cards_service

    def prepare_trial_activation(self, account_id):
        """Prepare data for trial activation"""
        # Get or generate card
        card = self.cards_service.get_random_active_card()
        if not card:
            raise Exception("No active card available")

        # Generate trial token
        trial_token = self._generate_trial_token()

        # Store trial attempt
        trial_id = self._create_trial_record(account_id, trial_token, card['id'])

        return {
            'trial_id': trial_id,
            'trial_token': trial_token,
            'card_data': {
                'number': card['card_number'],
                'expiry': card['expiry_display'],
                'cvv': card['cvv'],
                'holder': card['cardholder_name']
            },
            'stripe_url': 'https://cursor.com/settings/billing'
        }

    def update_trial_status(self, trial_id, status, error=None):
        """Update trial status after activation attempt"""
        query = """
            UPDATE pro_trials
            SET status = ?,
                error_message = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """
        self.db.execute(query, (status, error, trial_id))
```

#### Extension (`auto-fill.js`)

```javascript
// Pro trial activation (extension handles form filling)
class AutoFillManager {
  async activateProTrial(accountId) {
    try {
      // 1. Get activation data from backend
      const data = await chrome.runtime.sendMessage({
        type: "backendRequest",
        method: "proTrial.prepareActivation",
        params: { accountId },
      });

      // 2. Open billing page (extension API)
      const tab = await chrome.tabs.create({
        url: data.stripe_url,
      });

      // 3. Wait for page load
      await this.waitForPageLoad(tab.id);

      // 4. Fill payment form (DOM manipulation)
      await chrome.tabs.sendMessage(tab.id, {
        type: "fillPaymentForm",
        data: data.card_data,
      });

      // 5. Wait for form submission
      await this.waitForStripeResponse();

      // 6. Update backend with result
      await chrome.runtime.sendMessage({
        type: "backendRequest",
        method: "proTrial.updateStatus",
        params: {
          trialId: data.trial_id,
          status: "active",
        },
      });

      return { success: true };
    } catch (error) {
      // Report failure to backend
      await chrome.runtime.sendMessage({
        type: "backendRequest",
        method: "proTrial.updateStatus",
        params: {
          trialId: data.trial_id,
          status: "failed",
          error: error.message,
        },
      });

      throw error;
    }
  }
}
```

---

### 3. Bypass Testing (Hybrid)

#### Backend (`bypass_service.py`)

```python
class BypassService:
    def __init__(self, db):
        self.db = db
        self.test_definitions = self._load_test_definitions()

    def get_test_suite(self, test_type):
        """Get bypass test suite"""
        return {
            'parameter': [
                {'payload': '__proto__[test]=1', 'description': 'Prototype pollution'},
                {'payload': '_method=DELETE', 'description': 'Method override'},
                # ... more tests
            ],
            'header': [
                {'header': 'X-Forwarded-For: 127.0.0.1', 'description': 'IP spoofing'},
                # ... more tests
            ],
            # ... other test types
        }.get(test_type, [])

    def store_test_result(self, test_data):
        """Store bypass test result"""
        query = """
            INSERT INTO bypass_results
            (test_type, payload, target_url, success, response_code,
             response_body, execution_time, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """
        self.db.execute(query, (
            test_data['test_type'],
            test_data['payload'],
            test_data['target_url'],
            test_data['success'],
            test_data['response_code'],
            test_data['response_body'][:1000],  # Limit size
            test_data['execution_time']
        ))

    def get_test_results(self, limit=50):
        """Get recent test results"""
        query = """
            SELECT * FROM bypass_results
            ORDER BY created_at DESC
            LIMIT ?
        """
        return self.db.execute(query, (limit,)).fetchall()
```

#### Extension (`bypass-handler.js`)

```javascript
// Bypass testing (extension executes tests)
class BypassTestingHandler {
  async runTest(testType, payload, targetUrl) {
    const startTime = performance.now();
    let result = {
      test_type: testType,
      payload: payload,
      target_url: targetUrl,
      success: false,
      response_code: null,
      response_body: null,
      execution_time: 0,
    };

    try {
      switch (testType) {
        case "parameter":
          result = await this.testParameterInjection(targetUrl, payload);
          break;
        case "header":
          result = await this.testHeaderManipulation(targetUrl, payload);
          break;
        case "method":
          result = await this.testMethodOverride(targetUrl, payload);
          break;
        case "storage":
          result = await this.testStorageManipulation(payload);
          break;
        case "dom":
          result = await this.testDOMManipulation(payload);
          break;
      }

      result.execution_time = performance.now() - startTime;

      // Send result to backend for storage
      await chrome.runtime.sendMessage({
        type: "backendRequest",
        method: "bypass.storeResult",
        params: result,
      });

      return result;
    } catch (error) {
      result.success = false;
      result.error_message = error.message;
      result.execution_time = performance.now() - startTime;

      await chrome.runtime.sendMessage({
        type: "backendRequest",
        method: "bypass.storeResult",
        params: result,
      });

      throw error;
    }
  }

  async testParameterInjection(url, payload) {
    // Add payload to URL parameters
    const testUrl = `${url}${url.includes("?") ? "&" : "?"}${payload}`;

    // Make request via background script (can intercept with WebRequest)
    const response = await fetch(testUrl);

    return {
      test_type: "parameter",
      payload: payload,
      target_url: testUrl,
      success: response.ok,
      response_code: response.status,
      response_body: await response.text(),
    };
  }

  async testHeaderManipulation(url, headerPayload) {
    // Parse header
    const [headerName, headerValue] = headerPayload
      .split(":")
      .map((s) => s.trim());

    // Extension can modify request headers via WebRequest API
    // This requires declarativeNetRequest or webRequest permissions

    // Send to background script to handle WebRequest
    return await chrome.runtime.sendMessage({
      type: "executeHeaderTest",
      url: url,
      header: { name: headerName, value: headerValue },
    });
  }
}
```

---

### 4. Card Generator (Backend-Heavy)

#### Backend (`card_generator.py`)

```python
class CardGenerator:
    def generate_cards(self, bin_code, quantity, month=None, year=None, cvv=None):
        """Generate multiple credit cards"""
        cards = []
        for _ in range(quantity):
            card = self._generate_single_card(bin_code, month, year, cvv)
            cards.append(card)
        return cards

    def save_generated_cards(self, cards, auto_activate=False):
        """Save generated cards to database"""
        saved_ids = []
        for card in cards:
            card_id = self.cards_service.create(
                card_number=card['number'],
                card_holder='Generated Holder',
                expiry=card['expiry'],
                cvv=card['cvv']
            )
            saved_ids.append(card_id)

        return {
            'total': len(cards),
            'saved_ids': saved_ids
        }
```

#### Extension (`sidepanel.js`)

```javascript
// Generator UI (extension just displays)
async function generateCards() {
  const bin = document.getElementById("binInput").value;
  const quantity = document.getElementById("quantityInput").value;
  const month = document.getElementById("monthSelect").value;
  const year = document.getElementById("yearSelect").value;

  // 1. Backend generates cards
  const result = await backendService.request("generator.generateCards", {
    bin: bin,
    quantity: parseInt(quantity),
    month: month,
    year: year,
  });

  // 2. Display cards in UI
  displayGeneratedCards(result.cards);

  // 3. Option to save to database
  if (confirm("Save generated cards to database?")) {
    await backendService.request("generator.saveCards", {
      cards: result.cards,
    });
  }

  // 4. Option to use immediately for form filling
  if (confirm("Use first card to fill current form?")) {
    const card = result.cards[0];
    await chrome.tabs.query(
      { active: true, currentWindow: true },
      async (tabs) => {
        await chrome.tabs.sendMessage(tabs[0].id, {
          type: "fillPaymentForm",
          data: card,
        });
      }
    );
  }
}
```

---

## Communication Protocol

### Native Messaging (Extension ↔ Backend)

#### Request Format (JSON-RPC 2.0)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "accounts.getActivationData",
  "params": {
    "accountId": 123
  }
}
```

#### Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "account_id": 123,
    "email": "user@example.com",
    "cookies": "[{\"name\":\"session\",\"value\":\"abc123\",...}]"
  }
}
```

#### Error Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Account not found",
    "data": {
      "account_id": 123
    }
  }
}
```

### Complete API Methods

#### Backend Methods (Python)

```python
# Accounts
accounts.getAll(status=None)
accounts.getById(account_id)
accounts.getActivationData(account_id)
accounts.create(email, password, cookies=None)
accounts.update(account_id, data)
accounts.delete(account_id)
accounts.updateLastUsed(account_id)
accounts.search(query)

# Cards
cards.getAll(status=None)
cards.getById(card_id)
cards.getRandom()
cards.create(card_number, card_holder, expiry, cvv)
cards.update(card_id, data)
cards.delete(card_id)
cards.updateLastUsed(card_id)

# Generator
generator.generateCards(bin, quantity, month=None, year=None, cvv=None)
generator.saveCards(cards)
generator.validateCard(card_number)

# Bypass
bypass.getTestSuite(test_type)
bypass.storeResult(test_data)
bypass.getResults(limit=50)
bypass.exportResults(format='json')

# Pro Trial
proTrial.prepareActivation(account_id)
proTrial.updateStatus(trial_id, status, error=None)
proTrial.getHistory(account_id)
proTrial.checkStatus(account_id)

# Export/Import
export.accounts(format='json', filters=None)
export.cards(format='json', filters=None)
export.all()
import.accounts(data, merge_strategy='skip')
import.cards(data, merge_strategy='skip')

# Status
status.refreshAccount(account_id)
status.refreshAll()
status.getHealth(account_id)

# Batch
batch.createAccounts(accounts_data)
batch.deleteAccounts(account_ids)
batch.updateStatus(account_ids, status)
batch.getProgress(batch_id)

# System
system.ping()
system.version()
system.getStats()
```

#### Extension Methods (JavaScript)

```javascript
// Cookie Operations (Extension Only)
async function setCookies(cookies) {
  for (const cookie of cookies) {
    await chrome.cookies.set(cookie);
  }
}

async function getCookies(domain) {
  return await chrome.cookies.getAll({ domain });
}

async function clearCookies(domain) {
  const cookies = await chrome.cookies.getAll({ domain });
  for (const cookie of cookies) {
    await chrome.cookies.remove({
      url: `https://${cookie.domain}`,
      name: cookie.name,
    });
  }
}

// Form Filling (Extension Only)
async function fillForm(tabId, formData) {
  await chrome.tabs.sendMessage(tabId, {
    type: "fillPaymentForm",
    data: formData,
  });
}

// Tab Management (Extension Only)
async function openTab(url) {
  return await chrome.tabs.create({ url });
}

// WebRequest (Extension Only)
// Handled via background script listeners

// Bypass Execution (Extension Only)
async function executeBypassTest(test_type, payload, target_url) {
  // Execute in content script context
  // Return results to backend
}
```

---

## Database Schema

### Extended Schema for New Features

```sql
-- Bypass Testing
CREATE TABLE bypass_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_name TEXT NOT NULL,
    test_type TEXT NOT NULL,  -- 'parameter', 'header', 'method', 'storage', 'dom'
    test_payload TEXT NOT NULL,
    target_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bypass_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER,
    test_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    target_url TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    response_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    execution_time REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES bypass_tests(id)
);

-- Pro Trial Management
CREATE TABLE pro_trials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    card_id INTEGER,
    trial_token TEXT,
    activation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP,
    status TEXT DEFAULT 'pending',  -- 'pending', 'active', 'expired', 'failed'
    error_message TEXT,
    auto_renew BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (card_id) REFERENCES cards(id)
);

-- Batch Operations
CREATE TABLE batch_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_type TEXT NOT NULL,  -- 'create_accounts', 'delete_accounts', etc.
    total_items INTEGER NOT NULL,
    completed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running',  -- 'running', 'completed', 'failed'
    error_log TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_bypass_results_test_type ON bypass_results(test_type);
CREATE INDEX idx_bypass_results_created_at ON bypass_results(created_at);
CREATE INDEX idx_pro_trials_account_id ON pro_trials(account_id);
CREATE INDEX idx_pro_trials_status ON pro_trials(status);
CREATE INDEX idx_batch_operations_status ON batch_operations(status);
```

---

## Implementation Roadmap

### Phase 1: Backend Services (Week 1-2)

**Goal:** Implement core backend services

- [ ] `bypass_service.py` - Test definitions & result storage
- [ ] `pro_trial_service.py` - Trial management
- [ ] `export_service.py` - Export to JSON/CSV
- [ ] `import_service.py` - Import with validation
- [ ] `status_service.py` - Status checking logic
- [ ] `batch_service.py` - Batch operations
- [ ] Update database schema (migrations)
- [ ] Unit tests for each service

**Deliverables:**

- All backend services functional
- Database schema updated
- CLI commands for testing
- Service integration tests

---

### Phase 2: Native Host Updates (Week 2-3)

**Goal:** Add routing for new services

- [ ] Update `native_host.py` with new RPC methods
- [ ] Add error handling for each method
- [ ] Add request validation
- [ ] Add rate limiting
- [ ] Logging improvements
- [ ] Integration tests

**Deliverables:**

- Native host supports all new methods
- Comprehensive error handling
- Performance benchmarks

---

### Phase 3: Python GUI Updates (Week 3-4)

**Goal:** Add tabs for all features

- [ ] Dashboard tab (statistics, recent activity)
- [ ] Generator tab (fully functional)
- [ ] Bypass tab (test execution & results)
- [ ] Pro Trial tab (activation & management)
- [ ] Fix blank dialog issue in add_account
- [ ] Add connection status indicator
- [ ] Add progress bars for long operations
- [ ] Add notifications system

**Deliverables:**

- Complete GUI with all tabs
- User-friendly interface
- Real-time updates
- Error messages

---

### Phase 4: Extension Refactoring (Week 4-5)

**Goal:** Refactor extension to thin client

- [ ] Update `backend-service.js` with new methods
- [ ] Refactor `sidepanel.js` to use backend
- [ ] Refactor `background.js` messaging
- [ ] Keep browser-specific operations in extension
- [ ] Add connection status indicator in UI
- [ ] Add offline mode handling
- [ ] Update error handling
- [ ] Remove redundant code

**Deliverables:**

- Extension as smart client
- All backend integration working
- Browser operations optimized
- Reduced extension size

---

### Phase 5: Integration & Testing (Week 5-6)

**Goal:** End-to-end testing

- [ ] Integration tests (extension + backend)
- [ ] Performance testing
- [ ] Error handling testing
- [ ] Multi-browser testing (Chrome, Edge, Brave)
- [ ] User acceptance testing
- [ ] Documentation updates
- [ ] Bug fixes

**Deliverables:**

- Fully tested system
- Performance benchmarks
- Updated documentation
- Release candidate

---

### Phase 6: Release & Monitoring (Week 6)

**Goal:** Production deployment

- [ ] Final testing
- [ ] Create installers (Windows, macOS, Linux)
- [ ] Update README and guides
- [ ] Release notes
- [ ] User migration guide
- [ ] Monitoring setup
- [ ] Support documentation

**Deliverables:**

- Production-ready release
- Installation packages
- Complete documentation
- Support infrastructure

---

## Development Guidelines

### Backend Development

**File Location:** `backend/services/`

**Service Template:**

```python
"""
Service Name - Description
"""

import logging
from typing import Dict, List, Optional, Any
from ..database import Database

logger = logging.getLogger(__name__)

class ServiceName:
    """Service description"""

    def __init__(self, db: Database):
        self.db = db
        logger.info("ServiceName initialized")

    def method_name(self, param: str) -> Dict[str, Any]:
        """Method description"""
        try:
            # Implementation
            logger.debug(f"method_name called with param={param}")
            result = self._do_something(param)
            return {"success": True, "data": result}
        except Exception as e:
            logger.error(f"Error in method_name: {str(e)}", exc_info=True)
            raise

    def _private_method(self, param: str) -> Any:
        """Private helper method"""
        # Implementation
        pass
```

**Testing:**

```python
# tests/test_service_name.py
import unittest
from backend.database import Database
from backend.services.service_name import ServiceName

class TestServiceName(unittest.TestCase):
    def setUp(self):
        self.db = Database(':memory:')  # In-memory for testing
        self.service = ServiceName(self.db)

    def test_method_name(self):
        result = self.service.method_name("test")
        self.assertTrue(result['success'])
```

---

### Extension Development

**File Location:** `services/`, `modules/`

**Service Pattern:**

```javascript
/**
 * Service Name - Description
 */
class ServiceName {
  constructor() {
    this.backend = new BackendService();
    this.init();
  }

  async init() {
    // Initialization
  }

  async methodName(param) {
    try {
      // 1. Get data from backend if needed
      const data = await this.backend.request("service.method", { param });

      // 2. Perform browser-specific operations
      await this._browserOperation(data);

      // 3. Return or update backend
      return { success: true, data };
    } catch (error) {
      console.error("Error in methodName:", error);
      throw error;
    }
  }

  async _browserOperation(data) {
    // Chrome API operations
    // DOM manipulation
    // WebRequest handling
    // etc.
  }
}
```

---

## Security Considerations

### Data Protection

- **Extension:** Minimize stored data, use Chrome Storage only for cache
- **Backend:** SQLite database file permissions (read/write only for user)
- **Cookies:** Handle securely, redact from logs
- **Passwords:** Consider hashing (even though "no encryption" philosophy)

### Communication Security

- **Native Messaging:** stdio-based, inherently local only
- **Input Validation:** Validate all inputs in both extension and backend
- **Error Messages:** Don't expose sensitive data in error messages

### Best Practices

1. **Principle of Least Privilege:** Extension only has permissions it needs
2. **Data Minimization:** Don't store more than necessary
3. **Logging:** Redact sensitive data from logs (use PrivacyFilter)
4. **User Consent:** Clear about what data is collected and why

---

## Troubleshooting

### Backend Not Connecting

1. Check `native_host.bat` exists
2. Verify extension ID in manifest
3. Check manifest path (browser-specific)
4. Run backend diagnostics in GUI
5. Check logs: `backend/logs/`

### Cookie Operations Failing

1. Ensure extension has `cookies` permission
2. Check domain matches (`.cursor.com`)
3. Verify cookie structure
4. Check browser cookie settings

### Form Filling Not Working

1. Ensure content script injected
2. Check selector accuracy
3. Verify page loaded completely
4. Check for iframe (Stripe uses iframes)
5. Inspect console for errors

### Bypass Tests Failing

1. Check WebRequest permission
2. Verify test payload format
3. Check target URL accessibility
4. Review test execution logs
5. Test manually first

---

## FAQ

### Q: Can all features work offline?

**A:** No. Features requiring browser operations (cookies, form filling) need the extension. Backend features (data management, export) work offline if backend is running.

### Q: Does backend need to run always?

**A:** No. Backend only needs to run when:

- Extension needs data operations
- Using Python GUI
- Running CLI commands

Auto-start can be configured for convenience.

### Q: Can I use extension without backend?

**A:** Partially. Extension can still do browser operations (cookies, form filling) but data operations will fail. Fallback to Chrome Storage is possible for basic operations.

### Q: Why not put everything in backend?

**A:** Browser security model prevents external applications from accessing cookies, DOM, or browser tabs. These MUST be handled by extension.

### Q: Can backend access my browsing history?

**A:** No. Backend only has access to:

- Data YOU explicitly store (accounts, cards)
- Results sent by extension
- No automatic access to browser data

---

**Document Version:** 2.0  
**Last Updated:** 2025-10-04  
**Status:** ✅ Active - Ready for Implementation

# Backend-First Architecture: Complete Migration Plan

## Overview

Migrasi dari hybrid architecture ke pure backend-first architecture dimana Python backend menjadi pusat dari semua fitur dan logika bisnis, sementara Chrome Extension hanya berfungsi sebagai thin client/UI layer.

## Current State Analysis

### Extension Features (cursor_manager_old)

1. **Account Management**

   - Add/Edit/Delete accounts
   - Import from JSON/Downloads/Folder
   - Export accounts
   - Activate account (switch)
   - Refresh status

2. **Payment Cards**

   - Add/Edit/Delete cards
   - Auto-fill functionality
   - Import/Export cards

3. **Card Generator** (services/generator.js)

   - Namso Gen algorithm
   - BIN-based generation
   - Multiple card generation
   - Custom expiry/CVV options

4. **Bypass Testing** (modules/bypass/)

   - Parameter injection testing
   - Header manipulation
   - Method override
   - Storage manipulation
   - DOM manipulation
   - URL tampering
   - Race condition testing

5. **Pro Trial Activation**

   - One-click pro trial activation
   - Cookie/token manipulation

6. **Advanced Features**
   - Batch operations
   - Folder import
   - Downloads auto-import
   - Debug tools
   - Duplicate consolidation

### Current Backend Status

✅ **Implemented:**

- Database (SQLite)
- Account Service
- Cards Service
- Card Generator Module
- Native Messaging Host
- CLI Tools
- Python GUI (basic)

❌ **Missing:**

- Bypass Testing Service
- Pro Trial Service
- Export/Import Service
- Status Refresh Service
- Batch Operations Service

---

## New Architecture Design

### Backend Services Structure

```
backend/
├── __init__.py
├── database.py                 ✅ Core database
├── native_host.py              ✅ Communication layer
├── cli.py                      ✅ CLI interface
├── gui.py                      ⚠️  Need major update
│
├── services/
│   ├── __init__.py
│   ├── account_service.py      ✅ CRUD accounts
│   ├── cards_service.py        ✅ CRUD cards
│   ├── card_generator.py       ✅ Generate cards
│   ├── bypass_service.py       ❌ NEW - Bypass testing
│   ├── pro_trial_service.py    ❌ NEW - Pro trial activation
│   ├── export_service.py       ❌ NEW - Export data
│   ├── import_service.py       ❌ NEW - Batch import
│   ├── status_service.py       ❌ NEW - Account status check
│   └── batch_service.py        ❌ NEW - Batch operations
│
├── models/
│   ├── __init__.py
│   ├── account.py              ❌ NEW - Account model
│   ├── card.py                 ❌ NEW - Card model
│   ├── bypass_test.py          ❌ NEW - Bypass test model
│   └── test_result.py          ❌ NEW - Test result model
│
└── utils/
    ├── __init__.py
    ├── validator.py            ❌ NEW - Input validation
    ├── formatter.py            ❌ NEW - Data formatting
    └── logger.py               ❌ NEW - Enhanced logging
```

---

## Feature Migration Plan

### 1. Bypass Testing Service

**File:** `backend/services/bypass_service.py`

**Responsibilities:**

- Execute bypass tests (parameter, header, method, storage, DOM, URL)
- Store test results in database
- Generate test reports
- Manage test configurations

**Database Schema:**

```sql
CREATE TABLE bypass_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_name TEXT NOT NULL,
    test_type TEXT NOT NULL,  -- 'parameter', 'header', 'method', etc.
    test_payload TEXT NOT NULL,
    target_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bypass_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    response_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    execution_time REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES bypass_tests(id)
);
```

**API Methods:**

- `run_test(test_type, payload, target_url)` - Execute single test
- `run_batch_tests(test_suite, target_url)` - Execute multiple tests
- `get_test_results(test_id)` - Get test results
- `get_test_history(limit)` - Get past tests
- `export_results(test_id, format)` - Export results (JSON/CSV/HTML)

**Extension Integration:**

```javascript
// Extension calls backend
const result = await backendService.request("bypass.runTest", {
  testType: "parameter",
  payload: "__proto__[test]=1",
  targetUrl: "https://example.com/api/endpoint",
});
```

---

### 2. Pro Trial Activation Service

**File:** `backend/services/pro_trial_service.py`

**Responsibilities:**

- Activate pro trial for current account
- Manage trial cookies/tokens
- Check trial status
- Auto-renew trials

**Database Schema:**

```sql
CREATE TABLE pro_trials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    trial_token TEXT,
    activation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP,
    status TEXT DEFAULT 'active',  -- 'active', 'expired', 'renewed'
    auto_renew BOOLEAN DEFAULT 0,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);
```

**API Methods:**

- `activate_trial(account_id)` - Activate pro trial
- `check_trial_status(account_id)` - Check if trial is active
- `renew_trial(account_id)` - Renew expired trial
- `get_trial_info(account_id)` - Get trial details

**Extension Integration:**

```javascript
// Extension calls backend to activate
const result = await backendService.request("proTrial.activate", {
  accountId: currentAccount.id,
});

// Backend returns new cookies to inject
chrome.cookies.set(result.cookies);
```

---

### 3. Export/Import Service

**File:** `backend/services/export_service.py`

**Responsibilities:**

- Export accounts to JSON/CSV
- Export cards to JSON/CSV
- Export test results
- Bulk export (all data)

**API Methods:**

- `export_accounts(format, filters)` - Export filtered accounts
- `export_cards(format, filters)` - Export filtered cards
- `export_all(format)` - Export everything
- `import_accounts(data, merge_strategy)` - Import accounts
- `import_cards(data, merge_strategy)` - Import cards
- `import_from_folder(folder_path)` - Batch import from folder

**File:** `backend/services/import_service.py`

**Responsibilities:**

- Parse various JSON formats
- Validate imported data
- Handle duplicates
- Batch operations

---

### 4. Status Refresh Service

**File:** `backend/services/status_service.py`

**Responsibilities:**

- Check account validity (via API call)
- Refresh trial status
- Update account metadata
- Detect expired accounts

**API Methods:**

- `refresh_account_status(account_id)` - Check single account
- `refresh_all_accounts()` - Batch status check
- `get_account_health(account_id)` - Detailed health check

**Extension Integration:**

```javascript
// Background periodic check
setInterval(async () => {
  await backendService.request("status.refreshAll");
}, 300000); // Every 5 minutes
```

---

### 5. Batch Operations Service

**File:** `backend/services/batch_service.py`

**Responsibilities:**

- Batch account creation
- Batch account deletion
- Batch status updates
- Progress tracking

**API Methods:**

- `batch_create_accounts(accounts_data)` - Create multiple accounts
- `batch_delete_accounts(account_ids)` - Delete multiple accounts
- `batch_update_status(account_ids, status)` - Update multiple statuses
- `get_batch_progress(batch_id)` - Track batch operation

---

## Native Host Protocol Updates

### Current JSON-RPC Methods

```python
# Existing
accounts.getAll
accounts.getById
accounts.create
accounts.update
accounts.delete
cards.getAll
cards.create
cards.update
cards.delete
system.ping
system.version
```

### New JSON-RPC Methods

```python
# Bypass Testing
bypass.runTest
bypass.runBatch
bypass.getResults
bypass.getHistory
bypass.exportResults

# Pro Trial
proTrial.activate
proTrial.checkStatus
proTrial.renew
proTrial.getInfo

# Export/Import
export.accounts
export.cards
export.all
import.accounts
import.cards
import.fromFolder

# Status
status.refreshAccount
status.refreshAll
status.getHealth

# Batch Operations
batch.createAccounts
batch.deleteAccounts
batch.updateStatus
batch.getProgress

# Generator (enhance existing)
generator.generateCard
generator.generateMultiple
generator.validateCard
generator.getBinInfo
```

---

## Python GUI Updates

### New Tabs Structure

```
Tab 1: 📊 Dashboard
  - Statistics (accounts, cards, trials)
  - Recent activity
  - Quick actions
  - Connection status indicator

Tab 2: 👤 Accounts (existing, enhanced)
  - Tree view with status indicators
  - Import JSON button (existing)
  - Batch operations toolbar
  - Export button
  - Refresh status button

Tab 3: 💳 Cards (existing, enhanced)
  - Tree view
  - Batch add/delete
  - Export button

Tab 4: 🎲 Generator (NEW)
  - BIN input field
  - Quantity selector
  - Month/Year dropdowns
  - CVV option
  - Generate button
  - Generated cards list
  - Save to database button
  - Copy all button

Tab 5: 🛡️ Bypass (NEW)
  - Test type selector
  - Target URL input
  - Payload input (textarea)
  - Run Test button
  - Run Suite button
  - Results tree view
  - Export results button
  - Test history

Tab 6: ⚡ Pro Trial (NEW)
  - Account selector
  - Activate Trial button
  - Trial status display
  - Auto-renew toggle
  - Renewal history

Tab 7: ⚙️ Settings (existing, enhanced)
  - Extension IDs management
  - Browser selection
  - Manifest generation
  - Backend configuration
  - Log settings
```

### Dashboard Implementation

**New:** `backend/gui_dashboard.py`

```python
class DashboardTab:
    def __init__(self, parent, db, services):
        self.parent = parent
        self.db = db
        self.services = services

    def setup_dashboard(self):
        # Statistics cards
        self.create_stat_card("Total Accounts", self.get_accounts_count())
        self.create_stat_card("Total Cards", self.get_cards_count())
        self.create_stat_card("Active Trials", self.get_active_trials())

        # Recent activity
        self.create_activity_feed()

        # Connection status
        self.create_connection_indicator()
```

---

## Extension Refactoring (Thin Client)

### Before (Current)

```
Extension has:
- Account logic
- Card logic
- Generator logic
- Bypass logic
- Storage management
- Business rules
```

### After (Target)

```
Extension has:
- UI components only
- API client (backend-service.js)
- Event handlers
- Local cache (minimal)
```

### Example Refactoring

**Before:**

```javascript
// sidepanel.js (OLD)
async function addAccount(email, password, cookies) {
  // Validate input
  if (!email || !password) {
    showError("Email and password required");
    return;
  }

  // Store in Chrome Storage
  const accounts = await chrome.storage.local.get("accounts");
  accounts[email] = { email, password, cookies, created: Date.now() };
  await chrome.storage.local.set({ accounts });

  // Update UI
  refreshAccountsList();
}
```

**After:**

```javascript
// sidepanel.js (NEW)
async function addAccount(email, password, cookies) {
  try {
    // All logic in backend
    const result = await backendService.request("accounts.create", {
      email,
      password,
      cookies,
    });

    // Just update UI
    displayAccount(result.data);
    showSuccess(`Account ${email} added`);
  } catch (error) {
    showError(error.message);
  }
}
```

### Service Mapping

| Extension Service        | Backend Service        | Status       |
| ------------------------ | ---------------------- | ------------ |
| `account.js`             | `account_service.py`   | ✅ Ready     |
| `payment.js`             | `cards_service.py`     | ✅ Ready     |
| `generator.js`           | `card_generator.py`    | ✅ Ready     |
| `bypass-handler.js`      | `bypass_service.py`    | ❌ To Create |
| Pro Trial (sidepanel.js) | `pro_trial_service.py` | ❌ To Create |
| `export-handler.js`      | `export_service.py`    | ❌ To Create |

---

## Implementation Roadmap

### Phase 1: Core Backend Services (Week 1-2)

- [ ] Create bypass_service.py
- [ ] Create pro_trial_service.py
- [ ] Create export_service.py
- [ ] Create import_service.py
- [ ] Create status_service.py
- [ ] Create batch_service.py
- [ ] Update database schema
- [ ] Add models/ directory

### Phase 2: Native Host Updates (Week 2)

- [ ] Add new RPC methods
- [ ] Add request routing
- [ ] Add error handling
- [ ] Add logging
- [ ] Add rate limiting

### Phase 3: Python GUI Updates (Week 3)

- [ ] Add Dashboard tab
- [ ] Add Generator tab
- [ ] Add Bypass tab
- [ ] Add Pro Trial tab
- [ ] Add connection indicator
- [ ] Fix blank dialog issue
- [ ] Add progress bars
- [ ] Add notifications

### Phase 4: Extension Refactoring (Week 4)

- [ ] Remove business logic from extension
- [ ] Update all API calls to backend
- [ ] Simplify sidepanel.js
- [ ] Remove redundant services
- [ ] Add connection indicator
- [ ] Add offline mode handling
- [ ] Update error handling

### Phase 5: Testing & Documentation (Week 5)

- [ ] Integration testing
- [ ] Performance testing
- [ ] Update documentation
- [ ] Create migration guide
- [ ] User testing
- [ ] Bug fixes

### Phase 6: Release (Week 6)

- [ ] Final testing
- [ ] Deployment
- [ ] User communication
- [ ] Monitoring

---

## Technical Decisions

### 1. Database Design

- **Decision:** Add new tables for bypass tests, pro trials, batch operations
- **Rationale:** Centralized storage, audit trail, analytics capability
- **Alternative:** In-memory only (rejected due to data loss on restart)

### 2. API Protocol

- **Decision:** Extend existing JSON-RPC 2.0 protocol
- **Rationale:** Already implemented, well-tested, standard
- **Alternative:** REST API (rejected due to Native Messaging constraints)

### 3. Extension Architecture

- **Decision:** Thin client, all logic in backend
- **Rationale:** Easier maintenance, better security, offline capability
- **Alternative:** Hybrid (rejected due to complexity)

### 4. Data Sync

- **Decision:** Backend is single source of truth
- **Rationale:** Eliminates sync conflicts, simpler logic
- **Alternative:** Bidirectional sync (rejected due to complexity)

---

## Migration Strategy

### For Existing Users

**Data Migration:**

1. Extension detects old data format
2. Shows migration dialog
3. Exports all data from Chrome Storage
4. Sends to backend via `import.accounts` and `import.cards`
5. Backend stores in SQLite
6. Extension clears Chrome Storage (after confirmation)
7. Switches to backend mode

**Rollback Plan:**

1. Backend maintains export of pre-migration data
2. User can trigger "Restore from backup"
3. Extension switches back to Chrome Storage mode
4. Import backup data

### Backward Compatibility

**Extension:**

- Detect backend availability
- Fallback to Chrome Storage if backend not available
- Show prominent notification to install backend

**Backend:**

- Support both old and new data formats during import
- Validate and convert old formats automatically

---

## Risk Analysis

### High Risks

1. **Native Messaging Connection Failure**
   - _Mitigation:_ Robust error handling, offline mode, clear user instructions
2. **Data Migration Errors**
   - _Mitigation:_ Thorough testing, backup strategy, rollback plan
3. **Performance Degradation**
   - _Mitigation:_ Backend caching, batch operations, async processing

### Medium Risks

1. **User Adoption**
   - _Mitigation:_ Clear benefits communication, easy installation, migration wizard
2. **Multi-Platform Support**
   - _Mitigation:_ Test on Windows/macOS/Linux, platform-specific installers

### Low Risks

1. **Extension Store Approval**
   - _Mitigation:_ Follow all guidelines, clear privacy policy, Native Messaging declaration

---

## Success Metrics

### Performance

- [ ] Account operations < 100ms
- [ ] Card generation < 50ms per card
- [ ] Bypass test execution < 2s per test
- [ ] UI response < 50ms

### Reliability

- [ ] Backend uptime > 99%
- [ ] Zero data loss
- [ ] Graceful degradation on backend unavailable

### User Experience

- [ ] Installation < 5 minutes
- [ ] Migration success rate > 95%
- [ ] User satisfaction > 4/5

---

## Next Steps

1. **Immediate (Leader Approval)**

   - Review and approve this architecture document
   - Prioritize features (bypass vs pro trial vs export)
   - Clarify bypass testing requirements (store history?)
   - Clarify pro trial mechanism (API or cookies?)

2. **This Week**

   - Implement Phase 1: Core Backend Services
   - Create database migrations
   - Set up testing framework

3. **Next Week**
   - Implement Phase 2: Native Host Updates
   - Start Phase 3: Python GUI Updates

---

## Questions for Leader

1. **Bypass Testing Priority:**

   - Perlu simpan test history di database?
   - Perlu automated testing/scheduling?
   - Target websites untuk testing?

2. **Pro Trial Activation:**

   - Mechanism: API call atau cookie manipulation?
   - Auto-renewal: yes/no?
   - Trial duration configuration?

3. **Export/Import:**

   - Supported formats: JSON, CSV, SQL?
   - Encryption needed for exports?
   - Auto-backup schedule?

4. **Implementation Priority:**

   - Order: bypass → pro trial → export?
   - Or parallel development?
   - Timeline flexibility?

5. **GUI Requirements:**
   - Dashboard necessary atau direct to tabs?
   - Real-time updates needed?
   - Multi-window support?

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-04  
**Status:** 📋 Awaiting Review

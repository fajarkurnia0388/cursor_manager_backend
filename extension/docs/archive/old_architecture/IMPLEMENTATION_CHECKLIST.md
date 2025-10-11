# ✅ Implementation Checklist - Native Messaging (Simplified)

**Target:** 6 weeks implementation  
**Approach:** Python backend + Extension client (NO security/encryption)

---

## 📅 Week-by-Week Checklist

### Week 1: Python Backend Foundation ✅

#### Day 1: Project Setup

- [ ] Create project directory: `cursor-manager-backend/`
- [ ] Create virtual environment: `python -m venv venv`
- [ ] Create `requirements.txt`:
  ```
  click>=8.1.0
  rich>=13.0.0
  ```
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Create folder structure:
  ```
  cursor-manager-backend/
  ├── src/
  │   ├── __init__.py
  │   ├── main.py
  │   ├── database.py
  │   ├── native_host.py
  │   └── services/
  │       ├── __init__.py
  │       ├── account_service.py
  │       ├── card_service.py
  │       └── backup_service.py
  ├── cli.py
  ├── install.py
  ├── requirements.txt
  └── README.md
  ```

#### Day 2: Database Layer

- [ ] Copy `database.py` dari SIMPLIFIED_NATIVE_ARCHITECTURE.md
- [ ] Test database creation:
  ```python
  from database import Database
  db = Database()
  print(db.db_path)  # Should print: %APPDATA%/CursorManager/accounts.db
  ```
- [ ] Verify tables created (use DB Browser for SQLite)
- [ ] Test basic queries:
  ```python
  db.execute_write("INSERT INTO accounts (name, email) VALUES ('test', 'test@example.com')")
  accounts = db.execute("SELECT * FROM accounts")
  print(accounts)
  ```

#### Day 3: Account Service

- [ ] Copy `services/account_service.py` dari docs
- [ ] Test create account:

  ```python
  from database import Database
  from services.account_service import AccountService

  db = Database()
  service = AccountService(db)

  account = service.create('test1', 'test1@example.com')
  print(account)
  ```

- [ ] Test get_all()
- [ ] Test update()
- [ ] Test delete()
- [ ] Test set_active()

#### Day 4: Card Service

- [ ] Create `services/card_service.py` (similar to account_service)
- [ ] Implement:
  - `get_all()`
  - `create(card_number, card_holder, expiry_month, expiry_year, cvc)`
  - `delete(card_id)`
- [ ] Test all methods

#### Day 5: Backup Service

- [ ] Create `services/backup_service.py`
- [ ] Implement:
  ```python
  class BackupService:
      def export_to_json(self, path=None):
          # Export all accounts + cards to JSON
          pass

      def import_from_json(self, path):
          # Import from JSON file
          pass
  ```
- [ ] Test export/import

**Week 1 Completion Test:**

```python
# test_week1.py
from database import Database
from services.account_service import AccountService
from services.card_service import CardService

db = Database()
account_service = AccountService(db)
card_service = CardService(db)

# Create account
acc = account_service.create('week1_test', 'test@example.com', cookies=[
    {'name': 'session', 'value': 'abc123', 'domain': '.cursor.sh'}
])
print(f"✅ Created account: {acc['name']}")

# Create card
card = card_service.create('4111111111111111', 'Test User', '12', '2025', '123')
print(f"✅ Created card: {card['nickname']}")

# Get all
accounts = account_service.get_all()
cards = card_service.get_all()
print(f"✅ Total: {len(accounts)} accounts, {len(cards)} cards")
```

---

### Week 2: Native Messaging Protocol ✅

#### Day 1: Native Host Structure

- [ ] Create `src/native_host.py`
- [ ] Copy code from SIMPLIFIED_NATIVE_ARCHITECTURE.md
- [ ] Implement:
  - `read_message()` - Read from stdin
  - `send_message()` - Write to stdout
  - `handle_request()` - Route requests

#### Day 2: Request Handlers

- [ ] Implement `handle_accounts()`:
  - getAll, getById, create, update, delete, setActive, search
- [ ] Implement `handle_cards()`:
  - getAll, create, delete
- [ ] Implement `handle_backup()`:
  - export, import
- [ ] Implement `handle_system()`:
  - health, version, stats

#### Day 3: Testing Native Host (Manual)

- [ ] Create test script: `test_native_host.py`

  ```python
  import json
  import sys
  from native_host import NativeHost

  # Simulate Chrome sending message
  def test_native_host():
      host = NativeHost()

      # Test accounts.getAll
      request = {
          'jsonrpc': '2.0',
          'id': 1,
          'method': 'accounts.getAll',
          'params': {}
      }

      response = host.handle_request(request)
      print(json.dumps(response, indent=2))

  test_native_host()
  ```

- [ ] Test all methods manually

#### Day 4: Entry Point

- [ ] Create `src/main.py`:

  ```python
  #!/usr/bin/env python3
  from native_host import NativeHost

  if __name__ == '__main__':
      host = NativeHost()
      host.run()
  ```

- [ ] Make executable: `chmod +x src/main.py` (Mac/Linux)
- [ ] Test running: `python src/main.py`

#### Day 5: Integration Testing

- [ ] Test full request/response cycle
- [ ] Test error handling
- [ ] Test edge cases (missing params, invalid IDs, etc.)
- [ ] Performance test (should be < 50ms per request)

**Week 2 Completion Test:**

```bash
# Start native host
python src/main.py

# In another terminal, send test message:
echo '{"jsonrpc":"2.0","id":1,"method":"accounts.getAll","params":{}}' | python -c "
import sys, json, struct
msg = sys.stdin.read()
encoded = msg.encode('utf-8')
length = struct.pack('=I', len(encoded))
sys.stdout.buffer.write(length)
sys.stdout.buffer.write(encoded)
" | python src/main.py
```

---

### Week 3: Extension Integration ✅

#### Day 1: Native Client Setup

- [ ] Create `services/native-client.js` in extension
- [ ] Copy code from SIMPLIFIED_NATIVE_ARCHITECTURE.md
- [ ] Implement:
  - `connect()` - Connect to native host
  - `call(method, params)` - Send JSON-RPC request
  - `handleResponse()` - Process response

#### Day 2: Extension Manifest

- [ ] Update `manifest.json`:
  ```json
  {
    "manifest_version": 3,
    "name": "Cursor Account Manager",
    "version": "2.0.0",
    "permissions": ["nativeMessaging", "cookies", "tabs", "storage"]
  }
  ```
- [ ] Remove sql.js references
- [ ] Remove unused service imports

#### Day 3: Update Account Management UI

- [ ] Update `sidepanel.js` to use `nativeClient`:

  ```javascript
  import { nativeClient } from "./services/native-client.js";

  async function init() {
    try {
      await nativeClient.connect();
      await loadAccounts();
    } catch (error) {
      showError("Failed to connect to backend. Is it installed?");
    }
  }

  async function loadAccounts() {
    const accounts = await nativeClient.getAccounts();
    renderAccounts(accounts);
  }
  ```

- [ ] Update all CRUD operations
- [ ] Test in browser

#### Day 4: Update Card Management UI

- [ ] Update payment card functions to use nativeClient
- [ ] Test card operations

#### Day 5: Error Handling & Polish

- [ ] Add connection status indicator
- [ ] Add "Install Backend" instructions if not connected
- [ ] Add loading states
- [ ] Test all features end-to-end

**Week 3 Completion Test:**

- [ ] Load extension in Chrome
- [ ] Create new account via UI
- [ ] Edit account
- [ ] Delete account
- [ ] Switch account (inject cookies)
- [ ] Add payment card
- [ ] Delete payment card

---

### Week 4: CLI Tool ✅

#### Day 1: CLI Structure

- [ ] Create `cli.py`
- [ ] Copy code from SIMPLIFIED_NATIVE_ARCHITECTURE.md
- [ ] Setup Click commands:
  - `list` - List accounts
  - `add` - Add account
  - `delete` - Delete account
  - `activate` - Set active
  - `search` - Search accounts
  - `info` - Show stats

#### Day 2: CLI Testing

- [ ] Test each command:
  ```bash
  python cli.py list
  python cli.py add "Test Account" "test@example.com"
  python cli.py search "Test"
  python cli.py activate 1
  python cli.py delete 1
  python cli.py info
  ```
- [ ] Add Rich formatting (tables, colors)

#### Day 3: Advanced CLI Features

- [ ] Add `export` command:
  ```bash
  python cli.py export backup.json
  ```
- [ ] Add `import` command:
  ```bash
  python cli.py import backup.json
  ```
- [ ] Add `show` command (show account details):
  ```bash
  python cli.py show 1
  ```

#### Day 4: CLI Documentation

- [ ] Add `--help` text to all commands
- [ ] Create README_CLI.md with usage examples
- [ ] Add ASCII art/banner (optional, fun)

#### Day 5: CLI Polish

- [ ] Add confirmation prompts for destructive operations
- [ ] Add progress bars for long operations (if any)
- [ ] Add color coding (green=success, red=error, yellow=warning)
- [ ] Final testing

**Week 4 Completion Test:**

```bash
# Full CLI workflow
python cli.py add "CLI Test" "cli@example.com"
python cli.py list
python cli.py search "CLI"
python cli.py activate 1
python cli.py export backup.json
python cli.py delete 1
python cli.py import backup.json
python cli.py info
```

---

### Week 5: Installer & Distribution ✅

#### Day 1: Installer Script (Windows)

- [ ] Create `install.py`
- [ ] Implement Windows installation:
  - Get extension ID from user
  - Create native host manifest
  - Register in Windows Registry
- [ ] Test on Windows

#### Day 2: Installer (Mac/Linux)

- [ ] Add macOS installation:
  - Save manifest to `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
- [ ] Add Linux installation:
  - Save manifest to `~/.config/google-chrome/NativeMessagingHosts/`
- [ ] Test on Mac/Linux

#### Day 3: Uninstaller

- [ ] Create `uninstall.py`:
  ```python
  def uninstall():
      # Remove manifest file
      # Remove registry entry (Windows)
      # Ask if user wants to delete database
  ```
- [ ] Test uninstall/reinstall cycle

#### Day 4: Distribution Package

- [ ] Create release script:
  ```bash
  # Package Python backend
  zip -r cursor-manager-backend-v1.0.0.zip \
      src/ cli.py install.py requirements.txt README.md
  ```
- [ ] Create extension package:
  ```bash
  # Package extension
  zip -r cursor-manager-extension-v2.0.0.zip \
      manifest.json sidepanel.* services/ icons/ -x "*.md"
  ```
- [ ] Test installation from packages

#### Day 5: Documentation

- [ ] Create INSTALLATION.md:
  - Prerequisites (Python 3.8+)
  - Step-by-step installation
  - Troubleshooting
- [ ] Update main README.md
- [ ] Create video/GIF demo (optional)

**Week 5 Completion Test:**

- [ ] Fresh Windows VM: Install from scratch
- [ ] Fresh Mac: Install from scratch
- [ ] Fresh Linux: Install from scratch
- [ ] Verify all features work
- [ ] Test uninstall

---

### Week 6: Testing & Release ✅

#### Day 1: End-to-End Testing

- [ ] Test scenario 1: Fresh install → Add 10 accounts → Switch between them
- [ ] Test scenario 2: Export → Uninstall → Reinstall → Import
- [ ] Test scenario 3: CLI operations → Verify in extension UI
- [ ] Test scenario 4: Extension operations → Verify in CLI
- [ ] Test scenario 5: Multiple cards → Auto-fill

#### Day 2: Performance Testing

- [ ] Load test: Create 100 accounts
- [ ] Measure operation latencies:
  - getAll: < 50ms
  - create: < 100ms
  - update: < 100ms
  - delete: < 50ms
- [ ] Memory usage: < 30MB backend
- [ ] Extension load time: < 500ms

#### Day 3: Bug Fixes

- [ ] Fix any bugs found during testing
- [ ] Edge case handling:
  - Empty database
  - Duplicate names
  - Missing cookies
  - Invalid card numbers
- [ ] Error messages improvement

#### Day 4: Final Polish

- [ ] Code cleanup
- [ ] Remove console.log() debug statements
- [ ] Add final comments
- [ ] Update version numbers
- [ ] Create CHANGELOG.md

#### Day 5: Release

- [ ] Create GitHub release:
  - Tag: v2.0.0
  - Release notes
  - Attach packages (backend + extension)
- [ ] Update Chrome Web Store listing (if applicable)
- [ ] Announce release

**Week 6 Completion Checklist:**

- [ ] All features working
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Packages created
- [ ] Release published

---

## 🚨 Critical Tests (Must Pass)

### Connection Test

```javascript
// In extension console
import { nativeClient } from "./services/native-client.js";

await nativeClient.connect();
console.log("✅ Connected");

const health = await nativeClient.healthCheck();
console.log("Health:", health);
```

### CRUD Test

```javascript
// Create
const account = await nativeClient.createAccount({
  name: "Test Account",
  email: "test@example.com",
  cookies: [{ name: "session", value: "123", domain: ".cursor.sh" }],
});
console.log("✅ Created:", account.id);

// Read
const accounts = await nativeClient.getAccounts();
console.log("✅ Accounts:", accounts.length);

// Update
await nativeClient.updateAccount(account.id, { status: "expired" });
console.log("✅ Updated");

// Delete
await nativeClient.deleteAccount(account.id);
console.log("✅ Deleted");
```

### CLI Test

```bash
# Create via CLI
python cli.py add "CLI Account" "cli@example.com"

# Verify in extension (should see "CLI Account")

# Delete via extension

# Verify in CLI (should be gone)
python cli.py list
```

### Cross-Platform Test

- [ ] Works on Windows 10/11
- [ ] Works on macOS (Big Sur+)
- [ ] Works on Linux (Ubuntu/Fedora)

---

## 📊 Progress Tracking

### Overall Progress: 0/6 weeks

**Week 1: Backend Foundation** [ ]

- [ ] Database layer
- [ ] Account service
- [ ] Card service
- [ ] Backup service

**Week 2: Native Messaging** [ ]

- [ ] Native host
- [ ] Request handlers
- [ ] Testing

**Week 3: Extension Integration** [ ]

- [ ] Native client
- [ ] UI updates
- [ ] Testing

**Week 4: CLI Tool** [ ]

- [ ] Basic commands
- [ ] Advanced features
- [ ] Polish

**Week 5: Installer** [ ]

- [ ] Windows installer
- [ ] Mac/Linux installer
- [ ] Documentation

**Week 6: Testing & Release** [ ]

- [ ] E2E testing
- [ ] Performance testing
- [ ] Bug fixes
- [ ] Release

---

## 🎯 Daily Standup Questions

At the end of each day, ask:

1. ✅ What did I complete today?
2. 🚧 What am I working on next?
3. ❌ Any blockers?
4. 📝 What did I learn?

---

## 🆘 Troubleshooting Guide

### Issue: Native host won't connect

**Check:**

- [ ] Is native host registered? (check registry/manifest file)
- [ ] Is Python in PATH?
- [ ] Does `python src/main.py` work manually?
- [ ] Check extension ID in manifest matches

**Debug:**

```bash
# Check native host logs (stderr)
python src/main.py 2> debug.log

# Check Chrome extension errors
# Chrome → Extensions → Cursor Manager → Errors
```

### Issue: Database file not found

**Check:**

- [ ] Does %APPDATA%/CursorManager/ exist?
- [ ] Permissions correct?
- [ ] Try manual path: `Database('custom_path.db')`

### Issue: Slow performance

**Check:**

- [ ] Database size (should be < 10MB for good performance)
- [ ] Number of accounts (1000+ may slow down)
- [ ] Add indexes if needed

---

## 📞 Resources

- Native Messaging Docs: https://developer.chrome.com/docs/apps/nativeMessaging/
- SQLite Python: https://docs.python.org/3/library/sqlite3.html
- Click Docs: https://click.palletsprojects.com/
- Rich Docs: https://rich.readthedocs.io/

---

**Last Updated:** Oktober 2025  
**Status:** Ready to Start  
**Estimated Completion:** 6 weeks from start date

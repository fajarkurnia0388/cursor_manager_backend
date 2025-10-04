# 🎯 Decision Matrix: Storage Architecture

**Tanggal:** Oktober 2025  
**Tujuan:** Memilih arsitektur storage yang tepat untuk Cursor Account Manager

---

## 📊 Quick Comparison

| Kriteria             | Chrome Storage           | SQLite WASM               | Native Messaging + Python |
| -------------------- | ------------------------ | ------------------------- | ------------------------- |
| **Installation**     | ✅ Zero install          | ✅ Zero install           | ❌ Perlu install Python   |
| **Data Persistence** | ❌ Hilang saat uninstall | ⚠️ Manual export          | ✅ Otomatis persist       |
| **Storage Limit**    | ❌ 10MB limit            | ⚠️ ~500MB (browser quota) | ✅ Unlimited              |
| **Edit Flexibility** | ❌ Browser only          | ❌ Browser only           | ✅ CLI, scripts, tools    |
| **Performance**      | ✅ ~5ms                  | ✅ ~5ms                   | ⚠️ ~20-50ms               |
| **Maintenance**      | ✅ Simple                | ✅ Simple                 | ❌ Complex (2 codebases)  |
| **Extensibility**    | ❌ Limited               | ⚠️ Medium                 | ✅ High (API, CLI, web)   |
| **Development Time** | ✅ 1 week                | ✅ 2 weeks                | ❌ 9 weeks                |
| **User Experience**  | ✅ Seamless              | ✅ Seamless               | ⚠️ Install required       |
| **Power Features**   | ❌ Basic                 | ⚠️ Medium                 | ✅ Advanced               |
| **Team Friendly**    | ❌ No                    | ⚠️ Via export             | ✅ Yes (shared backend)   |
| **Cost**             | ✅ Free                  | ✅ Free                   | ✅ Free (open source)     |

---

## 🔍 Detailed Analysis

### Option 1: Chrome Storage (Current)

#### Architecture

```
┌─────────────────────────────┐
│  Extension                   │
│  ┌─────────────────────┐    │
│  │  UI Components      │    │
│  └──────────┬──────────┘    │
│             │                │
│  ┌──────────▼──────────┐    │
│  │  Chrome Storage API │    │
│  │  (max 10MB)         │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

#### Pros ✅

- **Zero setup** - Works immediately
- **Fast** - In-memory operations (~5ms)
- **Simple** - No external dependencies
- **Reliable** - Battle-tested Chrome API
- **Current** - Already implemented

#### Cons ❌

- **10MB limit** - Can store ~200-300 accounts max
- **Volatile** - Data lost on extension uninstall
- **Browser-locked** - Can't access from outside
- **No CLI** - Can't automate operations
- **Single device** - No sync (unless Chrome Sync enabled)

#### Best For

- Casual users (<100 accounts)
- Quick setup priority
- Simple use cases
- Don't need persistence across reinstalls

#### Implementation Effort

- **Current state:** Already done
- **Improvements:** 1 week (cleanup, optimize)

#### Code Example

```javascript
// Simple and straightforward
class ChromeStorageService {
  async getAccounts() {
    const result = await chrome.storage.local.get("accounts");
    return result.accounts || [];
  }

  async saveAccount(account) {
    const accounts = await this.getAccounts();
    accounts.push(account);
    await chrome.storage.local.set({ accounts });
  }
}
```

---

### Option 2: SQLite WASM + File System Access

#### Architecture

```
┌─────────────────────────────────────────────┐
│  Extension                                   │
│  ┌─────────────────────┐                    │
│  │  UI Components      │                    │
│  └──────────┬──────────┘                    │
│             │                                │
│  ┌──────────▼──────────┐                    │
│  │  SQLite WASM        │                    │
│  │  (In-browser DB)    │                    │
│  └──────────┬──────────┘                    │
│             │                                │
│  ┌──────────▼──────────┐                    │
│  │ File System Access  │ ─────► Local File  │
│  │ API (periodic save) │       (user folder)│
│  └─────────────────────┘                    │
└─────────────────────────────────────────────┘
```

#### Pros ✅

- **Zero install** - Pure browser tech
- **Fast** - In-memory WASM (~5ms)
- **SQL queries** - Full SQLite power
- **Larger storage** - Up to ~500MB
- **Manual persistence** - User controls export location
- **Portable** - .db file can be backed up

#### Cons ❌

- **Manual export** - User must remember to save
- **Still volatile** - Lost if user doesn't export before uninstall
- **Browser quota** - Still limited (500MB typical)
- **No external access** - Browser only
- **WASM overhead** - Initial load ~2MB

#### Best For

- Medium users (100-500 accounts)
- Want SQL power
- Don't want installation hassle
- OK with manual backups

#### Implementation Effort

- **New work:** 2 weeks
  - Week 1: SQLite WASM integration
  - Week 2: File System Access + UI

#### Code Example

```javascript
// Using sql.js (SQLite WASM)
import initSqlJs from "sql.js";

class SQLiteWASMService {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async init() {
    const SQL = await initSqlJs({
      locateFile: (file) => `libs/${file}`,
    });

    // Load from IndexedDB or create new
    const savedData = await this.loadFromIndexedDB();
    this.db = savedData
      ? new SQL.Database(new Uint8Array(savedData))
      : new SQL.Database();

    // Create tables if new
    if (!savedData) {
      this.db.run(`
        CREATE TABLE accounts (
          id INTEGER PRIMARY KEY,
          name TEXT UNIQUE,
          email TEXT,
          cookies TEXT
        )
      `);
    }

    this.initialized = true;

    // Auto-save every 5 minutes
    setInterval(() => this.autoSave(), 5 * 60 * 1000);
  }

  async getAccounts() {
    const result = this.db.exec("SELECT * FROM accounts");
    return result[0]?.values || [];
  }

  async saveAccount(account) {
    this.db.run(
      "INSERT INTO accounts (name, email, cookies) VALUES (?, ?, ?)",
      [account.name, account.email, JSON.stringify(account.cookies)]
    );
    await this.autoSave();
  }

  async autoSave() {
    // Save to IndexedDB (volatile but fast)
    const data = this.db.export();
    await this.saveToIndexedDB(data);

    // Optionally: Save to user-selected folder
    if (this.exportHandle) {
      await this.saveToFile(data);
    }
  }

  async setupAutoExport() {
    // User selects folder once
    const dirHandle = await window.showDirectoryPicker();
    this.exportHandle = await dirHandle.getFileHandle("cursor-accounts.db", {
      create: true,
    });
  }

  async saveToFile(data) {
    const writable = await this.exportHandle.createWritable();
    await writable.write(new Blob([data]));
    await writable.close();
  }
}
```

---

### Option 3: Native Messaging + Python Backend

#### Architecture

```
┌──────────────────────────────┐
│  Extension (UI Layer)         │
│  ┌─────────────────────┐     │
│  │  UI Components      │     │
│  └──────────┬──────────┘     │
│             │                 │
│  ┌──────────▼──────────┐     │
│  │ Native Msg Client   │     │
│  └──────────┬──────────┘     │
└─────────────┼─────────────────┘
              │ JSON-RPC
┌─────────────▼─────────────────┐
│  Python Backend               │
│  ┌─────────────────────┐     │
│  │  Native Host        │     │
│  │  (stdio)            │     │
│  └──────────┬──────────┘     │
│             │                 │
│  ┌──────────▼──────────┐     │
│  │  Services Layer     │     │
│  │  (CRUD + Business)  │     │
│  └──────────┬──────────┘     │
│             │                 │
│  ┌──────────▼──────────┐     │
│  │  SQLite Database    │     │
│  │  (Persistent File)  │     │
│  └─────────────────────┘     │
│                               │
│  ┌─────────────────────┐     │
│  │  CLI Tool           │     │
│  └─────────────────────┘     │
└───────────────────────────────┘
```

#### Pros ✅

- **Persistent** - Data survives uninstall/reinstall
- **Unlimited storage** - Disk-based (GBs possible)
- **External access** - CLI, scripts, tools
- **Professional** - Industry-standard architecture
- **Extensible** - Can add web interface, mobile app
- **Team-friendly** - Shared backend possible
- **Full SQL** - Native SQLite performance
- **Backup automation** - Python can handle scheduling

#### Cons ❌

- **Complex installation** - User must install Python backend
- **Maintenance** - Two codebases to maintain
- **Latency** - IPC overhead (~20-50ms)
- **Platform-specific** - Need Windows/Mac/Linux installers
- **Development time** - 9 weeks implementation
- **Learning curve** - More components to understand

#### Best For

- Power users (500+ accounts)
- Teams sharing account database
- Need CLI automation
- Want professional tooling
- Data persistence critical

#### Implementation Effort

- **New work:** 9 weeks
  - Week 1-2: Backend foundation
  - Week 3-4: Extension integration
  - Week 5: CLI tools
  - Week 6: Installer
  - Week 7-8: Testing
  - Week 9: Migration & release

#### Code Example

**Extension side:**

```javascript
class NativeMessagingService {
  constructor() {
    this.port = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.port = chrome.runtime.connectNative("com.cursor.account_manager");

        this.port.onMessage.addListener((msg) => {
          this.handleResponse(msg);
        });

        this.port.onDisconnect.addListener(() => {
          reject(new Error("Backend disconnected"));
        });

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async call(method, params = {}) {
    const id = ++this.requestId;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      this.port.postMessage({
        jsonrpc: "2.0",
        id,
        method,
        params,
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Request timeout"));
        }
      }, 5000);
    });
  }

  handleResponse(response) {
    const { id, result, error } = response;
    const pending = this.pendingRequests.get(id);

    if (!pending) return;

    this.pendingRequests.delete(id);

    if (error) {
      pending.reject(new Error(error.message));
    } else {
      pending.resolve(result);
    }
  }

  async getAccounts() {
    return this.call("accounts.getAll");
  }

  async saveAccount(account) {
    return this.call("accounts.create", account);
  }
}
```

**Python backend:**

```python
# Simplified example
import sys
import json
import struct
from services import AccountService, CardService

class NativeHost:
    def __init__(self):
        self.account_service = AccountService()
        self.card_service = CardService()

    def read_message(self):
        text_length_bytes = sys.stdin.buffer.read(4)
        if not text_length_bytes:
            return None

        text_length = struct.unpack('I', text_length_bytes)[0]
        text = sys.stdin.buffer.read(text_length).decode('utf-8')
        return json.loads(text)

    def send_message(self, message):
        encoded = json.dumps(message).encode('utf-8')
        sys.stdout.buffer.write(struct.pack('I', len(encoded)))
        sys.stdout.buffer.write(encoded)
        sys.stdout.buffer.flush()

    def handle(self, message):
        method = message['method']
        params = message['params']
        msg_id = message['id']

        try:
            # Route to appropriate service
            if method.startswith('accounts.'):
                action = method.split('.')[1]
                result = getattr(self.account_service, action)(params)
            elif method.startswith('cards.'):
                action = method.split('.')[1]
                result = getattr(self.card_service, action)(params)

            return {
                'jsonrpc': '2.0',
                'id': msg_id,
                'result': result
            }
        except Exception as e:
            return {
                'jsonrpc': '2.0',
                'id': msg_id,
                'error': {'code': -32603, 'message': str(e)}
            }

    def run(self):
        while True:
            message = self.read_message()
            if not message:
                break

            response = self.handle(message)
            self.send_message(response)

if __name__ == '__main__':
    NativeHost().run()
```

---

## 🎯 Decision Framework

### Use Chrome Storage IF:

- ✅ User base < 100 accounts per user
- ✅ Simple use case (personal use)
- ✅ Fast deployment needed
- ✅ Don't care about data loss on uninstall
- ✅ No CLI/automation needed

### Use SQLite WASM IF:

- ✅ User base 100-500 accounts per user
- ✅ Want SQL capabilities
- ✅ Don't want installation hassle
- ✅ OK with manual backups
- ✅ Medium complexity acceptable

### Use Native Messaging IF:

- ✅ User base 500+ accounts per user
- ✅ Data persistence critical
- ✅ Need CLI/automation
- ✅ Team/multi-user setup
- ✅ Professional tooling required
- ✅ Willing to invest dev time

---

## 📊 User Persona Analysis

### Persona 1: Casual User (70% of users)

**Profile:**

- Uses 5-20 accounts
- Personal projects only
- Rarely reinstalls extension
- No automation needs

**Best Choice:** ✅ **Chrome Storage**
**Why:** Simple, fast, sufficient for needs

---

### Persona 2: Power User (25% of users)

**Profile:**

- Uses 50-200 accounts
- Multiple projects
- Occasional reinstalls
- Some automation (scripts)

**Best Choice:** ✅ **SQLite WASM** or **Native Messaging**
**Why:**

- SQLite WASM: Good balance (simplicity + power)
- Native Messaging: If CLI needed

---

### Persona 3: Professional/Team (5% of users)

**Profile:**

- Uses 200+ accounts
- Team collaboration
- Frequent automation
- CI/CD integration
- Multiple devices

**Best Choice:** ✅ **Native Messaging**
**Why:** Only option with full feature set

---

## 💡 Hybrid Approach (Recommended)

### Strategy: Support All Three!

```javascript
// Adaptive storage strategy
class StorageStrategySelector {
  static async select() {
    // Check if native backend available
    const hasNative = await this.checkNativeBackend();
    if (hasNative) {
      return new NativeMessagingStorage();
    }

    // Check account count
    const accountCount = await this.getAccountCount();
    if (accountCount > 100) {
      // Suggest SQLite WASM for better performance
      return new SQLiteWASMStorage();
    }

    // Default to Chrome Storage
    return new ChromeStorage();
  }

  static async checkNativeBackend() {
    try {
      const port = chrome.runtime.connectNative("com.cursor.account_manager");
      port.disconnect();
      return true;
    } catch {
      return false;
    }
  }
}
```

### Implementation Plan

**Phase 1: Optimize Current (1 week)**

- Clean up Chrome Storage implementation
- Add export/import improvements
- Add account count warnings

**Phase 2: Add SQLite WASM (2 weeks)**

- Implement SQLite WASM option
- Add File System Access auto-save
- Add migration from Chrome Storage

**Phase 3: Add Native Backend (9 weeks)**

- Implement Python backend
- Add installer
- Add CLI tools
- Keep other options as fallback

### User Flow

```
User installs extension
  ↓
Starts with Chrome Storage (fast)
  ↓
If > 100 accounts
  ↓
Show suggestion: "Upgrade to SQLite for better performance"
  ↓
User clicks "Enable SQLite" (zero install)
  ↓
If user is power user or needs CLI
  ↓
Show suggestion: "Install Python backend for CLI access"
  ↓
User downloads installer (one-time setup)
  ↓
Extension auto-detects backend and switches
```

---

## 📈 ROI Analysis

### Chrome Storage

- **Investment:** 1 week (cleanup)
- **Benefit:** Works for 70% of users
- **ROI:** ⭐⭐⭐⭐⭐ Very High

### SQLite WASM

- **Investment:** 2 weeks
- **Benefit:** Covers 25% power users
- **ROI:** ⭐⭐⭐⭐ High

### Native Messaging

- **Investment:** 9 weeks
- **Benefit:** Covers 5% professional users
- **ROI:** ⭐⭐⭐ Medium
- **But:** Enables monetization (pro features)

---

## 🎯 Final Recommendation

### Short Term (Bulan 1-2): **Option 2 - SQLite WASM**

**Reasoning:**

1. Best balance of features vs complexity
2. Covers 95% of user needs (casual + power)
3. Zero installation hassle
4. Fast implementation (2 weeks)
5. Good foundation for future enhancements

**Action Items:**

- Week 1-2: Implement SQLite WASM
- Week 3: Add File System Access
- Week 4: Testing & polish

### Long Term (Bulan 3+): **Option 3 - Native Messaging**

**Reasoning:**

1. Enables professional features
2. Monetization opportunity (Pro version)
3. Team collaboration features
4. CLI automation
5. Ecosystem expansion (web dashboard, mobile)

**Action Items:**

- Month 1-2: SQLite WASM (foundation)
- Month 3-4: Native backend development
- Month 5: Beta testing
- Month 6: Public release

### Migration Path

```
v1.x (Current)
  → Chrome Storage

v2.0 (2 months)
  → SQLite WASM (default)
  → Chrome Storage (fallback)

v2.5 (5 months)
  → Native Messaging (optional, pro features)
  → SQLite WASM (default)
  → Chrome Storage (basic mode)
```

---

## ✅ Decision Checklist

Before implementation, verify:

- [ ] Target user base identified
- [ ] Account volume estimated
- [ ] Persistence requirements clear
- [ ] Maintenance capacity assessed
- [ ] Timeline realistic
- [ ] Budget approved (if any)
- [ ] Team skills aligned
- [ ] User feedback collected
- [ ] Fallback plan defined
- [ ] Success metrics set

---

## 📞 Questions to Ask

1. **What's the average account count per user?**

   - < 50: Chrome Storage
   - 50-200: SQLite WASM
   - 200+: Native Messaging

2. **How critical is data persistence?**

   - Nice to have: Chrome Storage + Export
   - Important: SQLite WASM + Auto-save
   - Critical: Native Messaging

3. **Do users need CLI/automation?**

   - No: Chrome Storage or SQLite WASM
   - Yes: Native Messaging

4. **What's the development timeline?**

   - 1 week: Chrome Storage (optimize current)
   - 2 weeks: SQLite WASM
   - 9 weeks: Native Messaging

5. **Is installation acceptable?**

   - No: Chrome Storage or SQLite WASM
   - Yes: Native Messaging

6. **Team or solo use?**
   - Solo: Any option
   - Team: Native Messaging

---

**Prepared By:** AI Architect  
**Date:** Oktober 2025  
**Recommendation:** Start with SQLite WASM (v2.0), add Native Messaging later (v2.5)  
**Confidence Level:** High ⭐⭐⭐⭐⭐

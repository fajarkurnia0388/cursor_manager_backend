# 🏗️ Simplified Native Messaging Architecture

**Tanggal:** Oktober 2025  
**Status:** Implementation Ready  
**Approach:** Native Messaging + Python Backend (NO Security/Encryption)  
**Timeline:** 6 weeks (simplified dari 9 weeks)

---

## 🎯 Design Philosophy: Keep It Simple

### What We REMOVE (For Speed):

- ❌ Encryption/Cryptography
- ❌ Security manager
- ❌ Threat detector
- ❌ Compliance manager
- ❌ Complex monitoring
- ❌ OAuth/Cloud sync

### What We KEEP (Core Features):

- ✅ Native messaging protocol
- ✅ SQLite database (plain text)
- ✅ CRUD operations (accounts, cards, cookies)
- ✅ CLI tool
- ✅ Backup/Export
- ✅ Simple installer

---

## 📊 Simplified Architecture

```
┌─────────────────────────────────────┐
│  CHROME EXTENSION (UI)              │
│  ┌───────────────────────┐          │
│  │  • Sidepanel UI       │          │
│  │  • Auto-fill logic    │          │
│  │  • Cookie injection   │          │
│  └───────────┬───────────┘          │
│              │                       │
│  ┌───────────▼───────────┐          │
│  │ Native Messaging      │          │
│  │ Client (JSON-RPC)     │          │
│  └───────────┬───────────┘          │
└──────────────┼─────────────────────┘
               │ stdio
┌──────────────▼─────────────────────┐
│  PYTHON BACKEND                    │
│  ┌───────────────────────┐         │
│  │  native_host.py       │         │
│  │  (stdio handler)      │         │
│  └───────────┬───────────┘         │
│              │                      │
│  ┌───────────▼───────────┐         │
│  │  Services:            │         │
│  │  • account_service    │         │
│  │  • card_service       │         │
│  │  • backup_service     │         │
│  └───────────┬───────────┘         │
│              │                      │
│  ┌───────────▼───────────┐         │
│  │  SQLite Database      │         │
│  │  (Plain Text)         │         │
│  │  accounts.db          │         │
│  └───────────────────────┘         │
│                                     │
│  📂 Data: %APPDATA%/CursorManager/  │
└─────────────────────────────────────┘
```

---

## 🐍 Python Backend Structure (Simplified)

```
cursor-manager-backend/
├── src/
│   ├── main.py              # Entry point for native host
│   ├── native_host.py       # stdio message handler
│   ├── database.py          # SQLite connection
│   │
│   ├── services/
│   │   ├── account_service.py
│   │   ├── card_service.py
│   │   └── backup_service.py
│   │
│   └── models.py            # Data classes (Account, Card, Cookie)
│
├── cli.py                   # CLI tool
├── install.py               # Installer script
├── requirements.txt         # Just: click, rich (NO crypto)
└── README.md
```

### Dependencies (Minimal)

```txt
# requirements.txt
click>=8.1.0        # CLI
rich>=13.0.0        # Pretty terminal output

# That's it! Using Python built-in sqlite3
```

---

## 💻 Core Implementation

### 1. Database Layer (database.py)

```python
"""
Simple SQLite database handler
No encryption, no complexity
"""
import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

class Database:
    def __init__(self, db_path: str = None):
        if db_path is None:
            # Default path: %APPDATA%/CursorManager/accounts.db
            if os.name == 'nt':  # Windows
                base = Path(os.environ['APPDATA'])
            else:  # Mac/Linux
                base = Path.home() / '.local' / 'share'

            self.db_path = base / 'CursorManager' / 'accounts.db'
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
        else:
            self.db_path = Path(db_path)

        self.conn = None
        self.init_db()

    def init_db(self):
        """Initialize database and create tables"""
        self.conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row  # Return dict-like rows

        # Create tables
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                email TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                avatar_url TEXT,
                is_active INTEGER DEFAULT 0,
                cookies TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS payment_cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_number TEXT NOT NULL,
                card_holder TEXT NOT NULL,
                expiry_month TEXT NOT NULL,
                expiry_year TEXT NOT NULL,
                cvc TEXT NOT NULL,
                card_type TEXT DEFAULT 'credit',
                nickname TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Create indexes
        self.conn.execute('CREATE INDEX IF NOT EXISTS idx_account_name ON accounts(name)')
        self.conn.execute('CREATE INDEX IF NOT EXISTS idx_account_status ON accounts(status)')

        self.conn.commit()
        print(f"✅ Database initialized: {self.db_path}")

    def execute(self, query: str, params: tuple = ()) -> List[Dict]:
        """Execute SELECT query and return results"""
        cursor = self.conn.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

    def execute_one(self, query: str, params: tuple = ()) -> Optional[Dict]:
        """Execute SELECT query and return first result"""
        cursor = self.conn.execute(query, params)
        row = cursor.fetchone()
        return dict(row) if row else None

    def execute_write(self, query: str, params: tuple = ()) -> int:
        """Execute INSERT/UPDATE/DELETE and return lastrowid"""
        cursor = self.conn.execute(query, params)
        self.conn.commit()
        return cursor.lastrowid

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
```

### 2. Account Service (services/account_service.py)

```python
"""
Account management service
Simple CRUD operations, no encryption
"""
import json
from typing import List, Dict, Optional
from database import Database

class AccountService:
    def __init__(self, db: Database):
        self.db = db

    def get_all(self) -> List[Dict]:
        """Get all accounts"""
        accounts = self.db.execute('''
            SELECT * FROM accounts ORDER BY created_at DESC
        ''')

        # Parse cookies JSON
        for account in accounts:
            if account['cookies']:
                account['cookies'] = json.loads(account['cookies'])
            else:
                account['cookies'] = []

            # Convert boolean
            account['active'] = account['is_active'] == 1
            del account['is_active']

        return accounts

    def get_by_id(self, account_id: int) -> Optional[Dict]:
        """Get account by ID"""
        account = self.db.execute_one(
            'SELECT * FROM accounts WHERE id = ?',
            (account_id,)
        )

        if account:
            account['cookies'] = json.loads(account['cookies'] or '[]')
            account['active'] = account['is_active'] == 1
            del account['is_active']

        return account

    def get_by_name(self, name: str) -> Optional[Dict]:
        """Get account by name"""
        account = self.db.execute_one(
            'SELECT * FROM accounts WHERE name = ?',
            (name,)
        )

        if account:
            account['cookies'] = json.loads(account['cookies'] or '[]')
            account['active'] = account['is_active'] == 1
            del account['is_active']

        return account

    def create(self, name: str, email: str, cookies: List[Dict] = None,
               avatar_url: str = '', status: str = 'active') -> Dict:
        """Create new account"""
        # Check if exists
        existing = self.get_by_name(name)
        if existing:
            raise ValueError(f'Account "{name}" already exists')

        # Serialize cookies
        cookies_json = json.dumps(cookies or [])

        # Insert
        account_id = self.db.execute_write('''
            INSERT INTO accounts (name, email, cookies, avatar_url, status)
            VALUES (?, ?, ?, ?, ?)
        ''', (name, email, cookies_json, avatar_url, status))

        print(f"✅ Account '{name}' created (ID: {account_id})")

        return self.get_by_id(account_id)

    def update(self, account_id: int, **updates) -> Dict:
        """Update account fields"""
        account = self.get_by_id(account_id)
        if not account:
            raise ValueError(f'Account ID {account_id} not found')

        # Build update query
        fields = []
        values = []

        if 'name' in updates:
            fields.append('name = ?')
            values.append(updates['name'])

        if 'email' in updates:
            fields.append('email = ?')
            values.append(updates['email'])

        if 'status' in updates:
            fields.append('status = ?')
            values.append(updates['status'])

        if 'avatar_url' in updates:
            fields.append('avatar_url = ?')
            values.append(updates['avatar_url'])

        if 'cookies' in updates:
            fields.append('cookies = ?')
            values.append(json.dumps(updates['cookies']))

        if fields:
            fields.append('updated_at = CURRENT_TIMESTAMP')
            values.append(account_id)

            self.db.execute_write(f'''
                UPDATE accounts
                SET {', '.join(fields)}
                WHERE id = ?
            ''', tuple(values))

            print(f"✅ Account ID {account_id} updated")

        return self.get_by_id(account_id)

    def delete(self, account_id: int) -> bool:
        """Delete account"""
        account = self.get_by_id(account_id)
        if not account:
            return False

        self.db.execute_write('DELETE FROM accounts WHERE id = ?', (account_id,))
        print(f"✅ Account '{account['name']}' deleted")

        return True

    def set_active(self, account_id: int) -> Dict:
        """Set account as active (deactivate others)"""
        # Deactivate all
        self.db.execute_write('UPDATE accounts SET is_active = 0')

        # Activate target
        self.db.execute_write(
            'UPDATE accounts SET is_active = 1 WHERE id = ?',
            (account_id,)
        )

        account = self.get_by_id(account_id)
        print(f"✅ Account '{account['name']}' set as active")

        return account

    def get_active(self) -> Optional[Dict]:
        """Get active account"""
        account = self.db.execute_one(
            'SELECT * FROM accounts WHERE is_active = 1'
        )

        if account:
            account['cookies'] = json.loads(account['cookies'] or '[]')
            account['active'] = True
            del account['is_active']

        return account

    def search(self, query: str) -> List[Dict]:
        """Search accounts by name or email"""
        accounts = self.db.execute('''
            SELECT * FROM accounts
            WHERE name LIKE ? OR email LIKE ?
            ORDER BY created_at DESC
        ''', (f'%{query}%', f'%{query}%'))

        for account in accounts:
            account['cookies'] = json.loads(account['cookies'] or '[]')
            account['active'] = account['is_active'] == 1
            del account['is_active']

        return accounts
```

### 3. Native Host (native_host.py)

```python
"""
Native messaging host
Handles stdio communication with Chrome extension
"""
import sys
import json
import struct
from database import Database
from services.account_service import AccountService
from services.card_service import CardService
from services.backup_service import BackupService

class NativeHost:
    def __init__(self):
        # Initialize database
        self.db = Database()

        # Initialize services
        self.account_service = AccountService(self.db)
        self.card_service = CardService(self.db)
        self.backup_service = BackupService(self.db)

    def read_message(self) -> dict:
        """Read message from stdin (Chrome Native Messaging format)"""
        # Read 4-byte length prefix
        raw_length = sys.stdin.buffer.read(4)
        if len(raw_length) == 0:
            return None

        # Unpack length as unsigned int
        message_length = struct.unpack('=I', raw_length)[0]

        # Read message
        message = sys.stdin.buffer.read(message_length).decode('utf-8')

        return json.loads(message)

    def send_message(self, message: dict):
        """Send message to stdout (Chrome Native Messaging format)"""
        # Encode message
        encoded_content = json.dumps(message).encode('utf-8')
        encoded_length = struct.pack('=I', len(encoded_content))

        # Write to stdout
        sys.stdout.buffer.write(encoded_length)
        sys.stdout.buffer.write(encoded_content)
        sys.stdout.buffer.flush()

    def handle_request(self, request: dict) -> dict:
        """Route request to appropriate service"""
        try:
            method = request.get('method', '')
            params = request.get('params', {})
            request_id = request.get('id')

            # Parse method (e.g., "accounts.getAll")
            if '.' not in method:
                raise ValueError(f'Invalid method format: {method}')

            namespace, action = method.split('.', 1)

            # Route to service
            if namespace == 'accounts':
                result = self.handle_accounts(action, params)
            elif namespace == 'cards':
                result = self.handle_cards(action, params)
            elif namespace == 'backup':
                result = self.handle_backup(action, params)
            elif namespace == 'system':
                result = self.handle_system(action, params)
            else:
                raise ValueError(f'Unknown namespace: {namespace}')

            # Success response
            return {
                'jsonrpc': '2.0',
                'id': request_id,
                'result': {
                    'success': True,
                    'data': result
                }
            }

        except Exception as e:
            # Error response
            return {
                'jsonrpc': '2.0',
                'id': request.get('id'),
                'error': {
                    'code': -32603,
                    'message': str(e)
                }
            }

    def handle_accounts(self, action: str, params: dict):
        """Handle account operations"""
        if action == 'getAll':
            return self.account_service.get_all()

        elif action == 'getById':
            return self.account_service.get_by_id(params['id'])

        elif action == 'getByName':
            return self.account_service.get_by_name(params['name'])

        elif action == 'create':
            return self.account_service.create(
                name=params['name'],
                email=params['email'],
                cookies=params.get('cookies', []),
                avatar_url=params.get('avatarUrl', ''),
                status=params.get('status', 'active')
            )

        elif action == 'update':
            return self.account_service.update(params['id'], **params.get('updates', {}))

        elif action == 'delete':
            return self.account_service.delete(params['id'])

        elif action == 'setActive':
            return self.account_service.set_active(params['id'])

        elif action == 'getActive':
            return self.account_service.get_active()

        elif action == 'search':
            return self.account_service.search(params['query'])

        else:
            raise ValueError(f'Unknown action: accounts.{action}')

    def handle_cards(self, action: str, params: dict):
        """Handle payment card operations"""
        if action == 'getAll':
            return self.card_service.get_all()

        elif action == 'create':
            return self.card_service.create(**params)

        elif action == 'delete':
            return self.card_service.delete(params['id'])

        else:
            raise ValueError(f'Unknown action: cards.{action}')

    def handle_backup(self, action: str, params: dict):
        """Handle backup operations"""
        if action == 'export':
            return self.backup_service.export_to_json(params.get('path'))

        elif action == 'import':
            return self.backup_service.import_from_json(params['path'])

        else:
            raise ValueError(f'Unknown action: backup.{action}')

    def handle_system(self, action: str, params: dict):
        """Handle system operations"""
        if action == 'health':
            return {'status': 'ok', 'database': str(self.db.db_path)}

        elif action == 'version':
            return {'version': '1.0.0'}

        elif action == 'stats':
            accounts = len(self.account_service.get_all())
            cards = len(self.card_service.get_all())
            return {'accounts': accounts, 'cards': cards}

        else:
            raise ValueError(f'Unknown action: system.{action}')

    def run(self):
        """Main event loop"""
        print("🚀 Native host started", file=sys.stderr)

        while True:
            try:
                # Read request
                request = self.read_message()

                if request is None:
                    # EOF reached
                    break

                print(f"📨 Received: {request.get('method')}", file=sys.stderr)

                # Handle request
                response = self.handle_request(request)

                # Send response
                self.send_message(response)

                print(f"📤 Sent response", file=sys.stderr)

            except Exception as e:
                print(f"❌ Error: {e}", file=sys.stderr)

                # Send error response
                error_response = {
                    'jsonrpc': '2.0',
                    'error': {
                        'code': -32700,
                        'message': f'Parse error: {str(e)}'
                    }
                }
                self.send_message(error_response)

        # Cleanup
        self.db.close()
        print("👋 Native host stopped", file=sys.stderr)

def main():
    host = NativeHost()
    host.run()

if __name__ == '__main__':
    main()
```

### 4. CLI Tool (cli.py)

```python
"""
Command-line interface for Cursor Account Manager
Simple commands, no complexity
"""
import click
from rich.console import Console
from rich.table import Table
from database import Database
from services.account_service import AccountService
from services.card_service import CardService

console = Console()
db = Database()
account_service = AccountService(db)
card_service = CardService(db)

@click.group()
def cli():
    """Cursor Account Manager CLI"""
    pass

@cli.command('list')
def list_accounts():
    """List all accounts"""
    accounts = account_service.get_all()

    if not accounts:
        console.print("[yellow]No accounts found[/yellow]")
        return

    table = Table(title="Accounts")
    table.add_column("ID", style="cyan")
    table.add_column("Name", style="green")
    table.add_column("Email", style="yellow")
    table.add_column("Status", style="magenta")
    table.add_column("Active", style="red")
    table.add_column("Cookies", style="blue")

    for acc in accounts:
        table.add_row(
            str(acc['id']),
            acc['name'],
            acc['email'],
            acc['status'],
            "✓" if acc['active'] else "",
            str(len(acc['cookies']))
        )

    console.print(table)

@cli.command('add')
@click.argument('name')
@click.argument('email')
def add_account(name, email):
    """Add new account"""
    try:
        account = account_service.create(name, email)
        console.print(f"[green]✓[/green] Account '{name}' created (ID: {account['id']})")
    except Exception as e:
        console.print(f"[red]✗ Error: {e}[/red]")

@cli.command('delete')
@click.argument('account_id', type=int)
def delete_account(account_id):
    """Delete account"""
    try:
        success = account_service.delete(account_id)
        if success:
            console.print(f"[green]✓[/green] Account {account_id} deleted")
        else:
            console.print(f"[red]✗[/red] Account {account_id} not found")
    except Exception as e:
        console.print(f"[red]✗ Error: {e}[/red]")

@cli.command('activate')
@click.argument('account_id', type=int)
def activate_account(account_id):
    """Set account as active"""
    try:
        account = account_service.set_active(account_id)
        console.print(f"[green]✓[/green] Account '{account['name']}' is now active")
    except Exception as e:
        console.print(f"[red]✗ Error: {e}[/red]")

@cli.command('search')
@click.argument('query')
def search_accounts(query):
    """Search accounts"""
    accounts = account_service.search(query)

    if not accounts:
        console.print(f"[yellow]No accounts found for '{query}'[/yellow]")
        return

    console.print(f"Found {len(accounts)} account(s):")
    for acc in accounts:
        console.print(f"  • {acc['name']} ({acc['email']})")

@cli.command('info')
def show_info():
    """Show database info"""
    stats = account_service.db.execute_one('''
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as current_active
        FROM accounts
    ''')

    console.print(f"📊 Database: {db.db_path}")
    console.print(f"📝 Total accounts: {stats['total']}")
    console.print(f"✅ Active accounts: {stats['active']}")
    console.print(f"⭐ Currently active: {stats['current_active']}")

if __name__ == '__main__':
    cli()
```

### 5. Simple Installer (install.py)

```python
"""
Simple installer for Windows/Mac/Linux
Just registers native host manifest
"""
import os
import sys
import json
import winreg  # Windows only
from pathlib import Path

def install():
    """Install native messaging host"""
    print("🚀 Installing Cursor Account Manager Native Host...")

    # Get extension ID (user must provide)
    extension_id = input("Enter your extension ID: ").strip()
    if not extension_id:
        print("❌ Extension ID required")
        return

    # Get backend script path
    backend_path = Path(__file__).parent / 'src' / 'main.py'
    backend_path = backend_path.resolve()

    if not backend_path.exists():
        print(f"❌ Backend not found: {backend_path}")
        return

    # Create manifest
    manifest = {
        "name": "com.cursor.account_manager",
        "description": "Cursor Account Manager Native Host",
        "path": str(backend_path),
        "type": "stdio",
        "allowed_origins": [
            f"chrome-extension://{extension_id}/"
        ]
    }

    # Platform-specific installation
    if sys.platform == 'win32':
        install_windows(manifest)
    elif sys.platform == 'darwin':
        install_mac(manifest)
    else:
        install_linux(manifest)

    print("✅ Installation complete!")
    print(f"📂 Backend: {backend_path}")

def install_windows(manifest):
    """Install on Windows"""
    # Save manifest
    manifest_path = Path(__file__).parent / 'native_host_manifest.json'
    manifest_path.write_text(json.dumps(manifest, indent=2))

    # Register in registry
    key_path = r'Software\Google\Chrome\NativeMessagingHosts\com.cursor.account_manager'

    try:
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path) as key:
            winreg.SetValueEx(key, '', 0, winreg.REG_SZ, str(manifest_path))

        print(f"✅ Registered in Windows Registry")
        print(f"📄 Manifest: {manifest_path}")
    except Exception as e:
        print(f"❌ Failed to register: {e}")

def install_mac(manifest):
    """Install on macOS"""
    manifest_dir = Path.home() / 'Library' / 'Application Support' / 'Google' / 'Chrome' / 'NativeMessagingHosts'
    manifest_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = manifest_dir / 'com.cursor.account_manager.json'
    manifest_path.write_text(json.dumps(manifest, indent=2))

    print(f"✅ Installed for macOS")
    print(f"📄 Manifest: {manifest_path}")

def install_linux(manifest):
    """Install on Linux"""
    manifest_dir = Path.home() / '.config' / 'google-chrome' / 'NativeMessagingHosts'
    manifest_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = manifest_dir / 'com.cursor.account_manager.json'
    manifest_path.write_text(json.dumps(manifest, indent=2))

    print(f"✅ Installed for Linux")
    print(f"📄 Manifest: {manifest_path}")

if __name__ == '__main__':
    install()
```

---

## 🔌 Extension Integration (Minimal)

### Native Messaging Client (services/native-client.js)

```javascript
/**
 * Native messaging client
 * Simple JSON-RPC wrapper
 */

class NativeClient {
  constructor() {
    this.port = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.connected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.port = chrome.runtime.connectNative("com.cursor.account_manager");

        this.port.onMessage.addListener((msg) => {
          this.handleResponse(msg);
        });

        this.port.onDisconnect.addListener(() => {
          this.connected = false;
          console.log("Native host disconnected");

          // Reject all pending requests
          for (const [id, pending] of this.pendingRequests) {
            pending.reject(new Error("Native host disconnected"));
          }
          this.pendingRequests.clear();
        });

        this.connected = true;
        console.log("✅ Connected to native host");
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async call(method, params = {}) {
    if (!this.connected) {
      throw new Error("Not connected to native host");
    }

    const id = ++this.requestId;

    return new Promise((resolve, reject) => {
      // Store pending request
      this.pendingRequests.set(id, { resolve, reject });

      // Send request
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
    if (!pending) {
      console.warn("Received response for unknown request:", id);
      return;
    }

    this.pendingRequests.delete(id);

    if (error) {
      pending.reject(new Error(error.message));
    } else {
      pending.resolve(result.data);
    }
  }

  // Account methods
  async getAccounts() {
    return this.call("accounts.getAll");
  }

  async getAccount(id) {
    return this.call("accounts.getById", { id });
  }

  async createAccount(data) {
    return this.call("accounts.create", data);
  }

  async updateAccount(id, updates) {
    return this.call("accounts.update", { id, updates });
  }

  async deleteAccount(id) {
    return this.call("accounts.delete", { id });
  }

  async setActiveAccount(id) {
    return this.call("accounts.setActive", { id });
  }

  async searchAccounts(query) {
    return this.call("accounts.search", { query });
  }

  // Card methods
  async getCards() {
    return this.call("cards.getAll");
  }

  async createCard(data) {
    return this.call("cards.create", data);
  }

  async deleteCard(id) {
    return this.call("cards.delete", { id });
  }

  // System methods
  async healthCheck() {
    return this.call("system.health");
  }

  async getStats() {
    return this.call("system.stats");
  }
}

// Export singleton
export const nativeClient = new NativeClient();
export default NativeClient;
```

---

## 📅 Simplified Timeline: 6 Weeks

### Week 1: Python Backend Core

- Day 1-2: Database setup (database.py)
- Day 3-4: Account service (account_service.py)
- Day 5: Card service (card_service.py)

### Week 2: Native Messaging

- Day 1-3: Native host (native_host.py)
- Day 4-5: Testing native messaging

### Week 3: Extension Integration

- Day 1-2: Native client (native-client.js)
- Day 3-5: Update UI to use native client

### Week 4: CLI Tool

- Day 1-3: CLI tool (cli.py)
- Day 4-5: Testing & polish

### Week 5: Installer & Distribution

- Day 1-2: Installer script (install.py)
- Day 3-5: Multi-platform testing

### Week 6: Testing & Release

- Day 1-3: End-to-end testing
- Day 4-5: Documentation & release

---

## 🎯 Success Metrics (Simplified)

### Performance:

- ✅ Operation latency: < 100ms (P95)
- ✅ Startup time: < 200ms
- ✅ Memory usage: < 30MB (no encryption overhead)

### Functionality:

- ✅ CRUD operations work
- ✅ CLI tool functional
- ✅ Cross-platform (Windows/Mac/Linux)
- ✅ Data persists across uninstall

### Code Quality:

- ✅ < 1000 lines Python code (vs 3000+ with security)
- ✅ < 500 lines JS client code
- ✅ Zero dependencies except click + rich

---

## ⚠️ What We Sacrifice (For Speed)

1. **No Data Encryption** - Database stored in plain text
2. **No Access Control** - Any process can read database file
3. **No Audit Logs** - No tracking of who changed what
4. **No Input Sanitization** - Trust extension input
5. **No Rate Limiting** - Can spam backend with requests

### Is This OK?

**YES, because:**

- Data is local-only (not exposed to network)
- Extension runs in user's browser (trusted environment)
- Database file is in user's private folder
- Python backend only accessible to extension (native messaging)

**Trade-off:** Simplicity + Speed > Security

---

## 📦 What User Gets

1. **Simple Installation:**

   ```bash
   python install.py
   # Enter extension ID
   # Done!
   ```

2. **CLI Access:**

   ```bash
   python cli.py list
   python cli.py add "Account1" "test@example.com"
   python cli.py activate 1
   ```

3. **Data Persistence:**

   - Database file: `%APPDATA%/CursorManager/accounts.db`
   - Can backup/restore manually
   - Survives extension uninstall

4. **Fast Performance:**
   - No encryption overhead
   - Direct SQLite access
   - Minimal dependencies

---

**Prepared By:** AI Architect  
**Date:** Oktober 2025  
**Status:** Implementation Ready (Simplified)  
**Timeline:** 6 weeks  
**Approach:** Native Messaging WITHOUT security features  
**Philosophy:** Keep It Simple, Ship Fast 🚀

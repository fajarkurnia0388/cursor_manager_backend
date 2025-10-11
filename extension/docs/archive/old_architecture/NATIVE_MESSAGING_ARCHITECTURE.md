# 🏗️ Arsitektur Native Messaging + Python Backend

**Tanggal:** Oktober 2025  
**Status:** Proposal Implementasi  
**Tujuan:** Persistent data storage dengan kemampuan edit langsung

---

## 📋 Executive Summary

### Masalah yang Diselesaikan:

1. ✅ Data hilang saat extension dihapus
2. ✅ Tidak bisa edit data secara leluasa
3. ✅ Terbatas pada browser storage API
4. ✅ Sulit untuk backup/migration/testing

### Solusi:

Pisahkan **UI Layer (Extension)** dari **Data Layer (Python Backend)** menggunakan Chrome Native Messaging API.

---

## 🎯 Arsitektur Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CHROME BROWSER                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Cursor Manager Extension (UI Layer)                 │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │  • Sidepanel UI (React/Vanilla JS)                   │  │
│  │  • Auto-fill content scripts                         │  │
│  │  • Cookie injection logic                            │  │
│  │  • Bypass testing UI                                 │  │
│  │  • Native messaging client                           │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │ Chrome Native Messaging API               │
│                 │ (JSON-RPC over stdio)                     │
└─────────────────┼───────────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────────┐
│              LOCAL SYSTEM (Python Backend)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Cursor Manager Backend Service                      │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │                                                       │  │
│  │  ┌─────────────────┐  ┌─────────────────┐          │  │
│  │  │  Native Host    │  │   HTTP Server   │          │  │
│  │  │  (stdio comms)  │  │  (optional API) │          │  │
│  │  └────────┬────────┘  └────────┬────────┘          │  │
│  │           │                     │                    │  │
│  │           └──────────┬──────────┘                    │  │
│  │                      │                               │  │
│  │           ┌──────────┴──────────┐                   │  │
│  │           │   Core Service      │                   │  │
│  │           │   • Account CRUD    │                   │  │
│  │           │   • Card CRUD       │                   │  │
│  │           │   • Cookie manager  │                   │  │
│  │           │   • Backup/Restore  │                   │  │
│  │           └──────────┬──────────┘                   │  │
│  │                      │                               │  │
│  │           ┌──────────┴──────────┐                   │  │
│  │           │   SQLite Database   │                   │  │
│  │           │   • accounts.db     │                   │  │
│  │           │   • cards.db        │                   │  │
│  │           │   • logs.db         │                   │  │
│  │           └─────────────────────┘                   │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Storage: %APPDATA%/CursorAccountManager/                  │
│           or ~/.cursor-manager/                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 Native Messaging Protocol

### 1. Connection Flow

```javascript
// Extension side (manifest.json)
{
  "permissions": ["nativeMessaging"],
  "nativeMessaging": {
    "allowed_origins": ["chrome-extension://[EXTENSION_ID]/"]
  }
}

// Extension connection
const port = chrome.runtime.connectNative('com.cursor.account_manager');

port.onMessage.addListener((response) => {
  console.log('Received:', response);
});

port.postMessage({ action: 'getAccounts' });
```

### 2. Message Format (JSON-RPC 2.0 Style)

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": "uuid-v4",
  "method": "accounts.getAll",
  "params": {
    "filter": "active",
    "includeExpired": false
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": "uuid-v4",
  "result": {
    "success": true,
    "data": [
      {
        "id": 1,
        "name": "account1",
        "email": "test@example.com",
        "cookies": [...],
        "status": "active"
      }
    ]
  }
}
```

**Error:**

```json
{
  "jsonrpc": "2.0",
  "id": "uuid-v4",
  "error": {
    "code": -32600,
    "message": "Invalid request",
    "data": { "details": "..." }
  }
}
```

### 3. API Methods

#### Account Management

- `accounts.getAll()` - Get all accounts
- `accounts.getById(id)` - Get specific account
- `accounts.create(data)` - Create new account
- `accounts.update(id, data)` - Update account
- `accounts.delete(id)` - Delete account
- `accounts.setActive(id)` - Set active account
- `accounts.search(query)` - Search accounts

#### Payment Cards

- `cards.getAll()` - Get all cards
- `cards.getById(id)` - Get specific card
- `cards.create(data)` - Create new card
- `cards.update(id, data)` - Update card
- `cards.delete(id)` - Delete card

#### Backup & Restore

- `backup.create()` - Create backup
- `backup.restore(path)` - Restore from backup
- `backup.export(format)` - Export to JSON/CSV
- `backup.import(path)` - Import from file

#### System

- `system.health()` - Health check
- `system.version()` - Get version
- `system.stats()` - Get statistics

---

## 🐍 Python Backend Architecture

### Project Structure

```
cursor-manager-backend/
├── src/
│   ├── __init__.py
│   ├── main.py              # Entry point
│   ├── native_host.py       # Native messaging handler
│   ├── api_server.py        # Optional HTTP API
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── database.py      # SQLite connection manager
│   │   ├── models.py        # Data models (Account, Card)
│   │   └── config.py        # Configuration
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── account_service.py
│   │   ├── card_service.py
│   │   ├── backup_service.py
│   │   └── cookie_service.py
│   │
│   ├── handlers/
│   │   ├── __init__.py
│   │   ├── account_handler.py
│   │   ├── card_handler.py
│   │   └── system_handler.py
│   │
│   └── utils/
│       ├── __init__.py
│       ├── crypto.py        # Encryption utilities
│       ├── validation.py    # Input validation
│       └── logger.py        # Logging
│
├── cli/
│   ├── __init__.py
│   └── manager.py           # CLI tool
│
├── tests/
│   ├── test_accounts.py
│   ├── test_cards.py
│   └── test_native_host.py
│
├── database/
│   └── schemas/
│       ├── accounts.sql
│       └── cards.sql
│
├── installer/
│   ├── install.py           # Installation script
│   ├── uninstall.py
│   └── native_host_manifest.json
│
├── requirements.txt
├── setup.py
├── pyproject.toml
└── README.md
```

### Core Dependencies

```txt
# requirements.txt
# Core
pydantic>=2.0.0          # Data validation
sqlalchemy>=2.0.0        # Database ORM
aiosqlite>=0.19.0        # Async SQLite
cryptography>=41.0.0     # Encryption

# Optional HTTP API
fastapi>=0.104.0
uvicorn>=0.24.0

# CLI
click>=8.1.0
rich>=13.0.0             # Pretty CLI output

# Testing
pytest>=7.4.0
pytest-asyncio>=0.21.0

# Utils
python-dotenv>=1.0.0
```

### Database Schema

```sql
-- accounts.sql
CREATE TABLE accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    avatar_url TEXT,
    is_active INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cookies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    domain TEXT NOT NULL,
    path TEXT DEFAULT '/',
    expires_at TIMESTAMP,
    http_only INTEGER DEFAULT 0,
    secure INTEGER DEFAULT 0,
    same_site TEXT DEFAULT 'no_restriction',
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX idx_account_name ON accounts(name);
CREATE INDEX idx_account_status ON accounts(status);
CREATE INDEX idx_cookie_account ON cookies(account_id);

-- cards.sql
CREATE TABLE payment_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_number TEXT NOT NULL,
    card_holder TEXT NOT NULL,
    expiry_month TEXT NOT NULL,
    expiry_year TEXT NOT NULL,
    cvc TEXT NOT NULL,
    card_type TEXT DEFAULT 'credit',
    nickname TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_card_active ON payment_cards(is_active);
```

---

## 💻 Implementation Details

### 1. Native Host Setup

**Windows:** `com.cursor.account_manager.json`

```json
{
  "name": "com.cursor.account_manager",
  "description": "Cursor Account Manager Native Host",
  "path": "C:\\Program Files\\CursorManager\\backend.exe",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://[EXTENSION_ID]/"]
}
```

**Location:**

- Windows: `HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.cursor.account_manager`
- macOS: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.cursor.account_manager.json`
- Linux: `~/.config/google-chrome/NativeMessagingHosts/com.cursor.account_manager.json`

### 2. Python Native Host Implementation

```python
# src/native_host.py
import sys
import json
import struct
import asyncio
from typing import Dict, Any
from handlers import AccountHandler, CardHandler, SystemHandler

class NativeHost:
    def __init__(self):
        self.handlers = {
            'accounts': AccountHandler(),
            'cards': CardHandler(),
            'system': SystemHandler(),
            'backup': BackupHandler()
        }

    async def read_message(self) -> Dict[str, Any]:
        """Read message from stdin (Chrome Native Messaging format)"""
        # Read message length (4 bytes)
        text_length_bytes = sys.stdin.buffer.read(4)
        if len(text_length_bytes) == 0:
            return None

        # Unpack message length
        text_length = struct.unpack('I', text_length_bytes)[0]

        # Read message text
        text = sys.stdin.buffer.read(text_length).decode('utf-8')
        return json.loads(text)

    def send_message(self, message: Dict[str, Any]):
        """Send message to stdout (Chrome Native Messaging format)"""
        encoded_message = json.dumps(message).encode('utf-8')
        encoded_length = struct.pack('I', len(encoded_message))

        sys.stdout.buffer.write(encoded_length)
        sys.stdout.buffer.write(encoded_message)
        sys.stdout.buffer.flush()

    async def handle_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Route message to appropriate handler"""
        try:
            method = message.get('method', '')
            params = message.get('params', {})
            msg_id = message.get('id')

            # Parse method (e.g., "accounts.getAll")
            namespace, action = method.split('.', 1)

            if namespace not in self.handlers:
                return {
                    'jsonrpc': '2.0',
                    'id': msg_id,
                    'error': {
                        'code': -32601,
                        'message': f'Unknown namespace: {namespace}'
                    }
                }

            # Call handler
            handler = self.handlers[namespace]
            result = await handler.handle(action, params)

            return {
                'jsonrpc': '2.0',
                'id': msg_id,
                'result': result
            }

        except Exception as e:
            return {
                'jsonrpc': '2.0',
                'id': message.get('id'),
                'error': {
                    'code': -32603,
                    'message': str(e)
                }
            }

    async def run(self):
        """Main event loop"""
        while True:
            try:
                message = await self.read_message()
                if message is None:
                    break

                response = await self.handle_message(message)
                self.send_message(response)

            except Exception as e:
                # Log error and continue
                error_response = {
                    'jsonrpc': '2.0',
                    'error': {
                        'code': -32700,
                        'message': f'Parse error: {str(e)}'
                    }
                }
                self.send_message(error_response)

# Entry point
if __name__ == '__main__':
    host = NativeHost()
    asyncio.run(host.run())
```

### 3. Account Service Example

```python
# src/services/account_service.py
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from core.models import Account, Cookie
from core.database import get_db

class AccountService:
    async def get_all(
        self,
        filter_status: Optional[str] = None,
        include_expired: bool = True
    ) -> List[Account]:
        """Get all accounts with optional filtering"""
        async with get_db() as session:
            query = session.query(Account)

            if filter_status:
                query = query.filter(Account.status == filter_status)

            accounts = await query.all()

            # Load cookies for each account
            for account in accounts:
                await account.awaitable_attrs.cookies

            return accounts

    async def create(self, data: dict) -> Account:
        """Create new account"""
        async with get_db() as session:
            account = Account(
                name=data['name'],
                email=data['email'],
                status=data.get('status', 'active'),
                avatar_url=data.get('avatarUrl')
            )

            # Add cookies
            for cookie_data in data.get('cookies', []):
                cookie = Cookie(**cookie_data)
                account.cookies.append(cookie)

            session.add(account)
            await session.commit()
            await session.refresh(account)

            return account

    async def update(self, account_id: int, data: dict) -> Account:
        """Update account"""
        async with get_db() as session:
            account = await session.get(Account, account_id)
            if not account:
                raise ValueError(f'Account {account_id} not found')

            # Update fields
            for key, value in data.items():
                if hasattr(account, key):
                    setattr(account, key, value)

            await session.commit()
            await session.refresh(account)

            return account

    async def delete(self, account_id: int) -> bool:
        """Delete account"""
        async with get_db() as session:
            account = await session.get(Account, account_id)
            if not account:
                return False

            await session.delete(account)
            await session.commit()

            return True

    async def set_active(self, account_id: int) -> Account:
        """Set account as active"""
        async with get_db() as session:
            # Deactivate all accounts
            await session.execute(
                "UPDATE accounts SET is_active = 0"
            )

            # Activate target account
            account = await session.get(Account, account_id)
            if not account:
                raise ValueError(f'Account {account_id} not found')

            account.is_active = True
            await session.commit()
            await session.refresh(account)

            return account
```

### 4. CLI Tool

```python
# cli/manager.py
import click
import asyncio
from rich.console import Console
from rich.table import Table
from services.account_service import AccountService

console = Console()
account_service = AccountService()

@click.group()
def cli():
    """Cursor Account Manager CLI"""
    pass

@cli.command()
def list_accounts():
    """List all accounts"""
    async def _list():
        accounts = await account_service.get_all()

        table = Table(title="Accounts")
        table.add_column("ID", style="cyan")
        table.add_column("Name", style="green")
        table.add_column("Email", style="yellow")
        table.add_column("Status", style="magenta")
        table.add_column("Active", style="red")

        for acc in accounts:
            table.add_row(
                str(acc.id),
                acc.name,
                acc.email,
                acc.status,
                "✓" if acc.is_active else ""
            )

        console.print(table)

    asyncio.run(_list())

@cli.command()
@click.argument('name')
@click.argument('email')
def add_account(name: str, email: str):
    """Add new account"""
    async def _add():
        account = await account_service.create({
            'name': name,
            'email': email,
            'status': 'active'
        })
        console.print(f"[green]✓[/green] Account '{name}' created (ID: {account.id})")

    asyncio.run(_add())

@cli.command()
@click.argument('account_id', type=int)
def delete_account(account_id: int):
    """Delete account"""
    async def _delete():
        success = await account_service.delete(account_id)
        if success:
            console.print(f"[green]✓[/green] Account {account_id} deleted")
        else:
            console.print(f"[red]✗[/red] Account {account_id} not found")

    asyncio.run(_delete())

@cli.command()
@click.argument('account_id', type=int)
def activate(account_id: int):
    """Set account as active"""
    async def _activate():
        account = await account_service.set_active(account_id)
        console.print(f"[green]✓[/green] Account '{account.name}' is now active")

    asyncio.run(_activate())

if __name__ == '__main__':
    cli()
```

---

## 📦 Installation & Distribution

### 1. Installer Script

```python
# installer/install.py
import os
import sys
import json
import shutil
import winreg  # Windows only
from pathlib import Path

class Installer:
    def __init__(self):
        self.extension_id = "YOUR_EXTENSION_ID"
        self.app_name = "CursorAccountManager"

        if sys.platform == 'win32':
            self.install_dir = Path(os.environ['PROGRAMFILES']) / self.app_name
            self.data_dir = Path(os.environ['APPDATA']) / self.app_name
        elif sys.platform == 'darwin':
            self.install_dir = Path.home() / 'Applications' / self.app_name
            self.data_dir = Path.home() / 'Library' / 'Application Support' / self.app_name
        else:  # Linux
            self.install_dir = Path.home() / '.local' / 'share' / self.app_name
            self.data_dir = Path.home() / '.config' / self.app_name

    def install(self):
        """Install backend and register native host"""
        print(f"Installing {self.app_name}...")

        # Create directories
        self.install_dir.mkdir(parents=True, exist_ok=True)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # Copy files
        self.copy_files()

        # Register native host
        self.register_native_host()

        # Create database
        self.init_database()

        print(f"✓ Installation complete!")
        print(f"  Install dir: {self.install_dir}")
        print(f"  Data dir: {self.data_dir}")

    def copy_files(self):
        """Copy backend files to install directory"""
        # Copy Python files
        shutil.copytree('src', self.install_dir / 'src')
        shutil.copy('requirements.txt', self.install_dir)

        # Create executable launcher
        if sys.platform == 'win32':
            self.create_windows_launcher()
        else:
            self.create_unix_launcher()

    def create_windows_launcher(self):
        """Create Windows launcher script"""
        launcher = self.install_dir / 'backend.bat'
        launcher.write_text(f'''@echo off
cd /d "{self.install_dir}"
python -m src.main
''')

    def register_native_host(self):
        """Register native messaging host with Chrome"""
        manifest = {
            "name": "com.cursor.account_manager",
            "description": "Cursor Account Manager Native Host",
            "path": str(self.install_dir / 'backend.bat'),
            "type": "stdio",
            "allowed_origins": [
                f"chrome-extension://{self.extension_id}/"
            ]
        }

        if sys.platform == 'win32':
            # Windows registry
            manifest_path = self.install_dir / 'native_host_manifest.json'
            manifest_path.write_text(json.dumps(manifest, indent=2))

            key_path = r'Software\Google\Chrome\NativeMessagingHosts\com.cursor.account_manager'
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path) as key:
                winreg.SetValueEx(key, '', 0, winreg.REG_SZ, str(manifest_path))

        elif sys.platform == 'darwin':
            # macOS
            manifest_dir = Path.home() / 'Library/Application Support/Google/Chrome/NativeMessagingHosts'
            manifest_dir.mkdir(parents=True, exist_ok=True)
            manifest_path = manifest_dir / 'com.cursor.account_manager.json'
            manifest_path.write_text(json.dumps(manifest, indent=2))

        else:
            # Linux
            manifest_dir = Path.home() / '.config/google-chrome/NativeMessagingHosts'
            manifest_dir.mkdir(parents=True, exist_ok=True)
            manifest_path = manifest_dir / 'com.cursor.account_manager.json'
            manifest_path.write_text(json.dumps(manifest, indent=2))

    def init_database(self):
        """Initialize SQLite database"""
        # Run database migration
        import asyncio
        from src.core.database import init_db

        asyncio.run(init_db())

if __name__ == '__main__':
    installer = Installer()
    installer.install()
```

### 2. Distribution Package

**Option A: Python Installer**

```bash
# User downloads installer.exe / installer.py
python installer.py install
```

**Option B: Auto-install dari Extension**

```javascript
// Extension detects missing native host
async function checkNativeHost() {
  try {
    const port = chrome.runtime.connectNative("com.cursor.account_manager");
    // Native host exists
  } catch (e) {
    // Show install button
    showInstallPrompt();
  }
}

async function downloadAndInstall() {
  // Download installer from GitHub release
  const response = await fetch("https://github.com/.../installer.py");
  const blob = await response.blob();

  // Trigger download
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({
    url: url,
    filename: "cursor_manager_installer.py",
    saveAs: true,
  });

  // Show instructions
  showInstructions("Run: python cursor_manager_installer.py");
}
```

---

## 🔄 Migration Strategy

### Phase 1: Dual Mode (2 minggu)

```
Extension mendukung DUA mode:
1. Legacy mode: Chrome Storage (existing)
2. Native mode: Python Backend (new)

User bisa switch between modes.
```

**Implementation:**

```javascript
// services/storage-adapter.js
class StorageAdapter {
  constructor() {
    this.mode = "chrome"; // or 'native'
    this.backends = {
      chrome: new ChromeStorageBackend(),
      native: new NativeMessagingBackend(),
    };
  }

  async getAccounts() {
    return this.backends[this.mode].getAccounts();
  }

  async switchMode(newMode) {
    // Migrate data
    await this.migrateData(this.mode, newMode);
    this.mode = newMode;
  }
}
```

### Phase 2: Python Backend Only (1 minggu)

```
- Remove Chrome Storage code
- Native messaging becomes primary
- Simplify extension code
```

### Phase 3: Cleanup (1 minggu)

```
- Remove legacy code
- Update documentation
- Release v2.0.0
```

---

## ⚡ Performance Considerations

### 1. Latency

**Chrome Storage:** ~5ms per operation (in-memory)
**Native Messaging:** ~20-50ms per operation (IPC + SQLite)

**Mitigation:**

- Cache frequently accessed data in extension
- Batch operations when possible
- Use async/await properly

### 2. Memory

**Chrome Storage:** Limited to 10MB (local storage)
**Native Messaging:** Unlimited (disk-based)

**Advantage:** Can store much more data (unlimited accounts)

### 3. Startup Time

**Before:** Extension loads immediately
**After:** Extension + backend process (~100ms overhead)

**Mitigation:**

- Keep backend process running in background
- Lazy start on first use

---

## 🔒 Security

### 1. Data Encryption

```python
# Encrypt sensitive data at rest
from cryptography.fernet import Fernet

class CryptoService:
    def __init__(self, key: bytes):
        self.cipher = Fernet(key)

    def encrypt(self, data: str) -> str:
        return self.cipher.encrypt(data.encode()).decode()

    def decrypt(self, encrypted: str) -> str:
        return self.cipher.decrypt(encrypted.encode()).decode()

# Usage
# Encrypt cookies, card numbers before storing
account.cookies = [crypto.encrypt(cookie) for cookie in cookies]
```

### 2. Access Control

- Only authorized extension can connect (via allowed_origins)
- No network exposure (stdio only)
- Optional password protection for database

### 3. Audit Logging

```python
# Log all operations
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    user TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT
);
```

---

## 🧪 Testing Strategy

### 1. Unit Tests

```python
# tests/test_account_service.py
import pytest
from services.account_service import AccountService

@pytest.mark.asyncio
async def test_create_account():
    service = AccountService()
    account = await service.create({
        'name': 'test',
        'email': 'test@example.com'
    })

    assert account.name == 'test'
    assert account.email == 'test@example.com'
    assert account.status == 'active'

@pytest.mark.asyncio
async def test_get_all_accounts():
    service = AccountService()
    accounts = await service.get_all()

    assert len(accounts) >= 0
```

### 2. Integration Tests

```python
# tests/test_native_host.py
import asyncio
from native_host import NativeHost

@pytest.mark.asyncio
async def test_native_host_message():
    host = NativeHost()

    request = {
        'jsonrpc': '2.0',
        'id': '123',
        'method': 'accounts.getAll',
        'params': {}
    }

    response = await host.handle_message(request)

    assert response['id'] == '123'
    assert 'result' in response
```

### 3. End-to-End Tests

```javascript
// tests/e2e/test_extension.js
describe("Extension with Native Backend", () => {
  it("should connect to native host", async () => {
    const port = chrome.runtime.connectNative("com.cursor.account_manager");
    expect(port).toBeDefined();
  });

  it("should get accounts", async () => {
    const accounts = await storageAdapter.getAccounts();
    expect(Array.isArray(accounts)).toBe(true);
  });
});
```

---

## 📊 Success Metrics

### Before (Chrome Storage):

- ✅ Fast: ~5ms operations
- ❌ Limited: 10MB quota
- ❌ Volatile: Data lost on uninstall
- ❌ Browser-only: No external access

### After (Native Messaging):

- ✅ Persistent: Data survives uninstall
- ✅ Unlimited: Disk-based storage
- ✅ Flexible: Edit via CLI/scripts
- ✅ Extensible: Can add web interface
- ⚠️ Slower: ~20-50ms operations (acceptable)
- ⚠️ Complex: Requires installation

### Target Metrics:

- Operation latency: < 100ms (P95)
- Startup time: < 200ms additional
- Memory usage: < 50MB backend
- Test coverage: > 80%
- Installation success rate: > 95%

---

## 📅 Implementation Timeline

### Week 1-2: Backend Foundation

- [x] Project structure setup
- [ ] Database schema & models
- [ ] Core services (Account, Card)
- [ ] Native messaging protocol
- [ ] Basic unit tests

### Week 3-4: Extension Integration

- [ ] Storage adapter pattern
- [ ] Native messaging client
- [ ] Dual-mode support (Chrome + Native)
- [ ] Migration tools
- [ ] Integration tests

### Week 5: CLI & Tools

- [ ] CLI tool development
- [ ] Backup/restore features
- [ ] Export/import utilities
- [ ] Documentation

### Week 6: Installer & Distribution

- [ ] Installer script (Windows/Mac/Linux)
- [ ] Auto-update mechanism
- [ ] GitHub releases setup
- [ ] User guide

### Week 7-8: Testing & Polish

- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Code cleanup

### Week 9: Migration & Release

- [ ] Beta testing with select users
- [ ] Data migration from Chrome Storage
- [ ] Final testing
- [ ] v2.0.0 release

**Total Duration: ~9 weeks (2+ bulan)**

---

## 🎯 Pros & Cons

### Pros ✅

1. **Data Persistence** - Survives extension uninstall/reinstall
2. **Unlimited Storage** - No 10MB Chrome Storage limit
3. **Flexibility** - Edit data via CLI, scripts, external tools
4. **Extensibility** - Can add web dashboard, mobile app later
5. **Power User Features** - Backup automation, bulk operations
6. **Better Testing** - Backend can be tested independently
7. **Professional** - Industry-standard architecture

### Cons ❌

1. **Complexity** - More moving parts (extension + backend)
2. **Installation** - Users need to install Python backend
3. **Maintenance** - Two codebases to maintain
4. **Latency** - ~20-50ms overhead (vs ~5ms Chrome Storage)
5. **Platform-specific** - Need Windows/Mac/Linux installers
6. **Dependencies** - Python runtime requirement

### Mitigation for Cons:

- **Complexity:** Good documentation + automated installer
- **Installation:** One-click installer, clear instructions
- **Maintenance:** Shared models, automated CI/CD
- **Latency:** Caching + batch operations
- **Platform:** GitHub Actions for multi-platform builds
- **Dependencies:** Bundle Python with installer (PyInstaller)

---

## 🚀 Alternative: SQLite WASM (Simpler)

### Quick Alternative for Consideration:

```
Instead of Python backend, use SQLite WASM in extension:
- sql.js or @sqlite.org/sqlite-wasm
- Periodic export to user-selected folder (File System Access API)
- No native backend needed
- Simpler installation
```

**Comparison:**

| Feature          | Native Messaging | SQLite WASM       |
| ---------------- | ---------------- | ----------------- |
| Data persistence | ✅ Automatic     | ⚠️ Manual export  |
| Installation     | ❌ Complex       | ✅ Zero install   |
| External access  | ✅ CLI/scripts   | ❌ Extension only |
| Storage limit    | ✅ Unlimited     | ⚠️ Browser quota  |
| Latency          | ⚠️ ~20-50ms      | ✅ ~5ms           |
| Maintenance      | ❌ Two codebases | ✅ One codebase   |

**Recommendation:** SQLite WASM untuk simplicity, Native Messaging untuk power features.

---

## 💡 Recommendations

### For Small Users (<100 accounts):

**Use SQLite WASM + File System Access API**

- Simpler setup
- Good enough performance
- Manual backup control

### For Power Users (>100 accounts):

**Use Native Messaging + Python Backend**

- Professional tooling
- CLI automation
- Better for teams

### Hybrid Approach:

1. **v1.x:** SQLite WASM (current users)
2. **v2.0:** Optional Native Backend for power users
3. **v2.5:** Native-first, WASM fallback

---

## 📞 Next Steps

1. **Decision Required:**

   - Full Native Messaging implementation?
   - SQLite WASM alternative?
   - Hybrid approach?

2. **If Native Messaging approved:**

   - Start with backend foundation (Week 1-2)
   - Parallel: Keep current extension working
   - Beta release in 6 weeks

3. **Resources Needed:**
   - Python developer time: ~160 hours
   - Testing time: ~40 hours
   - Documentation: ~20 hours
   - **Total: ~220 hours (6-8 weeks)**

---

**Prepared By:** AI Architect  
**Date:** Oktober 2025  
**Status:** Proposal - Awaiting Approval  
**Estimated Effort:** 220 hours (2 months)  
**Risk Level:** Medium (new architecture)  
**Reward Level:** High (professional solution)

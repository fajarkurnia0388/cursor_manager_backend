# Cursor Manager - Python Backend

Native messaging backend untuk Cursor Manager Chrome Extension.

## Architecture

```
┌─────────────────┐
│  Chrome         │
│  Extension      │◄──── Browser-specific operations
│  (Thin Client)  │      (cookies, DOM, tabs)
└────────┬────────┘
         │ Native Messaging (JSON-RPC 2.0)
         ▼
┌────────────────────────────────────────┐
│  Python Backend (Business Logic)      │
│  ┌──────────┐  ┌──────────┐          │
│  │ Account  │  │  Cards   │          │
│  │ Service  │  │ Service  │          │
│  └──────────┘  └──────────┘          │
│  ┌──────────┐  ┌──────────┐          │
│  │ Bypass   │  │Generator │          │
│  │ Service  │  │ Service  │          │
│  └──────────┘  └──────────┘          │
│  ┌──────────┐  ┌──────────┐          │
│  │ProTrial  │  │  Export  │          │
│  │ Service  │  │  Import  │          │
│  └──────────┘  └──────────┘          │
│                                        │
│  ┌─────────────────────────────────┐  │
│  │     SQLite Database             │  │
│  └─────────────────────────────────┘  │
└────────────────────────────────────────┘
```

## Features

- **SQLite Database** - Persistent storage untuk accounts dan payment cards
- **Tagging Support** - Tambahkan label fleksibel untuk setiap akun dan kartu guna mempermudah pengelompokan.
- **Native Messaging** - Komunikasi dengan Chrome extension via JSON-RPC 2.0
- **CLI Tool** - Command line interface untuk manage data
- **Desktop GUI** - Graphical user interface untuk desktop management
- **CustomTkinter UI** - Modern dark-theme interface powered by `customtkinter`
- **Automation Scheduler** - Job terjadwal (refresh status, cleanup bypass, pruning events) berbasis APScheduler
- **Realtime Event Log** - setiap perubahan akun/kartu tercatat di tabel `sync_events` dan tersedia lewat endpoint `events.*`
- **Persisted Settings** - preferensi tema & konfigurasi scheduler disimpan di `~/.cursor_manager/settings.json`

## Requirements

- Python 3.8 atau lebih tinggi
- `customtkinter`
- `apscheduler`
- Chrome browser dengan Cursor Manager extension

## Installation

1. Jalankan installer:

```bash
python install.py
```

2. Update EXTENSION_ID di `install.py` dengan ID extension yang sebenarnya

3. Reload Chrome extension

## Usage

### Desktop GUI Application

**Launch GUI:**

```bash
# Windows
python gui.py
# or double-click run_gui.bat

# macOS/Linux
python gui.py
```

**Features:**

- Dashboard menampilkan statistik akun, kartu, bypass test, dan pro-trial
- Manajemen akun lengkap (tambah, edit, hapus, pencarian, impor & ekspor)
- Penyimpanan kartu pembayaran dengan generator kartu terintegrasi
- Automation suite: quick generator, bypass test viewer dengan histori & export, serta pro-trial manager
- Panel maintenance untuk backup, restore, health check, dan akses folder data

### CLI Commands

**Version Info:**

```bash
python cli.py version
```

**List Accounts:**

```bash
python cli.py accounts list
python cli.py accounts list --status active
```

**Show Account:**

```bash
python cli.py accounts show <id>
```

**Create Account:**

```bash
python cli.py accounts create email@example.com password123
python cli.py accounts create email@example.com password123 --cookies cookies.json
```

**Delete Account:**

```bash
python cli.py accounts delete <id>
python cli.py accounts delete <id> --permanent
```

**Import/Export:**

```bash
python cli.py accounts import accounts.json
python cli.py accounts export output.json
python cli.py accounts export output.json --status active
```

**Statistics:**

```bash
python cli.py accounts stats
```

**Cards Management:**

```bash
python cli.py cards list
python cli.py cards show <id>
python cli.py cards create "1234567890123456" "John Doe" "12/25" "123"
python cli.py cards delete <id>
```

**Backup/Restore:**

```bash
python cli.py backup
python cli.py backup --output /path/to/backup.db
python cli.py restore /path/to/backup.db
```

## Directory Structure

```
backend/
├── __init__.py              # Package info
├── database.py              # SQLite database handler
├── account_service.py       # Account CRUD operations
├── cards_service.py         # Card CRUD operations
├── native_host.py           # Native messaging host
├── cli.py                   # Command line interface
├── install.py               # Installer script
├── requirements.txt         # Dependencies
└── README.md               # This file
```

## Data Location

- **Database:** `~/cursor_manager/data.db`
- **Backups:** `~/cursor_manager/backups/`
- **Logs:** `~/cursor_manager/logs/`
- **Settings:** `~/cursor_manager/settings.json`

## API Reference

### JSON-RPC 2.0 Methods

**Accounts:**

- `accounts.getAll` - Get all accounts
- `accounts.getById` - Get account by ID
- `accounts.getByEmail` - Get account by email
- `accounts.create` - Create new account
- `accounts.update` - Update account
- `accounts.delete` - Delete account
- `accounts.search` - Search accounts
- `accounts.getStats` - Get statistics

**Cards:**

- `cards.getAll` - Get all cards
- `cards.getById` - Get card by ID
- `cards.create` - Create new card
- `cards.update` - Update card
- `cards.delete` - Delete card
- `cards.search` - Search cards
- `cards.getStats` - Get statistics

**System:**

- `system.ping` - Health check
- `system.version` - Get version info
- `system.backup` - Create backup
- `system.restore` - Restore from backup

## Troubleshooting

**Backend tidak terdeteksi:**

1. Check manifest file: `%APPDATA%\Google\Chrome\NativeMessagingHosts\com.cursor.manager.json`
2. Pastikan EXTENSION_ID sudah benar
3. Check logs: `~/cursor_manager/logs/backend.log`

**Database error:**

1. Check permissions di `~/cursor_manager/`
2. Try restore dari backup
3. Delete database dan re-initialize

## Uninstall

```bash
python install.py uninstall
```

## License

MIT License

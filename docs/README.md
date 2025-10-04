# Cursor Manager Extension - Documentation

> **Architecture:** Backend-First dengan Python Native Host

## 📋 Quick Start

1. **[Backend-First Architecture](BACKEND_FIRST_ARCHITECTURE.md)** - Complete architecture dan migration plan
2. **[Error Handling](ERROR_HANDLING.md)** - Error handling strategy
3. **[Database Migration](DATABASE_MIGRATION.md)** - Database schema migration guide
4. **[Logging Strategy](LOGGING_STRATEGY.md)** - Privacy-first logging
5. **[Backend Control](BACKEND_CONTROL.md)** - Backend process control dari extension

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Chrome Extension (UI)                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐    │
│  │  Sidepanel │  │  Background│  │  Content Script│    │
│  └──────┬─────┘  └──────┬─────┘  └────────────────┘    │
│         │                 │                              │
│         └────────┬────────┘                              │
│                  │ Native Messaging                      │
└──────────────────┼───────────────────────────────────────┘
                   │
┌──────────────────┼───────────────────────────────────────┐
│                  │ JSON-RPC 2.0                          │
│         ┌────────▼────────┐                              │
│         │  Native Host    │                              │
│         │  (Python)       │                              │
│         └────────┬────────┘                              │
│                  │                                       │
│      ┌───────────┴──────────────────────────┐          │
│      │                                        │          │
│  ┌───▼────┐  ┌──────────┐  ┌─────────────┐  │          │
│  │Database│  │ Services │  │  GUI (tkinter)│  │         │
│  │(SQLite)│  │          │  │               │  │         │
│  └────────┘  └──────────┘  └─────────────┘  │         │
│              - Accounts                       │         │
│              - Cards                          │         │
│              - Generator                      │         │
│              - Bypass                         │         │
│              - Pro Trial                      │         │
│              - Export/Import                  │         │
│                                               │         │
│            Python Backend                     │         │
└───────────────────────────────────────────────┘
```

## 📁 Repository Structure

```
cursor_manager_ext/
├── README.md, README_IN.md          # Project documentation
│
├── backend/                          # Python backend (core logic)
│   ├── __init__.py
│   ├── database.py                   # SQLite database handler
│   ├── native_host.py                # Native messaging host
│   ├── cli.py                        # CLI interface
│   ├── gui.py                        # Desktop GUI (tkinter)
│   ├── account_service.py            # Account CRUD
│   ├── cards_service.py              # Card CRUD
│   ├── card_generator.py             # Card generation (Namso Gen)
│   ├── install.py                    # Installer
│   ├── requirements.txt              # Dependencies (none currently)
│   └── README.md
│
├── services/                         # Extension services (thin client)
│   ├── backend-service.js            # Native messaging client
│   ├── backend-adapter.js            # Adapter with fallback
│   ├── backend-ui.js                 # Backend UI components
│   ├── migration-service.js          # Data migration
│   └── ... (other services)
│
├── modules/bypass/                   # Bypass testing modules
│
├── docs/                             # Documentation
│   ├── README.md                     # This file
│   ├── BACKEND_FIRST_ARCHITECTURE.md # Main architecture doc
│   ├── ERROR_HANDLING.md
│   ├── DATABASE_MIGRATION.md
│   ├── LOGGING_STRATEGY.md
│   ├── BACKEND_CONTROL.md
│   ├── INDEX.md                      # Documentation index
│   └── archive/                      # Old/deprecated docs
│
├── manifest.json                     # Extension manifest
├── sidepanel.html, sidepanel.js      # Extension UI
├── background.js                     # Extension background script
└── ... (other extension files)
```

## 🎯 Core Features

### Backend (Python)

- ✅ Account Management (CRUD)
- ✅ Payment Cards (CRUD)
- ✅ Card Generator (Namso Gen algorithm)
- ✅ SQLite Database
- ✅ Native Messaging Host
- ✅ CLI Tools
- ✅ Desktop GUI
- 🚧 Bypass Testing Service
- 🚧 Pro Trial Activation
- 🚧 Export/Import Service
- 🚧 Status Refresh Service

### Extension (Chrome)

- ✅ Native Messaging Client
- ✅ Sidepanel UI
- ✅ Background Script
- ✅ Content Scripts
- ✅ Auto-fill Functionality
- ✅ Migration Service
- 🚧 Backend Control UI
- 🚧 Connection Status Indicator

## 📚 Documentation Categories

### 🏛️ Architecture

- **[Backend-First Architecture](BACKEND_FIRST_ARCHITECTURE.md)** - Complete system design, migration plan, roadmap

### 🔧 Technical Specifications

- **[Error Handling](ERROR_HANDLING.md)** - Error categories, codes, handling strategy
- **[Database Migration](DATABASE_MIGRATION.md)** - Schema versioning, safe migrations
- **[Logging Strategy](LOGGING_STRATEGY.md)** - Privacy-first logging approach
- **[Backend Control](BACKEND_CONTROL.md)** - Process management, auto-start

### 📦 Archive

- **[archive/old_architecture/](archive/old_architecture/)** - Deprecated architecture documents
  - `NATIVE_MESSAGING_ARCHITECTURE.md`
  - `SIMPLIFIED_NATIVE_ARCHITECTURE.md`
  - `IMPLEMENTATION_GUIDE.md`
  - `IMPLEMENTATION_CHECKLIST.md`
  - `DECISION_MATRIX.md`

## 🚀 Getting Started

### Installation

1. **Install Python Backend:**

   ```bash
   cd backend
   python install.py
   ```

2. **Configure Extension ID:**

   - Run `python gui.py`
   - Go to Settings tab
   - Add your extension ID
   - Select target browsers
   - Click "Save & Apply"

3. **Load Extension:**

   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select extension directory
   - Copy extension ID

4. **Test Connection:**
   - Open extension sidepanel
   - Check connection status
   - Click "Reconnect" if needed

### Development

**Backend Development:**

```bash
cd backend
python -m backend.native_host  # Run host
python cli.py --help           # CLI tools
python gui.py                  # Desktop GUI
```

**Extension Development:**

- Edit files
- Reload extension
- Check console for errors
- Test features

## 🧪 Testing

```bash
# Backend tests
cd backend
python -m pytest tests/

# Extension tests
# Open chrome://extensions
# Click "Service Worker" to view logs
```

## 📝 Contributing

1. Read [BACKEND_FIRST_ARCHITECTURE.md](BACKEND_FIRST_ARCHITECTURE.md)
2. Check current roadmap
3. Create feature branch
4. Follow code style
5. Add tests
6. Update documentation
7. Submit PR

## 🔄 Migration from Old Architecture

If you have data from the old Chrome Storage-based version:

1. Extension will auto-detect old data
2. Click "Migrate to Backend" button
3. Confirm migration
4. Wait for completion
5. Verify data in backend
6. Old data will be backed up

## 📖 Additional Resources

- **Backend README:** `backend/README.md`
- **Extension README:** Root `README.md` and `README_IN.md`
- **Bypass Modules:** `modules/bypass/README.md`

## 🆘 Troubleshooting

### Backend Not Connecting

1. Check if `native_host.bat` exists in backend/
2. Verify extension ID in manifest
3. Check browser-specific manifest path
4. View backend logs
5. Run GUI diagnostics

### Data Not Syncing

1. Check backend is running
2. Verify connection status
3. Check browser console
4. Check backend logs
5. Try manual sync

### Import Errors

1. Validate JSON format
2. Check for duplicates
3. Review error messages
4. Check backend logs

## 📮 Contact

- **Issues:** GitHub Issues
- **Discussions:** GitHub Discussions

---

**Last Updated:** 2025-10-04  
**Version:** 2.0 (Backend-First Architecture)

# Cursor Account Manager

**Version 4.0** - Backend-First Hybrid Architecture with Python Desktop GUI

A comprehensive Chrome extension with Python backend that allows you to manage multiple Cursor accounts, auto-fill payment information, test bypass vulnerabilities, and automate pro trial renewals. Features a unified sidebar interface, desktop GUI application, and persistent SQLite storage.

[![English](https://img.shields.io/badge/English-blue.svg)](README.md) [![Bahasa Indonesia](https://img.shields.io/badge/Bahasa%20Indonesia-red.svg)](README_IN.md)

**🎉 v4.0 Highlights:**

- ✨ **One-Click Backend Installer** - Auto-generates and downloads platform-specific install scripts
- 🖥️ **Desktop Python GUI** - Standalone app with 8 feature tabs (Generator, Bypass, Pro Trial, Dashboard)
- 🚀 **50% Lighter Extension** - Removed SQLite WASM (-2MB), now uses Python backend
- ⚡ **Real-Time Connection Indicator** - Visual backend status with auto-reconnect
- 💾 **Zero Data Loss** - Persistent SQLite database survives browser crashes
- 🔄 **Offline Caching** - Chrome Storage fallback with 5-minute TTL

## 🚀 Features

### Core Features

- **👤 Multi-Account Support**: Save and manage unlimited Cursor accounts
- **🔄 One-Click Switching**: Click on any account to instantly switch
- **📋 JSON Import**: Add accounts by pasting cookies JSON from any source
- **💾 Auto Export**: All accounts saved to Downloads/cursor_accounts/ folder
- **📧 Smart Detection**: Automatically extracts email and subscription status
- **🔐 Secure Storage**: Cookies stored locally in Chrome's secure storage

### Payment Features 💳

- **💳 Payment Card Management**: Store and manage multiple payment cards locally
- **✨ Auto-Fill Checkout**: Automatically fill payment forms on e-commerce sites
- **🎯 Stripe Support**: Enhanced compatibility with Stripe payment forms
- **📂 Card Import**: Import card data from text or files
- **🔍 Field Detection**: Automatically detect payment fields on current page

### Interface Features

- **📌 Unified Sidebar**: Single sidebar interface replacing popup (Chrome 114+)
- **📑 Tab Navigation**: Switch between Accounts and Cards tabs
- **🌓 Dark/Light Mode**: Automatic theme detection with manual toggle
- **🔔 Smart Notifications**: Non-intrusive feedback for all operations
- **🐛 Debug Panel**: Advanced debugging tools (Ctrl+Shift+D)

## 🏗️ Architecture

**Version 2.0** introduces a **Backend-First Hybrid Architecture**:

```
┌─────────────────────────────────┐
│  Chrome Extension (Frontend)   │
│  - Browser operations           │
│  - Cookie management            │
│  - Form auto-fill               │
│  - UI/UX                        │
└──────────────┬──────────────────┘
               │ Native Messaging
               │ (JSON-RPC 2.0)
               ▼
┌──────────────────────────────────┐
│  Python Backend (Business Logic)│
│  ┌────────────┐  ┌────────────┐ │
│  │  Account   │  │   Cards    │ │
│  │  Service   │  │  Service   │ │
│  └────────────┘  └────────────┘ │
│  ┌────────────┐  ┌────────────┐ │
│  │  Bypass    │  │ Generator  │ │
│  │  Service   │  │  Service   │ │
│  └────────────┘  └────────────┘ │
│  ┌────────────────────────────┐ │
│  │    SQLite Database         │ │
│  └────────────────────────────┘ │
└──────────────────────────────────┘
```

**Key Benefits:**

- ✅ **Persistent Storage**: Data survives browser crashes and extension updates
- ✅ **Unlimited Storage**: No browser storage limits
- ✅ **External Access**: Manage data via Python GUI or CLI
- ✅ **Advanced Features**: Bypass testing, batch operations, pro trial management
- ✅ **Connection Indicator**: Real-time backend status in extension

**See:** [`backend/README.md`](backend/README.md) for backend documentation.

## 📋 How It Works

### Account Management

1. **Cookie Management**: Captures and stores Cursor session cookies securely
2. **Smart Detection**: Automatically extracts email and plan info from dashboard
3. **Instant Switching**: Clears current session and restores selected account cookies
4. **Auto Export**: Saves accounts to Downloads/cursor_accounts/ for backup
5. **Page Integration**: Injects account switcher into Cursor.com for quick access

### Payment Auto-Fill

1. **Form Detection**: Automatically identifies payment fields on checkout pages
2. **Smart Filling**: Simulates human typing for better form compatibility
3. **Stripe Integration**: Enhanced support for Stripe payment elements
4. **Multi-Format Support**: Handles various payment form layouts and structures

## 🛠️ Installation

### Method 1: One-Click Auto-Install (Recommended) ⚡

1. **Install Extension:**

   - Clone this repository or download the ZIP file
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the extension directory

2. **Auto-Install Backend:**
   - Open the extension sidebar (click extension icon)
   - When you see "Backend Not Installed" dialog:
     - Click **"📦 Auto Install Backend"** button
     - Script will auto-download to your Downloads folder
     - Run the downloaded script (`install_backend.bat` on Windows or `install_backend.sh` on Unix)
     - Follow the prompts (extension ID is pre-filled!)
     - Reload extension → Connected! ✅

**That's it!** The auto-installer handles everything: checks Python, navigates to folders, runs install.py, and verifies the installation.

### Method 2: Manual Installation (Traditional)

For those who prefer manual control:

1. **Install Extension** (steps above)

2. **Install Python Backend:**

   ```bash
   cd backend
   python install.py
   ```

3. **Follow Installer Prompts:**

   - Enter your extension ID (copy from extension details page)
   - Choose browsers to configure (Chrome, Edge, Brave, etc.)
   - Confirm installation

4. **Reload Extension:**
   - Go to `chrome://extensions/`
   - Click "Reload" on Cursor Manager
   - Backend should connect automatically

**Requirements:**

- Python 3.8+ installed on your system
- Chrome/Edge/Brave browser (or other Chromium-based)

**Detailed Guide:** See [`backend/INSTALLATION_GUIDE.md`](backend/INSTALLATION_GUIDE.md)

## 📖 Usage

### Getting Started

Click the extension icon to open the **unified sidebar interface**. The sidebar contains two main tabs:

- **👤 Accounts**: Manage your Cursor accounts
- **💳 Cards**: Manage payment cards and auto-fill

### Account Management

#### Adding an Account

**Method 1: Import from JSON**

1. In the sidebar, go to **Accounts** tab
2. Click "➕ Add Account"
3. Paste your Cursor cookies JSON
4. Optionally provide a custom name
5. Handle duplicates: Choose "Replace" or "Cancel" if account already exists

**Method 2: Export Current Session**

1. Log into your Cursor account in the browser
2. In the sidebar, click "💾 Export"
3. Account will be saved to Downloads/cursor_accounts/

**Method 3: Import Files**

1. Click "📁 Import Files"
2. Select one or multiple account files from Downloads/cursor_accounts/
3. Extension will import all valid accounts and skip duplicates

**Method 4: Advanced Tools**

1. Click "⚙️ Advanced Tools" (next to Import Files)
2. Use "📂 Import Folder" to import entire Downloads/cursor_accounts/ directory
3. Use "🔧 Fix Duplicates" to consolidate duplicate accounts
4. Use "🗑️ Clear All Data" to reset extension completely

#### Switching Accounts

1. In the **Accounts** tab, click on any account card
2. The page will automatically reload with the new account
3. Active account is marked with green indicator

#### Account Troubleshooting

- **File Not Found**: Extension will offer to re-export if backup file is missing
- **Switch Failure**: Clear browser data if switching fails due to cookie conflicts
- **Duplicates**: Extension prevents duplicate imports and offers replacement option

### Payment Card Management NEW! 💳

#### Adding Payment Cards

**Method 1: Manual Import**

1. Switch to **💳 Cards** tab
2. Click "➕ Import Cards"
3. Paste card data in format: `number|MM/YY|CVC` (one per line)
4. Choose "Replace existing cards" or merge with existing

**Method 2: File Import**

1. Prepare card data in `.md` or `.txt` files
2. Click "➕ Import Cards" and select files
3. Extension will parse and import card data automatically

#### Using Auto-Fill

1. Navigate to any checkout page (e.g., Stripe, e-commerce sites)
2. Click "🔍 Find Fields" to detect payment form
3. Click "✨" button next to any card to auto-fill the form
4. Extension will simulate human typing for better compatibility

#### Managing Cards

- **View Cards**: See all saved cards with masked numbers
- **Remove Cards**: Click "🗑️" button on individual cards
- **Clear All**: Use "🗑️ Clear All" to remove all payment data
- **Field Detection**: Automatic detection of Stripe and generic payment forms

### Debug Features 🐛

Press **Ctrl+Shift+D** to enable debug panel:

- **📄 Show Data**: View all stored extension data
- **🔧 Fix Duplicates**: Advanced duplicate consolidation
- **🗑️ Clear All**: Complete extension reset

### Private Window Support

Extension now works in private/incognito windows with proper data isolation.

## 🎯 Key Features Overview

### Account Management Features

- **Visual Design**: Clean, modern UI with account cards showing email and status
- **Color-Coded Status**: Free (blue), Pro (purple), Business (green)
- **Active Indicator**: Green dot (🟢) shows currently active account
- **Click to Switch**: Simply click any account card to switch instantly
- **Auto Backup**: All accounts automatically saved to Downloads/cursor_accounts/
- **Enhanced Duplicate Detection**: Smart duplicate handling with replace/cancel options
- **Dashboard Redirect**: Automatically redirects to cursor.com/dashboard after switching
- **Switch Failure Detection**: Warns when account switching fails due to cookie conflicts
- **Browser Data Cleaner**: One-click access to browser's clear data settings (supports Chrome, Edge, Brave, Opera)
- **Unified Sidebar**: Streamlined single-interface design (no more popup)
- **Folder Import**: Import entire Downloads/cursor_accounts/ folder at once
- **File Reveal**: Show account files in Windows Explorer with 📁 button (auto-export if missing)
- **Smart Deletion**: Option to delete account only or include backup files in Downloads folder
- **File Management**: Automatic cleanup of duplicate backup files during consolidation
- **Private Window Support**: Full functionality in incognito mode with data isolation

### Payment Management Features NEW!

- **Card Storage**: Securely store multiple payment cards locally
- **Auto-Fill Engine**: Advanced form filling with human-like typing simulation
- **Stripe Integration**: Enhanced compatibility with Stripe Elements
- **Generic Form Support**: Works with most e-commerce checkout forms
- **Field Detection**: Automatically identify card number, expiry, and CVC fields
- **Card Type Detection**: Automatically identifies Visa, MasterCard, etc.
- **Masked Display**: Secure card number display (\***\*-\*\***-\*\*\*\*-1234)
- **File Import**: Import card data from .md/.txt files
- **Bulk Management**: Import multiple cards at once
- **Form Feedback**: Real-time detection of payment fields on current page

### Interface Improvements

- **Tab Navigation**: Clean separation between Accounts and Cards
- **Unified Sidebar**: Single interface replacing dual popup/sidebar system
- **Advanced Tools**: Consolidated advanced features in one place
- **Debug Panel**: Developer tools for troubleshooting (Ctrl+Shift+D)
- **Enhanced Error Handling**: Better user feedback and error recovery
- **Responsive Design**: Optimized for sidebar use with proper scrolling

## 🔧 Technical Details

### Permissions Required

- `cookies`: To read and manage Cursor.com cookies
- `storage`: To save account and payment data locally
- `tabs`: To reload tabs after switching accounts
- `scripting` & `activeTab`: For content script functionality and auto-fill
- `downloads`: To save accounts to Downloads folder
- `sidePanel`: For unified sidebar interface (Chrome 114+)
- Host permissions for all URLs (for cookie management and form auto-fill)

### Data Storage

**Account Data:**

- Accounts stored in Chrome's local storage (`cursor_accounts` key)
- Each account includes:
  - Email address
  - Subscription status (Free/Pro/Business)
  - Session cookies
  - Auto-generated or custom name
- Automatic backup to Downloads/cursor_accounts/

**Payment Data:**

- Payment cards stored locally (`cursor_payment_cards` key)
- Each card includes:
  - Masked card number
  - Expiry date (MM/YY format)
  - CVC code
  - Card type (Visa, MasterCard, etc.)
  - Unique card ID
- No sensitive data sent to external servers

### Data Storage

- **Local Storage**: All data stored locally in Chrome's storage
- **Domain Isolation**: Cookies only accessed for cursor.com domain
- **No External Servers**: No data transmission to external services
- **Incognito Support**: Private window compatibility with data isolation

### Architecture

- **Unified Interface**: Single sidebar replacing popup/sidebar duality
- **Service Worker**: Background script for account and payment management
- **Content Scripts**: Injected for form detection and auto-fill functionality
- **Storage Services**: Modular account and payment data management
- **Tab Management**: Smart switching with automatic redirect handling

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🔄 Recent Updates

### v4.0 - Backend-First Architecture & One-Click Installer (October 2025)

**Breaking Changes:**

- **Removed SQLite WASM** - Extension now uses Python backend for data storage
- **Backend Required** - Full features require Python backend (Chrome Storage fallback available)

**New Features:**

- ✨ **One-Click Backend Installer** - Auto-generates platform-specific install scripts with embedded extension ID
- 🖥️ **Python Desktop GUI** - 8-tab application (Dashboard, Accounts, Cards, Generator, Bypass, Pro Trial, Settings, Statistics)
- 📦 **Card Generator** - BIN-based card generation with Luhn validation (Namso Gen algorithm)
- 🔒 **Bypass Tester** - Security vulnerability testing with result tracking
- 🎯 **Pro Trial Automation** - Automatic trial activation and renewal
- 📊 **Dashboard** - System overview with quick stats and health monitoring
- 🔄 **Real-Time Connection Indicator** - Visual backend status in extension sidebar
- 💾 **Batch Operations** - Bulk account/card creation and management
- 📤 **Export/Import** - Data export in JSON/CSV formats
- 🔍 **Status Monitoring** - System health checks and performance metrics

**Improvements:**

- 🚀 **50% Lighter Extension** - Removed SQLite WASM dependency (-2MB bundle size)
- ⚡ **-53% Code Reduction** - Extension code reduced from 1867 to 870 lines
- 🎨 **Enhanced UI** - Modern Python GUI with dark theme and professional styling
- 🌐 **Multi-Browser Support** - Manifest generation for Chrome, Edge, Brave, Chromium, Opera
- 💾 **Offline Caching** - Chrome Storage fallback with 5-minute TTL for offline operations
- 🔐 **Simplified CSP** - Removed 'wasm-unsafe-eval', cleaner security policy
- ✅ **100% Test Coverage** - 30 automated tests (20 unit + 10 integration), all passing

**Technical:**

- Python backend with JSON-RPC 2.0 over Native Messaging
- SQLite database (v2 schema with 7 tables, 8 indexes)
- CLI tool for command-line management
- Zero external dependencies (pure Python stdlib)
- Thread-safe database connection pooling

**Documentation:**

- 📚 15+ markdown files with comprehensive guides
- 📖 API Reference (600+ lines, 50 methods documented)
- 🛠️ Installation Guide (500+ lines, step-by-step)
- 📊 Project Status dashboard with metrics
- 📝 CHANGELOG with version history

**See:** [`CHANGELOG.md`](CHANGELOG.md) for complete version history.

## 🛡️ Privacy Notice

This extension operates entirely locally:

- **Zero Telemetry**: No usage data collection or tracking
- **Local Storage**: All data remains on your device
- **No Network Requests**: Extension doesn't communicate with external servers
- **Open Source**: All code is auditable and transparent

**Important**: This is a tool for personal convenience. Users are responsible for securing their own data.

## 🙏 Acknowledgments

Inspired by several excellent browser extensions:

- **[GitHub Account Switcher](https://github.com/yuezk/github-account-switcher)** - For the multi-account switching concept and UI design patterns
- **[Cookie Editor](https://github.com/Moustachauve/cookie-editor)** - For cookie management and JSON import/export functionality
- **[Bookmark Sidebar](https://github.com/Kiuryy/Bookmark_Sidebar)** - For the unified sidebar interface design and tab navigation approach

Payment form compatibility testing done with various e-commerce platforms and Stripe implementations.

---

**Disclaimer**: This extension is not affiliated with Cursor AI, Stripe, or any payment processors. Use at your own risk and responsibility. This is a convenience tool for personal use.

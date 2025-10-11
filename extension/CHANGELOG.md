# Changelog

All notable changes to Cursor Account Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2025-10-04

### Changed - Extension Refactoring (Phase 1 Complete)

#### Extension Optimization

- **Removed SQLite WASM**: Completely eliminated sql.js dependency (-2MB bundle size)
- **Backend-Only Services**: New `account-backend.js` (470 lines) and `payment-backend.js` (400 lines)
- **Code Reduction**: -53% total code (1867 → 870 lines)
- **Bundle Size**: -71% smaller (3.5MB → 1MB)
- **CSP Simplified**: Removed 'wasm-unsafe-eval', cleaner security policy

#### Offline Support

- **Chrome Storage Caching**: 5-minute cache untuk offline operations
- **Automatic Sync**: Cache auto-refresh saat backend available
- **Graceful Fallback**: Works offline dengan cached data

#### Python GUI Enhancement (Phase 2 Complete)

- **4 New Tabs**: Generator, Bypass Testing, Pro Trial, Dashboard
- **Dashboard Tab**: System overview, quick stats, service status monitoring
- **Generator Tab**: BIN-based card generation, bulk operations, export
- **Bypass Tab**: Test suite loader, results viewer, statistics
- **Pro Trial Tab**: Activation preparation, status checking, renewal, history

#### Backend Services

- **All 6 Services Operational**: bypass, pro_trial, export, import, status, batch
- **40+ JSON-RPC Methods**: Complete API coverage
- **100% Test Pass Rate**: 30/30 tests passing

### Added

- **CHANGELOG.md**: Professional version tracking
- **API Reference**: 600+ lines documenting all methods
- **Installation Guide**: 500+ lines step-by-step
- **Connection Indicator**: Real-time backend status in extension
- **Auto-Install Feature**: One-click backend installer dengan script generator
  - Downloads platform-specific install script (Windows .bat / Unix .sh)
  - Automatic extension ID injection
  - Step-by-step guided installation
  - Retry connection button dengan progress tracking
  - Copy extension ID button untuk easy setup

### Technical

- **Version**: Bumped to 4.0.0 (major architecture change)
- **Zero External Dependencies**: Pure stdlib
- **Thread-Safe**: Database connection pooling
- **Multi-Browser**: 5 browsers supported

---

## [2.0.0] - 2025-10-04

### Added - Backend-First Hybrid Architecture

#### Backend Infrastructure

- **Python Backend** dengan Native Messaging JSON-RPC 2.0
- **6 New Services**: bypass_service, pro_trial_service, export_service, import_service, status_service, batch_service
- **Card Generator**: Namso Gen algorithm dengan Luhn validation
- **Database Schema v2**: 7 tables (accounts, cards, bypass_tests, bypass_results, pro_trials, batch_operations, \_metadata)
- **CLI Tool**: Command-line interface untuk management
- **Desktop GUI**: tkinter application dengan 7 tabs (Accounts, Cards, Generator, Bypass Testing, Pro Trial, Statistics, Settings)
- **Test Suite**: 30 tests (20 unit + 10 integration) dengan 100% pass rate

#### Extension Features

- **Backend Connection**: Native messaging integration dengan JSON-RPC 2.0
- **Connection Indicator**: Real-time backend status monitoring
- **Backend Adapter**: Compatibility layer dengan fallback ke SQLite WASM
- **Migration Service**: Automated data migration dari Chrome Storage ke backend

#### Documentation

- **Architecture Docs**: HYBRID_ARCHITECTURE.md, BACKEND_FIRST_ARCHITECTURE.md
- **API Reference**: 600+ lines documenting all 40+ JSON-RPC methods
- **Installation Guide**: 500+ lines step-by-step setup
- **Enhancement Roadmap**: Future development planning
- **ERROR_HANDLING.md**: Error categorization & handling
- **DATABASE_MIGRATION.md**: Schema versioning strategy
- **LOGGING_STRATEGY.md**: Privacy-first logging approach

#### Multi-Browser Support

- **Manifest Generation**: Chrome, Edge, Brave, Chromium, Opera
- **Extension ID Management**: Multiple extension IDs support

### Changed

- **Architecture**: Migrated dari SQLite WASM-only ke Backend-First Hybrid
- **Storage**: Data sekarang persistent di SQLite backend (tidak hilang saat extension uninstall)
- **Performance**: Unlimited storage, tidak ada browser storage limits

### Technical Details

- **Zero External Dependencies**: Backend hanya gunakan Python stdlib
- **Thread-Safe**: Database dengan connection pooling
- **Production-Ready**: 100% test coverage

---

## [1.0.0] - 2024 (Previous Version)

### Features

- Multi-account management
- Cookie-based account switching
- Payment card storage
- Auto-fill functionality
- SQLite WASM untuk local storage
- Chrome Storage fallback

### Known Issues

- Data loss saat extension uninstall
- Browser storage limits (10MB)
- No external access ke data
- Complex SQLite WASM setup

---

## Upgrade Guide

### From v1.0 to v2.0

**Recommended**: Fresh install untuk clean migration

1. **Backup Data (Optional)**

   ```bash
   # Export accounts dari v1.0
   # Use extension export feature
   ```

2. **Install Backend**

   ```bash
   cd backend
   python install.py
   ```

3. **Update Extension**

   - Reload extension di Chrome
   - Backend akan auto-connect

4. **Verify**
   - Check connection indicator (green = connected)
   - Test account operations

**Migration**: Data akan di-migrate otomatis saat pertama kali connect ke backend.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/yourrepo/cursor-manager/issues)
- **Documentation**: `docs/INDEX.md`
- **Backend Docs**: `backend/README.md`

---

## Contributors

- Development Team
- Community Contributors

---

## License

See LICENSE file for details.

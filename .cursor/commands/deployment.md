# Deployment Commands and Guidelines

## Extension Deployment

### Chrome Web Store Deployment

```bash
# Prepare extension for store
cd extension

# 1. Update version in manifest.json
# 2. Update CHANGELOG.md
# 3. Test thoroughly
# 4. Create zip package
zip -r cursor-manager-extension.zip . -x "node_modules/*" "tests/*" "*.md" ".git/*"

# Upload to Chrome Web Store Developer Dashboard
# https://chrome.google.com/webstore/devconsole/
```

### Firefox Add-ons Deployment

```bash
# Prepare for Firefox
cd extension

# 1. Update manifest.json for Firefox compatibility
# 2. Test in Firefox
# 3. Create zip package
zip -r cursor-manager-firefox.zip . -x "node_modules/*" "tests/*" "*.md" ".git/*"

# Upload to Firefox Add-ons
# https://addons.mozilla.org/developers/
```

### Edge Add-ons Deployment

```bash
# Prepare for Edge
cd extension

# 1. Update manifest.json for Edge compatibility
# 2. Test in Edge
# 3. Create zip package
zip -r cursor-manager-edge.zip . -x "node_modules/*" "tests/*" "*.md" ".git/*"

# Upload to Edge Add-ons
# https://partner.microsoft.com/dashboard/microsoftedge/
```

## Backend Deployment

### Windows Service Installation

```bash
# Install as Windows service
cd backend
python install.py --service

# Start service
net start cursor-manager-backend

# Stop service
net stop cursor-manager-backend

# Uninstall service
python install.py --uninstall-service
```

### Standalone Executable

```bash
# Create executable
cd backend
python -m PyInstaller --onefile --name cursor-manager-backend native_host.py

# Create installer
python -m PyInstaller --onefile --windowed --name cursor-manager-installer gui.py
```

### Python Package Distribution

```bash
# Build package
cd backend
python -m build

# Upload to PyPI
python -m twine upload dist/*

# Install from PyPI
pip install cursor-manager-backend
```

## Database Deployment

### Production Database Setup

```bash
# Initialize production database
cd backend
python -c "from database import init_production_database; init_production_database()"

# Set up database backup
python -c "from database import setup_backup_schedule; setup_backup_schedule()"

# Configure database security
python -c "from database import configure_security; configure_security()"
```

### Database Migration

```bash
# Run database migrations
cd backend
python -c "from migration_service import run_migrations; run_migrations()"

# Check migration status
python -c "from migration_service import check_migration_status; check_migration_status()"

# Rollback migration
python -c "from migration_service import rollback_migration; rollback_migration('migration_id')"
```

## Configuration Management

### Environment Configuration

```bash
# Create production config
cp .env.example .env.production

# Set production variables
export NODE_ENV=production
export DATABASE_URL=sqlite:///prod.db
export LOG_LEVEL=INFO

# Validate configuration
python -c "from config import validate_config; validate_config()"
```

### Security Configuration

```bash
# Generate security keys
python -c "from security_manager import generate_keys; generate_keys()"

# Configure SSL/TLS
python -c "from security_manager import configure_ssl; configure_ssl()"

# Set up authentication
python -c "from security_manager import setup_auth; setup_auth()"
```

## Monitoring and Logging

### Set Up Monitoring

```bash
# Configure logging
python -c "from logger import configure_logging; configure_logging('production')"

# Set up performance monitoring
python -c "from performance_monitor import setup_monitoring; setup_monitoring()"

# Configure alerts
python -c "from performance_monitor import setup_alerts; setup_alerts()"
```

### Health Checks

```bash
# Test system health
python -c "from status_service import check_system_health; print(check_system_health())"

# Test database connectivity
python -c "from status_service import test_database_connection; print(test_database_connection())"

# Test API endpoints
python -c "from status_service import test_api_endpoints; print(test_api_endpoints())"
```

## Backup and Recovery

### Database Backup

```bash
# Create full backup
python -c "from database import create_full_backup; create_full_backup()"

# Create incremental backup
python -c "from database import create_incremental_backup; create_incremental_backup()"

# Schedule automatic backups
python -c "from database import schedule_backups; schedule_backups()"
```

### System Recovery

```bash
# Restore from backup
python -c "from database import restore_from_backup; restore_from_backup('backup_file.db')"

# Recover from corruption
python -c "from database import recover_database; recover_database()"

# Reset to clean state
python -c "from database import reset_to_clean_state; reset_to_clean_state()"
```

## Update and Maintenance

### Extension Updates

```bash
# Check for updates
python -c "from update_service import check_for_updates; print(check_for_updates())"

# Download updates
python -c "from update_service import download_updates; download_updates()"

# Apply updates
python -c "from update_service import apply_updates; apply_updates()"
```

### Backend Updates

```bash
# Update backend
pip install --upgrade cursor-manager-backend

# Restart services
net stop cursor-manager-backend
net start cursor-manager-backend

# Verify update
python -c "from cli import get_version; print(get_version())"
```

## Troubleshooting

### Common Issues

```bash
# Check service status
sc query cursor-manager-backend

# Check logs
python -c "from logger import get_recent_logs; print(get_recent_logs())"

# Check database status
python -c "from database import get_database_status; print(get_database_status())"

# Check system resources
python -c "from performance_monitor import check_resources; print(check_resources())"
```

### Debug Mode

```bash
# Run in debug mode
python native_host.py --debug --verbose

# Enable detailed logging
python -c "from logger import set_debug_level; set_debug_level()"

# Test in isolation
python -c "from tests.test_isolation import run_isolation_tests; run_isolation_tests()"
```

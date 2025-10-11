# 🔄 Database Schema Migration Strategy

**Tanggal:** Oktober 2025  
**Status:** Design Document  
**Approach:** Simple, Forward-Compatible, Safe

---

## 🎯 Migration Philosophy

### Principles:

1. **Backward Compatible** - New schema works with old data
2. **Forward Compatible** - Old code can handle new schema (when possible)
3. **Safe** - Never lose data
4. **Automatic** - Migrations run automatically on startup
5. **Version Tracked** - Always know current schema version

---

## 📊 Schema Versioning

### Version Tracking Table

```sql
CREATE TABLE IF NOT EXISTS schema_version (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version INTEGER NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Insert initial version
INSERT OR IGNORE INTO schema_version (id, version, description)
VALUES (1, 1, 'Initial schema');
```

### Version History

| Version | Date     | Description            | Changes                                               |
| ------- | -------- | ---------------------- | ----------------------------------------------------- |
| 1       | Oct 2025 | Initial schema         | accounts, cookies (in accounts), payment_cards        |
| 2       | TBD      | Separate cookies table | Move cookies to separate table for better performance |
| 3       | TBD      | Add account groups     | New `account_groups` table                            |
| 4       | TBD      | Add audit log          | New `audit_log` table (if needed)                     |

---

## 💻 Migration Implementation

### Python: Migration Manager

```python
# src/migrations.py
"""
Database migration manager
Handles schema version upgrades automatically
"""
import logging
from database import Database

logger = logging.getLogger(__name__)

class MigrationManager:
    def __init__(self, db: Database):
        self.db = db
        self.current_version = self.get_current_version()
        self.target_version = 1  # Update this when adding new migrations

        # Migration functions (ordered by version)
        self.migrations = {
            1: self.migrate_to_v1,
            # Future migrations:
            # 2: self.migrate_to_v2,
            # 3: self.migrate_to_v3,
        }

    def get_current_version(self) -> int:
        """Get current schema version"""
        try:
            # Check if version table exists
            result = self.db.execute("""
                SELECT name FROM sqlite_master
                WHERE type='table' AND name='schema_version'
            """)

            if not result:
                # No version table = version 0 (need initial migration)
                return 0

            # Get version
            version_row = self.db.execute_one('SELECT version FROM schema_version WHERE id = 1')
            return version_row['version'] if version_row else 0

        except Exception as e:
            logger.error(f"Error getting schema version: {e}")
            return 0

    def needs_migration(self) -> bool:
        """Check if migration is needed"""
        return self.current_version < self.target_version

    def migrate(self):
        """Run all pending migrations"""
        if not self.needs_migration():
            logger.info(f"Database is up-to-date (version {self.current_version})")
            return

        logger.info(f"Migrating database from version {self.current_version} to {self.target_version}")

        # Run migrations in order
        for version in range(self.current_version + 1, self.target_version + 1):
            if version not in self.migrations:
                raise ValueError(f"Missing migration for version {version}")

            logger.info(f"Applying migration to version {version}...")

            try:
                # Backup before migration
                self.create_backup(f"pre_migration_v{version}")

                # Run migration
                description = self.migrations[version]()

                # Update version
                self.update_version(version, description)

                logger.info(f"✅ Migration to version {version} complete")

            except Exception as e:
                logger.error(f"❌ Migration to version {version} failed: {e}")
                logger.error("Rolling back...")
                self.restore_backup(f"pre_migration_v{version}")
                raise

        logger.info(f"🎉 All migrations complete! Database is now at version {self.target_version}")

    def migrate_to_v1(self) -> str:
        """Initial schema creation"""
        logger.info("Creating initial schema...")

        # Create schema_version table
        self.db.conn.execute("""
            CREATE TABLE IF NOT EXISTS schema_version (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                version INTEGER NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                description TEXT
            )
        """)

        # Create accounts table
        self.db.conn.execute("""
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
        """)

        # Create payment_cards table
        self.db.conn.execute("""
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
        """)

        # Create indexes
        self.db.conn.execute('CREATE INDEX IF NOT EXISTS idx_account_name ON accounts(name)')
        self.db.conn.execute('CREATE INDEX IF NOT EXISTS idx_account_status ON accounts(status)')
        self.db.conn.execute('CREATE INDEX IF NOT EXISTS idx_card_active ON payment_cards(is_active)')

        self.db.conn.commit()

        return "Initial schema with accounts and payment_cards tables"

    # Future migrations (examples):

    def migrate_to_v2(self) -> str:
        """Separate cookies into their own table"""
        logger.info("Migrating cookies to separate table...")

        # Create new cookies table
        self.db.conn.execute("""
            CREATE TABLE IF NOT EXISTS cookies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                value TEXT NOT NULL,
                domain TEXT NOT NULL,
                path TEXT DEFAULT '/',
                expiration_date INTEGER,
                http_only INTEGER DEFAULT 0,
                secure INTEGER DEFAULT 0,
                same_site TEXT DEFAULT 'no_restriction',
                session INTEGER DEFAULT 0,
                store_id TEXT,
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )
        """)

        # Migrate existing cookies from accounts.cookies (JSON) to cookies table
        accounts = self.db.execute('SELECT id, cookies FROM accounts WHERE cookies IS NOT NULL')

        import json
        for account in accounts:
            if not account['cookies']:
                continue

            cookies = json.loads(account['cookies'])
            for cookie in cookies:
                self.db.conn.execute("""
                    INSERT INTO cookies (
                        account_id, name, value, domain, path,
                        expiration_date, http_only, secure, same_site, session, store_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    account['id'],
                    cookie.get('name'),
                    cookie.get('value'),
                    cookie.get('domain'),
                    cookie.get('path', '/'),
                    cookie.get('expirationDate'),
                    1 if cookie.get('httpOnly') else 0,
                    1 if cookie.get('secure') else 0,
                    cookie.get('sameSite', 'no_restriction'),
                    1 if cookie.get('session') else 0,
                    cookie.get('storeId')
                ))

        # Drop cookies column from accounts (optional, for cleanup)
        # Note: SQLite doesn't support DROP COLUMN, so we'd need to recreate table
        # For now, just keep the column (will be ignored)

        # Create index
        self.db.conn.execute('CREATE INDEX IF NOT EXISTS idx_cookie_account ON cookies(account_id)')

        self.db.conn.commit()

        return "Migrated cookies to separate table for better performance"

    def migrate_to_v3(self) -> str:
        """Add account groups feature"""
        logger.info("Adding account groups...")

        # Create groups table
        self.db.conn.execute("""
            CREATE TABLE IF NOT EXISTS account_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Add group_id column to accounts
        self.db.conn.execute("""
            ALTER TABLE accounts ADD COLUMN group_id INTEGER REFERENCES account_groups(id)
        """)

        # Create default group
        self.db.conn.execute("""
            INSERT INTO account_groups (name, description)
            VALUES ('Default', 'Default group for accounts')
        """)

        self.db.conn.commit()

        return "Added account groups feature"

    def update_version(self, version: int, description: str):
        """Update schema version"""
        self.db.conn.execute("""
            INSERT OR REPLACE INTO schema_version (id, version, description, applied_at)
            VALUES (1, ?, ?, CURRENT_TIMESTAMP)
        """, (version, description))
        self.db.conn.commit()

        self.current_version = version

    def create_backup(self, name: str):
        """Create backup before migration"""
        import shutil
        from datetime import datetime

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = self.db.db_path.parent / f"{name}_{timestamp}.db"

        shutil.copy2(self.db.db_path, backup_path)
        logger.info(f"Backup created: {backup_path}")

    def restore_backup(self, name: str):
        """Restore from backup (if migration fails)"""
        import shutil
        import glob

        # Find most recent backup matching name
        pattern = str(self.db.db_path.parent / f"{name}_*.db")
        backups = sorted(glob.glob(pattern), reverse=True)

        if not backups:
            logger.error(f"No backup found matching: {name}")
            return

        backup_path = backups[0]
        shutil.copy2(backup_path, self.db.db_path)
        logger.info(f"Database restored from: {backup_path}")
```

### Python: Integrate with Database Class

```python
# src/database.py (updated init_db)
class Database:
    def init_db(self):
        """Initialize database and run migrations"""
        self.conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row

        # Run migrations
        from migrations import MigrationManager

        migrator = MigrationManager(self)
        if migrator.needs_migration():
            print(f"⚠️  Database needs migration (current: v{migrator.current_version}, target: v{migrator.target_version})")
            print("Running migrations...")
            migrator.migrate()

        print(f"✅ Database initialized: {self.db_path} (version {migrator.current_version})")
```

---

## 🧪 Testing Migrations

### Test Migration Manager

```python
# tests/test_migrations.py
import pytest
import tempfile
from pathlib import Path
from database import Database
from migrations import MigrationManager

def test_initial_migration():
    """Test migration from version 0 to 1"""
    # Create temporary database
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / 'test.db'
        db = Database(str(db_path))

        # Check version
        migrator = MigrationManager(db)
        assert migrator.current_version == 1

        # Check tables exist
        tables = db.execute("SELECT name FROM sqlite_master WHERE type='table'")
        table_names = [t['name'] for t in tables]

        assert 'schema_version' in table_names
        assert 'accounts' in table_names
        assert 'payment_cards' in table_names

def test_migration_creates_backup():
    """Test that migration creates backup"""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / 'test.db'
        db = Database(str(db_path))

        # Manually trigger migration
        migrator = MigrationManager(db)
        migrator.create_backup('test_backup')

        # Check backup exists
        backups = list(Path(tmpdir).glob('test_backup_*.db'))
        assert len(backups) > 0

def test_version_upgrade():
    """Test upgrading from v1 to v2"""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / 'test.db'

        # Create v1 database
        db = Database(str(db_path))

        # Manually set target version to 2
        migrator = MigrationManager(db)
        migrator.target_version = 2
        migrator.migrations[2] = migrator.migrate_to_v2

        # Add test account with cookies
        db.execute_write("""
            INSERT INTO accounts (name, email, cookies)
            VALUES ('test', 'test@example.com', '[{"name": "session", "value": "123", "domain": ".cursor.sh"}]')
        """)

        # Run migration
        migrator.migrate()

        # Check version updated
        assert migrator.current_version == 2

        # Check cookies table exists
        cookies = db.execute('SELECT * FROM cookies')
        assert len(cookies) > 0
```

---

## 📋 Migration Workflow

### Adding New Migration

**Step 1: Update target version**

```python
# src/migrations.py
class MigrationManager:
    def __init__(self, db: Database):
        # ...
        self.target_version = 2  # Increment this
```

**Step 2: Add migration function**

```python
def migrate_to_v2(self) -> str:
    """Description of what this migration does"""
    logger.info("Migrating to v2...")

    # Make schema changes
    self.db.conn.execute("""
        ALTER TABLE accounts ADD COLUMN new_field TEXT
    """)

    # Migrate data if needed
    # ...

    self.db.conn.commit()

    return "Description for version history"
```

**Step 3: Register migration**

```python
self.migrations = {
    1: self.migrate_to_v1,
    2: self.migrate_to_v2,  # Add here
}
```

**Step 4: Test migration**

```bash
python -m pytest tests/test_migrations.py::test_migrate_to_v2
```

**Step 5: Update version history table**
Update the Version History section in this document.

---

## 🔒 Safe Migration Practices

### DO:

- ✅ Always create backup before migration
- ✅ Test migrations on copy of production database
- ✅ Use transactions (automatic with SQLite)
- ✅ Log all migration steps
- ✅ Make migrations idempotent (safe to run multiple times)
- ✅ Add indexes after data migration (faster)

### DON'T:

- ❌ Drop columns (use ALTER TABLE ... ADD instead)
- ❌ Remove tables without backup
- ❌ Change data types without migration
- ❌ Forget to update version number
- ❌ Skip testing on production-like data

---

## 🚨 Emergency Rollback

### If Migration Fails:

**Step 1: Check error log**

```bash
# Look for error in stderr
cat ~/.cursor-manager/debug.log | grep "Migration"
```

**Step 2: Restore from automatic backup**

```python
# Backups are in same directory as database
# File pattern: pre_migration_v{version}_{timestamp}.db

from pathlib import Path
import shutil

db_path = Path.home() / 'AppData' / 'Roaming' / 'CursorManager' / 'accounts.db'
backup_dir = db_path.parent

# Find latest backup
backups = sorted(backup_dir.glob('pre_migration_v*_*.db'), reverse=True)
latest_backup = backups[0]

# Restore
shutil.copy2(latest_backup, db_path)
print(f"Restored from: {latest_backup}")
```

**Step 3: Fix migration code and retry**

---

## 📊 Schema Change Examples

### Adding Column (Safe)

```python
def migrate_to_vX(self) -> str:
    # Add new column with default value
    self.db.conn.execute("""
        ALTER TABLE accounts
        ADD COLUMN new_column TEXT DEFAULT 'default_value'
    """)

    self.db.conn.commit()
    return "Added new_column to accounts"
```

### Adding Table (Safe)

```python
def migrate_to_vX(self) -> str:
    self.db.conn.execute("""
        CREATE TABLE IF NOT EXISTS new_table (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )
    """)

    self.db.conn.commit()
    return "Added new_table"
```

### Renaming Column (Requires Rebuild)

```python
def migrate_to_vX(self) -> str:
    # SQLite doesn't support RENAME COLUMN before v3.25
    # Need to recreate table

    # 1. Create new table with new column name
    self.db.conn.execute("""
        CREATE TABLE accounts_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            new_name TEXT NOT NULL,  -- renamed from old_name
            email TEXT NOT NULL
        )
    """)

    # 2. Copy data
    self.db.conn.execute("""
        INSERT INTO accounts_new (id, new_name, email)
        SELECT id, old_name, email FROM accounts
    """)

    # 3. Drop old table
    self.db.conn.execute("DROP TABLE accounts")

    # 4. Rename new table
    self.db.conn.execute("ALTER TABLE accounts_new RENAME TO accounts")

    self.db.conn.commit()
    return "Renamed column old_name to new_name"
```

### Data Migration

```python
def migrate_to_vX(self) -> str:
    # Example: Normalize email addresses
    accounts = self.db.execute('SELECT id, email FROM accounts')

    for account in accounts:
        normalized_email = account['email'].lower().strip()
        self.db.conn.execute(
            'UPDATE accounts SET email = ? WHERE id = ?',
            (normalized_email, account['id'])
        )

    self.db.conn.commit()
    return "Normalized all email addresses"
```

---

## 🔍 Debugging Migrations

### Check Current Version

```bash
# CLI command
python cli.py version

# Or query directly
sqlite3 accounts.db "SELECT * FROM schema_version"
```

### List All Tables

```bash
sqlite3 accounts.db ".tables"
```

### Show Table Schema

```bash
sqlite3 accounts.db ".schema accounts"
```

### Manual Migration (Emergency)

```bash
# Connect to database
sqlite3 accounts.db

-- Check version
SELECT * FROM schema_version;

-- Manually update version if needed
UPDATE schema_version SET version = 2 WHERE id = 1;

-- Exit
.quit
```

---

## ✅ Migration Checklist

Before deploying new migration:

- [ ] Migration function created
- [ ] Migration registered in `migrations` dict
- [ ] Target version incremented
- [ ] Backup logic tested
- [ ] Migration tested on empty database
- [ ] Migration tested on database with existing data
- [ ] Rollback tested
- [ ] Version history updated
- [ ] Migration documented
- [ ] Performance impact assessed

---

## 📦 CLI: Version Command

```python
# cli.py (add new command)
@cli.command('version')
def show_version():
    """Show database schema version"""
    from migrations import MigrationManager

    migrator = MigrationManager(db)

    console.print(f"📊 Database Version Information")
    console.print(f"  Current Version: {migrator.current_version}")
    console.print(f"  Target Version:  {migrator.target_version}")
    console.print(f"  Database Path:   {db.db_path}")

    if migrator.needs_migration():
        console.print(f"\n⚠️  [yellow]Migration needed![/yellow]")
        console.print(f"  Run backend to apply migrations automatically.")
    else:
        console.print(f"\n✅ [green]Database is up-to-date[/green]")
```

---

**Prepared By:** AI Architect  
**Date:** Oktober 2025  
**Status:** Design Complete  
**Implementation Time:** 1 day

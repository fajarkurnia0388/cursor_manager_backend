"""
Database Module - SQLite handler dengan connection pooling sederhana
"""

import sqlite3
import json
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import threading


class Database:
    """SQLite database handler dengan connection pooling sederhana"""

    # Schema version untuk migration tracking
    SCHEMA_VERSION = 2

    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize database

        Args:
            db_path: Path ke database file. Default: ~/cursor_manager/data.db
        """
        if db_path is None:
            # Default location
            home = Path.home()
            self.db_dir = home / "cursor_manager"
            self.db_dir.mkdir(parents=True, exist_ok=True)
            self.db_path = self.db_dir / "data.db"
        else:
            self.db_path = Path(db_path)
            self.db_dir = self.db_path.parent
            self.db_dir.mkdir(parents=True, exist_ok=True)

        # Thread-local storage untuk connections
        self._local = threading.local()

        # Initialize schema
        self._init_schema()

    def _get_connection(self) -> sqlite3.Connection:
        """Get thread-local database connection"""
        if not hasattr(self._local, "conn"):
            self._local.conn = sqlite3.connect(
                str(self.db_path), check_same_thread=False
            )
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn

    def _init_schema(self):
        """Initialize database schema"""
        conn = self._get_connection()
        cursor = conn.cursor()

        # Metadata table untuk version tracking
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS _metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Accounts table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                cookies TEXT,
                status TEXT DEFAULT 'active',
                last_used TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Payment cards table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_number TEXT NOT NULL,
                card_holder TEXT NOT NULL,
                expiry TEXT NOT NULL,
                cvv TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                last_used TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Bypass Testing tables
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS bypass_tests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                test_name TEXT NOT NULL,
                test_type TEXT NOT NULL,
                test_payload TEXT NOT NULL,
                target_url TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS bypass_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                test_id INTEGER,
                test_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                target_url TEXT NOT NULL,
                success BOOLEAN NOT NULL,
                response_code INTEGER,
                response_body TEXT,
                error_message TEXT,
                execution_time REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (test_id) REFERENCES bypass_tests(id)
            )
        """
        )

        # Pro Trial Management table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS pro_trials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                card_id INTEGER,
                trial_token TEXT,
                activation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expiry_date TIMESTAMP,
                status TEXT DEFAULT 'pending',
                error_message TEXT,
                auto_renew BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (account_id) REFERENCES accounts(id),
                FOREIGN KEY (card_id) REFERENCES cards(id)
            )
        """
        )

        # Batch Operations table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS batch_operations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                operation_type TEXT NOT NULL,
                total_items INTEGER NOT NULL,
                completed_items INTEGER DEFAULT 0,
                failed_items INTEGER DEFAULT 0,
                status TEXT DEFAULT 'running',
                error_log TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
        """
        )

        # Create indexes
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status)"
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status)")
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_bypass_results_test_type ON bypass_results(test_type)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_bypass_results_created_at ON bypass_results(created_at)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_pro_trials_account_id ON pro_trials(account_id)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_pro_trials_status ON pro_trials(status)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_batch_operations_status ON batch_operations(status)"
        )

        # Set schema version
        cursor.execute(
            "INSERT OR REPLACE INTO _metadata (key, value) VALUES (?, ?)",
            ("schema_version", str(self.SCHEMA_VERSION)),
        )

        conn.commit()

    def get_schema_version(self) -> int:
        """Get current schema version"""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM _metadata WHERE key = ?", ("schema_version",))
        row = cursor.fetchone()
        return int(row["value"]) if row else 0

    def execute(self, query: str, params: tuple = ()) -> sqlite3.Cursor:
        """Execute SQL query"""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        conn.commit()
        return cursor

    def fetch_all(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """Fetch all rows dari query"""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

    def fetch_one(self, query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
        """Fetch single row dari query"""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        row = cursor.fetchone()
        return dict(row) if row else None

    def close(self):
        """Close database connection"""
        if hasattr(self._local, "conn"):
            self._local.conn.close()
            del self._local.conn

    def backup(self, backup_path: Optional[str] = None) -> str:
        """
        Create database backup

        Args:
            backup_path: Path untuk backup file. Default: ~/cursor_manager/backups/

        Returns:
            Path ke backup file
        """
        if backup_path is None:
            backup_dir = self.db_dir / "backups"
            backup_dir.mkdir(exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = backup_dir / f"data_backup_{timestamp}.db"

        # Close existing connection
        self.close()

        # Copy database file
        import shutil

        shutil.copy2(self.db_path, backup_path)

        return str(backup_path)

    def restore(self, backup_path: str):
        """
        Restore database dari backup

        Args:
            backup_path: Path ke backup file
        """
        import shutil

        # Close existing connection
        self.close()

        # Backup current database dulu
        current_backup = self.backup()

        try:
            # Restore dari backup
            shutil.copy2(backup_path, self.db_path)
        except Exception as e:
            # Rollback jika gagal
            shutil.copy2(current_backup, self.db_path)
            raise e

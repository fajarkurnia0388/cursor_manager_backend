"""
Account Service - CRUD operations untuk accounts
"""

import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from database import Database


class AccountService:
    """Service untuk manage accounts"""

    def __init__(self, db: Database):
        self.db = db

    def get_all(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all accounts

        Args:
            status: Filter by status (active/inactive/deleted)

        Returns:
            List of accounts
        """
        if status:
            query = "SELECT * FROM accounts WHERE status = ? ORDER BY created_at DESC"
            accounts = self.db.fetch_all(query, (status,))
        else:
            query = "SELECT * FROM accounts ORDER BY created_at DESC"
            accounts = self.db.fetch_all(query)

        # Parse cookies JSON
        for account in accounts:
            if account.get("cookies"):
                try:
                    account["cookies"] = json.loads(account["cookies"])
                except json.JSONDecodeError:
                    account["cookies"] = None

        return accounts

    def get_by_id(self, account_id: int) -> Optional[Dict[str, Any]]:
        """Get account by ID"""
        query = "SELECT * FROM accounts WHERE id = ?"
        account = self.db.fetch_one(query, (account_id,))

        if account and account.get("cookies"):
            try:
                account["cookies"] = json.loads(account["cookies"])
            except json.JSONDecodeError:
                account["cookies"] = None

        return account

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get account by email"""
        query = "SELECT * FROM accounts WHERE email = ?"
        account = self.db.fetch_one(query, (email,))

        if account and account.get("cookies"):
            try:
                account["cookies"] = json.loads(account["cookies"])
            except json.JSONDecodeError:
                account["cookies"] = None

        return account

    def create(
        self, email: str, password: str, cookies: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Create new account

        Args:
            email: Account email
            password: Account password
            cookies: Optional cookies dict

        Returns:
            Created account data
        """
        # Convert cookies to JSON string
        cookies_json = json.dumps(cookies) if cookies else None

        query = """
            INSERT INTO accounts (email, password, cookies, status, created_at, updated_at)
            VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """

        cursor = self.db.execute(query, (email, password, cookies_json))
        account_id = cursor.lastrowid

        return self.get_by_id(account_id)

    def update(self, account_id: int, **kwargs) -> Optional[Dict[str, Any]]:
        """
        Update account

        Args:
            account_id: Account ID
            **kwargs: Fields to update (email, password, cookies, status)

        Returns:
            Updated account data
        """
        # Build update query
        allowed_fields = ["email", "password", "cookies", "status", "last_used"]
        updates = []
        params = []

        for field, value in kwargs.items():
            if field in allowed_fields:
                if field == "cookies" and isinstance(value, dict):
                    value = json.dumps(value)
                updates.append(f"{field} = ?")
                params.append(value)

        if not updates:
            return self.get_by_id(account_id)

        # Add updated_at
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(account_id)

        query = f"UPDATE accounts SET {', '.join(updates)} WHERE id = ?"
        self.db.execute(query, tuple(params))

        return self.get_by_id(account_id)

    def delete(self, account_id: int, soft: bool = True) -> bool:
        """
        Delete account

        Args:
            account_id: Account ID
            soft: If True, mark as deleted. If False, permanently delete.

        Returns:
            True if deleted successfully
        """
        if soft:
            query = "UPDATE accounts SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            self.db.execute(query, (account_id,))
        else:
            query = "DELETE FROM accounts WHERE id = ?"
            self.db.execute(query, (account_id,))

        return True

    def update_last_used(self, account_id: int):
        """Update last_used timestamp"""
        query = "UPDATE accounts SET last_used = CURRENT_TIMESTAMP WHERE id = ?"
        self.db.execute(query, (account_id,))

    def search(self, keyword: str) -> List[Dict[str, Any]]:
        """
        Search accounts by email

        Args:
            keyword: Search keyword

        Returns:
            List of matching accounts
        """
        query = """
            SELECT * FROM accounts 
            WHERE email LIKE ? AND status != 'deleted'
            ORDER BY created_at DESC
        """
        accounts = self.db.fetch_all(query, (f"%{keyword}%",))

        # Parse cookies
        for account in accounts:
            if account.get("cookies"):
                try:
                    account["cookies"] = json.loads(account["cookies"])
                except json.JSONDecodeError:
                    account["cookies"] = None

        return accounts

    def get_stats(self) -> Dict[str, Any]:
        """Get account statistics"""
        query = """
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
                SUM(CASE WHEN status = 'deleted' THEN 1 ELSE 0 END) as deleted
            FROM accounts
        """
        return self.db.fetch_one(query) or {}

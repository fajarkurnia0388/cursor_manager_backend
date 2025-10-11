"""
Account Service - CRUD operations untuk accounts
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, TYPE_CHECKING
from uuid import uuid4

from database import Database

if TYPE_CHECKING:  # pragma: no cover - type hint only
    from services.event_service import EventService

logger = logging.getLogger(__name__)


DELETED_ACCOUNT_STATUS = "deleted"
ACCOUNT_STATUS_VALUES = {
    "free",
    "pro-trial",
    "pro",
    "pro+ plan",
    "ultra",
    "teams",
    "limit pro-trial",
    "limit pro",
    DELETED_ACCOUNT_STATUS,
}
DEFAULT_ACCOUNT_STATUS = "free"

class AccountService:
    """Service untuk manage accounts"""

    def __init__(
        self,
        db: Database,
        event_service: Optional["EventService"] = None,
    ):
        self.db = db
        self.event_service = event_service

    def get_all(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all accounts

        Args:
            status: Filter by status (free/pro-trial/pro/pro+ plan/ultra/teams/limit pro-trial/limit pro/deleted)

        Returns:
            List of accounts
        """
        if status:
            query = "SELECT * FROM accounts WHERE status = ? ORDER BY created_at DESC"
            accounts = self.db.fetch_all(query, (status,))
        else:
            query = "SELECT * FROM accounts ORDER BY created_at DESC"
            accounts = self.db.fetch_all(query)

        # Parse JSON fields
        for account in accounts:
            account["cookies"] = self._parse_json(account.get("cookies"))
            account["tags"] = self._parse_tags(account.get("tags"))

        return accounts

    def get_by_id(self, account_id: int) -> Optional[Dict[str, Any]]:
        """Get account by ID"""
        query = "SELECT * FROM accounts WHERE id = ?"
        account = self.db.fetch_one(query, (account_id,))

        if account:
            account["cookies"] = self._parse_json(account.get("cookies"))
            account["tags"] = self._parse_tags(account.get("tags"))

        return account

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get account by email"""
        query = "SELECT * FROM accounts WHERE email = ?"
        account = self.db.fetch_one(query, (email,))

        if account:
            account["cookies"] = self._parse_json(account.get("cookies"))
            account["tags"] = self._parse_tags(account.get("tags"))

        return account

    def create(
        self,
        email: Optional[str],
        password: Optional[str] = "",  # kept for backward compatibility
        cookies: Optional[Dict] = None,
        tags: Optional[List[str]] = None,
        status: str = DEFAULT_ACCOUNT_STATUS,
    ) -> Dict[str, Any]:
        """
        Create new account

        Args:
            email: Account email
            cookies: Optional cookies dict

        Returns:
            Created account data
        """
        email_value = (email or "").strip()
        if not email_value:
            email_value = self._generate_placeholder_email()

        status_value = status if status in ACCOUNT_STATUS_VALUES else DEFAULT_ACCOUNT_STATUS

        # Convert JSON fields
        cookies_json = json.dumps(cookies) if cookies else None
        tags_json = json.dumps(tags or [])

        query = """
            INSERT INTO accounts (email, password, cookies, tags, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """

        cursor = self.db.execute(
            query,
            (
                email_value,
                "",
                cookies_json,
                tags_json,
                status_value,
            ),
        )
        account_id = cursor.lastrowid

        account = self.get_by_id(account_id)

        if account and self.event_service:
            self._emit_event(
                "created",
                account_id,
                {
                    "email": account.get("email"),
                    "status": account.get("status"),
                    "tags": account.get("tags", []),
                },
            )

        return account

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
        allowed_fields = ["email", "password", "cookies", "status", "last_used", "tags"]
        updates = []
        params = []

        for field, value in kwargs.items():
            if field in allowed_fields and value is not None:
                if field == "email":
                    value = value.strip() or self._generate_placeholder_email()
                if field == "status" and value not in ACCOUNT_STATUS_VALUES:
                    value = DEFAULT_ACCOUNT_STATUS
                if field == "cookies" and isinstance(value, dict):
                    value = json.dumps(value)
                if field == "tags" and isinstance(value, list):
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

        account = self.get_by_id(account_id)

        if account and self.event_service:
            self._emit_event(
                "updated",
                account_id,
                {
                    "changes": {key: kwargs[key] for key in allowed_fields if key in kwargs},
                    "status": account.get("status"),
                },
            )

        return account

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
            action = "soft_delete"
        else:
            query = "DELETE FROM accounts WHERE id = ?"
            self.db.execute(query, (account_id,))
            action = "deleted"

        if self.event_service:
            self._emit_event(action, account_id)

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

        for account in accounts:
            account["cookies"] = self._parse_json(account.get("cookies"))
            account["tags"] = self._parse_tags(account.get("tags"))

        return accounts

    def get_stats(self) -> Dict[str, Any]:
        """Get account statistics."""
        rows = self.db.fetch_all(
            "SELECT status, COUNT(*) AS total FROM accounts GROUP BY status"
        )
        stats: Dict[str, Any] = {"total": 0, "by_status": {}}
        for row in rows:
            status = row.get("status") or DEFAULT_ACCOUNT_STATUS
            count = row.get("total", 0)
            stats["total"] += count
            stats["by_status"][status] = count

        for status in ACCOUNT_STATUS_VALUES:
            stats[status] = stats["by_status"].get(status, 0)

        return stats

    def _parse_json(self, data: Optional[str]) -> Optional[Dict[str, Any]]:
        """Parse JSON string safely."""
        if not data:
            return None
        try:
            return json.loads(data)
        except json.JSONDecodeError:
            return None

    def _parse_tags(self, data: Optional[str]) -> List[str]:
        """Parse tags JSON into list."""
        if not data:
            return []
        try:
            parsed = json.loads(data)
            if isinstance(parsed, list):
                return [str(tag).strip() for tag in parsed if str(tag).strip()]
        except json.JSONDecodeError:
            pass
        return []

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #

    def _emit_event(
        self,
        action: str,
        account_id: int,
        payload: Optional[Dict[str, Any]] = None,
    ) -> None:
        if not self.event_service:
            return
        try:
            self.event_service.record_event(
                entity_type="account",
                action=action,
                entity_id=account_id,
                payload=payload or {},
            )
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.debug("Failed to record account event: %s", exc)

    def _generate_placeholder_email(self) -> str:
        return f"account_{uuid4().hex[:10]}@local"

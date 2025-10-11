"""
Cards Service - CRUD operations untuk payment cards
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, TYPE_CHECKING

from database import Database

if TYPE_CHECKING:  # pragma: no cover
    from services.event_service import EventService

logger = logging.getLogger(__name__)


class CardsService:
    """Service untuk manage payment cards"""

    def __init__(
        self,
        db: Database,
        event_service: Optional["EventService"] = None,
    ):
        self.db = db
        self.event_service = event_service

    def get_all(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all payment cards

        Args:
            status: Filter by status (active/inactive/deleted)

        Returns:
            List of cards
        """
        if status:
            query = "SELECT * FROM cards WHERE status = ? ORDER BY created_at DESC"
            cards = self.db.fetch_all(query, (status,))
        else:
            query = "SELECT * FROM cards ORDER BY created_at DESC"
            cards = self.db.fetch_all(query)

        return [self._hydrate_card(card) for card in cards]

    def get_by_id(self, card_id: int) -> Optional[Dict[str, Any]]:
        """Get card by ID"""
        query = "SELECT * FROM cards WHERE id = ?"
        card = self.db.fetch_one(query, (card_id,))
        return self._hydrate_card(card) if card else None

    def create(
        self,
        card_number: str,
        card_holder: str,
        expiry: str,
        cvv: str,
        tags: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Create new payment card

        Args:
            card_number: Card number
            card_holder: Card holder name
            expiry: Expiry date (MM/YY)
            cvv: CVV code

        Returns:
            Created card data
        """
        query = """
            INSERT INTO cards (card_number, card_holder, expiry, cvv, tags, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """

        tags_json = json.dumps(tags or [])
        cursor = self.db.execute(
            query, (card_number, card_holder, expiry, cvv, tags_json)
        )
        card_id = cursor.lastrowid

        card = self.get_by_id(card_id)
        if card:
            self._emit_event(
                "created",
                card_id,
                {
                    "card_holder": card.get("card_holder"),
                    "status": card.get("status"),
                },
            )

        return card

    def update(self, card_id: int, **kwargs) -> Optional[Dict[str, Any]]:
        """
        Update card

        Args:
            card_id: Card ID
            **kwargs: Fields to update (card_number, card_holder, expiry, cvv, status)

        Returns:
            Updated card data
        """
        # Build update query
        allowed_fields = [
            "card_number",
            "card_holder",
            "expiry",
            "cvv",
            "status",
            "last_used",
            "tags",
        ]
        updates = []
        params = []

        for field, value in kwargs.items():
            if field in allowed_fields:
                if field == "tags" and isinstance(value, list):
                    value = json.dumps(value)
                updates.append(f"{field} = ?")
                params.append(value)

        if not updates:
            return self.get_by_id(card_id)

        # Add updated_at
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(card_id)

        query = f"UPDATE cards SET {', '.join(updates)} WHERE id = ?"
        self.db.execute(query, tuple(params))

        card = self.get_by_id(card_id)
        if card:
            self._emit_event(
                "updated",
                card_id,
                {
                    "changes": {key: kwargs[key] for key in allowed_fields if key in kwargs},
                    "status": card.get("status"),
                },
            )

        return card

    def delete(self, card_id: int, soft: bool = True) -> bool:
        """
        Delete card

        Args:
            card_id: Card ID
            soft: If True, mark as deleted. If False, permanently delete.

        Returns:
            True if deleted successfully
        """
        if soft:
            query = "UPDATE cards SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            self.db.execute(query, (card_id,))
            action = "soft_delete"
        else:
            query = "DELETE FROM cards WHERE id = ?"
            self.db.execute(query, (card_id,))
            action = "deleted"

        self._emit_event(action, card_id)

        return True

    def update_last_used(self, card_id: int):
        """Update last_used timestamp"""
        query = "UPDATE cards SET last_used = CURRENT_TIMESTAMP WHERE id = ?"
        self.db.execute(query, (card_id,))

    def search(self, keyword: str) -> List[Dict[str, Any]]:
        """
        Search cards by card holder name

        Args:
            keyword: Search keyword

        Returns:
            List of matching cards
        """
        query = """
            SELECT * FROM cards 
            WHERE (card_holder LIKE ? OR card_number LIKE ?) AND status != 'deleted'
            ORDER BY created_at DESC
        """
        cards = self.db.fetch_all(query, (f"%{keyword}%", f"%{keyword}%"))
        return [self._hydrate_card(card) for card in cards]

    def get_stats(self) -> Dict[str, Any]:
        """Get card statistics"""
        query = """
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
                SUM(CASE WHEN status = 'deleted' THEN 1 ELSE 0 END) as deleted
            FROM cards
        """
        return self.db.fetch_one(query) or {}

    def _hydrate_card(self, card: Dict[str, Any]) -> Dict[str, Any]:
        """Parse JSON fields for card record."""
        if not card:
            return card

        raw_tags = card.get("tags")
        tags: List[str] = []
        if raw_tags:
            try:
                parsed = json.loads(raw_tags)
                if isinstance(parsed, list):
                    tags = [str(tag).strip() for tag in parsed if str(tag).strip()]
            except json.JSONDecodeError:
                tags = []

        card["tags"] = tags
        return card

    def _emit_event(
        self,
        action: str,
        card_id: int,
        payload: Optional[Dict[str, Any]] = None,
    ) -> None:
        if not self.event_service:
            return
        try:
            self.event_service.record_event(
                entity_type="card",
                action=action,
                entity_id=card_id,
                payload=payload or {},
            )
        except Exception as exc:  # pragma: no cover - defensive log
            logger.debug("Failed to record card event: %s", exc)

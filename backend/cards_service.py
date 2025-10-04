"""
Cards Service - CRUD operations untuk payment cards
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from database import Database


class CardsService:
    """Service untuk manage payment cards"""

    def __init__(self, db: Database):
        self.db = db

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

        return cards

    def get_by_id(self, card_id: int) -> Optional[Dict[str, Any]]:
        """Get card by ID"""
        query = "SELECT * FROM cards WHERE id = ?"
        return self.db.fetch_one(query, (card_id,))

    def create(
        self, card_number: str, card_holder: str, expiry: str, cvv: str
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
            INSERT INTO cards (card_number, card_holder, expiry, cvv, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """

        cursor = self.db.execute(query, (card_number, card_holder, expiry, cvv))
        card_id = cursor.lastrowid

        return self.get_by_id(card_id)

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
        ]
        updates = []
        params = []

        for field, value in kwargs.items():
            if field in allowed_fields:
                updates.append(f"{field} = ?")
                params.append(value)

        if not updates:
            return self.get_by_id(card_id)

        # Add updated_at
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(card_id)

        query = f"UPDATE cards SET {', '.join(updates)} WHERE id = ?"
        self.db.execute(query, tuple(params))

        return self.get_by_id(card_id)

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
        else:
            query = "DELETE FROM cards WHERE id = ?"
            self.db.execute(query, (card_id,))

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
            WHERE card_holder LIKE ? AND status != 'deleted'
            ORDER BY created_at DESC
        """
        return self.db.fetch_all(query, (f"%{keyword}%",))

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

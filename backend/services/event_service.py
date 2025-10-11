"""
Event Service - lightweight event log supporting realtime syncing.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class EventService:
    """Persist small event messages to SQLite for cross-process polling."""

    def __init__(self, db) -> None:
        self.db = db

    def record_event(
        self,
        entity_type: str,
        action: str,
        entity_id: Optional[int] = None,
        payload: Optional[Dict[str, Any]] = None,
        source: str = "backend",
    ) -> int:
        try:
            payload_json = json.dumps(payload) if payload is not None else None
        except (TypeError, ValueError) as exc:
            logger.warning("Unable to encode event payload: %s", exc)
            payload_json = None

        query = """
            INSERT INTO sync_events (entity_type, entity_id, action, source, payload)
            VALUES (?, ?, ?, ?, ?)
        """
        cursor = self.db.execute(query, (entity_type, entity_id, action, source, payload_json))
        event_id = cursor.lastrowid
        logger.debug(
            "Recorded sync event id=%s entity=%s action=%s source=%s",
            event_id,
            entity_type,
            action,
            source,
        )
        return int(event_id)

    def get_events(self, after_id: Optional[int] = None, limit: int = 200) -> Dict[str, Any]:
        if limit <= 0:
            limit = 50
        params: List[Any] = []
        base_query = """
            SELECT id, entity_type, entity_id, action, source, payload, created_at
            FROM sync_events
        """
        if after_id:
            base_query += " WHERE id > ?"
            params.append(after_id)
        base_query += " ORDER BY id ASC LIMIT ?"
        params.append(limit)

        rows = self.db.fetch_all(base_query, tuple(params))
        events: List[Dict[str, Any]] = []
        for row in rows:
            payload = row.get("payload")
            if payload:
                try:
                    payload = json.loads(payload)
                except (TypeError, json.JSONDecodeError):
                    logger.debug("Skip invalid event payload for event id=%s", row.get("id"))
                    payload = None
            events.append(
                {
                    "id": row.get("id"),
                    "entity_type": row.get("entity_type"),
                    "entity_id": row.get("entity_id"),
                    "action": row.get("action"),
                    "source": row.get("source"),
                    "payload": payload,
                    "created_at": row.get("created_at"),
                }
            )
        return {"events": events, "last_id": events[-1]["id"] if events else after_id}

    def prune(self, keep_hours: int = 72) -> int:
        """Remove events older than the retention window."""
        query = """
            DELETE FROM sync_events
            WHERE created_at < datetime('now', '-' || ? || ' hours')
        """
        cursor = self.db.execute(query, (keep_hours,))
        deleted = cursor.rowcount
        logger.info("Pruned %s sync events older than %s hours", deleted, keep_hours)
        return int(deleted or 0)


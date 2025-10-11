"""
Settings Manager - persist application preferences and service configuration.
"""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any, Dict, Optional


class SettingsManager:
    """
    Tiny helper to persist user preferences (theme, scheduler, encryption).
    Backed by ~/.cursor_manager/settings.json to keep parity with database location.
    """

    DEFAULTS: Dict[str, Any] = {
        "version": 1,
        "appearance": {"mode": "dark"},
        "scheduler": {
            "enabled": True,
            "jobs": {
                "refresh_accounts": {"enabled": True, "interval_minutes": 30},
                "cleanup_bypass": {"enabled": True, "interval_minutes": 1440},
                "auto_renew_trials": {"enabled": False, "interval_minutes": 60},
            },
        },
        "encryption": {
            "enabled": False,
            "salt": None,
            "remember_key": False,
            "kdf_iterations": 390000,
        },
    }

    def __init__(self, settings_path: Optional[Path] = None) -> None:
        settings_dir = Path.home() / "cursor_manager"
        settings_dir.mkdir(parents=True, exist_ok=True)
        self.settings_path = (
            settings_path if settings_path else settings_dir / "settings.json"
        )
        self._lock = threading.RLock()
        self._data: Dict[str, Any] = {}
        self.reload()

    # ------------------------------------------------------------------ #
    # Core operations
    # ------------------------------------------------------------------ #

    def reload(self) -> None:
        """Load settings from disk, falling back to defaults on failure."""
        with self._lock:
            if self.settings_path.exists():
                try:
                    content = self.settings_path.read_text(encoding="utf-8")
                    loaded = json.loads(content)
                except (json.JSONDecodeError, OSError):
                    loaded = {}
            else:
                loaded = {}

            self._data = self._merge_dicts(self.DEFAULTS, loaded)

    def save(self) -> None:
        """Persist current settings snapshot to disk."""
        with self._lock:
            payload = json.dumps(self._data, indent=2, ensure_ascii=False)
            self.settings_path.write_text(payload, encoding="utf-8")

    # ------------------------------------------------------------------ #
    # Convenience helpers
    # ------------------------------------------------------------------ #

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            return self._data.get(key, default)

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._data[key] = value
            self.save()

    def get_section(self, section: str) -> Dict[str, Any]:
        with self._lock:
            value = self._data.get(section, {})
            return value.copy() if isinstance(value, dict) else {}

    def update_section(self, section: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            base = self._data.get(section, {})
            if not isinstance(base, dict):
                base = {}
            merged = self._merge_dicts(base, updates)
            self._data[section] = merged
            self.save()
            return merged

    # ------------------------------------------------------------------ #
    # Internal utilities
    # ------------------------------------------------------------------ #

    def _merge_dicts(self, base: Dict[str, Any], incoming: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively merge dictionaries, preserving values from incoming when present."""
        result: Dict[str, Any] = {}
        keys = set(base.keys()) | set(incoming.keys())
        for key in keys:
            base_value = base.get(key)
            incoming_value = incoming.get(key)
            if isinstance(base_value, dict) and isinstance(incoming_value, dict):
                result[key] = self._merge_dicts(base_value, incoming_value)
            elif incoming_value is not None:
                result[key] = incoming_value
            else:
                result[key] = base_value
        return result


def get_settings_manager() -> SettingsManager:
    """Provide singleton-ish helper to share settings manager across modules."""
    # Late import to avoid circular dependency during module import time
    if not hasattr(get_settings_manager, "_instance"):
        get_settings_manager._instance = SettingsManager()
    return get_settings_manager._instance  # type: ignore[attr-defined]


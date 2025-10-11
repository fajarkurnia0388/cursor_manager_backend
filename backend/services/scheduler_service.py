"""
Scheduler Service - orchestrates recurring automation jobs via APScheduler.
"""

from __future__ import annotations

import logging
import threading
from typing import Any, Callable, Dict, Optional

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.interval import IntervalTrigger

    _APSCHEDULER_IMPORT_ERROR = None
except ImportError as exc:  # pragma: no cover - handled at runtime
    BackgroundScheduler = None  # type: ignore[assignment]
    IntervalTrigger = None  # type: ignore[assignment]
    _APSCHEDULER_IMPORT_ERROR = exc

from settings_manager import SettingsManager, get_settings_manager

logger = logging.getLogger(__name__)

JobCallable = Callable[[], Any]


class SchedulerService:
    """Tiny layer above APScheduler to sync configuration with settings.json."""

    def __init__(self, settings: Optional[SettingsManager] = None) -> None:
        if BackgroundScheduler is None or IntervalTrigger is None:
            raise RuntimeError(
                "APScheduler is required to use the SchedulerService. Install it with "
                "'pip install apscheduler'."
            ) from _APSCHEDULER_IMPORT_ERROR
        self.settings = settings if settings else get_settings_manager()
        self.scheduler = BackgroundScheduler(daemon=True)
        self._lock = threading.RLock()
        self._job_factories: Dict[str, Dict[str, Any]] = {}
        self._scheduled_jobs: Dict[str, Any] = {}

    # ------------------------------------------------------------------ #
    # Registration & lifecycle
    # ------------------------------------------------------------------ #

    def register_job(
        self,
        job_id: str,
        callback: JobCallable,
        *,
        default_interval: int,
        description: str,
    ) -> None:
        """
        Register job factory that can be toggled via settings.

        If settings do not contain the job definition yet, defaults are seeded.
        """
        with self._lock:
            self._job_factories[job_id] = {
                "callback": callback,
                "default_interval": max(1, int(default_interval)),
                "description": description,
            }

            scheduler_settings = self.settings.get_section("scheduler")
            jobs = scheduler_settings.get("jobs", {})
            if job_id not in jobs:
                jobs[job_id] = {
                    "enabled": True,
                    "interval_minutes": max(1, int(default_interval)),
                    "description": description,
                }
                self.settings.update_section(
                    "scheduler",
                    {
                        "jobs": jobs,
                    },
                )

    def start(self) -> None:
        """Start scheduler (idempotent) and align jobs with persisted configuration."""
        with self._lock:
            if not self.scheduler.running:
                self.scheduler.start()
        self._sync_jobs_from_settings()

    def shutdown(self) -> None:
        with self._lock:
            if self.scheduler.running:
                self.scheduler.shutdown(wait=False)
            self._scheduled_jobs.clear()

    # ------------------------------------------------------------------ #
    # Configuration updates
    # ------------------------------------------------------------------ #

    def refresh(self) -> None:
        """Public hook to re-read settings and reschedule tasks."""
        self._sync_jobs_from_settings()

    def set_enabled(self, enabled: bool) -> Dict[str, Any]:
        """
        Toggle scheduler on/off and reschedule accordingly.
        """
        self.settings.update_section("scheduler", {"enabled": bool(enabled)})
        self._sync_jobs_from_settings()
        return self.settings.get_section("scheduler")

    def update_job_config(
        self, job_id: str, *, enabled: Optional[bool] = None, interval_minutes: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Update job configuration inside settings and reschedule when necessary.
        """
        with self._lock:
            scheduler_settings = self.settings.get_section("scheduler")
            jobs = scheduler_settings.get("jobs", {})
            data = jobs.get(job_id, {}).copy()
            if not data:
                raise ValueError(f"Unknown scheduler job: {job_id}")

            if enabled is not None:
                data["enabled"] = bool(enabled)
            if interval_minutes is not None:
                data["interval_minutes"] = max(1, int(interval_minutes))

            jobs[job_id] = data
            self.settings.update_section("scheduler", {"jobs": jobs})

        self._sync_jobs_from_settings()
        return data

    # ------------------------------------------------------------------ #
    # Internals
    # ------------------------------------------------------------------ #

    def _sync_jobs_from_settings(self) -> None:
        scheduler_settings = self.settings.get_section("scheduler")
        enabled = scheduler_settings.get("enabled", True)

        with self._lock:
            for job_id, job in list(self._scheduled_jobs.items()):
                job.remove()
                del self._scheduled_jobs[job_id]

            if not enabled:
                logger.info("Scheduler disabled via settings.")
                return

            jobs_config = scheduler_settings.get("jobs", {})
            for job_id, config in jobs_config.items():
                if not config.get("enabled"):
                    continue
                factory = self._job_factories.get(job_id)
                if not factory:
                    continue

                interval = max(1, int(config.get("interval_minutes") or factory["default_interval"]))
                trigger = IntervalTrigger(minutes=interval)
                callback = factory["callback"]

                def _safe_wrapper(job_callback: JobCallable, job_name: str) -> None:
                    try:
                        job_callback()
                    except Exception as exc:
                        logger.exception("Scheduled job %s failed: %s", job_name, exc)

                job = self.scheduler.add_job(
                    _safe_wrapper,
                    trigger=trigger,
                    args=[callback, job_id],
                    id=job_id,
                    replace_existing=True,
                    coalesce=True,
                    max_instances=1,
                )
                self._scheduled_jobs[job_id] = job
                logger.info(
                    "Scheduled job %s every %s minute(s) (description: %s)",
                    job_id,
                    interval,
                    factory.get("description", ""),
                )

"""CustomTkinter-based desktop application for Cursor Manager."""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import customtkinter as ctk
except ImportError as exc:  # pragma: no cover - guidance for runtime usage
    raise ImportError(
        "customtkinter is required to run the GUI. Install it with 'pip install customtkinter'."
    ) from exc

import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from account_service import AccountService
from card_generator import CardGenerator
from cards_service import CardsService
from database import Database
from services.batch_service import BatchService
from services.bypass_service import BypassService
from services.export_service import ExportService
from services.import_service import ImportService
from services.pro_trial_service import ProTrialService
from services.status_service import StatusService
from services.event_service import EventService
from services.scheduler_service import SchedulerService
from settings_manager import SettingsManager, get_settings_manager
if __package__:
    from . import get_version
else:  # Allow running via `python gui.py` from backend folder
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from __init__ import get_version


def format_datetime(value: Optional[str]) -> str:
    """Return human friendly datetime string."""
    if not value:
        return "-"
    try:
        cleaned = value.rstrip("Z")
        if "+" not in cleaned and len(cleaned) == 19:
            cleaned = f"{cleaned}+00:00"
        dt_obj = datetime.fromisoformat(cleaned)
        return dt_obj.strftime("%Y-%m-%d %H:%M")
    except Exception:
        return str(value)


def open_file_location(path: Path) -> None:
    """Open a path in the platform explorer."""
    try:
        if sys.platform.startswith("win"):
            os.startfile(path)  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            os.system(f'open "{path}"')
        else:
            os.system(f'xdg-open "{path}"')
    except Exception:
        messagebox.showinfo("Open Directory", str(path))
ACCOUNT_STATUS_CHOICES = [
    "free",
    "pro-trial",
    "pro",
    "pro+ plan",
    "ultra",
    "teams",
    "limit pro-trial",
    "limit pro",
]
DELETED_ACCOUNT_STATUS = "deleted"



class CursorManagerApp(ctk.CTk):
    """Main application window built with customtkinter."""

    def __init__(self) -> None:
        self.settings: SettingsManager = get_settings_manager()
        initial_mode = self._normalize_theme_mode(
            self.settings.get_section("appearance").get("mode", "dark")
        )
        ctk.set_appearance_mode(initial_mode)
        ctk.set_default_color_theme("dark-blue")

        super().__init__()

        self.title("Cursor Manager - Desktop")
        self.geometry("1280x820")
        self.minsize(1120, 720)

        # Backend services
        self.db = Database()
        self.event_service = EventService(self.db)
        self.account_service = AccountService(self.db, self.event_service)
        self.cards_service = CardsService(self.db, self.event_service)
        self.card_generator = CardGenerator()
        self.bypass_service = BypassService(self.db)
        self.pro_trial_service = ProTrialService(self.db, self.cards_service)
        self.export_service = ExportService(
            self.db, self.account_service, self.cards_service
        )
        self.import_service = ImportService(
            self.db, self.account_service, self.cards_service
        )
        self.status_service = StatusService(
            self.db, self.account_service, self.event_service
        )
        self.batch_service = BatchService(
            self.db, self.account_service, self.cards_service, self.event_service
        )

        self.scheduler_service = SchedulerService(self.settings)
        self.scheduler_history: List[Dict[str, Any]] = []
        self._history_lock = threading.Lock()
        self._register_scheduler_jobs()
        self.scheduler_service.start()

        self.theme_var = tk.StringVar(value=initial_mode)
        self.current_theme_mode = initial_mode
        self.status_var = tk.StringVar(value="Ready")

        self._configure_treeview_style()
        self._build_header()
        self._build_tabs()
        self._build_statusbar()

        self.after(200, self.refresh_all)
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    def _configure_treeview_style(self) -> None:
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass

        mode = ctk.get_appearance_mode().lower()
        if mode == "light":
            bg = "#ffffff"
            fg = "#1f1f1f"
            heading_bg = "#f1f1f1"
            heading_fg = "#1f1f1f"
            selected_bg = "#1f6aa5"
            selected_fg = "#ffffff"
        else:
            bg = "#1d1d1d"
            fg = "#e5e5e5"
            heading_bg = "#2a2a2a"
            heading_fg = "#ffffff"
            selected_bg = "#285A9D"
            selected_fg = "#ffffff"

        style.configure(
            "Cursor.Treeview",
            background=bg,
            foreground=fg,
            fieldbackground=bg,
            rowheight=30,
            borderwidth=0,
        )
        style.map(
            "Cursor.Treeview",
            background=[("selected", selected_bg)],
            foreground=[("selected", selected_fg)],
        )
        style.configure(
            "Cursor.Treeview.Heading",
            background=heading_bg,
            foreground=heading_fg,
            relief="flat",
        )

    def _normalize_theme_mode(self, mode: Optional[str]) -> str:
        candidate = (mode or "system").lower()
        return candidate if candidate in {"light", "dark", "system"} else "system"

    def get_theme_mode(self) -> str:
        return self.theme_var.get()

    def _apply_theme(self, mode: str) -> None:
        normalized = self._normalize_theme_mode(mode)
        if normalized == self.current_theme_mode:
            return
        self.current_theme_mode = normalized
        self.theme_var.set(normalized)
        ctk.set_appearance_mode(normalized)
        self.settings.update_section("appearance", {"mode": normalized})
        self._configure_treeview_style()
        self.refresh_all()

    def _on_theme_change(self, choice: str) -> None:
        self._apply_theme(choice)

    def _register_scheduler_jobs(self) -> None:
        self.scheduler_service.register_job(
            "refresh_accounts",
            self._job_refresh_accounts,
            default_interval=30,
            description="Tag accounts for background status refresh",
        )
        self.scheduler_service.register_job(
            "cleanup_bypass",
            self._job_cleanup_bypass,
            default_interval=1440,
            description="Prune bypass test results older than retention window",
        )
        self.scheduler_service.register_job(
            "prune_sync_events",
            self._job_prune_events,
            default_interval=60,
            description="Trim sync event log to keep realtime feed lean",
        )

    def _job_refresh_accounts(self) -> None:
        try:
            result = self.status_service.refresh_all_accounts(limit=50)
            summary = {
                "marked": result.get("total", 0),
                "status": result.get("status"),
            }
            self._record_job_run("refresh_accounts", True, summary)
        except Exception as exc:
            self._record_job_run(
                "refresh_accounts", False, {"error": str(exc)}
            )

    def _job_cleanup_bypass(self) -> None:
        try:
            result = self.bypass_service.delete_old_results(days=7)
            self._record_job_run(
                "cleanup_bypass",
                True,
                {"deleted": result.get("deleted_count", 0)},
            )
        except Exception as exc:
            self._record_job_run("cleanup_bypass", False, {"error": str(exc)})

    def _job_prune_events(self) -> None:
        try:
            deleted = self.event_service.prune(keep_hours=72)
            self._record_job_run(
                "prune_sync_events", True, {"deleted": deleted}
            )
        except Exception as exc:
            self._record_job_run("prune_sync_events", False, {"error": str(exc)})

    def _record_job_run(
        self, job_id: str, success: bool, details: Dict[str, Any]
    ) -> None:
        entry = {
            "job_id": job_id,
            "success": success,
            "details": details,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        with self._history_lock:
            self.scheduler_history.append(entry)
            self.scheduler_history = self.scheduler_history[-20:]
        self._notify_scheduler_observers()

    def _notify_scheduler_observers(self) -> None:
        def _safe_call(callback: Any) -> None:
            try:
                callback()
            except Exception:
                pass

        if hasattr(self, "dashboard_tab"):
            self.after(0, lambda: _safe_call(self.dashboard_tab.refresh_scheduler_summary))
        if hasattr(self, "settings_tab"):
            self.after(0, lambda: _safe_call(self.settings_tab.refresh_scheduler_section))

    def get_scheduler_history(self) -> List[Dict[str, Any]]:
        with self._history_lock:
            return list(self.scheduler_history)

    def refresh_scheduler(self) -> None:
        self.scheduler_service.refresh()

    def get_scheduler_config(self) -> Dict[str, Any]:
        return self.settings.get_section("scheduler")

    def get_recent_events(self, limit: int = 5) -> List[Dict[str, Any]]:
        data = self.event_service.get_events(after_id=None, limit=limit)
        events = data.get("events", [])
        return list(reversed(events))

    def _build_header(self) -> None:
        header = ctk.CTkFrame(self, corner_radius=12)
        header.pack(fill="x", padx=20, pady=(20, 10))

        title = ctk.CTkLabel(
            header,
            text="Cursor Manager Desktop",
            font=ctk.CTkFont(size=26, weight="bold"),
        )
        title.pack(side="left", padx=20, pady=16)

        controls = ctk.CTkFrame(header, fg_color="transparent")
        controls.pack(side="right", padx=20, pady=12)

        theme_menu = ctk.CTkOptionMenu(
            controls,
            values=["light", "dark", "system"],
            command=self._on_theme_change,
            variable=self.theme_var,
            width=120,
        )
        theme_menu.pack(side="right", padx=(8, 0))

        version_label = ctk.CTkLabel(
            controls,
            text=f"v{get_version()}",
            font=ctk.CTkFont(size=14),
        )
        version_label.pack(side="right", padx=(0, 8))

    def _build_tabs(self) -> None:
        self.tabview = ctk.CTkTabview(self, corner_radius=12)
        self.tabview.pack(fill="both", expand=True, padx=20, pady=(0, 20))

        dashboard_frame = self.tabview.add("Dashboard")
        accounts_frame = self.tabview.add("Accounts")
        cards_frame = self.tabview.add("Payment Cards")
        automation_frame = self.tabview.add("Automation")
        settings_frame = self.tabview.add("Settings")

        self.dashboard_tab = DashboardTab(dashboard_frame, self)
        self.accounts_tab = AccountsTab(accounts_frame, self)
        self.cards_tab = CardsTab(cards_frame, self)
        self.automation_tab = AutomationTab(automation_frame, self)
        self.settings_tab = SettingsTab(settings_frame, self)

    def _build_statusbar(self) -> None:
        bar = ctk.CTkFrame(self, corner_radius=12)
        bar.pack(fill="x", padx=20, pady=(0, 20))

        self.status_label = ctk.CTkLabel(bar, textvariable=self.status_var)
        self.status_label.pack(side="left", padx=20, pady=10)

        refresh_button = ctk.CTkButton(
            bar, text="Refresh All", command=self.refresh_all, width=120
        )
        refresh_button.pack(side="right", padx=20, pady=10)

    def refresh_all(self) -> None:
        try:
            self.dashboard_tab.refresh()
            self.accounts_tab.refresh()
            self.cards_tab.refresh()
            self.automation_tab.refresh()
            self.settings_tab.refresh()
            self.show_status("Data refreshed")
        except Exception as exc:  # pragma: no cover - defensive UI code
            self.handle_exception("Unable to refresh data", exc)

    def show_status(self, message: str) -> None:
        self.status_var.set(message)
        self.status_label.update_idletasks()

    def handle_exception(self, context: str, error: Exception) -> None:
        messagebox.showerror("Cursor Manager", f"{context}:\n{error}")

    def _on_close(self) -> None:
        try:
            self.scheduler_service.shutdown()
            self.db.close()
        finally:
            self.destroy()

    def run(self) -> None:
        self.mainloop()


# ---------------------------------------------------------------------------
# Dashboard Tab
# ---------------------------------------------------------------------------


class DashboardTab(ctk.CTkFrame):
    """Dashboard overview."""

    def __init__(self, parent: ctk.CTkFrame, app: CursorManagerApp) -> None:
        super().__init__(parent, fg_color="transparent")
        self.app = app
        self.pack(fill="both", expand=True)

        self._build_widgets()

    def _build_widgets(self) -> None:
        stats_frame = ctk.CTkFrame(self, corner_radius=12)
        stats_frame.pack(fill="x", pady=(0, 16))

        self.accounts_value = self._stat_block(
            stats_frame, "Accounts", "0", row=0, column=0
        )
        self.cards_value = self._stat_block(
            stats_frame, "Payment Cards", "0", row=0, column=1
        )
        self.bypass_value = self._stat_block(
            stats_frame, "Bypass Success", "0", row=0, column=2
        )
        self.protrial_value = self._stat_block(
            stats_frame, "Active Pro Trials", "0", row=0, column=3
        )

        stats_frame.grid_columnconfigure((0, 1, 2, 3), weight=1, uniform="stats")

        automation_frame = ctk.CTkFrame(self, corner_radius=12)
        automation_frame.pack(fill="x", pady=(0, 16))

        ctk.CTkLabel(
            automation_frame,
            text="Automation Snapshot",
            font=ctk.CTkFont(size=16, weight="bold"),
        ).pack(anchor="w", padx=20, pady=(18, 8))

        self.scheduler_summary_label = ctk.CTkLabel(
            automation_frame,
            text="Scheduler: loading…",
            justify="left",
        )
        self.scheduler_summary_label.pack(anchor="w", padx=20)

        self.events_summary_label = ctk.CTkLabel(
            automation_frame,
            text="Last sync event: -",
            justify="left",
        )
        self.events_summary_label.pack(anchor="w", padx=20, pady=(6, 12))

        activity_frame = ctk.CTkFrame(self, corner_radius=12)
        activity_frame.pack(fill="both", expand=True)

        ctk.CTkLabel(
            activity_frame,
            text="Recent Activity",
            font=ctk.CTkFont(size=16, weight="bold"),
        ).pack(anchor="w", padx=20, pady=(20, 10))

        self.activity_box = ctk.CTkTextbox(
            activity_frame,
            height=260,
            corner_radius=12,
            wrap="word",
        )
        self.activity_box.pack(fill="both", expand=True, padx=20, pady=(0, 20))
        self.activity_box.configure(state="disabled")

    def _stat_block(
        self, master: ctk.CTkFrame, title: str, value: str, row: int, column: int
    ) -> ctk.CTkLabel:
        block = ctk.CTkFrame(master, corner_radius=12)
        block.grid(row=row, column=column, padx=12, pady=16, sticky="nsew")

        ctk.CTkLabel(
            block, text=title, font=ctk.CTkFont(size=14, weight="bold")
        ).pack(pady=(18, 4))
        value_label = ctk.CTkLabel(
            block, text=value, font=ctk.CTkFont(size=26, weight="bold")
        )
        value_label.pack(pady=(0, 18))
        return value_label

    def refresh(self) -> None:
        accounts_stats = self.app.account_service.get_stats() or {}
        cards_stats = self.app.cards_service.get_stats() or {}

        try:
            bypass_stats = self.app.bypass_service.get_test_statistics() or {}
        except Exception:
            bypass_stats = {}

        try:
            pro_trial_stats = self.app.pro_trial_service.get_statistics() or {}
        except Exception:
            pro_trial_stats = {}

        overall_bypass = bypass_stats.get("overall", {})

        self.accounts_value.configure(text=str(accounts_stats.get("total", 0)))
        self.cards_value.configure(text=str(cards_stats.get("total", 0)))
        self.bypass_value.configure(
            text=str(overall_bypass.get("successful_tests", 0))
        )
        self.protrial_value.configure(
            text=str(pro_trial_stats.get("active_trials", 0))
        )

        self.refresh_scheduler_summary()

        lines: List[str] = []

        system_health = {}
        try:
            system_health = self.app.status_service.get_system_health() or {}
        except Exception:
            system_health = {}

        if system_health:
            timestamp = system_health.get("generated_at")
            if timestamp:
                lines.append(f"[System] Health check at {format_datetime(timestamp)}")
            accounts_info = system_health.get("accounts", {})
            cards_info = system_health.get("cards", {})
            lines.append(
                f"Accounts total={accounts_info.get('total', 0)} "
                f"premium={accounts_info.get('premium', 0)}"
            )
            lines.append(
                f"Cards total={cards_info.get('total', 0)} active={cards_info.get('active', 0)}"
            )

        try:
            history = self.app.batch_service.get_batch_history(limit=5)
            for item in history.get("operations", []):
                lines.append(
                    f"[Batch] {item.get('operation_type')} • status={item.get('status')} • "
                    f"{item.get('completed_items', 0)}/{item.get('total_items', 0)} "
                    f"({format_datetime(item.get('created_at'))})"
                )
        except Exception:
            pass

        try:
            events = self.app.get_recent_events(limit=5)
            for event in events:
                lines.append(
                    f"[Sync] {event.get('entity_type')}::{event.get('action')} "
                    f"(id={event.get('id')}) at {format_datetime(event.get('created_at'))}"
                )
        except Exception:
            pass

        if not lines:
            lines.append("No recent activity logged.")

        self.activity_box.configure(state="normal")
        self.activity_box.delete("1.0", tk.END)
        self.activity_box.insert("1.0", "\n".join(lines))
        self.activity_box.configure(state="disabled")

    def refresh_scheduler_summary(self) -> None:
        config = self.app.get_scheduler_config()
        jobs = config.get("jobs", {})
        enabled = bool(config.get("enabled", True))
        active_jobs = sum(1 for job in jobs.values() if job.get("enabled"))

        history = self.app.get_scheduler_history()
        if history:
            last = history[-1]
            status = "ok" if last.get("success") else "error"
            timestamp = format_datetime(last.get("timestamp"))
            details = last.get("details", {})
            if isinstance(details, dict):
                details = ", ".join(f"{k}={v}" for k, v in details.items())
            last_run = f"Last run: {last.get('job_id')} [{status}] at {timestamp} ({details})"
        else:
            last_run = "Last run: none yet."

        summary = (
            f"Scheduler: {'On' if enabled else 'Paused'} • "
            f"{active_jobs}/{len(jobs)} jobs active. {last_run}"
        )
        self.scheduler_summary_label.configure(text=summary)

        try:
            latest_event = self.app.get_recent_events(limit=1)
        except Exception:
            latest_event = []
        if latest_event:
            event = latest_event[0]
            event_text = (
                f"Last sync event: {event.get('entity_type')}::{event.get('action')} "
                f"(id={event.get('id')}) at {format_datetime(event.get('created_at'))}"
            )
        else:
            event_text = "Last sync event: none recorded yet."
        self.events_summary_label.configure(text=event_text)


# ---------------------------------------------------------------------------
# Accounts Tab
# ---------------------------------------------------------------------------


class AccountsTab(ctk.CTkFrame):
    """Account management tab."""

    def __init__(self, parent: ctk.CTkFrame, app: CursorManagerApp) -> None:
        super().__init__(parent, fg_color="transparent")
        self.app = app
        self.pack(fill="both", expand=True)

        self.status_options = ACCOUNT_STATUS_CHOICES.copy()
        self.accounts: List[Dict[str, Any]] = []
        self.search_var = tk.StringVar()
        self.status_var = tk.StringVar(value="all")

        self._build_toolbar()
        self._build_table()

    def _build_toolbar(self) -> None:
        toolbar = ctk.CTkFrame(self, corner_radius=12)
        toolbar.pack(fill="x", pady=(0, 12))

        search_entry = ctk.CTkEntry(
            toolbar,
            placeholder_text="Search email…",
            textvariable=self.search_var,
            width=260,
        )
        search_entry.pack(side="left", padx=(16, 8), pady=12)
        search_entry.bind("<Return>", lambda _event: self.refresh())

        status_menu = ctk.CTkOptionMenu(
            toolbar,
            values=["all"] + self.status_options,
            variable=self.status_var,
            command=lambda _value: self.refresh(),
        )
        status_menu.pack(side="left", padx=(0, 16))

        ctk.CTkButton(
            toolbar, text="Deleted Accounts", command=self._open_deleted_accounts
        ).pack(side="left", padx=(0, 16))

        ctk.CTkButton(toolbar, text="Add", command=self._open_add_dialog).pack(
            side="left", padx=6
        )
        ctk.CTkButton(toolbar, text="Edit", command=self._open_edit_dialog).pack(
            side="left", padx=6
        )
        ctk.CTkButton(toolbar, text="Delete", command=self._delete_account).pack(
            side="left", padx=6
        )
        ctk.CTkButton(toolbar, text="Import…", command=self._import_accounts).pack(
            side="left", padx=6
        )
        ctk.CTkButton(toolbar, text="Export…", command=self._export_accounts).pack(
            side="left", padx=6
        )
        ctk.CTkButton(toolbar, text="View Cookies", command=self._view_cookies).pack(
            side="left", padx=6
        )

    def _build_table(self) -> None:
        table_frame = ctk.CTkFrame(self, corner_radius=12)
        table_frame.pack(fill="both", expand=True, padx=4, pady=(0, 8))

        columns = ("email", "tags", "status", "created", "last_used")
        self.tree = ttk.Treeview(
            table_frame,
            columns=columns,
            show="headings",
            style="Cursor.Treeview",
        )
        self.tree.heading("email", text="Email")
        self.tree.heading("tags", text="Tags")
        self.tree.heading("status", text="Status")
        self.tree.heading("created", text="Created")
        self.tree.heading("last_used", text="Last Used")

        self.tree.column("email", width=320, anchor="w")
        self.tree.column("tags", width=200, anchor="w")
        self.tree.column("status", width=120, anchor="center")
        self.tree.column("created", width=180, anchor="center")
        self.tree.column("last_used", width=180, anchor="center")

        vsb = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        self.tree.bind("<Double-1>", self._on_tree_double_click)

        self.tree.pack(side="left", fill="both", expand=True, padx=(12, 0), pady=12)
        vsb.pack(side="right", fill="y", padx=(0, 12), pady=12)

    def refresh(self) -> None:
        data = self.app.account_service.get_all()
        accounts = data if isinstance(data, list) else data.get("accounts", [])
        accounts = [
            acc
            for acc in accounts
            if acc.get("status") and acc.get("status") != DELETED_ACCOUNT_STATUS
        ]
        search = self.search_var.get().strip().lower()
        status_filter = self.status_var.get()

        filtered: List[Dict[str, Any]] = []
        for account in accounts:
            matches_search = True
            matches_status = status_filter == "all"

            if search:
                matches_search = search in account.get("email", "").lower()

            if status_filter != "all":
                matches_status = account.get("status") == status_filter

            if matches_search and matches_status:
                filtered.append(account)

        self.accounts = filtered
        self.tree.delete(*self.tree.get_children())

        for account in filtered:
            self.tree.insert(
                "",
                tk.END,
                iid=str(account["id"]),
                values=(
                    account.get("email", "-"),
                    ", ".join(account.get("tags") or []),
                    account.get("status", "-"),
                    format_datetime(account.get("created_at")),
                    format_datetime(account.get("last_used")),
                ),
            )

    def _selected_account(self) -> Optional[Dict[str, Any]]:
        selection = self.tree.selection()
        if not selection:
            messagebox.showinfo("Accounts", "Select an account first.")
            return None
        account_id = int(selection[0])
        for account in self.accounts:
            if account.get("id") == account_id:
                return account
        return None

    def _open_add_dialog(self) -> None:
        dialog = AccountDialog(self.app, title="Add Account")
        self.wait_window(dialog)
        if dialog.result:
            try:
                account = self.app.account_service.create(
                    dialog.result["email"],
                    status=dialog.result["status"],
                    cookies=dialog.result.get("cookies"),
                    tags=dialog.result.get("tags"),
                )
                self.app.show_status(
                    f"Account created for {account.get('email', 'unnamed')}"
                )
            except Exception as exc:
                self.app.handle_exception("Unable to create account", exc)
        self.refresh()

    def _open_deleted_accounts(self) -> None:
        dialog = DeletedAccountsDialog(self.app)
        self.wait_window(dialog)
        self.refresh()

    def _open_edit_dialog(self) -> None:
        account = self._selected_account()
        if not account:
            return
        self._edit_account(account)

    def _on_tree_double_click(self, _event: tk.Event) -> None:
        account = self._selected_account()
        if account:
            self._open_detail_dialog(account)

    def _open_detail_dialog(self, account: Dict[str, Any]) -> None:
        AccountDetailDialog(
            self.app,
            account,
            allow_edit=True,
            on_edit=self._edit_account,
        )

    def _edit_account(self, account: Dict[str, Any]) -> None:
        dialog = AccountDialog(self.app, title="Edit Account", account=account)
        self.wait_window(dialog)
        if dialog.result:
            try:
                update_data = {
                    "email": dialog.result["email"],
                    "status": dialog.result.get("status"),
                    "tags": dialog.result.get("tags", []),
                }
                if not update_data["email"]:
                    update_data["email"] = account.get("email")
                if not update_data.get("status"):
                    update_data["status"] = account.get("status", ACCOUNT_STATUS_CHOICES[0])
                if dialog.result.get("cookies") is not None:
                    update_data["cookies"] = dialog.result["cookies"]
                self.app.account_service.update(account["id"], **update_data)
                self.app.show_status(f"Account updated: {dialog.result['email']}")
            except Exception as exc:
                self.app.handle_exception("Unable to update account", exc)
        self.refresh()

    def _delete_account(self) -> None:
        account = self._selected_account()
        if not account:
            return
        confirm = messagebox.askyesno(
            "Delete Account",
            f"Soft delete account {account.get('email')}?",
        )
        if not confirm:
            return
        try:
            self.app.account_service.delete(account["id"], soft=True)
            self.app.show_status(f"Account {account.get('email')} marked as deleted")
        except Exception as exc:
            self.app.handle_exception("Unable to delete account", exc)
        self.refresh()

    def _import_accounts(self) -> None:
        file_path = filedialog.askopenfilename(
            title="Import Accounts",
            filetypes=[("JSON Files", "*.json"), ("All Files", "*.*")],
        )
        if not file_path:
            return
        merge_choice = messagebox.askyesno(
            "Merge Strategy",
            "Update existing accounts when duplicates are found?",
        )
        strategy = "update" if merge_choice else "skip"
        try:
            result = self.app.import_service.import_accounts(
                Path(file_path).read_text(encoding="utf-8"), merge_strategy=strategy
            )
            summary = (
                f"{result.get('created', 0)} created, "
                f"{result.get('updated', 0)} updated, "
                f"{result.get('skipped', 0)} skipped."
            )
            messagebox.showinfo("Import Accounts", summary)
            self.app.show_status("Account import finished")
        except Exception as exc:
            self.app.handle_exception("Unable to import accounts", exc)
        self.refresh()

    def _export_accounts(self) -> None:
        file_path = filedialog.asksaveasfilename(
            title="Export Accounts",
            defaultextension=".json",
            filetypes=[("JSON", "*.json"), ("CSV", "*.csv")],
        )
        if not file_path:
            return
        export_format = "csv" if file_path.endswith(".csv") else "json"
        try:
            result = self.app.export_service.export_accounts(format=export_format)
            Path(file_path).write_text(result.get("data", ""), encoding="utf-8")
            self.app.show_status(f"Accounts exported to {Path(file_path).name}")
        except Exception as exc:
            self.app.handle_exception("Unable to export accounts", exc)

    def _view_cookies(self) -> None:
        account = self._selected_account()
        if not account:
            return
        cookies = account.get("cookies")
        if not cookies:
            messagebox.showinfo("Cookies", "Account has no stored cookies.")
            return
        dialog = ctk.CTkToplevel(self)
        dialog.title(f"Cookies - {account.get('email')}")
        dialog.geometry("620x420")
        dialog.transient(self)
        dialog.grab_set()

        textbox = ctk.CTkTextbox(dialog, wrap="word")
        textbox.pack(fill="both", expand=True, padx=20, pady=20)
        textbox.insert("1.0", json.dumps(cookies, indent=2, ensure_ascii=False))
        textbox.configure(state="disabled")

        ctk.CTkButton(dialog, text="Close", command=dialog.destroy).pack(
            pady=(0, 20)
        )


class DeletedAccountsDialog(ctk.CTkToplevel):
    """Dialog menampilkan akun berstatus deleted."""

    def __init__(self, app: CursorManagerApp) -> None:
        super().__init__(app)
        self.app = app
        self.title("Deleted Accounts")
        self.geometry("760x480")
        self.transient(app)
        self.grab_set()

        self.app._configure_treeview_style()
        self.accounts: List[Dict[str, Any]] = []

        container = ctk.CTkFrame(self, corner_radius=12)
        container.pack(fill="both", expand=True, padx=20, pady=(20, 10))

        columns = ("email", "tags", "updated")
        self.tree = ttk.Treeview(
            container, columns=columns, show="headings", style="Cursor.Treeview"
        )
        self.tree.heading("email", text="Email")
        self.tree.heading("tags", text="Tags")
        self.tree.heading("updated", text="Updated")

        self.tree.column("email", width=320, anchor="w")
        self.tree.column("tags", width=200, anchor="w")
        self.tree.column("updated", width=180, anchor="center")

        vsb = ttk.Scrollbar(container, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)

        self.tree.pack(side="left", fill="both", expand=True)
        vsb.pack(side="right", fill="y", padx=(8, 0))
        self.tree.bind("<Double-1>", self._on_row_double_click)

        button_row = ctk.CTkFrame(self, fg_color="transparent")
        button_row.pack(fill="x", padx=20, pady=(0, 20))

        ctk.CTkButton(
            button_row,
            text="Delete Permanently",
            fg_color="#f44336",
            hover_color="#d32f2f",
            command=self._delete_permanently,
            width=160,
        ).pack(side="left")

        ctk.CTkButton(
            button_row,
            text="Restore",
            command=self._restore_account,
            width=130,
        ).pack(side="right", padx=(0, 12))
        ctk.CTkButton(button_row, text="Close", command=self._close, width=120).pack(
            side="right"
        )

        self.bind("<Escape>", lambda _event: self._close())

        self._load_accounts()
        self.update_idletasks()
        self.minsize(self.winfo_width(), self.winfo_height())

    def _load_accounts(self) -> None:
        try:
            data = self.app.account_service.get_all(status=DELETED_ACCOUNT_STATUS)
        except Exception as exc:
            messagebox.showerror("Deleted Accounts", str(exc), parent=self)
            return

        accounts = data if isinstance(data, list) else data.get("accounts", [])
        self.accounts = accounts
        self.tree.delete(*self.tree.get_children())

        if not accounts:
            self.tree.insert("", tk.END, values=("-", "-", "-"))
            return

        for acc in accounts:
            self.tree.insert(
                "",
                tk.END,
                values=(
                    acc.get("email", "-"),
                    ", ".join(acc.get("tags") or []),
                    format_datetime(acc.get("updated_at")),
                ),
            )

    def _selected_account(self, show_warning: bool = True) -> Optional[Dict[str, Any]]:
        selection = self.tree.selection()
        if not selection:
            if show_warning:
                messagebox.showinfo("Deleted Accounts", "Select an account first.", parent=self)
            return None
        if not self.accounts:
            if show_warning:
                messagebox.showinfo("Deleted Accounts", "No deleted accounts available.", parent=self)
            return None
        try:
            index = self.tree.index(selection[0])
        except Exception:
            if show_warning:
                messagebox.showinfo("Deleted Accounts", "Unable to resolve selected entry.", parent=self)
            return None
        if index >= len(self.accounts):
            if show_warning:
                messagebox.showinfo("Deleted Accounts", "Selected account not found.", parent=self)
            return None
        return self.accounts[index]


    def _on_row_double_click(self, _event: tk.Event) -> None:
        account = self._selected_account(show_warning=False)
        if not account:
            return
        AccountDetailDialog(
            self.app,
            account,
            allow_edit=False,
        )

    def _restore_account(self) -> None:
        account = self._selected_account()
        if not account:
            return
        account_id = account.get("id")
        if account_id is None:
            messagebox.showerror("Restore Account", "Account record is missing an id.", parent=self)
            return
        email = account.get("email", "-")
        if not messagebox.askyesno("Restore Account", f"Restore account {email}?", parent=self):
            return
        try:
            restored = self.app.account_service.update(
                account_id, status=ACCOUNT_STATUS_CHOICES[0]
            )
        except Exception as exc:
            self.app.handle_exception("Unable to restore account", exc)
            return
        restored_status = restored.get("status") if isinstance(restored, dict) else ACCOUNT_STATUS_CHOICES[0]
        self.app.show_status(f"Account {email} restored (status={restored_status})")
        self._load_accounts()
        if hasattr(self.app, "accounts_tab") and self.app.accounts_tab:
            self.app.accounts_tab.refresh()

    def _delete_permanently(self) -> None:
        account = self._selected_account()
        if not account:
            return
        account_id = account.get("id")
        if account_id is None:
            messagebox.showerror("Delete Account", "Account record is missing an id.", parent=self)
            return
        email = account.get("email", "-")
        if not messagebox.askyesno("Delete Account", f"Permanently delete {email}? This cannot be undone.", parent=self):
            return
        try:
            self.app.account_service.delete(account_id, soft=False)
        except Exception as exc:
            self.app.handle_exception("Unable to permanently delete account", exc)
            return
        self.app.show_status(f"Account {email} permanently deleted")
        self._load_accounts()
        if hasattr(self.app, "accounts_tab") and self.app.accounts_tab:
            self.app.accounts_tab.refresh()

    def _close(self) -> None:
        self.destroy()

class AccountDetailDialog(ctk.CTkToplevel):
    """Read-only dialog to inspect account details."""

    def __init__(
        self,
        app: CursorManagerApp,
        account: Dict[str, Any],
        allow_edit: bool = True,
        on_edit: Optional[Any] = None,
    ) -> None:
        super().__init__(app)
        self.app = app
        self.account = account
        self.allow_edit = allow_edit
        self.on_edit = on_edit

        self.title("Account Details")
        self.geometry("560x520")
        self.transient(app)
        self.grab_set()

        container = ctk.CTkFrame(self, corner_radius=12)
        container.pack(fill="both", expand=True, padx=20, pady=(20, 10))

        def add_entry(label: str, value: str) -> ctk.CTkEntry:
            ctk.CTkLabel(container, text=label, anchor="w").pack(
                fill="x", pady=(0, 4)
            )
            entry = ctk.CTkEntry(container)
            entry.insert(0, value or "-")
            entry.configure(state="disabled")
            entry.pack(fill="x", pady=(0, 12))
            return entry

        add_entry("Email", account.get("email", ""))
        add_entry("Status", account.get("status", ""))
        add_entry("Tags", ", ".join(account.get("tags") or []))

        meta_frame = ctk.CTkFrame(container, corner_radius=10)
        meta_frame.pack(fill="x", pady=(0, 12))
        ctk.CTkLabel(
            meta_frame,
            text=f"Created: {format_datetime(account.get('created_at'))}",
            anchor="w",
        ).pack(fill="x", pady=(6, 0), padx=8)
        ctk.CTkLabel(
            meta_frame,
            text=f"Updated: {format_datetime(account.get('updated_at'))}",
            anchor="w",
        ).pack(fill="x", pady=2, padx=8)
        ctk.CTkLabel(
            meta_frame,
            text=f"Last used: {format_datetime(account.get('last_used'))}",
            anchor="w",
        ).pack(fill="x", pady=(0, 6), padx=8)

        ctk.CTkLabel(
            container,
            text="Cookies (read only)",
            anchor="w",
            font=ctk.CTkFont(weight="bold"),
        ).pack(fill="x", pady=(8, 4))
        cookies_box = ctk.CTkTextbox(container, height=200, wrap="word")
        cookies_box.pack(fill="both", expand=True)
        cookies = account.get("cookies")
        if cookies:
            cookies_box.insert(
                "1.0", json.dumps(cookies, indent=2, ensure_ascii=False)
            )
        else:
            cookies_box.insert("1.0", "No cookies stored.")
        cookies_box.configure(state="disabled")

        button_row = ctk.CTkFrame(self, fg_color="transparent")
        button_row.pack(fill="x", padx=20, pady=(10, 20))

        close_button = ctk.CTkButton(button_row, text="Close", command=self._close)
        close_button.pack(side="right", padx=(0, 8))

        edit_kwargs: Dict[str, Any] = {
            "text": "Open Edit",
            "width": 130,
        }
        if allow_edit and on_edit:
            edit_button = ctk.CTkButton(
                button_row,
                command=self._trigger_edit,
                **edit_kwargs,
            )
            edit_button.pack(side="right", padx=(0, 12))
        else:
            edit_button = ctk.CTkButton(
                button_row,
                state="disabled",
                fg_color="gray35",
                hover=False,
                **edit_kwargs,
            )
            edit_button.pack(side="right", padx=(0, 12))

        self.bind("<Escape>", lambda _event: self._close())
        self.update_idletasks()
        self.minsize(self.winfo_width(), self.winfo_height())

    def _trigger_edit(self) -> None:
        if self.allow_edit and self.on_edit:
            self.destroy()
            self.on_edit(self.account)

    def _close(self) -> None:
        self.destroy()




class AccountDialog(ctk.CTkToplevel):
    """Modal dialog for creating or editing accounts."""

    def __init__(
        self,
        app: CursorManagerApp,
        title: str,
        account: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(app)
        self.app = app
        self.result: Optional[Dict[str, Any]] = None

        self.title(title)
        self.geometry("540x500")
        self.transient(app)
        self.grab_set()

        self.email_var = tk.StringVar(value=account.get("email", "") if account else "")
        default_status = account.get("status") if account else ACCOUNT_STATUS_CHOICES[0]
        if default_status not in ACCOUNT_STATUS_CHOICES:
            default_status = ACCOUNT_STATUS_CHOICES[0]
        self.status_var = tk.StringVar(value=default_status)
        self.tags_var = tk.StringVar(
            value=", ".join(account.get("tags") or []) if account else ""
        )

        container = ctk.CTkFrame(self, corner_radius=12)
        container.pack(fill="both", expand=True, padx=20, pady=(20, 10))

        ctk.CTkLabel(container, text="Email").pack(anchor="w", pady=(12, 4))
        self.email_entry = ctk.CTkEntry(container, textvariable=self.email_var)
        self.email_entry.pack(fill="x")

        ctk.CTkLabel(container, text="Status").pack(anchor="w", pady=(16, 4))
        ctk.CTkOptionMenu(
            container,
            values=ACCOUNT_STATUS_CHOICES,
            variable=self.status_var,
        ).pack(fill="x")

        ctk.CTkLabel(container, text="Tags (comma separated)").pack(
            anchor="w", pady=(16, 4)
        )
        ctk.CTkEntry(container, textvariable=self.tags_var).pack(fill="x")

        ctk.CTkLabel(container, text="Cookies (JSON)").pack(anchor="w", pady=(16, 4))
        self.cookies_box = ctk.CTkTextbox(container, height=180, wrap="word")
        self.cookies_box.pack(fill="both", expand=True)

        if account and account.get("cookies"):
            self.cookies_box.insert(
                "1.0", json.dumps(account["cookies"], indent=2, ensure_ascii=False)
            )

        button_row = ctk.CTkFrame(self, fg_color="transparent")
        button_row.pack(fill="x", padx=20, pady=(0, 20))

        ctk.CTkButton(
            button_row, text="Cancel", fg_color="gray30", command=self._cancel
        ).pack(side="right", padx=(0, 12))
        ctk.CTkButton(
            button_row, text="Save", command=self._save, width=120
        ).pack(side="right")

        self.bind("<Return>", lambda _event: self._save())
        self.bind("<Escape>", lambda _event: self._cancel())
        self.after(100, self._focus_initial)
        self.update_idletasks()
        self.minsize(self.winfo_width(), self.winfo_height())

    def _focus_initial(self) -> None:
        if self.email_entry.get().strip():
            self.cookies_box.focus_set()
        else:
            self.email_entry.focus_set()

    def _save(self) -> None:
        email = self.email_var.get().strip()
        status = self.status_var.get()
        if status not in ACCOUNT_STATUS_CHOICES:
            status = ACCOUNT_STATUS_CHOICES[0]
        tags = [tag.strip() for tag in self.tags_var.get().split(",") if tag.strip()]

        cookies_raw = self.cookies_box.get("1.0", tk.END).strip()
        cookies: Optional[Any] = None
        if cookies_raw:
            try:
                cookies = json.loads(cookies_raw)
            except json.JSONDecodeError as exc:
                messagebox.showerror(
                    "Validation",
                    f"Cookies must be valid JSON.\n{exc}",
                    parent=self,
                )
                return

        self.result = {
            "email": email,
            "status": status,
            "cookies": cookies,
            "tags": tags,
        }
        self.destroy()

    def _cancel(self) -> None:
        self.result = None
        self.destroy()


# ---------------------------------------------------------------------------
# Payment Cards Tab
# ---------------------------------------------------------------------------


class CardsTab(ctk.CTkFrame):
    """Payment card management tab."""

    def __init__(self, parent: ctk.CTkFrame, app: CursorManagerApp) -> None:
        super().__init__(parent, fg_color="transparent")
        self.app = app
        self.pack(fill="both", expand=True)

        self.cards: List[Dict[str, Any]] = []
        self.search_var = tk.StringVar()

        self._build_toolbar()
        self._build_table()

    def _build_toolbar(self) -> None:
        toolbar = ctk.CTkFrame(self, corner_radius=12)
        toolbar.pack(fill="x", pady=(0, 12))

        search_entry = ctk.CTkEntry(
            toolbar,
            placeholder_text="Search card holder or number…",
            textvariable=self.search_var,
            width=320,
        )
        search_entry.pack(side="left", padx=(16, 12), pady=12)
        search_entry.bind("<Return>", lambda _event: self.refresh())

        ctk.CTkButton(toolbar, text="Add Card", command=self._open_add_dialog).pack(
            side="left", padx=6
        )
        ctk.CTkButton(toolbar, text="Edit", command=self._open_edit_dialog).pack(
            side="left", padx=6
        )
        ctk.CTkButton(toolbar, text="Delete", command=self._delete_card).pack(
            side="left", padx=6
        )
        ctk.CTkButton(toolbar, text="Generate…", command=self._open_generator).pack(
            side="left", padx=6
        )
        ctk.CTkButton(toolbar, text="Export…", command=self._export_cards).pack(
            side="left", padx=6
        )

    def _build_table(self) -> None:
        table_frame = ctk.CTkFrame(self, corner_radius=12)
        table_frame.pack(fill="both", expand=True, padx=4, pady=(0, 8))

        columns = (
            "card_number",
            "card_holder",
            "tags",
            "expiry",
            "status",
            "created",
            "last_used",
        )
        self.tree = ttk.Treeview(
            table_frame,
            columns=columns,
            show="headings",
            style="Cursor.Treeview",
        )
        self.tree.heading("card_number", text="Card Number")
        self.tree.heading("card_holder", text="Card Holder")
        self.tree.heading("tags", text="Tags")
        self.tree.heading("expiry", text="Expiry")
        self.tree.heading("status", text="Status")
        self.tree.heading("created", text="Created")
        self.tree.heading("last_used", text="Last Used")

        self.tree.column("card_number", width=220, anchor="center")
        self.tree.column("card_holder", width=200, anchor="w")
        self.tree.column("tags", width=180, anchor="w")
        self.tree.column("expiry", width=100, anchor="center")
        self.tree.column("status", width=100, anchor="center")
        self.tree.column("created", width=160, anchor="center")
        self.tree.column("last_used", width=160, anchor="center")

        vsb = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)

        self.tree.pack(side="left", fill="both", expand=True, padx=(12, 0), pady=12)
        vsb.pack(side="right", fill="y", padx=(0, 12), pady=12)

    def refresh(self) -> None:
        data = self.app.cards_service.get_all()
        cards = data if isinstance(data, list) else data.get("cards", [])
        search = self.search_var.get().strip().lower()

        filtered: List[Dict[str, Any]] = []
        for card in cards:
            matches = True
            if search:
                matches = (
                    search in (card.get("card_holder", "").lower())
                    or search in str(card.get("card_number", "")).lower()
                )
            if matches:
                filtered.append(card)

        self.cards = filtered
        self.tree.delete(*self.tree.get_children())

        for card in filtered:
            self.tree.insert(
                "",
                tk.END,
                iid=str(card["id"]),
                values=(
                    card.get("card_number", "-"),
                    card.get("card_holder", "-"),
                    ", ".join(card.get("tags") or []),
                    card.get("expiry", "-"),
                    card.get("status", "-"),
                    format_datetime(card.get("created_at")),
                    format_datetime(card.get("last_used")),
                ),
            )

    def _selected_card(self) -> Optional[Dict[str, Any]]:
        selection = self.tree.selection()
        if not selection:
            messagebox.showinfo("Payment Cards", "Select a card first.")
            return None
        card_id = int(selection[0])
        for card in self.cards:
            if card.get("id") == card_id:
                return card
        return None

    def _open_add_dialog(self) -> None:
        dialog = CardDialog(self.app, title="Add Card")
        self.wait_window(dialog)
        if dialog.result:
            try:
                self.app.cards_service.create(
                    dialog.result["card_number"],
                    dialog.result["card_holder"],
                    dialog.result["expiry"],
                    dialog.result["cvv"],
                    dialog.result.get("tags"),
                )
                self.app.show_status("Payment card added")
            except Exception as exc:
                self.app.handle_exception("Unable to add card", exc)
        self.refresh()

    def _open_edit_dialog(self) -> None:
        card = self._selected_card()
        if not card:
            return

        dialog = CardDialog(self.app, title="Edit Card", card=card)
        self.wait_window(dialog)
        if dialog.result:
            try:
                self.app.cards_service.update(card["id"], **dialog.result)
                self.app.show_status("Payment card updated")
            except Exception as exc:
                self.app.handle_exception("Unable to update card", exc)
        self.refresh()

    def _delete_card(self) -> None:
        card = self._selected_card()
        if not card:
            return
        card_number = card.get("card_number", "-")
        confirm = messagebox.askyesno(
            "Delete Card",
            f"Remove card {card_number}?",
        )
        if not confirm:
            return
        try:
            self.app.cards_service.delete(card["id"], soft=False)
            self.app.show_status("Card deleted")
        except Exception as exc:
            self.app.handle_exception("Unable to delete card", exc)
        self.refresh()

    def _export_cards(self) -> None:
        file_path = filedialog.asksaveasfilename(
            title="Export Cards",
            defaultextension=".csv",
            filetypes=[("CSV", "*.csv"), ("JSON", "*.json")],
        )
        if not file_path:
            return
        export_format = "json" if file_path.endswith(".json") else "csv"
        try:
            result = self.app.export_service.export_cards(format=export_format)
            Path(file_path).write_text(result.get("data", ""), encoding="utf-8")
            self.app.show_status(f"Cards exported to {Path(file_path).name}")
        except Exception as exc:
            self.app.handle_exception("Unable to export cards", exc)

    def _open_generator(self) -> None:
        self.app.automation_tab.open_generator_dialog(parent=self)


class CardDialog(ctk.CTkToplevel):
    """Modal dialog for adding or editing cards."""

    def __init__(
        self,
        app: CursorManagerApp,
        title: str,
        card: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(app)
        self.app = app
        self.result: Optional[Dict[str, Any]] = None

        self.title(title)
        self.geometry("420x420")
        self.transient(app)
        self.grab_set()

        self.card_number_var = tk.StringVar(
            value=card.get("card_number", "") if card else ""
        )
        self.card_holder_var = tk.StringVar(
            value=card.get("card_holder", "") if card else ""
        )
        self.expiry_var = tk.StringVar(value=card.get("expiry", "") if card else "")
        self.cvv_var = tk.StringVar(value=card.get("cvv", "") if card else "")
        self.status_var = tk.StringVar(
            value=card.get("status", "active") if card else "active"
        )
        self.tags_var = tk.StringVar(
            value=", ".join(card.get("tags") or []) if card else ""
        )

        container = ctk.CTkFrame(self, corner_radius=12)
        container.pack(fill="both", expand=True, padx=20, pady=(20, 10))

        ctk.CTkLabel(container, text="Card Number").pack(anchor="w", pady=(12, 4))
        self.card_number_entry = ctk.CTkEntry(
            container, textvariable=self.card_number_var
        )
        self.card_number_entry.pack(fill="x")

        ctk.CTkLabel(container, text="Card Holder").pack(anchor="w", pady=(16, 4))
        ctk.CTkEntry(container, textvariable=self.card_holder_var).pack(fill="x")

        ctk.CTkLabel(container, text="Expiry (MM/YY)").pack(anchor="w", pady=(16, 4))
        ctk.CTkEntry(container, textvariable=self.expiry_var).pack(fill="x")

        ctk.CTkLabel(container, text="CVV").pack(anchor="w", pady=(16, 4))
        ctk.CTkEntry(container, textvariable=self.cvv_var).pack(fill="x")

        ctk.CTkLabel(container, text="Tags (comma separated)").pack(
            anchor="w", pady=(16, 4)
        )
        ctk.CTkEntry(container, textvariable=self.tags_var).pack(fill="x")

        ctk.CTkLabel(container, text="Status").pack(anchor="w", pady=(16, 4))
        ctk.CTkOptionMenu(
            container,
            values=["active", "inactive", "deleted"],
            variable=self.status_var,
        ).pack(fill="x")

        button_row = ctk.CTkFrame(self, fg_color="transparent")
        button_row.pack(fill="x", padx=20, pady=(0, 20))

        ctk.CTkButton(
            button_row, text="Cancel", fg_color="gray30", command=self._cancel
        ).pack(side="right", padx=(0, 12))
        ctk.CTkButton(
            button_row, text="Save", command=self._save, width=120
        ).pack(side="right")

        self.bind("<Return>", lambda _event: self._save())
        self.bind("<Escape>", lambda _event: self._cancel())
        self.after(100, self.card_number_entry.focus_set)
        self.update_idletasks()
        self.minsize(self.winfo_width(), self.winfo_height())

    def _save(self) -> None:
        card_number = self.card_number_var.get().strip()
        card_holder = self.card_holder_var.get().strip()
        expiry = self.expiry_var.get().strip()
        cvv = self.cvv_var.get().strip()
        tags = [tag.strip() for tag in self.tags_var.get().split(",") if tag.strip()]

        if not card_number or not card_holder or not expiry or not cvv:
            messagebox.showerror(
                "Validation", "All fields are required.", parent=self
            )
            return

        self.result = {
            "card_number": card_number,
            "card_holder": card_holder,
            "expiry": expiry,
            "cvv": cvv,
            "status": self.status_var.get(),
            "tags": tags,
        }
        self.destroy()

    def _cancel(self) -> None:
        self.result = None
        self.destroy()


# ---------------------------------------------------------------------------
# Automation Tab (Generator + ProTrial)
# ---------------------------------------------------------------------------


class AutomationTab(ctk.CTkFrame):
    """Automation utilities (generator, bypass, pro-trial)."""

    def __init__(self, parent: ctk.CTkFrame, app: CursorManagerApp) -> None:
        super().__init__(parent, fg_color="transparent")
        self.app = app
        self.pack(fill="both", expand=True)

        self.generator_panel = GeneratorPanel(self, app)
        self.generator_panel.pack(fill="x", padx=4, pady=(0, 16))

        self.bypass_panel = BypassPanel(self, app)
        self.bypass_panel.pack(fill="both", expand=True, padx=4, pady=(0, 16))

        self.pro_trial_panel = ProTrialPanel(self, app)
        self.pro_trial_panel.pack(fill="both", expand=True, padx=4, pady=(0, 8))

    def refresh(self) -> None:
        self.bypass_panel.refresh()
        self.pro_trial_panel.refresh()

    def open_generator_dialog(self, parent: tk.Widget) -> None:
        self.generator_panel.open_dialog(parent=parent)


class GeneratorPanel(ctk.CTkFrame):
    """Card generator panel that integrates with backend service."""

    def __init__(self, parent: ctk.CTkFrame, app: CursorManagerApp) -> None:
        super().__init__(parent, corner_radius=12)
        self.app = app

        self.bin_var = tk.StringVar()
        self.quantity_var = tk.IntVar(value=5)
        self.month_var = tk.StringVar()
        self.year_var = tk.StringVar()
        self.cvv_var = tk.StringVar()

        self._build_widgets()

    def _build_widgets(self) -> None:
        ctk.CTkLabel(
            self,
            text="Quick Card Generator",
            font=ctk.CTkFont(size=18, weight="bold"),
        ).grid(row=0, column=0, columnspan=6, sticky="w", padx=20, pady=(16, 10))

        ctk.CTkLabel(self, text="BIN").grid(row=1, column=0, padx=20, sticky="w")
        ctk.CTkEntry(self, textvariable=self.bin_var, width=160).grid(
            row=1, column=1, sticky="w"
        )

        ctk.CTkLabel(self, text="Quantity").grid(row=1, column=2, padx=20, sticky="w")
        ctk.CTkEntry(self, textvariable=self.quantity_var, width=100).grid(
            row=1, column=3, sticky="w"
        )

        ctk.CTkLabel(self, text="Expiry (MM)").grid(row=2, column=0, padx=20, sticky="w")
        ctk.CTkEntry(self, textvariable=self.month_var, width=160).grid(
            row=2, column=1, sticky="w"
        )

        ctk.CTkLabel(self, text="Expiry (YY)").grid(row=2, column=2, padx=20, sticky="w")
        ctk.CTkEntry(self, textvariable=self.year_var, width=100).grid(
            row=2, column=3, sticky="w"
        )

        ctk.CTkLabel(self, text="CVV").grid(row=2, column=4, padx=20, sticky="w")
        ctk.CTkEntry(self, textvariable=self.cvv_var, width=100).grid(
            row=2, column=5, sticky="w"
        )

        self.preview_box = ctk.CTkTextbox(self, height=120, wrap="none")
        self.preview_box.grid(
            row=3,
            column=0,
            columnspan=6,
            padx=20,
            pady=(16, 10),
            sticky="nsew",
        )

        button_row = ctk.CTkFrame(self, fg_color="transparent")
        button_row.grid(row=4, column=0, columnspan=6, sticky="e", padx=20, pady=(0, 16))

        ctk.CTkButton(
            button_row, text="Generate", command=lambda: self._generate(False), width=140
        ).pack(side="right", padx=6)
        ctk.CTkButton(
            button_row,
            text="Generate & Store",
            command=lambda: self._generate(True),
            width=160,
        ).pack(side="right", padx=6)

        self.grid_columnconfigure((0, 1, 2, 3, 4, 5), weight=1)
        self.grid_rowconfigure(3, weight=1)

    def _generate(self, store: bool) -> None:
        try:
            quantity = max(1, int(self.quantity_var.get()))
        except ValueError:
            messagebox.showerror(
                "Generator", "Quantity must be a positive integer.", parent=self
            )
            return

        try:
            cards = self.app.card_generator.generate_multiple_cards(
                quantity=quantity,
                bin_code=self.bin_var.get() or None,
                month=self.month_var.get() or None,
                year=self.year_var.get() or None,
                cvv=self.cvv_var.get() or None,
            )
        except Exception as exc:
            self.app.handle_exception("Unable to generate cards", exc)
            return

        lines = [
            f"{item['number']} | {item['expiry']} | {item['cvv']} | {item['card_type'].title()}"
            for item in cards
        ]
        self.preview_box.delete("1.0", tk.END)
        self.preview_box.insert("1.0", "\n".join(lines))

        if store:
            stored = 0
            for item in cards:
                try:
                    self.app.cards_service.create(
                        item["number"],
                        f"{item['card_type'].title()} Card",
                        item["expiry"],
                        item["cvv"],
                    )
                    stored += 1
                except Exception as exc:
                    self.app.handle_exception("Unable to store generated card", exc)
                    break
        if stored:
            self.app.show_status(f"Stored {stored} generated cards")

    def open_dialog(self, parent: tk.Widget) -> None:
        dialog = ctk.CTkToplevel(parent)
        dialog.title("Quick Card Generator")
        dialog.geometry("540x360")
        dialog.transient(parent)
        dialog.grab_set()

        temp_panel = GeneratorPanel(dialog, self.app)
        temp_panel.pack(fill="both", expand=True, padx=20, pady=20)


class BypassPanel(ctk.CTkFrame):
    """Panel to browse bypass suites and historical results."""

    def __init__(self, parent: ctk.CTkFrame, app: CursorManagerApp) -> None:
        super().__init__(parent, corner_radius=12)
        self.app = app
        self.suites: Dict[str, List[Dict[str, Any]]] = {}
        self.selected_suite = tk.StringVar()

        self._build_widgets()

    def _build_widgets(self) -> None:
        header = ctk.CTkLabel(
            self,
            text="Bypass Test Suites",
            font=ctk.CTkFont(size=18, weight="bold"),
        )
        header.grid(row=0, column=0, columnspan=4, sticky="w", padx=20, pady=(20, 10))

        ctk.CTkLabel(self, text="Suite").grid(row=1, column=0, padx=20, sticky="w")
        self.suite_menu = ctk.CTkOptionMenu(
            self,
            values=["Loading..."],
            variable=self.selected_suite,
        )
        self.suite_menu.grid(row=1, column=1, sticky="w")

        button_row = ctk.CTkFrame(self, fg_color="transparent")
        button_row.grid(row=1, column=2, columnspan=2, sticky="e", padx=20)

        ctk.CTkButton(
            button_row, text="View Payloads", command=self._show_suite_payloads, width=130
        ).pack(side="left", padx=6)
        ctk.CTkButton(
            button_row, text="Load Results", command=self._load_results, width=120
        ).pack(side="left", padx=6)
        ctk.CTkButton(
            button_row, text="Export JSON", command=lambda: self._export_results("json"), width=120
        ).pack(side="left", padx=6)
        ctk.CTkButton(
            button_row, text="Export CSV", command=lambda: self._export_results("csv"), width=120
        ).pack(side="left", padx=6)
        ctk.CTkButton(
            button_row, text="Delete Old", command=self._delete_old_results, width=120, fg_color="#8b1a1a"
        ).pack(side="left", padx=6)

        self.stats_label = ctk.CTkLabel(
            self,
            text="Stats: -",
            justify="left",
        )
        self.stats_label.grid(row=2, column=0, columnspan=4, sticky="w", padx=20, pady=(10, 0))

        self.output_box = ctk.CTkTextbox(self, height=220, wrap="word")
        self.output_box.grid(
            row=3, column=0, columnspan=4, sticky="nsew", padx=20, pady=(10, 20)
        )
        self.output_box.configure(state="disabled")

        self.grid_columnconfigure((0, 1, 2, 3), weight=1)
        self.grid_rowconfigure(3, weight=1)

    def refresh(self) -> None:
        try:
            data = self.app.bypass_service.get_all_test_suites()
        except Exception as exc:
            self.app.handle_exception("Unable to load bypass suites", exc)
            return

        self.suites = data.get("test_suites", {})
        values = list(self.suites.keys()) or ["No suites"]
        self.suite_menu.configure(values=values)
        if values:
            self.selected_suite.set(values[0])
        self._update_stats()

    def _current_suite(self) -> Optional[str]:
        suite = self.selected_suite.get()
        if not suite or suite == "No suites":
            return None
        return suite

    def _show_suite_payloads(self) -> None:
        suite_name = self._current_suite()
        if not suite_name:
            messagebox.showinfo("Bypass Suites", "No suite selected.")
            return
        tests = self.suites.get(suite_name, [])
        lines = []
        for test in tests:
            parts = []
            if "description" in test:
                parts.append(test["description"])
            for key, value in test.items():
                if key != "description":
                    parts.append(f"{key}: {value}")
            lines.append(" • ".join(parts))
        if not lines:
            lines.append("No payload definitions available.")
        self._write_output("\n".join(lines))

    def _load_results(self) -> None:
        suite_name = self._current_suite()
        test_type = suite_name if suite_name else None
        try:
            results = self.app.bypass_service.get_test_results(
                limit=50, test_type=test_type
            )
        except Exception as exc:
            self.app.handle_exception("Unable to load bypass results", exc)
            return

        lines = []
        for result in results.get("results", []):
            status = "PASS" if result.get("success") else "FAIL"
            lines.append(
                f"[{status}] {format_datetime(result.get('created_at'))} • "
                f"{result.get('target_url', '-')}\nPayload: {result.get('payload', '-')}"
            )
        if not lines:
            lines.append("No results available.")
        self._write_output("\n\n".join(lines))
        self._update_stats()

    def _export_results(self, fmt: str) -> None:
        suite_name = self._current_suite()
        test_type = suite_name if suite_name else None
        filetypes = [("JSON", "*.json")] if fmt == "json" else [("CSV", "*.csv")]
        def_ext = ".json" if fmt == "json" else ".csv"
        file_path = filedialog.asksaveasfilename(
            title="Export Bypass Results",
            defaultextension=def_ext,
            filetypes=filetypes,
        )
        if not file_path:
            return
        try:
            result = self.app.bypass_service.export_results(format=fmt, test_type=test_type)
            Path(file_path).write_text(result.get("data", ""), encoding="utf-8")
            self.app.show_status(f"Bypass results exported to {Path(file_path).name}")
        except Exception as exc:
            self.app.handle_exception("Unable to export bypass results", exc)

    def _delete_old_results(self) -> None:
        dialog = ctk.CTkInputDialog(
            title="Delete Old Results", text="Delete results older than how many days?"
        )
        user_input = dialog.get_input()
        if user_input is None:
            return
        try:
            days = max(1, int(user_input))
        except ValueError:
            messagebox.showerror("Bypass Results", "Please enter a valid number of days.")
            return
        try:
            result = self.app.bypass_service.delete_old_results(days)
            deleted = result.get("deleted_count", 0)
            self.app.show_status(f"Deleted {deleted} results older than {days} days")
            self._update_stats()
        except Exception as exc:
            self.app.handle_exception("Unable to delete bypass results", exc)

    def _write_output(self, text: str) -> None:
        self.output_box.configure(state="normal")
        self.output_box.delete("1.0", tk.END)
        self.output_box.insert("1.0", text)
        self.output_box.configure(state="disabled")

    def _update_stats(self) -> None:
        try:
            stats = self.app.bypass_service.get_test_statistics()
        except Exception:
            self.stats_label.configure(text="Stats: unavailable")
            return
        overall = stats.get("overall", {})
        total = overall.get("total_tests", 0)
        success = overall.get("successful_tests", 0)
        success_rate = overall.get("success_rate", 0)
        self.stats_label.configure(
            text=f"Stats: total={total} • success={success} • success_rate={success_rate:.1f}%"
        )


class ProTrialPanel(ctk.CTkFrame):
    """Pro trial management controls."""

    def __init__(self, parent: ctk.CTkFrame, app: CursorManagerApp) -> None:
        super().__init__(parent, corner_radius=12)
        self.app = app
        self.accounts: List[Dict[str, Any]] = []
        self.account_var = tk.StringVar()
        self.auto_renew_var = tk.BooleanVar(value=False)

        self._build_widgets()

    def _build_widgets(self) -> None:
        header = ctk.CTkLabel(
            self,
            text="Pro Trial Manager",
            font=ctk.CTkFont(size=18, weight="bold"),
        )
        header.grid(row=0, column=0, columnspan=3, sticky="w", padx=20, pady=(20, 8))

        ctk.CTkLabel(self, text="Account").grid(row=1, column=0, padx=20, sticky="w")
        self.account_menu = ctk.CTkOptionMenu(
            self,
            values=["No accounts"],
            variable=self.account_var,
            command=lambda _value: self._sync_status(),
            width=260,
        )
        self.account_menu.grid(row=1, column=1, sticky="w")

        ctk.CTkCheckBox(
            self, text="Auto renew", variable=self.auto_renew_var, command=self._toggle_auto
        ).grid(row=1, column=2, padx=20, sticky="w")

        button_row = ctk.CTkFrame(self, fg_color="transparent")
        button_row.grid(row=2, column=0, columnspan=3, sticky="w", padx=20, pady=(10, 0))

        ctk.CTkButton(button_row, text="Prepare Activation", command=self._prepare).pack(
            side="left", padx=6
        )
        ctk.CTkButton(button_row, text="Renew Trial", command=self._renew).pack(
            side="left", padx=6
        )
        ctk.CTkButton(button_row, text="Check Status", command=self._sync_status).pack(
            side="left", padx=6
        )

        self.status_label = ctk.CTkLabel(
            self,
            text="Select an account to view pro-trial status.",
            wraplength=720,
            justify="left",
        )
        self.status_label.grid(
            row=3, column=0, columnspan=3, sticky="w", padx=20, pady=(16, 10)
        )

        self.history_box = ctk.CTkTextbox(self, height=180, wrap="word")
        self.history_box.grid(
            row=4, column=0, columnspan=3, sticky="nsew", padx=20, pady=(0, 20)
        )
        self.history_box.configure(state="disabled")

        self.grid_columnconfigure((0, 1, 2), weight=1)
        self.grid_rowconfigure(4, weight=1)

    def refresh(self) -> None:
        data = self.app.account_service.get_all()
        accounts = data if isinstance(data, list) else data.get("accounts", [])
        accounts = [
            acc
            for acc in accounts
            if acc.get("status")
            and acc.get("status") != DELETED_ACCOUNT_STATUS
            and acc.get("status") in {"free", "pro-trial", "limit pro-trial"}
        ]
        self.accounts = accounts

        if accounts:
            values = [f"{account['id']} - {account.get('email', '')}" for account in accounts]
            self.account_menu.configure(values=values)
            if not self.account_var.get() or self.account_var.get() == "No accounts":
                self.account_var.set(values[0])
            self._sync_status()
        else:
            self.account_menu.configure(values=["No accounts"])
            self.account_var.set("No accounts")
            self.status_label.configure(text="Add an eligible account (free or limit pro-trial) to manage pro trials.")
            self.history_box.configure(state="normal")
            self.history_box.delete("1.0", tk.END)
            self.history_box.configure(state="disabled")

    def _selected_account_id(self) -> Optional[int]:
        value = self.account_var.get()
        if not value or value == "No accounts":
            return None
        try:
            return int(value.split(" - ", 1)[0])
        except (ValueError, IndexError):
            return None

    def _sync_status(self) -> None:
        account_id = self._selected_account_id()
        if not account_id:
            return

        try:
            status = self.app.pro_trial_service.check_trial_status(account_id)
        except Exception as exc:
            self.app.handle_exception("Unable to check trial status", exc)
            return

        if status.get("has_trial"):
            expiry = status.get("expiry_date", "-")
            state = status.get("status", "-")
            auto = bool(status.get("auto_renew"))
            self.auto_renew_var.set(auto)
            self.status_label.configure(
                text=f"Trial status: {state} • expires {expiry} • auto-renew={'on' if auto else 'off'}"
            )
        else:
            self.auto_renew_var.set(False)
            self.status_label.configure(text="No active trial for this account.")

        self._load_history(account_id)

    def _load_history(self, account_id: int) -> None:
        try:
            history = self.app.pro_trial_service.get_trial_history(
                account_id=account_id, limit=20
            )
        except Exception as exc:
            self.app.handle_exception("Unable to load trial history", exc)
            return

        self.history_box.configure(state="normal")
        self.history_box.delete("1.0", tk.END)
        entries = []
        for item in history.get("trials", []):
            entries.append(
                f"#{item.get('trial_id')} • status={item.get('status')} • "
                f"expiry={format_datetime(item.get('expiry_date'))} • "
                f"{format_datetime(item.get('created_at'))}"
            )
        if not entries:
            entries.append("No trial history yet.")
        self.history_box.insert("1.0", "\n".join(entries))
        self.history_box.configure(state="disabled")

    def _prepare(self) -> None:
        account_id = self._selected_account_id()
        if not account_id:
            return
        try:
            result = self.app.pro_trial_service.prepare_trial_activation(account_id)
            info = [
                f"Trial prepared for {result.get('account_email', '-')}",
                f"Token: {result.get('trial_token')}",
                f"Card: {result.get('card_data', {}).get('number')}",
                f"Stripe URL: {result.get('stripe_url')}",
            ]
            messagebox.showinfo("Pro Trial Prepared", "\n".join(info))
            self.app.show_status("Trial preparation recorded")
        except Exception as exc:
            self.app.handle_exception("Unable to prepare trial", exc)
        self._sync_status()

    def _renew(self) -> None:
        account_id = self._selected_account_id()
        if not account_id:
            return
        try:
            result = self.app.pro_trial_service.renew_trial(account_id)
            messagebox.showinfo(
                "Renewal Scheduled",
                f"Account will be renewed • batch_id={result.get('batch_id')}",
            )
        except Exception as exc:
            self.app.handle_exception("Unable to schedule renewal", exc)
        self._sync_status()

    def _toggle_auto(self) -> None:
        account_id = self._selected_account_id()
        if not account_id:
            return
        try:
            self.app.pro_trial_service.set_auto_renew(
                account_id, bool(self.auto_renew_var.get())
            )
            self.app.show_status("Auto-renew preference updated")
        except Exception as exc:
            self.app.handle_exception("Unable to update auto-renew", exc)
        self._sync_status()


# ---------------------------------------------------------------------------
# Settings Tab
# ---------------------------------------------------------------------------


class SettingsTab(ctk.CTkFrame):
    """Maintenance and diagnostics tab."""

    def __init__(self, parent: ctk.CTkFrame, app: CursorManagerApp) -> None:
        super().__init__(parent, fg_color="transparent")
        self.app = app
        self.pack(fill="both", expand=True)

        self.scheduler_enabled_var = tk.BooleanVar(
            value=bool(self.app.get_scheduler_config().get("enabled", True))
        )
        self.job_controls: Dict[str, Dict[str, Any]] = {}
        self.scheduler_jobs_container: Optional[ctk.CTkFrame] = None
        self.scheduler_history_box: Optional[ctk.CTkTextbox] = None
        self._updating_scheduler = False
        self.health_box: Optional[ctk.CTkTextbox] = None
        self._build_widgets()
        self.refresh_scheduler_section()

    def _build_widgets(self) -> None:
        self._build_appearance_section()
        self._build_scheduler_section()
        self._build_maintenance_section()
        self._build_health_section()

    def _build_appearance_section(self) -> None:
        frame = ctk.CTkFrame(self, corner_radius=12)
        frame.pack(fill="x", padx=4, pady=(0, 16))

        ctk.CTkLabel(
            frame,
            text="Appearance",
            font=ctk.CTkFont(size=18, weight="bold"),
        ).pack(anchor="w", padx=20, pady=(20, 10))

        ctk.CTkLabel(
            frame,
            text="Select application theme (syncs with header switch).",
        ).pack(anchor="w", padx=20)

        theme_row = ctk.CTkFrame(frame, fg_color="transparent")
        theme_row.pack(fill="x", padx=20, pady=(10, 16))

        ctk.CTkLabel(theme_row, text="Theme").pack(side="left")
        ctk.CTkOptionMenu(
            theme_row,
            values=["light", "dark", "system"],
            variable=self.app.theme_var,
            command=self.app._on_theme_change,
            width=140,
        ).pack(side="left", padx=(12, 0))

    def _build_scheduler_section(self) -> None:
        frame = ctk.CTkFrame(self, corner_radius=12)
        frame.pack(fill="both", expand=False, padx=4, pady=(0, 16))

        header_row = ctk.CTkFrame(frame, fg_color="transparent")
        header_row.pack(fill="x", padx=20, pady=(20, 10))

        ctk.CTkLabel(
            header_row,
            text="Automation Scheduler",
            font=ctk.CTkFont(size=18, weight="bold"),
        ).pack(side="left")

        ctk.CTkSwitch(
            header_row,
            text="Enabled",
            variable=self.scheduler_enabled_var,
            command=self._toggle_scheduler,
        ).pack(side="right")

        self.scheduler_jobs_container = ctk.CTkFrame(frame, fg_color="transparent")
        self.scheduler_jobs_container.pack(fill="x", padx=20, pady=(0, 10))

        desc = ctk.CTkLabel(
            frame,
            text="Adjust background automation that keeps accounts synced and data tidy.",
            wraplength=720,
            justify="left",
        )
        desc.pack(fill="x", padx=20, pady=(0, 10))

        self.scheduler_history_box = ctk.CTkTextbox(frame, height=120, wrap="word")
        self.scheduler_history_box.pack(fill="x", padx=20, pady=(0, 20))
        self.scheduler_history_box.configure(state="disabled")

    def _build_maintenance_section(self) -> None:
        grid = ctk.CTkFrame(self, corner_radius=12)
        grid.pack(fill="x", padx=4, pady=(0, 16))

        ctk.CTkLabel(
            grid,
            text="Maintenance",
            font=ctk.CTkFont(size=18, weight="bold"),
        ).grid(row=0, column=0, columnspan=2, sticky="w", padx=20, pady=(20, 10))

        ctk.CTkButton(
            grid, text="Create Backup", command=self._backup, width=200
        ).grid(row=1, column=0, padx=20, pady=6, sticky="w")
        ctk.CTkButton(
            grid, text="Restore Backup", command=self._restore, width=200
        ).grid(row=1, column=1, padx=20, pady=6, sticky="w")
        ctk.CTkButton(
            grid, text="Open Data Directory", command=self._open_data_dir, width=200
        ).grid(row=2, column=0, padx=20, pady=6, sticky="w")
        ctk.CTkButton(
            grid, text="Health Check", command=self._health_check, width=200
        ).grid(row=2, column=1, padx=20, pady=6, sticky="w")

        grid.grid_columnconfigure((0, 1), weight=1)

    def _build_health_section(self) -> None:
        health_frame = ctk.CTkFrame(self, corner_radius=12)
        health_frame.pack(fill="both", expand=True, padx=4, pady=(0, 20))

        ctk.CTkLabel(
            health_frame,
            text="System Health",
            font=ctk.CTkFont(size=16, weight="bold"),
        ).pack(anchor="w", padx=20, pady=(20, 10))

        self.health_box = ctk.CTkTextbox(health_frame, wrap="word")
        self.health_box.pack(fill="both", expand=True, padx=20, pady=(0, 20))
        self.health_box.configure(state="disabled")

    def refresh(self) -> None:
        self.refresh_scheduler_section()

    def refresh_scheduler_section(self) -> None:
        if self.scheduler_jobs_container is None:
            return
        config = self.app.get_scheduler_config()
        enabled = bool(config.get("enabled", True))
        self._updating_scheduler = True
        try:
            self.scheduler_enabled_var.set(enabled)
            jobs = config.get("jobs", {})
            self._render_job_rows(jobs, enabled)
            self._update_scheduler_history()
        finally:
            self._updating_scheduler = False

    def _render_job_rows(self, jobs: Dict[str, Dict[str, Any]], scheduler_enabled: bool) -> None:
        assert self.scheduler_jobs_container is not None
        for child in self.scheduler_jobs_container.winfo_children():
            child.destroy()
        self.job_controls.clear()

        if not jobs:
            ctk.CTkLabel(
                self.scheduler_jobs_container,
                text="No scheduled jobs registered.",
            ).pack(anchor="w", padx=8, pady=4)
            return

        for job_id, job_config in jobs.items():
            row = ctk.CTkFrame(self.scheduler_jobs_container, fg_color="transparent")
            row.pack(fill="x", padx=4, pady=4)

            title = job_config.get("description") or job_id.replace("_", " ").title()
            ctk.CTkLabel(
                row, text=title, anchor="w", justify="left", width=320
            ).pack(side="left", padx=(0, 12))

            enabled_var = tk.BooleanVar(value=bool(job_config.get("enabled", True)))
            interval_var = tk.StringVar(
                value=str(job_config.get("interval_minutes", 30))
            )

            switch = ctk.CTkSwitch(
                row,
                text="Enabled",
                variable=enabled_var,
                command=lambda jid=job_id, var=enabled_var: self._toggle_job(jid, var),
            )
            switch.pack(side="left", padx=(0, 12))

            interval_menu = ctk.CTkOptionMenu(
                row,
                values=self._interval_choices(),
                variable=interval_var,
                command=lambda selection, jid=job_id: self._change_interval(jid, selection),
                width=100,
            )
            interval_menu.pack(side="left")

            ctk.CTkLabel(
                row,
                text="minutes",
            ).pack(side="left", padx=(6, 0))

            self.job_controls[job_id] = {
                "switch": switch,
                "interval": interval_menu,
                "enabled_var": enabled_var,
                "interval_var": interval_var,
            }

        self._update_job_row_states(scheduler_enabled)

    def _update_job_row_states(self, scheduler_enabled: bool) -> None:
        state = "normal" if scheduler_enabled else "disabled"
        for controls in self.job_controls.values():
            controls["switch"].configure(state=state)
            controls["interval"].configure(state=state)

    def _update_scheduler_history(self) -> None:
        if not self.scheduler_history_box:
            return
        history = self.app.get_scheduler_history()
        lines: List[str] = []
        for entry in history[-8:]:
            status = "ok" if entry.get("success") else "error"
            timestamp = format_datetime(entry.get("timestamp"))
            detail = entry.get("details", {})
            if isinstance(detail, dict):
                detail = ", ".join(f"{k}={v}" for k, v in detail.items())
            lines.append(f"[{timestamp}] {entry.get('job_id')} -> {status} ({detail})")
        if not lines:
            lines.append("Scheduler has not executed any jobs yet.")

        self.scheduler_history_box.configure(state="normal")
        self.scheduler_history_box.delete("1.0", tk.END)
        self.scheduler_history_box.insert("1.0", "\n".join(lines))
        self.scheduler_history_box.configure(state="disabled")

    def _toggle_scheduler(self) -> None:
        if self._updating_scheduler:
            return
        enabled = bool(self.scheduler_enabled_var.get())
        try:
            self.app.scheduler_service.set_enabled(enabled)
            self.app.refresh_scheduler()
            self.app.show_status(
                f"Scheduler {'enabled' if enabled else 'paused'}"
            )
        except Exception as exc:
            self.app.handle_exception("Unable to update scheduler state", exc)
        self.refresh_scheduler_section()

    def _toggle_job(self, job_id: str, var: tk.BooleanVar) -> None:
        if self._updating_scheduler:
            return
        try:
            self.app.scheduler_service.update_job_config(job_id, enabled=bool(var.get()))
            self.app.refresh_scheduler()
            self.app.show_status(f"Updated job '{job_id}'")
        except Exception as exc:
            self.app.handle_exception("Unable to update scheduler job", exc)
        self.refresh_scheduler_section()

    def _change_interval(self, job_id: str, selection: str) -> None:
        if self._updating_scheduler:
            return
        try:
            minutes = int(selection)
        except ValueError:
            minutes = 30
        try:
            self.app.scheduler_service.update_job_config(
                job_id, interval_minutes=minutes
            )
            self.app.refresh_scheduler()
            self.app.show_status(f"Updated '{job_id}' interval to {minutes} minutes")
        except Exception as exc:
            self.app.handle_exception("Unable to update scheduler interval", exc)
        self.refresh_scheduler_section()

    def _interval_choices(self) -> List[str]:
        return ["5", "10", "15", "30", "45", "60", "90", "120", "240", "480", "720", "1440"]

    def _backup(self) -> None:
        try:
            backup_path = self.app.db.backup()
            messagebox.showinfo(
                "Backup created", f"Backup written to:\n{backup_path}", parent=self
            )
            self.app.show_status("Backup completed")
        except Exception as exc:
            self.app.handle_exception("Unable to create backup", exc)

    def _restore(self) -> None:
        file_path = filedialog.askopenfilename(
            title="Restore Backup",
            filetypes=[("Database files", "*.db"), ("All Files", "*.*")],
        )
        if not file_path:
            return
        confirm = messagebox.askyesno(
            "Restore Backup",
            "Restoring will overwrite the current database. Continue?",
        )
        if not confirm:
            return
        try:
            self.app.db.restore(file_path)
            self.app.show_status("Database restored")
        except Exception as exc:
            self.app.handle_exception("Unable to restore backup", exc)

    def _open_data_dir(self) -> None:
        open_file_location(self.app.db.db_dir)

    def _health_check(self) -> None:
        if self.health_box is None:
            return
        self.health_box.configure(state="normal")
        self.health_box.delete("1.0", tk.END)
        try:
            health = self.app.status_service.get_system_health()
        except Exception as exc:
            self.health_box.insert("1.0", f"Health check failed: {exc}")
            self.health_box.configure(state="disabled")
            return

        lines = [
            f"Generated: {format_datetime(health.get('generated_at'))}",
            f"Accounts -> {health.get('accounts', {})}",
            f"Cards -> {health.get('cards', {})}",
        ]
        try:
            batch_history = self.app.batch_service.get_batch_history(limit=5)
        except Exception:
            batch_history = {}

        if batch_history.get("operations"):
            lines.append("Recent batch operations:")
            for item in batch_history["operations"]:
                lines.append(
                    f"  - {item.get('operation_type')} | status={item.get('status')} | "
                    f"{item.get('completed_items', 0)}/{item.get('total_items', 0)} • "
                    f"{format_datetime(item.get('created_at'))}"
                )

        self.health_box.insert("1.0", "\n".join(lines))
        self.health_box.configure(state="disabled")
        self.app.show_status("Health check completed")


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def main() -> None:
    app = CursorManagerApp()
    app.run()


if __name__ == "__main__":
    main()

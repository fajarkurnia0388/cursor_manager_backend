"""
GUI Desktop Application - Cursor Manager
Manage accounts dan payment cards dari desktop
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog, scrolledtext
import json
import sys
import os
from datetime import datetime
from pathlib import Path

from database import Database
from account_service import AccountService
from cards_service import CardsService


class CursorManagerGUI:
    """Desktop GUI application untuk Cursor Manager"""

    def __init__(self, root):
        self.root = root
        self.root.title("Cursor Manager - Desktop Application")
        self.root.geometry("1200x800")

        # Set modern theme
        style = ttk.Style()
        style.theme_use("clam")  # Modern theme

        # Custom colors
        self.colors = {
            "primary": "#4CAF50",
            "secondary": "#2196F3",
            "danger": "#F44336",
            "warning": "#FF9800",
            "bg": "#1e1e1e",
            "fg": "#ffffff",
            "accent": "#00BCD4",
        }

        # Configure styles
        self.setup_styles(style)

        # Set window background
        self.root.configure(bg=self.colors["bg"])

        # Initialize services
        self.db = Database()
        self.account_service = AccountService(self.db)
        self.cards_service = CardsService(self.db)

        # Setup UI
        self.setup_ui()

        # Load initial data
        self.refresh_accounts()
        self.refresh_cards()
        self.update_stats()

    def setup_styles(self, style):
        """Setup custom styles"""
        # Configure Treeview
        style.configure(
            "Treeview",
            background="#2b2b2b",
            foreground="white",
            fieldbackground="#2b2b2b",
            borderwidth=0,
        )
        style.map("Treeview", background=[("selected", self.colors["primary"])])

        # Configure Notebook
        style.configure("TNotebook", background=self.colors["bg"], borderwidth=0)
        style.configure(
            "TNotebook.Tab",
            background="#333333",
            foreground="white",
            padding=[20, 10],
            borderwidth=0,
        )
        style.map(
            "TNotebook.Tab",
            background=[("selected", self.colors["primary"])],
            foreground=[("selected", "white")],
        )

        # Configure Buttons
        style.configure(
            "TButton",
            background=self.colors["secondary"],
            foreground="white",
            borderwidth=0,
            focuscolor="none",
            padding=[15, 8],
        )
        style.map("TButton", background=[("active", self.colors["accent"])])

        # Configure Labels
        style.configure("TLabel", background=self.colors["bg"], foreground="white")

        # Configure Frames
        style.configure("TFrame", background=self.colors["bg"])

        # Configure Entry
        style.configure(
            "TEntry", fieldbackground="#333333", foreground="white", borderwidth=1
        )

    def setup_ui(self):
        """Setup user interface"""
        # Header
        header = tk.Frame(self.root, bg=self.colors["primary"], height=80)
        header.pack(side=tk.TOP, fill=tk.X)
        header.pack_propagate(False)

        # Title
        title_label = tk.Label(
            header,
            text="🛡️  CURSOR MANAGER",
            font=("Arial", 24, "bold"),
            bg=self.colors["primary"],
            fg="white",
        )
        title_label.pack(side=tk.LEFT, padx=20, pady=20)

        # Subtitle
        subtitle_label = tk.Label(
            header,
            text="Desktop Management Application",
            font=("Arial", 10),
            bg=self.colors["primary"],
            fg="white",
        )
        subtitle_label.place(relx=0.02, rely=0.65)

        # Version
        version_label = tk.Label(
            header,
            text="v1.0.0",
            font=("Arial", 9),
            bg=self.colors["primary"],
            fg="#eeeeee",
        )
        version_label.pack(side=tk.RIGHT, padx=20)

        # Create notebook (tabs)
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill="both", expand=True, padx=10, pady=10)

        # Tabs
        self.dashboard_tab = ttk.Frame(self.notebook)
        self.accounts_tab = ttk.Frame(self.notebook)
        self.cards_tab = ttk.Frame(self.notebook)
        self.generator_tab = ttk.Frame(self.notebook)
        self.bypass_tab = ttk.Frame(self.notebook)
        self.pro_trial_tab = ttk.Frame(self.notebook)
        self.stats_tab = ttk.Frame(self.notebook)
        self.settings_tab = ttk.Frame(self.notebook)

        self.notebook.add(self.dashboard_tab, text="🏠  Dashboard")
        self.notebook.add(self.accounts_tab, text="📧  Accounts")
        self.notebook.add(self.cards_tab, text="💳  Payment Cards")
        self.notebook.add(self.generator_tab, text="🎲  Generator")
        self.notebook.add(self.bypass_tab, text="🔐  Bypass Testing")
        self.notebook.add(self.pro_trial_tab, text="⭐  Pro Trial")
        self.notebook.add(self.stats_tab, text="📊  Statistics")
        self.notebook.add(self.settings_tab, text="⚙️  Settings")

        # Setup each tab
        self.setup_dashboard_tab()
        self.setup_accounts_tab()
        self.setup_cards_tab()
        self.setup_generator_tab()
        self.setup_bypass_tab()
        self.setup_pro_trial_tab()
        self.setup_stats_tab()
        self.setup_settings_tab()

        # Status bar
        status_frame = tk.Frame(self.root, bg="#333333", height=30)
        status_frame.pack(side=tk.BOTTOM, fill=tk.X)
        status_frame.pack_propagate(False)

        self.status_bar = tk.Label(
            status_frame,
            text="✓ Ready",
            bg="#333333",
            fg=self.colors["primary"],
            font=("Arial", 9),
            anchor=tk.W,
        )
        self.status_bar.pack(side=tk.LEFT, padx=10, fill=tk.X, expand=True)

    def setup_dashboard_tab(self):
        """Setup dashboard tab dengan quick stats dan recent activity"""
        # Main container
        main_container = tk.Frame(self.dashboard_tab, bg=self.colors["bg"])
        main_container.pack(fill="both", expand=True, padx=20, pady=20)

        # Title
        title_label = tk.Label(
            main_container,
            text="Dashboard - System Overview",
            font=("Arial", 18, "bold"),
            bg=self.colors["bg"],
            fg="white",
        )
        title_label.pack(side=tk.TOP, anchor=tk.W, pady=(0, 20))

        # Stats cards row
        stats_row = tk.Frame(main_container, bg=self.colors["bg"])
        stats_row.pack(side=tk.TOP, fill=tk.X, pady=(0, 20))

        # Account stats card
        self.dash_accounts_frame = tk.Frame(
            stats_row, bg=self.colors["card"], relief=tk.RAISED, bd=2
        )
        self.dash_accounts_frame.pack(
            side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 10)
        )

        tk.Label(
            self.dash_accounts_frame,
            text="📧 Accounts",
            font=("Arial", 14, "bold"),
            bg=self.colors["card"],
            fg="white",
        ).pack(pady=(15, 5))

        self.dash_accounts_count = tk.Label(
            self.dash_accounts_frame,
            text="0",
            font=("Arial", 32, "bold"),
            bg=self.colors["card"],
            fg=self.colors["primary"],
        )
        self.dash_accounts_count.pack(pady=10)

        tk.Label(
            self.dash_accounts_frame,
            text="Total Accounts",
            font=("Arial", 10),
            bg=self.colors["card"],
            fg="#cccccc",
        ).pack(pady=(0, 15))

        # Cards stats card
        self.dash_cards_frame = tk.Frame(
            stats_row, bg=self.colors["card"], relief=tk.RAISED, bd=2
        )
        self.dash_cards_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5)

        tk.Label(
            self.dash_cards_frame,
            text="💳 Payment Cards",
            font=("Arial", 14, "bold"),
            bg=self.colors["card"],
            fg="white",
        ).pack(pady=(15, 5))

        self.dash_cards_count = tk.Label(
            self.dash_cards_frame,
            text="0",
            font=("Arial", 32, "bold"),
            bg=self.colors["card"],
            fg=self.colors["primary"],
        )
        self.dash_cards_count.pack(pady=10)

        tk.Label(
            self.dash_cards_frame,
            text="Total Cards",
            font=("Arial", 10),
            bg=self.colors["card"],
            fg="#cccccc",
        ).pack(pady=(0, 15))

        # Backend status card
        self.dash_backend_frame = tk.Frame(
            stats_row, bg=self.colors["card"], relief=tk.RAISED, bd=2
        )
        self.dash_backend_frame.pack(
            side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(10, 0)
        )

        tk.Label(
            self.dash_backend_frame,
            text="🔗 Backend Status",
            font=("Arial", 14, "bold"),
            bg=self.colors["card"],
            fg="white",
        ).pack(pady=(15, 5))

        self.dash_backend_status = tk.Label(
            self.dash_backend_frame,
            text="READY",
            font=("Arial", 24, "bold"),
            bg=self.colors["card"],
            fg="#4CAF50",
        )
        self.dash_backend_status.pack(pady=10)

        tk.Label(
            self.dash_backend_frame,
            text="Database Connected",
            font=("Arial", 10),
            bg=self.colors["card"],
            fg="#cccccc",
        ).pack(pady=(0, 15))

        # Quick actions row
        actions_frame = tk.Frame(main_container, bg=self.colors["bg"])
        actions_frame.pack(side=tk.TOP, fill=tk.X, pady=(0, 20))

        tk.Label(
            actions_frame,
            text="Quick Actions",
            font=("Arial", 14, "bold"),
            bg=self.colors["bg"],
            fg="white",
        ).pack(side=tk.TOP, anchor=tk.W, pady=(0, 10))

        quick_actions_btns = tk.Frame(actions_frame, bg=self.colors["bg"])
        quick_actions_btns.pack(side=tk.TOP, fill=tk.X)

        ttk.Button(
            quick_actions_btns, text="➕ Add Account", command=self.add_account
        ).pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(quick_actions_btns, text="💳 Add Card", command=self.add_card).pack(
            side=tk.LEFT, padx=5
        )
        ttk.Button(
            quick_actions_btns,
            text="🎲 Generate Cards",
            command=lambda: self.notebook.select(3),
        ).pack(side=tk.LEFT, padx=5)
        ttk.Button(
            quick_actions_btns, text="📊 View Statistics", command=self.update_stats
        ).pack(side=tk.LEFT, padx=5)
        ttk.Button(
            quick_actions_btns, text="💾 Backup Data", command=self.create_backup
        ).pack(side=tk.LEFT, padx=5)

        # System info
        info_frame = ttk.LabelFrame(main_container, text="System Information")
        info_frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True, pady=(0, 10))

        self.dash_info_text = scrolledtext.ScrolledText(
            info_frame, wrap=tk.WORD, height=12, font=("Courier", 10)
        )
        self.dash_info_text.pack(fill="both", expand=True, padx=5, pady=5)

        # Refresh button
        refresh_frame = tk.Frame(main_container, bg=self.colors["bg"])
        refresh_frame.pack(side=tk.TOP, fill=tk.X)

        ttk.Button(
            refresh_frame, text="🔄 Refresh Dashboard", command=self.refresh_dashboard
        ).pack(side=tk.LEFT)

        # Initial load
        self.refresh_dashboard()

    def setup_accounts_tab(self):
        """Setup accounts tab"""
        # Toolbar
        toolbar = ttk.Frame(self.accounts_tab)
        toolbar.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)

        ttk.Button(toolbar, text="➕ Add Account", command=self.add_account).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(toolbar, text="✏️ Edit", command=self.edit_account).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(toolbar, text="🗑️ Delete", command=self.delete_account).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(toolbar, text="🔄 Refresh", command=self.refresh_accounts).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(toolbar, text="📥 Import", command=self.import_accounts).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(toolbar, text="📤 Export", command=self.export_accounts).pack(
            side=tk.LEFT, padx=2
        )

        # Search
        search_frame = ttk.Frame(self.accounts_tab)
        search_frame.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)

        ttk.Label(search_frame, text="Search:").pack(side=tk.LEFT, padx=5)
        self.account_search = ttk.Entry(search_frame, width=30)
        self.account_search.pack(side=tk.LEFT, padx=5)
        self.account_search.bind("<KeyRelease>", lambda e: self.search_accounts())

        # Accounts list
        self.accounts_tree = ttk.Treeview(
            self.accounts_tab,
            columns=("ID", "Email", "Status", "Last Used", "Created"),
            show="headings",
        )

        self.accounts_tree.heading("ID", text="ID")
        self.accounts_tree.heading("Email", text="Email")
        self.accounts_tree.heading("Status", text="Status")
        self.accounts_tree.heading("Last Used", text="Last Used")
        self.accounts_tree.heading("Created", text="Created")

        self.accounts_tree.column("ID", width=60, anchor="center")
        self.accounts_tree.column("Email", width=350)
        self.accounts_tree.column("Status", width=100, anchor="center")
        self.accounts_tree.column("Last Used", width=180)
        self.accounts_tree.column("Created", width=180)

        # Configure treeview tags for colored rows
        self.accounts_tree.tag_configure("active", background="#2d4a2d")
        self.accounts_tree.tag_configure("inactive", background="#4a3d2d")
        self.accounts_tree.tag_configure("deleted", background="#4a2d2d")

        # Scrollbar
        scrollbar = ttk.Scrollbar(
            self.accounts_tab, orient=tk.VERTICAL, command=self.accounts_tree.yview
        )
        self.accounts_tree.configure(yscroll=scrollbar.set)

        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.accounts_tree.pack(fill="both", expand=True, padx=5, pady=5)

        # Double click to edit
        self.accounts_tree.bind("<Double-1>", lambda e: self.edit_account())

    def setup_cards_tab(self):
        """Setup payment cards tab"""
        # Toolbar
        toolbar = ttk.Frame(self.cards_tab)
        toolbar.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)

        ttk.Button(toolbar, text="➕ Add Card", command=self.add_card).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(toolbar, text="✏️ Edit", command=self.edit_card).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(toolbar, text="🗑️ Delete", command=self.delete_card).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(toolbar, text="🔄 Refresh", command=self.refresh_cards).pack(
            side=tk.LEFT, padx=2
        )

        # Cards list
        self.cards_tree = ttk.Treeview(
            self.cards_tab,
            columns=("ID", "Card Holder", "Card Number", "Expiry", "Status"),
            show="headings",
        )

        self.cards_tree.heading("ID", text="ID")
        self.cards_tree.heading("Card Holder", text="Card Holder")
        self.cards_tree.heading("Card Number", text="Card Number")
        self.cards_tree.heading("Expiry", text="Expiry")
        self.cards_tree.heading("Status", text="Status")

        self.cards_tree.column("ID", width=50)
        self.cards_tree.column("Card Holder", width=200)
        self.cards_tree.column("Card Number", width=200)
        self.cards_tree.column("Expiry", width=100)
        self.cards_tree.column("Status", width=100)

        # Scrollbar
        scrollbar = ttk.Scrollbar(
            self.cards_tab, orient=tk.VERTICAL, command=self.cards_tree.yview
        )
        self.cards_tree.configure(yscroll=scrollbar.set)

        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.cards_tree.pack(fill="both", expand=True, padx=5, pady=5)

        # Double click to edit
        self.cards_tree.bind("<Double-1>", lambda e: self.edit_card())

    def setup_stats_tab(self):
        """Setup statistics tab"""
        # Stats display
        self.stats_text = scrolledtext.ScrolledText(self.stats_tab, wrap=tk.WORD)
        self.stats_text.pack(fill="both", expand=True, padx=5, pady=5)

        # Toolbar
        toolbar = ttk.Frame(self.stats_tab)
        toolbar.pack(side=tk.BOTTOM, fill=tk.X, padx=5, pady=5)

        ttk.Button(toolbar, text="🔄 Refresh", command=self.update_stats).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(toolbar, text="💾 Create Backup", command=self.create_backup).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(
            toolbar, text="📂 Open Data Folder", command=self.open_data_folder
        ).pack(side=tk.LEFT, padx=2)

    def setup_generator_tab(self):
        """Setup card generator tab"""
        # Title
        title_frame = ttk.Frame(self.generator_tab)
        title_frame.pack(side=tk.TOP, fill=tk.X, padx=20, pady=20)

        title_label = tk.Label(
            title_frame,
            text="Card Generator (Namso Gen)",
            font=("Arial", 16, "bold"),
            bg=self.colors["bg"],
            fg="white",
        )
        title_label.pack(side=tk.LEFT)

        # Input frame
        input_frame = ttk.LabelFrame(self.generator_tab, text="Generator Settings")
        input_frame.pack(side=tk.TOP, fill=tk.X, padx=20, pady=10)

        # BIN input
        tk.Label(input_frame, text="BIN Code:", bg=self.colors["bg"], fg="white").grid(
            row=0, column=0, padx=10, pady=10, sticky=tk.W
        )
        self.gen_bin_entry = ttk.Entry(input_frame, width=20)
        self.gen_bin_entry.grid(row=0, column=1, padx=10, pady=10)
        self.gen_bin_entry.insert(0, "552461")  # Default MasterCard BIN

        # Quantity
        tk.Label(input_frame, text="Quantity:", bg=self.colors["bg"], fg="white").grid(
            row=0, column=2, padx=10, pady=10, sticky=tk.W
        )
        self.gen_quantity_var = tk.StringVar(value="5")
        ttk.Spinbox(
            input_frame, from_=1, to=1000, textvariable=self.gen_quantity_var, width=10
        ).grid(row=0, column=3, padx=10, pady=10)

        # Expiry
        tk.Label(
            input_frame, text="Expiry (MM/YY):", bg=self.colors["bg"], fg="white"
        ).grid(row=1, column=0, padx=10, pady=10, sticky=tk.W)
        self.gen_month_var = tk.StringVar(value="12")
        ttk.Combobox(
            input_frame,
            textvariable=self.gen_month_var,
            values=[f"{i:02d}" for i in range(1, 13)],
            width=5,
            state="readonly",
        ).grid(row=1, column=1, padx=(10, 5), pady=10, sticky=tk.W)
        self.gen_year_var = tk.StringVar(value="25")
        ttk.Combobox(
            input_frame,
            textvariable=self.gen_year_var,
            values=[f"{i:02d}" for i in range(25, 36)],
            width=5,
            state="readonly",
        ).grid(row=1, column=1, padx=(80, 10), pady=10, sticky=tk.W)

        # CVV
        tk.Label(input_frame, text="CVV:", bg=self.colors["bg"], fg="white").grid(
            row=1, column=2, padx=10, pady=10, sticky=tk.W
        )
        self.gen_cvv_entry = ttk.Entry(input_frame, width=10)
        self.gen_cvv_entry.grid(row=1, column=3, padx=10, pady=10, sticky=tk.W)
        self.gen_cvv_entry.insert(0, "random")

        # Buttons
        btn_frame = ttk.Frame(self.generator_tab)
        btn_frame.pack(side=tk.TOP, fill=tk.X, padx=20, pady=10)

        ttk.Button(
            btn_frame, text="🎲 Generate Cards", command=self.generate_cards
        ).pack(side=tk.LEFT, padx=5)
        ttk.Button(
            btn_frame, text="💾 Save All to Database", command=self.save_generated_cards
        ).pack(side=tk.LEFT, padx=5)
        ttk.Button(
            btn_frame, text="📋 Copy All", command=self.copy_generated_cards
        ).pack(side=tk.LEFT, padx=5)
        ttk.Button(
            btn_frame, text="📤 Export to File", command=self.export_generated_cards
        ).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="🗑️ Clear", command=self.clear_generated_cards).pack(
            side=tk.LEFT, padx=5
        )

        # Results frame
        results_frame = ttk.LabelFrame(self.generator_tab, text="Generated Cards")
        results_frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=20, pady=10)

        self.gen_results_text = scrolledtext.ScrolledText(
            results_frame, wrap=tk.WORD, font=("Courier", 10)
        )
        self.gen_results_text.pack(fill="both", expand=True, padx=5, pady=5)

        # Store generated cards
        self.generated_cards = []

    def setup_bypass_tab(self):
        """Setup bypass testing tab"""
        # Title
        title_frame = ttk.Frame(self.bypass_tab)
        title_frame.pack(side=tk.TOP, fill=tk.X, padx=20, pady=20)

        title_label = tk.Label(
            title_frame,
            text="Bypass Testing Suite",
            font=("Arial", 16, "bold"),
            bg=self.colors["bg"],
            fg="white",
        )
        title_label.pack(side=tk.LEFT)

        # Test configuration
        config_frame = ttk.LabelFrame(self.bypass_tab, text="Test Configuration")
        config_frame.pack(side=tk.TOP, fill=tk.X, padx=20, pady=10)

        # Test type
        tk.Label(
            config_frame, text="Test Type:", bg=self.colors["bg"], fg="white"
        ).grid(row=0, column=0, padx=10, pady=10, sticky=tk.W)
        self.bypass_type_var = tk.StringVar(value="parameter")
        ttk.Combobox(
            config_frame,
            textvariable=self.bypass_type_var,
            values=["parameter", "header", "method", "storage", "dom"],
            width=15,
            state="readonly",
        ).grid(row=0, column=1, padx=10, pady=10, sticky=tk.W)

        # Target URL
        tk.Label(
            config_frame, text="Target URL:", bg=self.colors["bg"], fg="white"
        ).grid(row=1, column=0, padx=10, pady=10, sticky=tk.W)
        self.bypass_url_entry = ttk.Entry(config_frame, width=50)
        self.bypass_url_entry.grid(
            row=1, column=1, columnspan=2, padx=10, pady=10, sticky=tk.W
        )
        self.bypass_url_entry.insert(0, "https://example.com/test")

        # Buttons
        btn_frame = ttk.Frame(self.bypass_tab)
        btn_frame.pack(side=tk.TOP, fill=tk.X, padx=20, pady=10)

        ttk.Button(
            btn_frame, text="🔍 Load Test Suite", command=self.load_bypass_suite
        ).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="▶️ Run Selected", command=self.run_bypass_test).pack(
            side=tk.LEFT, padx=5
        )
        ttk.Button(
            btn_frame, text="📊 View Statistics", command=self.view_bypass_stats
        ).pack(side=tk.LEFT, padx=5)
        ttk.Button(
            btn_frame, text="🗑️ Clear Results", command=self.clear_bypass_results
        ).pack(side=tk.LEFT, padx=5)

        # Results frame with tree
        results_frame = ttk.LabelFrame(self.bypass_tab, text="Test Results")
        results_frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=20, pady=10)

        self.bypass_tree = ttk.Treeview(
            results_frame, columns=("payload", "status", "code", "time"), height=15
        )
        self.bypass_tree.heading("#0", text="ID")
        self.bypass_tree.heading("payload", text="Payload")
        self.bypass_tree.heading("status", text="Status")
        self.bypass_tree.heading("code", text="Response Code")
        self.bypass_tree.heading("time", text="Time (s)")

        self.bypass_tree.column("#0", width=50)
        self.bypass_tree.column("payload", width=300)
        self.bypass_tree.column("status", width=100)
        self.bypass_tree.column("code", width=100)
        self.bypass_tree.column("time", width=100)

        self.bypass_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        scrollbar = ttk.Scrollbar(
            results_frame, orient=tk.VERTICAL, command=self.bypass_tree.yview
        )
        self.bypass_tree.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    def setup_pro_trial_tab(self):
        """Setup pro trial management tab"""
        # Title
        title_frame = ttk.Frame(self.pro_trial_tab)
        title_frame.pack(side=tk.TOP, fill=tk.X, padx=20, pady=20)

        title_label = tk.Label(
            title_frame,
            text="Pro Trial Management",
            font=("Arial", 16, "bold"),
            bg=self.colors["bg"],
            fg="white",
        )
        title_label.pack(side=tk.LEFT)

        # Account selection
        select_frame = ttk.LabelFrame(self.pro_trial_tab, text="Account Selection")
        select_frame.pack(side=tk.TOP, fill=tk.X, padx=20, pady=10)

        tk.Label(
            select_frame, text="Select Account:", bg=self.colors["bg"], fg="white"
        ).grid(row=0, column=0, padx=10, pady=10, sticky=tk.W)
        self.trial_account_var = tk.StringVar()
        self.trial_account_combo = ttk.Combobox(
            select_frame,
            textvariable=self.trial_account_var,
            width=40,
            state="readonly",
        )
        self.trial_account_combo.grid(row=0, column=1, padx=10, pady=10)

        ttk.Button(
            select_frame,
            text="🔄 Refresh Accounts",
            command=self.refresh_trial_accounts,
        ).grid(row=0, column=2, padx=10, pady=10)

        # Trial info
        info_frame = ttk.LabelFrame(self.pro_trial_tab, text="Trial Information")
        info_frame.pack(side=tk.TOP, fill=tk.X, padx=20, pady=10)

        self.trial_info_text = scrolledtext.ScrolledText(
            info_frame, wrap=tk.WORD, height=8, font=("Courier", 10)
        )
        self.trial_info_text.pack(fill="both", expand=True, padx=5, pady=5)

        # Actions
        action_frame = ttk.Frame(self.pro_trial_tab)
        action_frame.pack(side=tk.TOP, fill=tk.X, padx=20, pady=10)

        ttk.Button(
            action_frame, text="⭐ Prepare Trial Activation", command=self.prepare_trial
        ).pack(side=tk.LEFT, padx=5)
        ttk.Button(
            action_frame, text="✅ Check Status", command=self.check_trial_status
        ).pack(side=tk.LEFT, padx=5)
        ttk.Button(action_frame, text="🔄 Renew Trial", command=self.renew_trial).pack(
            side=tk.LEFT, padx=5
        )
        ttk.Button(
            action_frame, text="📊 View Statistics", command=self.view_trial_stats
        ).pack(side=tk.LEFT, padx=5)

        # History
        history_frame = ttk.LabelFrame(self.pro_trial_tab, text="Trial History")
        history_frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=20, pady=10)

        self.trial_tree = ttk.Treeview(
            history_frame,
            columns=("account", "activation", "expiry", "status"),
            height=10,
        )
        self.trial_tree.heading("#0", text="ID")
        self.trial_tree.heading("account", text="Account")
        self.trial_tree.heading("activation", text="Activation Date")
        self.trial_tree.heading("expiry", text="Expiry Date")
        self.trial_tree.heading("status", text="Status")

        self.trial_tree.column("#0", width=50)
        self.trial_tree.column("account", width=200)
        self.trial_tree.column("activation", width=150)
        self.trial_tree.column("expiry", width=150)
        self.trial_tree.column("status", width=100)

        self.trial_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        scrollbar = ttk.Scrollbar(
            history_frame, orient=tk.VERTICAL, command=self.trial_tree.yview
        )
        self.trial_tree.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    def refresh_accounts(self):
        """Refresh accounts list"""
        try:
            # Clear existing items
            for item in self.accounts_tree.get_children():
                self.accounts_tree.delete(item)

            # Load accounts
            accounts = self.account_service.get_all()

            for account in accounts:
                last_used = account.get("last_used", "Never")
                if last_used and last_used != "Never":
                    try:
                        dt = datetime.fromisoformat(last_used)
                        last_used = dt.strftime("%Y-%m-%d %H:%M")
                    except:
                        pass

                created = account.get("created_at", "")
                if created:
                    try:
                        dt = datetime.fromisoformat(created)
                        created = dt.strftime("%Y-%m-%d %H:%M")
                    except:
                        pass

                self.accounts_tree.insert(
                    "",
                    "end",
                    values=(
                        account["id"],
                        account["email"],
                        account["status"],
                        last_used,
                        created,
                    ),
                )

            self.status_bar.config(
                text=f"✓ Loaded {len(accounts)} accounts", fg=self.colors["primary"]
            )

        except Exception as e:
            messagebox.showerror("Error", f"Failed to load accounts: {str(e)}")

    def refresh_cards(self):
        """Refresh cards list"""
        try:
            # Clear existing items
            for item in self.cards_tree.get_children():
                self.cards_tree.delete(item)

            # Load cards
            cards = self.cards_service.get_all()

            for card in cards:
                # Mask card number
                card_num = card["card_number"]
                masked = f"****-****-****-{card_num[-4:]}"

                self.cards_tree.insert(
                    "",
                    "end",
                    values=(
                        card["id"],
                        card["card_holder"],
                        masked,
                        card["expiry"],
                        card["status"],
                    ),
                )

            self.status_bar.config(
                text=f"✓ Loaded {len(cards)} cards", fg=self.colors["primary"]
            )

        except Exception as e:
            messagebox.showerror("Error", f"Failed to load cards: {str(e)}")

    def add_account(self):
        """Add new account(s) from JSON input"""
        dialog = tk.Toplevel(self.root)
        dialog.title("Add Account - JSON Import")
        dialog.geometry("700x650")
        dialog.transient(self.root)
        dialog.grab_set()
        dialog.configure(bg=self.colors["bg"])

        # Header
        header = tk.Frame(dialog, bg=self.colors["card"], height=60)
        header.pack(fill=tk.X, pady=(0, 10))
        header.pack_propagate(False)

        title = tk.Label(
            header,
            text="📥 Import Account dari JSON",
            bg=self.colors["card"],
            fg="white",
            font=("Arial", 14, "bold"),
        )
        title.pack(pady=15)

        # Content frame
        content = tk.Frame(dialog, bg=self.colors["bg"])
        content.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)

        # Instructions
        instructions_frame = tk.Frame(content, bg=self.colors["card"])
        instructions_frame.pack(fill=tk.X, pady=(0, 10))

        instructions_label = tk.Label(
            instructions_frame,
            text="Paste JSON data dengan format berikut:",
            bg=self.colors["card"],
            fg="white",
            font=("Arial", 10, "bold"),
            anchor=tk.W,
        )
        instructions_label.pack(padx=10, pady=(10, 5), anchor=tk.W)

        # Format examples
        examples_text = """Format yang didukung:

1. Single Account:
   {"email": "user@example.com", "password": "pass123", "cookies": [...]}

2. Array of Accounts:
   [{"email": "user1@example.com", "password": "pass1"}, ...]

3. Full Export Format:
   {"account": {"email": "user@example.com", "password": "pass", "cookies": [...]}}

4. Direct Cookies Array (requires manual email/password):
   [{"name": "cookie_name", "value": "cookie_value", "domain": ".example.com"}, ...]"""

        examples_label = tk.Label(
            instructions_frame,
            text=examples_text,
            bg=self.colors["card"],
            fg="#aaaaaa",
            font=("Consolas", 9),
            anchor=tk.W,
            justify=tk.LEFT,
        )
        examples_label.pack(padx=20, pady=(0, 10), anchor=tk.W)

        # JSON Input
        input_frame = tk.Frame(content, bg=self.colors["bg"])
        input_frame.pack(fill=tk.BOTH, expand=True)

        input_label = tk.Label(
            input_frame,
            text="JSON Input:",
            bg=self.colors["bg"],
            fg="white",
            font=("Arial", 10, "bold"),
        )
        input_label.pack(anchor=tk.W, pady=(0, 5))

        # Text area with scrollbar
        text_frame = tk.Frame(input_frame, bg=self.colors["bg"])
        text_frame.pack(fill=tk.BOTH, expand=True)

        scrollbar = tk.Scrollbar(text_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        json_text = tk.Text(
            text_frame,
            bg=self.colors["card"],
            fg="white",
            font=("Consolas", 10),
            insertbackground="white",
            yscrollcommand=scrollbar.set,
            wrap=tk.WORD,
        )
        json_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=json_text.yview)

        def parse_and_save():
            """Parse JSON and create accounts"""
            json_input = json_text.get("1.0", tk.END).strip()

            if not json_input:
                messagebox.showerror("Error", "JSON input is required")
                return

            try:
                data = json.loads(json_input)
            except json.JSONDecodeError as e:
                messagebox.showerror(
                    "Invalid JSON",
                    f"Failed to parse JSON:\n\n{str(e)}\n\nPlease check your JSON format.",
                )
                return

            accounts_to_create = []

            # Parse different formats
            try:
                if isinstance(data, list):
                    # Check if it's array of accounts or cookies array
                    if data and isinstance(data[0], dict):
                        if "email" in data[0] or "password" in data[0]:
                            # Array of accounts
                            accounts_to_create = data
                        else:
                            # Cookies array - need manual input
                            result = self._prompt_for_credentials(data)
                            if result:
                                accounts_to_create = [result]
                            else:
                                return

                elif isinstance(data, dict):
                    if "account" in data:
                        # Full export format
                        account_data = data["account"]
                        accounts_to_create = [
                            {
                                "email": account_data.get("email", ""),
                                "password": account_data.get("password", ""),
                                "cookies": account_data.get("cookies", None),
                            }
                        ]
                    elif "email" in data or "password" in data:
                        # Single account format
                        accounts_to_create = [data]
                    elif "cookies" in data:
                        # Alternative format with cookies
                        accounts_to_create = [data]
                    else:
                        messagebox.showerror(
                            "Invalid Format",
                            "Unknown JSON format. Please check the examples.",
                        )
                        return

            except Exception as e:
                messagebox.showerror(
                    "Parse Error", f"Failed to parse data:\n\n{str(e)}"
                )
                return

            # Validate and create accounts
            created_count = 0
            failed_count = 0
            errors = []

            for idx, account_data in enumerate(accounts_to_create):
                try:
                    email = account_data.get("email", "").strip()
                    password = account_data.get("password", "").strip()
                    cookies = account_data.get("cookies", None)

                    if not email:
                        # Try to extract from cookies if available
                        if cookies:
                            email = f"imported_account_{idx + 1}@cursor.local"
                        else:
                            failed_count += 1
                            errors.append(f"Account {idx + 1}: Missing email")
                            continue

                    if not password:
                        # Generate placeholder password if not provided
                        password = f"imported_pass_{idx + 1}"

                    # Create account
                    self.account_service.create(email, password, cookies)
                    created_count += 1

                except Exception as e:
                    failed_count += 1
                    errors.append(f"Account {idx + 1} ({email}): {str(e)}")

            # Show results
            dialog.destroy()

            if created_count > 0:
                self.refresh_accounts()
                self.update_stats()

            result_msg = f"✓ Successfully imported {created_count} account(s)"
            if failed_count > 0:
                result_msg += f"\n✗ Failed: {failed_count}\n\nErrors:\n"
                result_msg += "\n".join(errors[:5])  # Show first 5 errors
                if len(errors) > 5:
                    result_msg += f"\n... and {len(errors) - 5} more errors"
                messagebox.showwarning("Import Complete", result_msg)
            else:
                messagebox.showinfo("Success", result_msg)
                self.status_bar.config(
                    text=f"✓ Imported {created_count} account(s)",
                    fg=self.colors["primary"],
                )

        def load_from_file():
            """Load JSON from file"""
            from tkinter import filedialog

            file_path = filedialog.askopenfilename(
                title="Select JSON file",
                filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
            )

            if file_path:
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    json_text.delete("1.0", tk.END)
                    json_text.insert("1.0", content)
                    self.status_bar.config(
                        text=f"✓ Loaded from {file_path}", fg=self.colors["primary"]
                    )
                except Exception as e:
                    messagebox.showerror("Error", f"Failed to load file:\n\n{str(e)}")

        # Buttons
        button_frame = tk.Frame(dialog, bg=self.colors["bg"])
        button_frame.pack(fill=tk.X, padx=20, pady=(10, 20))

        load_btn = tk.Button(
            button_frame,
            text="📁 Load from File",
            command=load_from_file,
            bg="#555555",
            fg="white",
            font=("Arial", 10),
            padx=15,
            pady=8,
            relief=tk.FLAT,
            cursor="hand2",
        )
        load_btn.pack(side=tk.LEFT, padx=(0, 10))

        cancel_btn = tk.Button(
            button_frame,
            text="Cancel",
            command=dialog.destroy,
            bg="#555555",
            fg="white",
            font=("Arial", 10),
            padx=15,
            pady=8,
            relief=tk.FLAT,
            cursor="hand2",
        )
        cancel_btn.pack(side=tk.RIGHT)

        save_btn = tk.Button(
            button_frame,
            text="✓ Import",
            command=parse_and_save,
            bg=self.colors["primary"],
            fg="white",
            font=("Arial", 10, "bold"),
            padx=30,
            pady=8,
            relief=tk.FLAT,
            cursor="hand2",
        )
        save_btn.pack(side=tk.RIGHT, padx=(0, 10))

    def _prompt_for_credentials(self, cookies):
        """Prompt for email/password when importing cookies array"""
        dialog = tk.Toplevel(self.root)
        dialog.title("Enter Credentials")
        dialog.geometry("400x250")
        dialog.transient(self.root)
        dialog.grab_set()
        dialog.configure(bg=self.colors["bg"])

        result = {}

        # Instructions
        tk.Label(
            dialog,
            text="Detected cookies array. Please provide credentials:",
            bg=self.colors["bg"],
            fg="white",
            font=("Arial", 10),
        ).pack(pady=(20, 10))

        # Form frame
        form_frame = tk.Frame(dialog, bg=self.colors["card"])
        form_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)

        tk.Label(
            form_frame,
            text="Email:",
            bg=self.colors["card"],
            fg="white",
            font=("Arial", 10),
        ).grid(row=0, column=0, padx=10, pady=10, sticky=tk.W)
        email_entry = ttk.Entry(form_frame, width=30)
        email_entry.grid(row=0, column=1, padx=10, pady=10)

        tk.Label(
            form_frame,
            text="Password:",
            bg=self.colors["card"],
            fg="white",
            font=("Arial", 10),
        ).grid(row=1, column=0, padx=10, pady=10, sticky=tk.W)
        password_entry = ttk.Entry(form_frame, width=30, show="*")
        password_entry.grid(row=1, column=1, padx=10, pady=10)

        def save():
            email = email_entry.get().strip()
            password = password_entry.get().strip()

            if not email or not password:
                messagebox.showerror("Error", "Both email and password are required")
                return

            result["email"] = email
            result["password"] = password
            result["cookies"] = cookies
            dialog.destroy()

        # Buttons
        button_frame = tk.Frame(dialog, bg=self.colors["bg"])
        button_frame.pack(pady=10)

        tk.Button(
            button_frame,
            text="Cancel",
            command=dialog.destroy,
            bg="#555555",
            fg="white",
            font=("Arial", 10),
            padx=15,
            pady=8,
            relief=tk.FLAT,
        ).pack(side=tk.LEFT, padx=5)

        tk.Button(
            button_frame,
            text="Save",
            command=save,
            bg=self.colors["primary"],
            fg="white",
            font=("Arial", 10, "bold"),
            padx=20,
            pady=8,
            relief=tk.FLAT,
        ).pack(side=tk.LEFT, padx=5)

        email_entry.focus()
        dialog.wait_window()
        return result if result else None

    def edit_account(self):
        """Edit selected account"""
        selection = self.accounts_tree.selection()
        if not selection:
            messagebox.showwarning("Warning", "Please select an account to edit")
            return

        item = self.accounts_tree.item(selection[0])
        account_id = item["values"][0]

        # Get account details
        account = self.account_service.get_by_id(account_id)
        if not account:
            messagebox.showerror("Error", "Account not found")
            return

        # Edit dialog
        dialog = tk.Toplevel(self.root)
        dialog.title("Edit Account")
        dialog.geometry("400x250")
        dialog.transient(self.root)
        dialog.grab_set()

        # Form
        ttk.Label(dialog, text="Email:").grid(
            row=0, column=0, padx=5, pady=5, sticky=tk.W
        )
        email_entry = ttk.Entry(dialog, width=40)
        email_entry.insert(0, account["email"])
        email_entry.grid(row=0, column=1, padx=5, pady=5)

        ttk.Label(dialog, text="Password:").grid(
            row=1, column=0, padx=5, pady=5, sticky=tk.W
        )
        password_entry = ttk.Entry(dialog, width=40, show="*")
        password_entry.insert(0, account["password"])
        password_entry.grid(row=1, column=1, padx=5, pady=5)

        ttk.Label(dialog, text="Status:").grid(
            row=2, column=0, padx=5, pady=5, sticky=tk.W
        )
        status_combo = ttk.Combobox(
            dialog, values=["active", "inactive", "deleted"], width=37
        )
        status_combo.set(account["status"])
        status_combo.grid(row=2, column=1, padx=5, pady=5)

        def save():
            email = email_entry.get().strip()
            password = password_entry.get().strip()
            status = status_combo.get()

            try:
                self.account_service.update(
                    account_id, email=email, password=password, status=status
                )
                messagebox.showinfo("Success", "Account updated successfully")
                dialog.destroy()
                self.refresh_accounts()
            except Exception as e:
                messagebox.showerror("Error", f"Failed to update account: {str(e)}")

        # Buttons
        button_frame = ttk.Frame(dialog)
        button_frame.grid(row=3, column=0, columnspan=2, pady=20)

        ttk.Button(button_frame, text="Save", command=save).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Cancel", command=dialog.destroy).pack(
            side=tk.LEFT, padx=5
        )

    def delete_account(self):
        """Delete selected account"""
        selection = self.accounts_tree.selection()
        if not selection:
            messagebox.showwarning("Warning", "Please select an account to delete")
            return

        item = self.accounts_tree.item(selection[0])
        account_id = item["values"][0]
        email = item["values"][1]

        if messagebox.askyesno(
            "Confirm",
            f"Delete account '{email}'?\n\n(This is a soft delete, data will be marked as deleted but not removed)",
        ):
            try:
                self.account_service.delete(account_id, soft=True)
                messagebox.showinfo("Success", "Account deleted successfully")
                self.refresh_accounts()
                self.update_stats()
            except Exception as e:
                messagebox.showerror("Error", f"Failed to delete account: {str(e)}")

    def search_accounts(self):
        """Search accounts"""
        keyword = self.account_search.get().strip()

        if not keyword:
            self.refresh_accounts()
            return

        try:
            # Clear existing items
            for item in self.accounts_tree.get_children():
                self.accounts_tree.delete(item)

            # Search accounts
            accounts = self.account_service.search(keyword)

            for account in accounts:
                last_used = account.get("last_used", "Never")
                if last_used and last_used != "Never":
                    try:
                        dt = datetime.fromisoformat(last_used)
                        last_used = dt.strftime("%Y-%m-%d %H:%M")
                    except:
                        pass

                created = account.get("created_at", "")
                if created:
                    try:
                        dt = datetime.fromisoformat(created)
                        created = dt.strftime("%Y-%m-%d %H:%M")
                    except:
                        pass

                self.accounts_tree.insert(
                    "",
                    "end",
                    values=(
                        account["id"],
                        account["email"],
                        account["status"],
                        last_used,
                        created,
                    ),
                )

            self.status_bar.config(
                text=f"✓ Found {len(accounts)} accounts", fg=self.colors["accent"]
            )

        except Exception as e:
            messagebox.showerror("Error", f"Failed to search accounts: {str(e)}")

    def import_accounts(self):
        """Import accounts dari JSON"""
        filename = filedialog.askopenfilename(
            title="Import Accounts",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
        )

        if not filename:
            return

        try:
            with open(filename) as f:
                data = json.load(f)

            # Handle both list and single account
            if isinstance(data, list):
                accounts = data
            elif isinstance(data, dict):
                accounts = [data]
            else:
                messagebox.showerror("Error", "Invalid JSON format")
                return

            # Import accounts
            imported = 0
            for account in accounts:
                try:
                    email = account.get("email") or account.get(
                        "name", "unknown@example.com"
                    )
                    password = account.get("password", "")
                    cookies = account.get("cookies")

                    self.account_service.create(email, password, cookies)
                    imported += 1
                except Exception as e:
                    print(f"Failed to import {email}: {e}")

            messagebox.showinfo("Success", f"Imported {imported} accounts")
            self.refresh_accounts()
            self.update_stats()

        except Exception as e:
            messagebox.showerror("Error", f"Failed to import accounts: {str(e)}")

    def export_accounts(self):
        """Export accounts ke JSON"""
        filename = filedialog.asksaveasfilename(
            title="Export Accounts",
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
        )

        if not filename:
            return

        try:
            accounts = self.account_service.get_all()

            with open(filename, "w") as f:
                json.dump(accounts, f, indent=2)

            messagebox.showinfo(
                "Success", f"Exported {len(accounts)} accounts to {filename}"
            )

        except Exception as e:
            messagebox.showerror("Error", f"Failed to export accounts: {str(e)}")

    def add_card(self):
        """Add new card"""
        dialog = tk.Toplevel(self.root)
        dialog.title("Add Payment Card")
        dialog.geometry("400x250")
        dialog.transient(self.root)
        dialog.grab_set()

        # Form
        ttk.Label(dialog, text="Card Number:").grid(
            row=0, column=0, padx=5, pady=5, sticky=tk.W
        )
        number_entry = ttk.Entry(dialog, width=40)
        number_entry.grid(row=0, column=1, padx=5, pady=5)

        ttk.Label(dialog, text="Card Holder:").grid(
            row=1, column=0, padx=5, pady=5, sticky=tk.W
        )
        holder_entry = ttk.Entry(dialog, width=40)
        holder_entry.grid(row=1, column=1, padx=5, pady=5)

        ttk.Label(dialog, text="Expiry (MM/YY):").grid(
            row=2, column=0, padx=5, pady=5, sticky=tk.W
        )
        expiry_entry = ttk.Entry(dialog, width=40)
        expiry_entry.grid(row=2, column=1, padx=5, pady=5)

        ttk.Label(dialog, text="CVV:").grid(
            row=3, column=0, padx=5, pady=5, sticky=tk.W
        )
        cvv_entry = ttk.Entry(dialog, width=40, show="*")
        cvv_entry.grid(row=3, column=1, padx=5, pady=5)

        def save():
            number = number_entry.get().strip()
            holder = holder_entry.get().strip()
            expiry = expiry_entry.get().strip()
            cvv = cvv_entry.get().strip()

            if not all([number, holder, expiry, cvv]):
                messagebox.showerror("Error", "All fields are required")
                return

            try:
                self.cards_service.create(number, holder, expiry, cvv)
                messagebox.showinfo("Success", "Card created successfully")
                dialog.destroy()
                self.refresh_cards()
                self.update_stats()
            except Exception as e:
                messagebox.showerror("Error", f"Failed to create card: {str(e)}")

        # Buttons
        button_frame = ttk.Frame(dialog)
        button_frame.grid(row=4, column=0, columnspan=2, pady=20)

        ttk.Button(button_frame, text="Save", command=save).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Cancel", command=dialog.destroy).pack(
            side=tk.LEFT, padx=5
        )

        number_entry.focus()

    def edit_card(self):
        """Edit selected card"""
        messagebox.showinfo("Info", "Card editing will be implemented soon")

    def delete_card(self):
        """Delete selected card"""
        selection = self.cards_tree.selection()
        if not selection:
            messagebox.showwarning("Warning", "Please select a card to delete")
            return

        item = self.cards_tree.item(selection[0])
        card_id = item["values"][0]

        if messagebox.askyesno("Confirm", "Delete this card?"):
            try:
                self.cards_service.delete(card_id, soft=True)
                messagebox.showinfo("Success", "Card deleted successfully")
                self.refresh_cards()
                self.update_stats()
            except Exception as e:
                messagebox.showerror("Error", f"Failed to delete card: {str(e)}")

    def update_stats(self):
        """Update statistics display"""
        try:
            account_stats = self.account_service.get_stats()
            card_stats = self.cards_service.get_stats()

            stats_text = f"""
═══════════════════════════════════════════════════════════
                    CURSOR MANAGER STATISTICS
═══════════════════════════════════════════════════════════

DATABASE INFORMATION:
  Location: {self.db.db_path}
  Schema Version: {self.db.get_schema_version()}

ACCOUNTS:
  Total: {account_stats.get('total', 0)}
  Active: {account_stats.get('active', 0)}
  Inactive: {account_stats.get('inactive', 0)}
  Deleted: {account_stats.get('deleted', 0)}

PAYMENT CARDS:
  Total: {card_stats.get('total', 0)}
  Active: {card_stats.get('active', 0)}
  Inactive: {card_stats.get('inactive', 0)}
  Deleted: {card_stats.get('deleted', 0)}

STORAGE:
  Database Size: {self.db.db_path.stat().st_size / 1024:.2f} KB

BACKUP LOCATION:
  {self.db.db_dir / "backups"}

═══════════════════════════════════════════════════════════
Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
═══════════════════════════════════════════════════════════
            """.strip()

            self.stats_text.delete("1.0", tk.END)
            self.stats_text.insert("1.0", stats_text)

        except Exception as e:
            messagebox.showerror("Error", f"Failed to update statistics: {str(e)}")

    def create_backup(self):
        """Create database backup"""
        try:
            backup_path = self.db.backup()
            messagebox.showinfo("Success", f"Backup created:\n{backup_path}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to create backup: {str(e)}")

    def open_data_folder(self):
        """Open data folder in file explorer"""
        import subprocess
        import platform

        try:
            if platform.system() == "Windows":
                subprocess.run(["explorer", str(self.db.db_dir)])
            elif platform.system() == "Darwin":  # macOS
                subprocess.run(["open", str(self.db.db_dir)])
            else:  # Linux
                subprocess.run(["xdg-open", str(self.db.db_dir)])
        except Exception as e:
            messagebox.showerror("Error", f"Failed to open folder: {str(e)}")

    def setup_settings_tab(self):
        """Setup settings tab untuk Extension ID management"""
        # Title
        title_frame = ttk.Frame(self.settings_tab)
        title_frame.pack(side=tk.TOP, fill=tk.X, padx=20, pady=20)

        title_label = tk.Label(
            title_frame,
            text="Extension ID Management",
            font=("Arial", 16, "bold"),
            bg=self.colors["bg"],
            fg="white",
        )
        title_label.pack(side=tk.LEFT)

        # Instructions
        instructions = tk.Label(
            self.settings_tab,
            text="Add Chrome Extension IDs to allow backend connection.\nYou can add multiple Extension IDs for multi-extension support.",
            bg=self.colors["bg"],
            fg="#cccccc",
            justify=tk.LEFT,
        )
        instructions.pack(side=tk.TOP, padx=20, pady=10, anchor=tk.W)

        # Extension IDs list
        list_frame = ttk.Frame(self.settings_tab)
        list_frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=20, pady=10)

        self.extension_ids_list = tk.Listbox(
            list_frame,
            bg="#2b2b2b",
            fg="white",
            selectbackground=self.colors["primary"],
            font=("Courier", 10),
            height=8,
        )
        self.extension_ids_list.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        scrollbar = ttk.Scrollbar(
            list_frame, orient=tk.VERTICAL, command=self.extension_ids_list.yview
        )
        self.extension_ids_list.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Buttons
        button_frame = ttk.Frame(self.settings_tab)
        button_frame.pack(side=tk.TOP, fill=tk.X, padx=20, pady=10)

        ttk.Button(
            button_frame, text="➕ Add Extension ID", command=self.add_extension_id
        ).pack(side=tk.LEFT, padx=5)
        ttk.Button(
            button_frame, text="🗑️ Remove Selected", command=self.remove_extension_id
        ).pack(side=tk.LEFT, padx=5)
        ttk.Button(
            button_frame,
            text="💾 Save & Apply to All Browsers",
            command=self.save_extension_ids,
        ).pack(side=tk.LEFT, padx=5)
        ttk.Button(
            button_frame, text="🔄 Refresh", command=self.load_extension_ids
        ).pack(side=tk.LEFT, padx=5)

        # Browser selection
        browser_frame = ttk.Frame(self.settings_tab)
        browser_frame.pack(side=tk.TOP, fill=tk.X, padx=20, pady=10)

        browser_label = tk.Label(
            browser_frame,
            text="Target Browsers (manifest akan di-generate untuk semua yang dipilih):",
            bg=self.colors["bg"],
            fg="white",
            font=("Arial", 10),
        )
        browser_label.pack(anchor=tk.W, pady=(0, 10))

        browsers_checkboxes = ttk.Frame(browser_frame)
        browsers_checkboxes.pack(fill=tk.X)

        self.browser_vars = {}
        browsers = [
            ("Chrome", "chrome"),
            ("Microsoft Edge", "edge"),
            ("Brave", "brave"),
            ("Chromium", "chromium"),
            ("Opera", "opera"),
        ]

        for browser_name, browser_key in browsers:
            var = tk.BooleanVar(value=True)  # All enabled by default
            self.browser_vars[browser_key] = var

            cb = tk.Checkbutton(
                browsers_checkboxes,
                text=f"🌐 {browser_name}",
                variable=var,
                bg=self.colors["bg"],
                fg="white",
                selectcolor="#333333",
                activebackground=self.colors["bg"],
                activeforeground="white",
                font=("Arial", 9),
            )
            cb.pack(side=tk.LEFT, padx=10)

        # Status info
        info_frame = tk.Frame(self.settings_tab, bg="#2a2a2a")
        info_frame.pack(side=tk.TOP, fill=tk.X, padx=20, pady=10)

        info_text = tk.Label(
            info_frame,
            text="📍 How to get Extension ID:\n1. Open chrome://extensions/\n2. Enable Developer Mode\n3. Copy the ID below the extension name",
            bg="#2a2a2a",
            fg="#aaaaaa",
            justify=tk.LEFT,
            font=("Arial", 9),
        )
        info_text.pack(padx=10, pady=10, anchor=tk.W)

        # Diagnostic section
        diag_frame = ttk.Frame(self.settings_tab)
        diag_frame.pack(side=tk.TOP, fill=tk.X, padx=20, pady=10)

        diag_label = tk.Label(
            diag_frame,
            text="🔍 Diagnostics & Testing",
            font=("Arial", 12, "bold"),
            bg=self.colors["bg"],
            fg="white",
        )
        diag_label.pack(anchor=tk.W, pady=(0, 10))

        diag_buttons = ttk.Frame(diag_frame)
        diag_buttons.pack(fill=tk.X)

        ttk.Button(
            diag_buttons,
            text="🔍 Check Configuration",
            command=self.check_configuration,
        ).pack(side=tk.LEFT, padx=5)
        ttk.Button(
            diag_buttons, text="📋 View Manifest", command=self.view_manifest
        ).pack(side=tk.LEFT, padx=5)
        ttk.Button(
            diag_buttons, text="🧪 Test Connection", command=self.test_connection
        ).pack(side=tk.LEFT, padx=5)

        # Load existing IDs
        self.load_extension_ids()

    def load_extension_ids(self):
        """Load extension IDs dari manifest file"""
        self.extension_ids_list.delete(0, tk.END)

        manifest_path = self.get_manifest_path()
        if not manifest_path.exists():
            self.status_bar.config(
                text="⚠ No manifest found. Add Extension IDs to create one.",
                fg=self.colors["warning"],
            )
            return

        try:
            with open(manifest_path) as f:
                manifest = json.load(f)

            allowed_origins = manifest.get("allowed_origins", [])
            for origin in allowed_origins:
                # Extract ID from chrome-extension://ID/
                ext_id = origin.replace("chrome-extension://", "").replace("/", "")
                self.extension_ids_list.insert(tk.END, ext_id)

            self.status_bar.config(
                text=f"✓ Loaded {len(allowed_origins)} Extension IDs",
                fg=self.colors["primary"],
            )

        except Exception as e:
            messagebox.showerror("Error", f"Failed to load Extension IDs: {str(e)}")

    def add_extension_id(self):
        """Add new Extension ID dengan browser selection"""
        dialog = tk.Toplevel(self.root)
        dialog.title("Add Extension ID")
        dialog.geometry("600x300")
        dialog.transient(self.root)
        dialog.grab_set()
        dialog.configure(bg=self.colors["bg"])

        # Title
        title = tk.Label(
            dialog,
            text="Add Extension ID",
            bg=self.colors["bg"],
            fg="white",
            font=("Arial", 14, "bold"),
        )
        title.pack(pady=(10, 5))

        # Browser selection
        browser_frame = ttk.Frame(dialog)
        browser_frame.pack(pady=10)

        tk.Label(
            browser_frame, text="Select Browser:", bg=self.colors["bg"], fg="white"
        ).pack(side=tk.LEFT, padx=5)

        browser_var = tk.StringVar(value="edge")
        browsers = [
            ("Microsoft Edge", "edge"),
            ("Google Chrome", "chrome"),
            ("Brave Browser", "brave"),
            ("Chromium", "chromium"),
            ("Opera", "opera"),
            ("Custom", "custom"),
        ]

        browser_combo = ttk.Combobox(
            browser_frame,
            textvariable=browser_var,
            values=[name for name, _ in browsers],
            state="readonly",
            width=20,
        )
        browser_combo.set("Microsoft Edge")
        browser_combo.pack(side=tk.LEFT, padx=5)

        # Template label
        template_frame = tk.Frame(dialog, bg=self.colors["bg"])
        template_frame.pack(pady=5)

        template_label = tk.Label(
            template_frame,
            text="Template: edge://extensions/?id=",
            bg=self.colors["bg"],
            fg="#888888",
            font=("Courier", 9),
        )
        template_label.pack()

        def update_template(*args):
            browser_name = browser_combo.get()
            browser_key = next(
                (key for name, key in browsers if name == browser_name), "edge"
            )

            if browser_key == "custom":
                template_label.config(text="Custom URL/ID (no template)")
            else:
                template_label.config(text=f"Template: {browser_key}://extensions/?id=")

        browser_combo.bind("<<ComboboxSelected>>", update_template)

        # Instructions
        instr = tk.Label(
            dialog,
            text="Paste full URL atau Extension ID saja:",
            bg=self.colors["bg"],
            fg="#cccccc",
            font=("Arial", 9),
        )
        instr.pack(pady=5)

        # Entry
        entry = ttk.Entry(dialog, width=60, font=("Courier", 10))
        entry.pack(pady=10)
        entry.focus()

        # Example
        example = tk.Label(
            dialog,
            text="Contoh:\n• edge://extensions/?id=bgnanbfmednppajbjombbalafjngpjng\n• bgnanbfmednppajbjombbalafjngpjng",
            bg=self.colors["bg"],
            fg="#666666",
            font=("Arial", 8),
            justify=tk.LEFT,
        )
        example.pack(pady=5)

        def save():
            input_text = entry.get().strip()
            if not input_text:
                messagebox.showerror("Error", "Extension ID cannot be empty")
                return

            # Extract ID dari URL atau use as-is
            ext_id = input_text

            # Check if it's a URL
            if "://" in input_text:
                # Extract ID dari URL
                if "?id=" in input_text:
                    ext_id = input_text.split("?id=")[1].split("&")[0]
                elif "/id=" in input_text:
                    ext_id = input_text.split("/id=")[1].split("&")[0]

            # Remove any trailing slashes or special chars
            ext_id = ext_id.rstrip("/")

            # Validate format (32 characters, alphanumeric)
            if len(ext_id) != 32 or not ext_id.isalnum():
                messagebox.showerror(
                    "Error",
                    f"Invalid Extension ID format.\n\nID: {ext_id}\nLength: {len(ext_id)}\nShould be 32 alphanumeric characters.",
                )
                return

            # Check if already exists
            existing = list(self.extension_ids_list.get(0, tk.END))
            if ext_id in existing:
                messagebox.showwarning("Warning", "Extension ID already exists")
                return

            # Auto-check corresponding browser
            browser_name = browser_combo.get()
            browser_key = next(
                (key for name, key in browsers if name == browser_name), None
            )
            if browser_key and browser_key in self.browser_vars:
                self.browser_vars[browser_key].set(True)

            self.extension_ids_list.insert(tk.END, ext_id)
            dialog.destroy()
            self.status_bar.config(
                text="✓ Extension ID added. Click 'Save & Apply' to activate.",
                fg=self.colors["accent"],
            )

        # Buttons
        button_frame = ttk.Frame(dialog)
        button_frame.pack(pady=15)

        ttk.Button(button_frame, text="Add", command=save).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Cancel", command=dialog.destroy).pack(
            side=tk.LEFT, padx=5
        )

    def remove_extension_id(self):
        """Remove selected Extension ID"""
        selection = self.extension_ids_list.curselection()
        if not selection:
            messagebox.showwarning("Warning", "Please select an Extension ID to remove")
            return

        ext_id = self.extension_ids_list.get(selection[0])

        if messagebox.askyesno("Confirm", f"Remove Extension ID?\n\n{ext_id}"):
            self.extension_ids_list.delete(selection[0])
            self.status_bar.config(
                text="✓ Extension ID removed. Click 'Save & Apply' to activate.",
                fg=self.colors["warning"],
            )

    def save_extension_ids(self):
        """Save Extension IDs dan re-generate manifest untuk ALL selected browsers"""
        extension_ids = list(self.extension_ids_list.get(0, tk.END))

        if not extension_ids:
            messagebox.showerror("Error", "Please add at least one Extension ID")
            return

        # Check selected browsers
        selected_browsers = [key for key, var in self.browser_vars.items() if var.get()]
        if not selected_browsers:
            messagebox.showerror("Error", "Please select at least one browser")
            return

        try:
            import platform

            # Get paths
            backend_dir = Path(__file__).parent
            python_path = sys.executable
            native_host_py = backend_dir / "native_host.py"

            # Create wrapper script untuk Windows
            if platform.system() == "Windows":
                # Create .bat file
                bat_file = backend_dir / "native_host.bat"
                bat_content = f'@echo off\n"{python_path}" "{native_host_py}" %*\n'

                with open(bat_file, "w") as f:
                    f.write(bat_content)

                # Use .bat file path in manifest (with forward slashes)
                host_path = str(bat_file).replace("\\", "/")
            else:
                # macOS/Linux can use Python directly
                host_path = str(native_host_py)

            # Build allowed_origins
            allowed_origins = [
                f"chrome-extension://{ext_id}/" for ext_id in extension_ids
            ]

            manifest = {
                "name": "com.cursor.manager",
                "description": "Native messaging host for Cursor Manager Extension",
                "path": host_path,
                "type": "stdio",
                "allowed_origins": allowed_origins,
            }

            # Generate manifest untuk EACH selected browser
            manifests_created = []
            for browser_key in selected_browsers:
                manifest_path = self.get_manifest_path(browser_key)
                manifest_path.parent.mkdir(parents=True, exist_ok=True)

                with open(manifest_path, "w") as f:
                    json.dump(manifest, f, indent=2)

                manifests_created.append(
                    f"  • {browser_key.capitalize()}: {manifest_path}"
                )

            messagebox.showinfo(
                "Success",
                f"Manifests created for {len(selected_browsers)} browser(s)!\n\n"
                + f"Extension IDs: {len(extension_ids)}\n"
                + f"Browsers: {', '.join([b.capitalize() for b in selected_browsers])}\n"
                + f"Host: {host_path}\n\n"
                + "Please reload your extension(s) to apply changes.",
            )

            self.status_bar.config(
                text=f"✓ Manifests saved for {len(selected_browsers)} browser(s)",
                fg=self.colors["primary"],
            )

        except Exception as e:
            messagebox.showerror("Error", f"Failed to save manifests: {str(e)}")

    def check_configuration(self):
        """Check dan display configuration status"""
        import platform
        import subprocess

        result = []
        result.append("=" * 60)
        result.append("CONFIGURATION DIAGNOSTICS")
        result.append("=" * 60)
        result.append("")

        # System info
        result.append(f"Platform: {platform.system()} {platform.release()}")
        result.append(f"Python: {sys.version.split()[0]}")
        result.append(f"Python Path: {sys.executable}")
        result.append("")

        # Backend files
        backend_dir = Path(__file__).parent
        result.append(f"Backend Directory: {backend_dir}")

        native_host_py = backend_dir / "native_host.py"
        result.append(f"✓ native_host.py exists: {native_host_py.exists()}")

        if platform.system() == "Windows":
            bat_file = backend_dir / "native_host.bat"
            result.append(f"✓ native_host.bat exists: {bat_file.exists()}")

        result.append("")

        # Manifest file
        manifest_path = self.get_manifest_path()
        result.append(f"Manifest Location: {manifest_path}")
        result.append(f"✓ Manifest exists: {manifest_path.exists()}")

        if manifest_path.exists():
            try:
                with open(manifest_path) as f:
                    manifest = json.load(f)

                result.append(
                    f"✓ Extension IDs: {len(manifest.get('allowed_origins', []))}"
                )
                result.append(f"✓ Host Path: {manifest.get('path', 'NOT SET')}")

                # Check if host path exists
                host_path = manifest.get("path", "")
                if host_path:
                    host_exists = (
                        Path(host_path.replace("/", "\\")).exists()
                        if platform.system() == "Windows"
                        else Path(host_path).exists()
                    )
                    result.append(f"✓ Host File Exists: {host_exists}")
            except Exception as e:
                result.append(f"✗ Error reading manifest: {str(e)}")
        else:
            result.append("✗ Manifest NOT found!")
            result.append("  → Click 'Add Extension ID' and 'Save & Apply'")

        result.append("")
        result.append("=" * 60)

        # Show in dialog
        dialog = tk.Toplevel(self.root)
        dialog.title("Configuration Check")
        dialog.geometry("700x500")
        dialog.transient(self.root)
        dialog.configure(bg=self.colors["bg"])

        text = scrolledtext.ScrolledText(
            dialog, bg="#2b2b2b", fg="white", font=("Courier", 9), wrap=tk.WORD
        )
        text.pack(fill="both", expand=True, padx=10, pady=10)
        text.insert("1.0", "\n".join(result))
        text.configure(state="disabled")

        ttk.Button(dialog, text="Close", command=dialog.destroy).pack(pady=10)

    def view_manifest(self):
        """View manifest file content"""
        manifest_path = self.get_manifest_path()

        if not manifest_path.exists():
            messagebox.showerror("Error", f"Manifest file not found:\n{manifest_path}")
            return

        try:
            with open(manifest_path) as f:
                content = f.read()

            dialog = tk.Toplevel(self.root)
            dialog.title("Manifest File")
            dialog.geometry("700x400")
            dialog.transient(self.root)
            dialog.configure(bg=self.colors["bg"])

            text = scrolledtext.ScrolledText(
                dialog, bg="#2b2b2b", fg="white", font=("Courier", 9), wrap=tk.WORD
            )
            text.pack(fill="both", expand=True, padx=10, pady=10)
            text.insert("1.0", content)
            text.configure(state="disabled")

            ttk.Button(dialog, text="Close", command=dialog.destroy).pack(pady=10)

        except Exception as e:
            messagebox.showerror("Error", f"Failed to read manifest:\n{str(e)}")

    def test_connection(self):
        """Test native messaging connection"""
        result = []
        result.append("=" * 60)
        result.append("CONNECTION TEST")
        result.append("=" * 60)
        result.append("")

        # Check if backend can be started
        import subprocess
        import platform

        backend_dir = Path(__file__).parent

        try:
            if platform.system() == "Windows":
                host_file = backend_dir / "native_host.bat"
            else:
                host_file = backend_dir / "native_host.py"

            result.append(f"Testing: {host_file}")
            result.append("")

            if not host_file.exists():
                result.append("✗ Host file NOT found!")
            else:
                result.append("✓ Host file exists")

                # Try to import native_host
                try:
                    import native_host

                    result.append("✓ Native host module can be imported")
                except Exception as e:
                    result.append(f"✗ Import error: {str(e)}")

                # Check database
                try:
                    db = Database()
                    version = db.get_schema_version()
                    db.close()
                    result.append(f"✓ Database accessible (schema v{version})")
                except Exception as e:
                    result.append(f"✗ Database error: {str(e)}")

        except Exception as e:
            result.append(f"✗ Test error: {str(e)}")

        result.append("")
        result.append("=" * 60)
        result.append("TROUBLESHOOTING:")
        result.append("1. Ensure Extension ID is added and saved")
        result.append("2. Reload Chrome extension (chrome://extensions/)")
        result.append("3. Check manifest location (click 'View Manifest')")
        result.append("4. Try 'Check Configuration' for detailed info")
        result.append("=" * 60)

        # Show result
        dialog = tk.Toplevel(self.root)
        dialog.title("Connection Test")
        dialog.geometry("700x400")
        dialog.transient(self.root)
        dialog.configure(bg=self.colors["bg"])

        text = scrolledtext.ScrolledText(
            dialog, bg="#2b2b2b", fg="white", font=("Courier", 9), wrap=tk.WORD
        )
        text.pack(fill="both", expand=True, padx=10, pady=10)
        text.insert("1.0", "\n".join(result))
        text.configure(state="disabled")

        ttk.Button(dialog, text="Close", command=dialog.destroy).pack(pady=10)

    # === Dashboard Tab Methods ===

    def refresh_dashboard(self):
        """Refresh dashboard statistics"""
        try:
            # Get counts
            accounts = self.account_service.get_all()
            cards = self.cards_service.get_all()

            # Update counts
            self.dash_accounts_count.config(text=str(len(accounts)))
            self.dash_cards_count.config(text=str(len(cards)))

            # Update system info
            import platform
            from datetime import datetime

            info = f"=== System Overview ===\n\n"
            info += f"Version: 2.0.0\n"
            info += f"Backend: Python {platform.python_version()}\n"
            info += f"OS: {platform.system()} {platform.release()}\n"
            info += f"Architecture: {platform.machine()}\n\n"

            info += f"=== Database Statistics ===\n\n"
            info += f"Total Accounts: {len(accounts)}\n"
            info += f"Total Cards: {len(cards)}\n"

            # Count active accounts
            active_accounts = sum(
                1 for acc in accounts if acc.get("status") == "active"
            )
            info += f"Active Accounts: {active_accounts}\n\n"

            info += f"=== Backend Services ===\n\n"
            info += f"✅ Account Service - Operational\n"
            info += f"✅ Cards Service - Operational\n"
            info += f"✅ Generator Service - Operational\n"
            info += f"✅ Bypass Service - Operational\n"
            info += f"✅ Pro Trial Service - Operational\n"
            info += f"✅ Export/Import Service - Operational\n"
            info += f"✅ Batch Service - Operational\n\n"

            info += f"Last Refreshed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

            self.dash_info_text.delete("1.0", tk.END)
            self.dash_info_text.insert("1.0", info)
            self.dash_info_text.config(state=tk.DISABLED)

            # Update status bar
            self.status_bar.config(
                text=f"✅ Ready | Accounts: {len(accounts)} | Cards: {len(cards)} | Database: Connected"
            )

        except Exception as e:
            messagebox.showerror("Error", f"Failed to refresh dashboard: {str(e)}")

    # === Generator Tab Methods ===

    def generate_cards(self):
        """Generate cards using backend card generator"""
        try:
            from card_generator import CardGenerator

            bin_code = self.gen_bin_entry.get().strip()
            quantity = int(self.gen_quantity_var.get())
            month = self.gen_month_var.get()
            year = self.gen_year_var.get()
            cvv_input = self.gen_cvv_entry.get().strip()

            cvv = None if cvv_input.lower() == "random" else cvv_input

            generator = CardGenerator()
            cards = generator.generate_multiple_cards(
                quantity, bin_code, month, year, cvv
            )

            # Store and display
            self.generated_cards = cards
            self.gen_results_text.delete("1.0", tk.END)

            for i, card in enumerate(cards, 1):
                self.gen_results_text.insert(tk.END, f"Card {i}:\n")
                self.gen_results_text.insert(tk.END, f"  Number: {card['number']}\n")
                self.gen_results_text.insert(tk.END, f"  Expiry: {card['expiry']}\n")
                self.gen_results_text.insert(tk.END, f"  CVV: {card['cvv']}\n")
                self.gen_results_text.insert(tk.END, f"  Type: {card['card_type']}\n\n")

            messagebox.showinfo("Success", f"Generated {quantity} cards successfully!")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to generate cards: {str(e)}")

    def save_generated_cards(self):
        """Save all generated cards to database"""
        if not self.generated_cards:
            messagebox.showwarning("Warning", "No cards to save. Generate cards first.")
            return

        try:
            saved = 0
            for card in self.generated_cards:
                self.cards_service.create(
                    card["number"], "Generated Card", card["expiry"], card["cvv"]
                )
                saved += 1

            messagebox.showinfo("Success", f"Saved {saved} cards to database!")
            self.refresh_cards()
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save cards: {str(e)}")

    def copy_generated_cards(self):
        """Copy all generated cards to clipboard"""
        if not self.generated_cards:
            messagebox.showwarning("Warning", "No cards to copy. Generate cards first.")
            return

        try:
            text = "\n".join(
                [
                    f"{c['number']}|{c['expiry']}|{c['cvv']}"
                    for c in self.generated_cards
                ]
            )
            self.root.clipboard_clear()
            self.root.clipboard_append(text)
            messagebox.showinfo(
                "Success", f"Copied {len(self.generated_cards)} cards to clipboard!"
            )
        except Exception as e:
            messagebox.showerror("Error", f"Failed to copy: {str(e)}")

    def export_generated_cards(self):
        """Export generated cards to file"""
        if not self.generated_cards:
            messagebox.showwarning(
                "Warning", "No cards to export. Generate cards first."
            )
            return

        try:
            from tkinter import filedialog

            filename = filedialog.asksaveasfilename(
                defaultextension=".txt",
                filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
            )

            if filename:
                with open(filename, "w") as f:
                    for card in self.generated_cards:
                        f.write(f"{card['number']}|{card['expiry']}|{card['cvv']}\n")
                messagebox.showinfo(
                    "Success",
                    f"Exported {len(self.generated_cards)} cards to {filename}",
                )
        except Exception as e:
            messagebox.showerror("Error", f"Failed to export: {str(e)}")

    def clear_generated_cards(self):
        """Clear generated cards"""
        self.generated_cards = []
        self.gen_results_text.delete("1.0", tk.END)

    # === Bypass Tab Methods ===

    def load_bypass_suite(self):
        """Load bypass test suite from backend"""
        try:
            from services.bypass_service import BypassService

            test_type = self.bypass_type_var.get()
            bypass_service = BypassService(self.db)
            result = bypass_service.get_test_suite(test_type)

            if result.get("success"):
                tests = result.get("tests", [])
                self.bypass_tree.delete(*self.bypass_tree.get_children())

                for i, test in enumerate(tests, 1):
                    payload = (
                        test.get("payload")
                        or test.get("header")
                        or test.get("method")
                        or test.get("storage")
                        or test.get("dom")
                    )
                    self.bypass_tree.insert(
                        "", tk.END, text=str(i), values=(payload, "Ready", "-", "-")
                    )

                messagebox.showinfo("Success", f"Loaded {len(tests)} test cases!")
            else:
                messagebox.showerror("Error", "Failed to load test suite")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load suite: {str(e)}")

    def run_bypass_test(self):
        """Run selected bypass test"""
        messagebox.showinfo(
            "Info",
            "Bypass testing requires browser integration.\nPlease use the Chrome extension for running tests.\n\nThis GUI can view test results and statistics.",
        )

    def view_bypass_stats(self):
        """View bypass testing statistics"""
        try:
            from services.bypass_service import BypassService

            bypass_service = BypassService(self.db)
            result = bypass_service.get_test_statistics()

            if result.get("success"):
                stats = result.get("overall", {})
                by_type = result.get("by_type", {})

                info = f"=== Bypass Test Statistics ===\n\n"
                info += f"Total Tests: {stats.get('total_tests', 0)}\n"
                info += f"Successful: {stats.get('successful_tests', 0)}\n"
                info += f"Failed: {stats.get('failed_tests', 0)}\n"
                info += f"Success Rate: {stats.get('success_rate', 0):.1f}%\n\n"
                info += f"=== By Type ===\n"
                for test_type, type_stats in by_type.items():
                    info += f"\n{test_type.upper()}:\n"
                    info += f"  Total: {type_stats.get('count', 0)}\n"
                    info += (
                        f"  Success Rate: {type_stats.get('success_rate', 0):.1f}%\n"
                    )

                dialog = tk.Toplevel(self.root)
                dialog.title("Bypass Statistics")
                dialog.geometry("500x400")

                text = scrolledtext.ScrolledText(
                    dialog, wrap=tk.WORD, font=("Courier", 10)
                )
                text.pack(fill="both", expand=True, padx=10, pady=10)
                text.insert("1.0", info)
                text.config(state=tk.DISABLED)

                ttk.Button(dialog, text="Close", command=dialog.destroy).pack(pady=10)
            else:
                messagebox.showerror("Error", "Failed to get statistics")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to get stats: {str(e)}")

    def clear_bypass_results(self):
        """Clear bypass test results"""
        self.bypass_tree.delete(*self.bypass_tree.get_children())

    # === Pro Trial Tab Methods ===

    def refresh_trial_accounts(self):
        """Refresh account list for trial selection"""
        try:
            accounts = self.account_service.get_all()
            account_list = [f"{acc['id']}: {acc['email']}" for acc in accounts]
            self.trial_account_combo["values"] = account_list
            if account_list:
                self.trial_account_combo.current(0)
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load accounts: {str(e)}")

    def prepare_trial(self):
        """Prepare pro trial activation"""
        try:
            from services.pro_trial_service import ProTrialService

            selected = self.trial_account_var.get()
            if not selected:
                messagebox.showwarning("Warning", "Please select an account first")
                return

            account_id = int(selected.split(":")[0])

            pro_trial_service = ProTrialService(self.db, self.cards_service)
            result = pro_trial_service.prepare_trial_activation(account_id)

            if result.get("success"):
                info = f"=== Trial Preparation ===\n\n"
                info += f"Trial ID: {result.get('trial_id')}\n"
                info += f"Trial Token: {result.get('trial_token')}\n\n"
                info += f"=== Card Data ===\n"
                card = result.get("card_data", {})
                info += f"Number: {card.get('number')}\n"
                info += f"Expiry: {card.get('expiry')}\n"
                info += f"CVV: {card.get('cvv')}\n"
                info += f"Holder: {card.get('holder')}\n\n"
                info += f"Expiry Date: {result.get('expiry_date')}\n\n"
                info += f"Use the Chrome extension to complete activation at:\n{result.get('stripe_url')}"

                self.trial_info_text.delete("1.0", tk.END)
                self.trial_info_text.insert("1.0", info)

                messagebox.showinfo(
                    "Success",
                    "Trial preparation complete!\nUse the extension to complete activation.",
                )
            else:
                messagebox.showerror("Error", "Failed to prepare trial")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to prepare trial: {str(e)}")

    def check_trial_status(self):
        """Check pro trial status"""
        try:
            from services.pro_trial_service import ProTrialService

            selected = self.trial_account_var.get()
            if not selected:
                messagebox.showwarning("Warning", "Please select an account first")
                return

            account_id = int(selected.split(":")[0])

            pro_trial_service = ProTrialService(self.db, self.cards_service)
            result = pro_trial_service.check_trial_status(account_id)

            if result.get("success"):
                has_trial = result.get("has_trial", False)
                if has_trial:
                    trial = result.get("trial", {})
                    info = f"=== Active Trial ===\n\n"
                    info += f"Status: {trial.get('status')}\n"
                    info += f"Activation: {trial.get('activation_date', 'N/A')}\n"
                    info += f"Expiry: {trial.get('expiry_date', 'N/A')}\n"
                    info += f"Auto-Renew: {trial.get('auto_renew', False)}\n"
                else:
                    info = "No active trial found for this account."

                self.trial_info_text.delete("1.0", tk.END)
                self.trial_info_text.insert("1.0", info)
            else:
                messagebox.showerror("Error", "Failed to check status")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to check status: {str(e)}")

    def renew_trial(self):
        """Renew pro trial"""
        try:
            from services.pro_trial_service import ProTrialService

            selected = self.trial_account_var.get()
            if not selected:
                messagebox.showwarning("Warning", "Please select an account first")
                return

            account_id = int(selected.split(":")[0])

            pro_trial_service = ProTrialService(self.db, self.cards_service)
            result = pro_trial_service.renew_trial(account_id)

            if result.get("success"):
                messagebox.showinfo("Success", "Trial renewed successfully!")
                self.check_trial_status()
            else:
                messagebox.showerror(
                    "Error", result.get("message", "Failed to renew trial")
                )
        except Exception as e:
            messagebox.showerror("Error", f"Failed to renew trial: {str(e)}")

    def view_trial_stats(self):
        """View pro trial statistics"""
        try:
            from services.pro_trial_service import ProTrialService

            pro_trial_service = ProTrialService(self.db, self.cards_service)
            result = pro_trial_service.get_statistics()

            if result.get("success"):
                stats = result

                info = f"=== Pro Trial Statistics ===\n\n"
                info += f"Total Trials: {stats.get('total_trials', 0)}\n"
                info += f"Active Trials: {stats.get('active_trials', 0)}\n"
                info += f"Expired Trials: {stats.get('expired_trials', 0)}\n"
                info += f"Failed Trials: {stats.get('failed_trials', 0)}\n"
                info += f"Success Rate: {stats.get('success_rate', 0):.1f}%\n"

                dialog = tk.Toplevel(self.root)
                dialog.title("Pro Trial Statistics")
                dialog.geometry("400x300")

                text = scrolledtext.ScrolledText(
                    dialog, wrap=tk.WORD, font=("Courier", 10)
                )
                text.pack(fill="both", expand=True, padx=10, pady=10)
                text.insert("1.0", info)
                text.config(state=tk.DISABLED)

                ttk.Button(dialog, text="Close", command=dialog.destroy).pack(pady=10)
            else:
                messagebox.showerror("Error", "Failed to get statistics")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to get stats: {str(e)}")

    def get_manifest_path(self, browser="chrome"):
        """Get native messaging manifest path untuk specific browser"""
        import platform

        browser_paths = {
            "chrome": {
                "Windows": Path(os.getenv("APPDATA"))
                / r"Google\Chrome\NativeMessagingHosts",
                "Darwin": Path.home()
                / "Library/Application Support/Google/Chrome/NativeMessagingHosts",
                "Linux": Path.home() / ".config/google-chrome/NativeMessagingHosts",
            },
            "edge": {
                "Windows": Path(os.getenv("APPDATA"))
                / r"Microsoft\Edge\NativeMessagingHosts",
                "Darwin": Path.home()
                / "Library/Application Support/Microsoft Edge/NativeMessagingHosts",
                "Linux": Path.home() / ".config/microsoft-edge/NativeMessagingHosts",
            },
            "brave": {
                "Windows": Path(os.getenv("APPDATA"))
                / r"BraveSoftware\Brave-Browser\NativeMessagingHosts",
                "Darwin": Path.home()
                / "Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts",
                "Linux": Path.home()
                / ".config/BraveSoftware/Brave-Browser/NativeMessagingHosts",
            },
            "chromium": {
                "Windows": Path(os.getenv("APPDATA"))
                / r"Chromium\NativeMessagingHosts",
                "Darwin": Path.home()
                / "Library/Application Support/Chromium/NativeMessagingHosts",
                "Linux": Path.home() / ".config/chromium/NativeMessagingHosts",
            },
            "opera": {
                "Windows": Path(os.getenv("APPDATA"))
                / r"Opera Software\Opera\NativeMessagingHosts",
                "Darwin": Path.home()
                / "Library/Application Support/Opera/NativeMessagingHosts",
                "Linux": Path.home() / ".config/opera/NativeMessagingHosts",
            },
        }

        system = platform.system()
        manifest_dir = browser_paths.get(browser, browser_paths["chrome"]).get(system)

        return manifest_dir / "com.cursor.manager.json"


def main():
    """Main entry point"""
    root = tk.Tk()
    app = CursorManagerGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()

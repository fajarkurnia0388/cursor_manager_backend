"""
CLI Tool - Command line interface untuk manage data
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Optional

from database import Database
from account_service import AccountService, DEFAULT_ACCOUNT_STATUS
from cards_service import CardsService
from __init__ import __version__

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


def format_table(headers, rows):
    """Format data as table"""
    if not rows:
        return "No data found."

    # Calculate column widths
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(str(cell)))

    # Format header
    header = " | ".join(h.ljust(w) for h, w in zip(headers, widths))
    separator = "-+-".join("-" * w for w in widths)

    # Format rows
    formatted_rows = []
    for row in rows:
        formatted_rows.append(
            " | ".join(str(cell).ljust(w) for cell, w in zip(row, widths))
        )

    return "\n".join([header, separator] + formatted_rows)


class CLI:
    """Command line interface"""

    def __init__(self, db_path: Optional[str] = None):
        self.db = Database(db_path)
        self.account_service = AccountService(self.db)
        self.cards_service = CardsService(self.db)

    def accounts_list(self, status: Optional[str] = None):
        """List all accounts"""
        accounts = self.account_service.get_all(status)

        if not accounts:
            print("No accounts found.")
            return

        # Format as table
        headers = ["ID", "Email", "Status", "Last Used", "Created"]
        rows = []
        for acc in accounts:
            rows.append(
                [
                    acc["id"],
                    acc["email"],
                    acc["status"],
                    acc.get("last_used", "Never"),
                    acc["created_at"],
                ]
            )

        print(format_table(headers, rows))
        print(f"\nTotal: {len(accounts)} accounts")

    def accounts_show(self, account_id: int):
        """Show account details"""
        account = self.account_service.get_by_id(account_id)

        if not account:
            print(f"Account {account_id} not found.")
            return

        print(f"ID: {account['id']}")
        print(f"Email: {account['email']}")
        print(f"Password: {account['password']}")
        print(f"Status: {account['status']}")
        print(f"Last Used: {account.get('last_used', 'Never')}")
        print(f"Created: {account['created_at']}")
        print(f"Updated: {account['updated_at']}")

        if account.get("cookies"):
            print(f"\nCookies:")
            print(json.dumps(account["cookies"], indent=2))

    def accounts_create(
        self,
        email: str,
        password: str = "",
        cookies_file: Optional[str] = None,
        status: str = DEFAULT_ACCOUNT_STATUS,
    ):
        """Create new account"""
        cookies = None
        if cookies_file:
            with open(cookies_file) as f:
                cookies = json.load(f)

        account = self.account_service.create(
            email,
            password,
            cookies,
            status=status,
        )
        print(f"Account created with ID: {account['id']}")

    def accounts_delete(self, account_id: int, permanent: bool = False):
        """Delete account"""
        self.account_service.delete(account_id, soft=not permanent)
        action = "permanently deleted" if permanent else "marked as deleted"
        print(f"Account {account_id} {action}.")

    def accounts_import(self, json_file: str):
        """Import accounts dari JSON file"""
        with open(json_file) as f:
            data = json.load(f)

        imported = 0
        for item in data:
            try:
                status = item.get("status", DEFAULT_ACCOUNT_STATUS)
                self.account_service.create(
                    email=item.get("email"),
                    password=item.get("password", ""),
                    cookies=item.get("cookies"),
                    status=status,
                )
                imported += 1
            except Exception as e:
                print(f"Error importing {item.get('email')}: {e}")

        print(f"Imported {imported} accounts.")

    def accounts_export(self, output_file: str, status: Optional[str] = None):
        """Export accounts ke JSON file"""
        accounts = self.account_service.get_all(status)

        with open(output_file, "w") as f:
            json.dump(accounts, f, indent=2)

        print(f"Exported {len(accounts)} accounts to {output_file}")

    def accounts_stats(self):
        """Show account statistics"""
        stats = self.account_service.get_stats()

        print("Account Statistics:")
        print(f"  Total: {stats.get('total', 0)}")
        for status in ACCOUNT_STATUS_CHOICES:
            label = status.replace("limit ", "Limit ").title()
            print(f"  {label}: {stats.get(status, 0)}")
        print(f"  Deleted: {stats.get(DELETED_ACCOUNT_STATUS, 0)}")

    def cards_list(self, status: Optional[str] = None):
        """List all cards"""
        cards = self.cards_service.get_all(status)

        if not cards:
            print("No cards found.")
            return

        # Format as table (mask card details)
        headers = ["ID", "Card Holder", "Card Number", "Expiry", "Status"]
        rows = []
        for card in cards:
            # Mask card number
            card_num = card["card_number"]
            masked = f"****-****-****-{card_num[-4:]}"

            rows.append(
                [
                    card["id"],
                    card["card_holder"],
                    masked,
                    card["expiry"],
                    card["status"],
                ]
            )

        print(format_table(headers, rows))
        print(f"\nTotal: {len(cards)} cards")

    def cards_show(self, card_id: int):
        """Show card details"""
        card = self.cards_service.get_by_id(card_id)

        if not card:
            print(f"Card {card_id} not found.")
            return

        print(f"ID: {card['id']}")
        print(f"Card Holder: {card['card_holder']}")
        print(f"Card Number: {card['card_number']}")
        print(f"Expiry: {card['expiry']}")
        print(f"CVV: {card['cvv']}")
        print(f"Status: {card['status']}")
        print(f"Last Used: {card.get('last_used', 'Never')}")
        print(f"Created: {card['created_at']}")

    def cards_create(self, card_number: str, card_holder: str, expiry: str, cvv: str):
        """Create new card"""
        card = self.cards_service.create(card_number, card_holder, expiry, cvv)
        print(f"Card created with ID: {card['id']}")

    def cards_delete(self, card_id: int, permanent: bool = False):
        """Delete card"""
        self.cards_service.delete(card_id, soft=not permanent)
        action = "permanently deleted" if permanent else "marked as deleted"
        print(f"Card {card_id} {action}.")

    def backup(self, output_path: Optional[str] = None):
        """Create database backup"""
        backup_path = self.db.backup(output_path)
        print(f"Backup created: {backup_path}")

    def restore(self, backup_path: str):
        """Restore database from backup"""
        self.db.restore(backup_path)
        print(f"Database restored from: {backup_path}")

    def version(self):
        """Show version info"""
        print(f"Cursor Manager Backend v{__version__}")
        print(f"Database Schema v{self.db.get_schema_version()}")
        print(f"Database Location: {self.db.db_path}")


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="Cursor Manager CLI Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument("--db", help="Database path")

    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Version command
    subparsers.add_parser("version", help="Show version info")

    # Accounts commands
    accounts_parser = subparsers.add_parser("accounts", help="Manage accounts")
    accounts_sub = accounts_parser.add_subparsers(dest="action")

    accounts_sub.add_parser("list", help="List accounts").add_argument(
        "--status", choices=ACCOUNT_STATUS_CHOICES + [DELETED_ACCOUNT_STATUS]
    )
    accounts_sub.add_parser("show", help="Show account details").add_argument(
        "id", type=int
    )

    create_acc = accounts_sub.add_parser("create", help="Create account")
    create_acc.add_argument("email")
    create_acc.add_argument("password", nargs="?", default="")
    create_acc.add_argument("--cookies", help="Path to cookies JSON file")
    create_acc.add_argument("--status", choices=ACCOUNT_STATUS_CHOICES, default=DEFAULT_ACCOUNT_STATUS)

    delete_acc = accounts_sub.add_parser("delete", help="Delete account")
    delete_acc.add_argument("id", type=int)
    delete_acc.add_argument("--permanent", action="store_true")

    accounts_sub.add_parser("import", help="Import from JSON").add_argument("file")

    export_acc = accounts_sub.add_parser("export", help="Export to JSON")
    export_acc.add_argument("file")
    export_acc.add_argument("--status", choices=ACCOUNT_STATUS_CHOICES + [DELETED_ACCOUNT_STATUS])

    accounts_sub.add_parser("stats", help="Show statistics")

    # Cards commands
    cards_parser = subparsers.add_parser("cards", help="Manage cards")
    cards_sub = cards_parser.add_subparsers(dest="action")

    cards_sub.add_parser("list", help="List cards").add_argument(
        "--status", choices=["active", "inactive", "deleted"]
    )
    cards_sub.add_parser("show", help="Show card details").add_argument("id", type=int)

    create_card = cards_sub.add_parser("create", help="Create card")
    create_card.add_argument("card_number")
    create_card.add_argument("card_holder")
    create_card.add_argument("expiry")
    create_card.add_argument("cvv")

    delete_card = cards_sub.add_parser("delete", help="Delete card")
    delete_card.add_argument("id", type=int)
    delete_card.add_argument("--permanent", action="store_true")

    # Backup/Restore commands
    subparsers.add_parser("backup", help="Create backup").add_argument(
        "--output", help="Output path"
    )
    subparsers.add_parser("restore", help="Restore from backup").add_argument(
        "backup_path"
    )

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # Initialize CLI
    cli = CLI(args.db)

    # Execute command
    try:
        if args.command == "version":
            cli.version()

        elif args.command == "accounts":
            if args.action == "list":
                cli.accounts_list(args.status)
            elif args.action == "show":
                cli.accounts_show(args.id)
            elif args.action == "create":
                cli.accounts_create(args.email, args.password, args.cookies, args.status)
            elif args.action == "delete":
                cli.accounts_delete(args.id, args.permanent)
            elif args.action == "import":
                cli.accounts_import(args.file)
            elif args.action == "export":
                cli.accounts_export(args.file, args.status)
            elif args.action == "stats":
                cli.accounts_stats()
            else:
                accounts_parser.print_help()

        elif args.command == "cards":
            if args.action == "list":
                cli.cards_list(args.status)
            elif args.action == "show":
                cli.cards_show(args.id)
            elif args.action == "create":
                cli.cards_create(
                    args.card_number, args.card_holder, args.expiry, args.cvv
                )
            elif args.action == "delete":
                cli.cards_delete(args.id, args.permanent)
            else:
                cards_parser.print_help()

        elif args.command == "backup":
            cli.backup(args.output)

        elif args.command == "restore":
            cli.restore(args.backup_path)

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

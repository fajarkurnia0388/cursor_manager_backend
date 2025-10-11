"""
Export Service - Export accounts, cards, and other data
"""

import logging
import json
import csv
import io
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)


class ExportService:
    """Service untuk export data dalam berbagai format"""

    def __init__(self, db, account_service, cards_service):
        self.db = db
        self.account_service = account_service
        self.cards_service = cards_service
        logger.info("ExportService initialized")

    def export_accounts(
        self, format: str = "json", filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Export accounts to specified format"""
        try:
            # Get all accounts
            accounts_data = self.account_service.get_all()
            # Handle both dict and list return types
            if isinstance(accounts_data, dict):
                accounts = accounts_data.get("accounts", [])
            elif isinstance(accounts_data, list):
                accounts = accounts_data
            else:
                accounts = []

            # Apply filters if provided
            if filters:
                accounts = self._apply_filters(accounts, filters)

            # Export based on format
            if format.lower() == "json":
                export_data = self._export_json(accounts)
            elif format.lower() == "csv":
                export_data = self._export_csv_accounts(accounts)
            else:
                raise ValueError(f"Unsupported format: {format}")

            logger.info(f"Exported {len(accounts)} accounts to {format}")
            return {
                "success": True,
                "format": format,
                "count": len(accounts),
                "data": export_data,
                "exported_at": datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error exporting accounts: {str(e)}", exc_info=True)
            raise

    def export_cards(
        self, format: str = "json", filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Export cards to specified format"""
        try:
            # Get all cards
            cards_data = self.cards_service.get_all()
            # Handle both dict and list return types
            if isinstance(cards_data, dict):
                cards = cards_data.get("cards", [])
            elif isinstance(cards_data, list):
                cards = cards_data
            else:
                cards = []

            # Apply filters if provided
            if filters:
                cards = self._apply_filters(cards, filters)

            # Export based on format
            if format.lower() == "json":
                export_data = self._export_json(cards)
            elif format.lower() == "csv":
                export_data = self._export_csv_cards(cards)
            else:
                raise ValueError(f"Unsupported format: {format}")

            logger.info(f"Exported {len(cards)} cards to {format}")
            return {
                "success": True,
                "format": format,
                "count": len(cards),
                "data": export_data,
                "exported_at": datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error exporting cards: {str(e)}", exc_info=True)
            raise

    def export_all(self, format: str = "json") -> Dict[str, Any]:
        """Export all data (accounts, cards, trials, bypass results)"""
        try:
            # Export accounts
            accounts_data = self.account_service.get_all()
            accounts = accounts_data.get("accounts", [])

            # Export cards
            cards_data = self.cards_service.get_all()
            cards = cards_data.get("cards", [])

            # Export pro trials
            trials_query = """
                SELECT pt.id, pt.account_id, a.email, pt.status, 
                       pt.activation_date, pt.expiry_date, pt.auto_renew, pt.created_at
                FROM pro_trials pt
                LEFT JOIN accounts a ON pt.account_id = a.id
                ORDER BY pt.created_at DESC
            """
            cursor = self.db.execute(trials_query)
            trials = []
            for row in cursor.fetchall():
                trials.append(
                    {
                        "id": row[0],
                        "account_id": row[1],
                        "account_email": row[2],
                        "status": row[3],
                        "activation_date": row[4],
                        "expiry_date": row[5],
                        "auto_renew": bool(row[6]),
                        "created_at": row[7],
                    }
                )

            # Export bypass results (last 100)
            bypass_query = """
                SELECT id, test_type, payload, target_url, success, 
                       response_code, execution_time, created_at
                FROM bypass_results
                ORDER BY created_at DESC
                LIMIT 100
            """
            cursor = self.db.execute(bypass_query)
            bypass_results = []
            for row in cursor.fetchall():
                bypass_results.append(
                    {
                        "id": row[0],
                        "test_type": row[1],
                        "payload": row[2],
                        "target_url": row[3],
                        "success": bool(row[4]),
                        "response_code": row[5],
                        "execution_time": row[6],
                        "created_at": row[7],
                    }
                )

            # Combine all data
            all_data = {
                "export_info": {
                    "exported_at": datetime.now().isoformat(),
                    "version": "1.0",
                    "format": format,
                },
                "accounts": accounts,
                "cards": cards,
                "pro_trials": trials,
                "bypass_results": bypass_results,
                "statistics": {
                    "total_accounts": len(accounts),
                    "total_cards": len(cards),
                    "total_trials": len(trials),
                    "total_bypass_results": len(bypass_results),
                },
            }

            # Format output
            if format.lower() == "json":
                export_data = json.dumps(all_data, indent=2, ensure_ascii=False)
            else:
                raise ValueError(f"Only JSON format supported for full export")

            logger.info(
                f"Exported all data: {len(accounts)} accounts, {len(cards)} cards, "
                f"{len(trials)} trials, {len(bypass_results)} bypass results"
            )

            return {
                "success": True,
                "format": format,
                "data": export_data,
                "statistics": all_data["statistics"],
                "exported_at": all_data["export_info"]["exported_at"],
            }

        except Exception as e:
            logger.error(f"Error exporting all data: {str(e)}", exc_info=True)
            raise

    def _export_json(self, data: List[Dict]) -> str:
        """Export data as JSON"""
        return json.dumps(data, indent=2, ensure_ascii=False)

    def _export_csv_accounts(self, accounts: List[Dict]) -> str:
        """Export accounts as CSV"""
        output = io.StringIO()

        if accounts:
            # Define fields to export (exclude sensitive fields if needed)
            fieldnames = ["id", "email", "status", "created_at", "last_used", "tags"]
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()

            for account in accounts:
                row = {field: account.get(field, "") for field in fieldnames}
                if isinstance(account.get("tags"), list):
                    row["tags"] = ", ".join(account["tags"])
                writer.writerow(row)

        return output.getvalue()

    def _export_csv_cards(self, cards: List[Dict]) -> str:
        """Export cards as CSV"""
        output = io.StringIO()

        if cards:
            fieldnames = [
                "id",
                "card_number",
                "card_holder",
                "expiry",
                "cvv",
                "tags",
                "created_at",
                "last_used",
            ]
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()

            for card in cards:
                row = {field: card.get(field, "") for field in fieldnames}
                if isinstance(card.get("tags"), list):
                    row["tags"] = ", ".join(card["tags"])
                writer.writerow(row)

        return output.getvalue()

    def _apply_filters(self, data: List[Dict], filters: Dict[str, Any]) -> List[Dict]:
        """Apply filters to data"""
        filtered_data = data

        # Filter by status
        if "status" in filters:
            filtered_data = [
                item
                for item in filtered_data
                if item.get("status") == filters["status"]
            ]

        # Filter by date range
        if "date_from" in filters:
            date_from = datetime.fromisoformat(filters["date_from"])
            filtered_data = [
                item
                for item in filtered_data
                if datetime.fromisoformat(item.get("created_at", "1970-01-01"))
                >= date_from
            ]

        if "date_to" in filters:
            date_to = datetime.fromisoformat(filters["date_to"])
            filtered_data = [
                item
                for item in filtered_data
                if datetime.fromisoformat(item.get("created_at", "1970-01-01"))
                <= date_to
            ]

        return filtered_data

    def export_to_file(
        self, export_type: str, file_path: str, format: str = "json"
    ) -> Dict[str, Any]:
        """Export data to file"""
        try:
            # Get export data
            if export_type == "accounts":
                result = self.export_accounts(format=format)
            elif export_type == "cards":
                result = self.export_cards(format=format)
            elif export_type == "all":
                result = self.export_all(format=format)
            else:
                raise ValueError(f"Unknown export type: {export_type}")

            # Write to file
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(result["data"])

            logger.info(f"Exported {export_type} to file: {file_path}")
            return {
                "success": True,
                "file_path": file_path,
                "export_type": export_type,
                "format": format,
                "count": result.get("count", 0),
            }

        except Exception as e:
            logger.error(f"Error exporting to file: {str(e)}", exc_info=True)
            raise

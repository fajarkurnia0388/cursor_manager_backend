"""
Import Service - Import accounts and cards from various formats
"""

import logging
import json
from typing import Dict, Any, List, Optional

from account_service import DEFAULT_ACCOUNT_STATUS

logger = logging.getLogger(__name__)


class ImportService:
    """Service untuk import data dari berbagai format"""

    def __init__(self, db, account_service, cards_service):
        self.db = db
        self.account_service = account_service
        self.cards_service = cards_service
        logger.info("ImportService initialized")

    def import_accounts(
        self, data: Any, merge_strategy: str = "skip"
    ) -> Dict[str, Any]:
        """
        Import accounts from various formats

        Args:
            data: JSON string or dict/list of accounts
            merge_strategy: 'skip' (skip duplicates), 'update' (update existing), 'replace' (delete & create)
        """
        try:
            # Parse data if string
            if isinstance(data, str):
                data = json.loads(data)

            # Normalize to list
            accounts_data = self._normalize_accounts_data(data)

            # Import accounts
            created_count = 0
            updated_count = 0
            skipped_count = 0
            errors = []

            for idx, account_data in enumerate(accounts_data):
                try:
                    email = account_data.get("email", "").strip()
                    password = account_data.get("password", "").strip()
                    cookies = account_data.get("cookies")
                    tags = self._normalize_tags(account_data.get("tags"))

                    if not email:
                        errors.append(f"Account {idx + 1}: Missing email")
                        skipped_count += 1
                        continue

                    # Check if account exists
                    existing = self.account_service.get_by_email(email)

                    if existing:
                        if merge_strategy == "skip":
                            skipped_count += 1
                            continue
                        elif merge_strategy == "update":
                            # Update existing account
                            update_data = {}
                            if password:
                                update_data["password"] = password
                            if cookies:
                                update_data["cookies"] = cookies
                            if tags is not None:
                                update_data["tags"] = tags
                            if account_data.get("status"):
                                update_data["status"] = account_data.get("status")

                            if update_data:
                                self.account_service.update(existing["id"], **update_data)
                                updated_count += 1
                            else:
                                skipped_count += 1
                        elif merge_strategy == "replace":
                            # Delete and recreate
                            self.account_service.delete(existing["id"])
                            self.account_service.create(email, password, cookies, tags, status=account_data.get("status", DEFAULT_ACCOUNT_STATUS))
                            created_count += 1
                    else:
                        # Create new account
                        if not password:
                            password = f"imported_pass_{idx + 1}"
                        self.account_service.create(email, password, cookies, tags, status=account_data.get("status", DEFAULT_ACCOUNT_STATUS))
                        created_count += 1

                except Exception as e:
                    errors.append(f"Account {idx + 1} ({email}): {str(e)}")
                    skipped_count += 1

            logger.info(
                f"Import completed: {created_count} created, {updated_count} updated, "
                f"{skipped_count} skipped, {len(errors)} errors"
            )

            return {
                "success": True,
                "created": created_count,
                "updated": updated_count,
                "skipped": skipped_count,
                "errors": errors,
                "total_processed": created_count + updated_count + skipped_count,
            }

        except Exception as e:
            logger.error(f"Error importing accounts: {str(e)}", exc_info=True)
            raise

    def import_cards(self, data: Any, merge_strategy: str = "skip") -> Dict[str, Any]:
        """Import cards from various formats"""
        try:
            # Parse data if string
            if isinstance(data, str):
                data = json.loads(data)

            # Normalize to list
            cards_data = self._normalize_cards_data(data)

            # Import cards
            created_count = 0
            updated_count = 0
            skipped_count = 0
            errors = []

            for idx, card_data in enumerate(cards_data):
                try:
                    card_number = card_data.get("card_number", "").strip()
                    cardholder_name = (
                        card_data.get("card_holder")
                        or card_data.get("cardholder_name")
                        or "Card Holder"
                    ).strip()
                    expiry = card_data.get("expiry", "").strip()
                    cvv = card_data.get("cvv", "").strip()
                    tags = self._normalize_tags(card_data.get("tags"))

                    if not card_number:
                        errors.append(f"Card {idx + 1}: Missing card number")
                        skipped_count += 1
                        continue

                    # Check if card exists
                    existing_query = "SELECT id FROM cards WHERE card_number = ?"
                    cursor = self.db.execute(existing_query, (card_number,))
                    existing = cursor.fetchone()

                    if existing:
                        if merge_strategy == "skip":
                            skipped_count += 1
                            continue
                        elif merge_strategy == "update":
                            # Update existing card
                            update_data = {}
                            if cardholder_name:
                                update_data["card_holder"] = cardholder_name
                            if expiry:
                                update_data["expiry"] = expiry
                            if cvv:
                                update_data["cvv"] = cvv
                            if tags is not None:
                                update_data["tags"] = tags

                            if update_data:
                                self.cards_service.update(existing[0], **update_data)
                                updated_count += 1
                            else:
                                skipped_count += 1
                        elif merge_strategy == "replace":
                            # Delete and recreate
                            self.cards_service.delete(existing[0])
                            self.cards_service.create(
                                card_number, cardholder_name, expiry, cvv, tags
                            )
                            created_count += 1
                    else:
                        # Create new card
                        self.cards_service.create(
                            card_number, cardholder_name, expiry, cvv, tags
                        )
                        created_count += 1

                except Exception as e:
                    errors.append(f"Card {idx + 1} ({card_number}): {str(e)}")
                    skipped_count += 1

            logger.info(
                f"Import completed: {created_count} created, {updated_count} updated, "
                f"{skipped_count} skipped, {len(errors)} errors"
            )

            return {
                "success": True,
                "created": created_count,
                "updated": updated_count,
                "skipped": skipped_count,
                "errors": errors,
                "total_processed": created_count + updated_count + skipped_count,
            }

        except Exception as e:
            logger.error(f"Error importing cards: {str(e)}", exc_info=True)
            raise

    def import_from_file(
        self, file_path: str, data_type: str, merge_strategy: str = "skip"
    ) -> Dict[str, Any]:
        """Import data from file"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = f.read()

            if data_type == "accounts":
                return self.import_accounts(data, merge_strategy)
            elif data_type == "cards":
                return self.import_cards(data, merge_strategy)
            else:
                raise ValueError(f"Unknown data type: {data_type}")

        except Exception as e:
            logger.error(f"Error importing from file: {str(e)}", exc_info=True)
            raise

    def _normalize_tags(self, tags: Any) -> Optional[List[str]]:
        """Normalize tags input into list of strings (or None if not provided)."""
        if tags is None:
            return None
        if isinstance(tags, str):
            parsed = [tag.strip() for tag in tags.split(",") if tag.strip()]
            return parsed
        if isinstance(tags, list):
            return [str(tag).strip() for tag in tags if str(tag).strip()]
        return []

    def _normalize_accounts_data(self, data: Any) -> List[Dict]:
        """Normalize various account data formats to standard list"""
        if isinstance(data, list):
            # Already a list, check if it's accounts or cookies
            if data and isinstance(data[0], dict):
                if "email" in data[0] or "password" in data[0]:
                    # Array of accounts
                    return data
                else:
                    # Cookies array - need manual input (handled by GUI)
                    return []
            return []

        elif isinstance(data, dict):
            # Could be single account or wrapped format
            if "account" in data:
                # Full export format
                account_data = data["account"]
                return [
                    {
                        "email": account_data.get("email", ""),
                        "password": account_data.get("password", ""),
                        "cookies": account_data.get("cookies"),
                    }
                ]
            elif "accounts" in data:
                # Wrapped accounts array
                return data["accounts"]
            elif "email" in data or "password" in data:
                # Single account
                return [data]
            else:
                return []

        return []

    def _normalize_cards_data(self, data: Any) -> List[Dict]:
        """Normalize various card data formats to standard list"""
        if isinstance(data, list):
            return data

        elif isinstance(data, dict):
            if "cards" in data:
                # Wrapped cards array
                return data["cards"]
            elif "card_number" in data or "number" in data:
                # Single card
                return [data]
            else:
                return []

        return []

    def validate_import_data(self, data: Any, data_type: str) -> Dict[str, Any]:
        """Validate import data before processing"""
        try:
            # Parse data if string
            if isinstance(data, str):
                data = json.loads(data)

            if data_type == "accounts":
                accounts = self._normalize_accounts_data(data)
                valid_count = sum(
                    1 for acc in accounts if acc.get("email") and acc.get("password")
                )
                return {
                    "success": True,
                    "valid": True,
                    "total": len(accounts),
                    "valid_count": valid_count,
                    "invalid_count": len(accounts) - valid_count,
                }

            elif data_type == "cards":
                cards = self._normalize_cards_data(data)
                valid_count = sum(1 for card in cards if card.get("card_number"))
                return {
                    "success": True,
                    "valid": True,
                    "total": len(cards),
                    "valid_count": valid_count,
                    "invalid_count": len(cards) - valid_count,
                }

            else:
                raise ValueError(f"Unknown data type: {data_type}")

        except json.JSONDecodeError as e:
            return {
                "success": False,
                "valid": False,
                "error": f"Invalid JSON: {str(e)}",
            }
        except Exception as e:
            logger.error(f"Error validating import data: {str(e)}", exc_info=True)
            raise

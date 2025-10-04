"""
Batch Service - Handle batch operations on accounts and cards
"""

import logging
from typing import Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)


class BatchService:
    """Service untuk batch operations"""

    def __init__(self, db, account_service, cards_service):
        self.db = db
        self.account_service = account_service
        self.cards_service = cards_service
        logger.info("BatchService initialized")

    def batch_create_accounts(
        self, accounts_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Create multiple accounts in batch"""
        try:
            # Create batch operation record
            batch_id = self._create_batch_operation(
                "create_accounts", len(accounts_data)
            )

            created_count = 0
            failed_count = 0
            errors = []

            for idx, account_data in enumerate(accounts_data):
                try:
                    email = account_data.get("email", "").strip()
                    password = account_data.get("password", "").strip()
                    cookies = account_data.get("cookies")

                    if not email or not password:
                        failed_count += 1
                        errors.append(f"Account {idx + 1}: Missing email or password")
                        continue

                    self.account_service.create(email, password, cookies)
                    created_count += 1

                    # Update batch progress
                    self._update_batch_progress(batch_id, created_count, failed_count)

                except Exception as e:
                    failed_count += 1
                    errors.append(f"Account {idx + 1} ({email}): {str(e)}")
                    self._update_batch_progress(batch_id, created_count, failed_count)

            # Complete batch operation
            self._complete_batch_operation(
                batch_id,
                "completed" if failed_count == 0 else "partial_success",
                errors,
            )

            logger.info(
                f"Batch create accounts: {created_count} created, {failed_count} failed"
            )

            return {
                "success": True,
                "batch_id": batch_id,
                "created": created_count,
                "failed": failed_count,
                "errors": errors,
                "total": len(accounts_data),
            }

        except Exception as e:
            logger.error(f"Error in batch create accounts: {str(e)}", exc_info=True)
            raise

    def batch_delete_accounts(self, account_ids: List[int]) -> Dict[str, Any]:
        """Delete multiple accounts in batch"""
        try:
            # Create batch operation record
            batch_id = self._create_batch_operation("delete_accounts", len(account_ids))

            deleted_count = 0
            failed_count = 0
            errors = []

            for account_id in account_ids:
                try:
                    self.account_service.delete(account_id)
                    deleted_count += 1
                    self._update_batch_progress(batch_id, deleted_count, failed_count)

                except Exception as e:
                    failed_count += 1
                    errors.append(f"Account ID {account_id}: {str(e)}")
                    self._update_batch_progress(batch_id, deleted_count, failed_count)

            # Complete batch operation
            self._complete_batch_operation(
                batch_id,
                "completed" if failed_count == 0 else "partial_success",
                errors,
            )

            logger.info(
                f"Batch delete accounts: {deleted_count} deleted, {failed_count} failed"
            )

            return {
                "success": True,
                "batch_id": batch_id,
                "deleted": deleted_count,
                "failed": failed_count,
                "errors": errors,
                "total": len(account_ids),
            }

        except Exception as e:
            logger.error(f"Error in batch delete accounts: {str(e)}", exc_info=True)
            raise

    def batch_update_status(
        self, account_ids: List[int], status: str
    ) -> Dict[str, Any]:
        """Update status for multiple accounts in batch"""
        try:
            # Create batch operation record
            batch_id = self._create_batch_operation("update_status", len(account_ids))

            updated_count = 0
            failed_count = 0
            errors = []

            for account_id in account_ids:
                try:
                    self.account_service.update(account_id, {"status": status})
                    updated_count += 1
                    self._update_batch_progress(batch_id, updated_count, failed_count)

                except Exception as e:
                    failed_count += 1
                    errors.append(f"Account ID {account_id}: {str(e)}")
                    self._update_batch_progress(batch_id, updated_count, failed_count)

            # Complete batch operation
            self._complete_batch_operation(
                batch_id,
                "completed" if failed_count == 0 else "partial_success",
                errors,
            )

            logger.info(
                f"Batch update status: {updated_count} updated, {failed_count} failed"
            )

            return {
                "success": True,
                "batch_id": batch_id,
                "updated": updated_count,
                "failed": failed_count,
                "errors": errors,
                "total": len(account_ids),
            }

        except Exception as e:
            logger.error(f"Error in batch update status: {str(e)}", exc_info=True)
            raise

    def batch_create_cards(self, cards_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create multiple cards in batch"""
        try:
            # Create batch operation record
            batch_id = self._create_batch_operation("create_cards", len(cards_data))

            created_count = 0
            failed_count = 0
            errors = []

            for idx, card_data in enumerate(cards_data):
                try:
                    card_number = card_data.get("card_number", "").strip()
                    cardholder_name = card_data.get(
                        "cardholder_name", "Card Holder"
                    ).strip()
                    expiry = card_data.get("expiry", "").strip()
                    cvv = card_data.get("cvv", "").strip()

                    if not card_number:
                        failed_count += 1
                        errors.append(f"Card {idx + 1}: Missing card number")
                        continue

                    self.cards_service.create(card_number, cardholder_name, expiry, cvv)
                    created_count += 1
                    self._update_batch_progress(batch_id, created_count, failed_count)

                except Exception as e:
                    failed_count += 1
                    errors.append(f"Card {idx + 1}: {str(e)}")
                    self._update_batch_progress(batch_id, created_count, failed_count)

            # Complete batch operation
            self._complete_batch_operation(
                batch_id,
                "completed" if failed_count == 0 else "partial_success",
                errors,
            )

            logger.info(
                f"Batch create cards: {created_count} created, {failed_count} failed"
            )

            return {
                "success": True,
                "batch_id": batch_id,
                "created": created_count,
                "failed": failed_count,
                "errors": errors,
                "total": len(cards_data),
            }

        except Exception as e:
            logger.error(f"Error in batch create cards: {str(e)}", exc_info=True)
            raise

    def get_batch_progress(self, batch_id: int) -> Dict[str, Any]:
        """Get progress of batch operation"""
        try:
            query = """
                SELECT id, operation_type, total_items, completed_items, 
                       failed_items, status, created_at, completed_at
                FROM batch_operations
                WHERE id = ?
            """
            cursor = self.db.execute(query, (batch_id,))
            row = cursor.fetchone()

            if not row:
                raise ValueError(f"Batch operation not found: {batch_id}")

            total = row[2]
            completed = row[3]
            failed = row[4]
            progress_percent = ((completed + failed) / total * 100) if total > 0 else 0

            return {
                "success": True,
                "batch_id": row[0],
                "operation_type": row[1],
                "total_items": total,
                "completed_items": completed,
                "failed_items": failed,
                "status": row[5],
                "progress_percent": round(progress_percent, 2),
                "created_at": row[6],
                "completed_at": row[7],
            }

        except Exception as e:
            logger.error(f"Error getting batch progress: {str(e)}", exc_info=True)
            raise

    def get_batch_history(self, limit: int = 20) -> Dict[str, Any]:
        """Get batch operation history"""
        try:
            query = """
                SELECT id, operation_type, total_items, completed_items, 
                       failed_items, status, created_at, completed_at
                FROM batch_operations
                ORDER BY created_at DESC
                LIMIT ?
            """
            cursor = self.db.execute(query, (limit,))

            operations = []
            for row in cursor.fetchall():
                operations.append(
                    {
                        "batch_id": row[0],
                        "operation_type": row[1],
                        "total_items": row[2],
                        "completed_items": row[3],
                        "failed_items": row[4],
                        "status": row[5],
                        "created_at": row[6],
                        "completed_at": row[7],
                    }
                )

            return {"success": True, "operations": operations, "total": len(operations)}

        except Exception as e:
            logger.error(f"Error getting batch history: {str(e)}", exc_info=True)
            raise

    def _create_batch_operation(self, operation_type: str, total_items: int) -> int:
        """Create batch operation record"""
        query = """
            INSERT INTO batch_operations
            (operation_type, total_items, status, created_at)
            VALUES (?, ?, 'running', CURRENT_TIMESTAMP)
        """
        cursor = self.db.execute(query, (operation_type, total_items))
        return cursor.lastrowid

    def _update_batch_progress(
        self, batch_id: int, completed: int, failed: int
    ) -> None:
        """Update batch operation progress"""
        query = """
            UPDATE batch_operations
            SET completed_items = ?,
                failed_items = ?
            WHERE id = ?
        """
        self.db.execute(query, (completed, failed, batch_id))

    def _complete_batch_operation(
        self, batch_id: int, status: str, errors: List[str]
    ) -> None:
        """Complete batch operation"""
        error_log = "\n".join(errors) if errors else None
        query = """
            UPDATE batch_operations
            SET status = ?,
                error_log = ?,
                completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """
        self.db.execute(query, (status, error_log, batch_id))

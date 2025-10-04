"""
Pro Trial Service - Manage pro trial activation and tracking
"""

import logging
import secrets
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ProTrialService:
    """Service untuk mengelola pro trial activation dan tracking"""

    def __init__(self, db, cards_service):
        self.db = db
        self.cards_service = cards_service
        logger.info("ProTrialService initialized")

    def _generate_trial_token(self) -> str:
        """Generate unique trial token"""
        return secrets.token_urlsafe(32)

    def prepare_trial_activation(self, account_id: int) -> Dict[str, Any]:
        """Prepare data for trial activation"""
        try:
            # Get account info
            account_query = "SELECT id, email FROM accounts WHERE id = ?"
            cursor = self.db.execute(account_query, (account_id,))
            account = cursor.fetchone()

            if not account:
                raise ValueError(f"Account not found: {account_id}")

            # Get or generate card
            cards_data = self.cards_service.get_all()

            # Handle both dict and list return types
            if isinstance(cards_data, dict):
                cards = cards_data.get("cards", [])
            elif isinstance(cards_data, list):
                cards = cards_data
            else:
                cards = []

            if not cards or len(cards) == 0:
                raise ValueError(
                    "No cards available. Please add or generate cards first."
                )

            # Get random active card
            import random

            card = random.choice(cards)

            # Generate trial token
            trial_token = self._generate_trial_token()

            # Calculate expiry (14 days from now)
            expiry_date = datetime.now() + timedelta(days=14)

            # Store trial attempt
            trial_query = """
                INSERT INTO pro_trials
                (account_id, card_id, trial_token, expiry_date, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """
            cursor = self.db.execute(
                trial_query,
                (account_id, card["id"], trial_token, expiry_date.isoformat()),
            )
            trial_id = cursor.lastrowid

            logger.info(
                f"Prepared trial activation: trial_id={trial_id}, account_id={account_id}"
            )

            return {
                "success": True,
                "trial_id": trial_id,
                "trial_token": trial_token,
                "account_email": account[1],
                "card_data": {
                    "number": card["card_number"],
                    "expiry": card["expiry"],
                    "cvv": card["cvv"],
                    "holder": card.get("card_holder", "Card Holder"),
                },
                "stripe_url": "https://cursor.com/settings/billing",
                "expiry_date": expiry_date.isoformat(),
            }

        except Exception as e:
            logger.error(f"Error preparing trial activation: {str(e)}", exc_info=True)
            raise

    def update_trial_status(
        self, trial_id: int, status: str, error: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update trial status after activation attempt"""
        try:
            query = """
                UPDATE pro_trials 
                SET status = ?, 
                    error_message = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """
            self.db.execute(query, (status, error, trial_id))

            logger.info(f"Updated trial status: trial_id={trial_id}, status={status}")
            return {"success": True, "trial_id": trial_id, "status": status}

        except Exception as e:
            logger.error(f"Error updating trial status: {str(e)}", exc_info=True)
            raise

    def check_trial_status(self, account_id: int) -> Dict[str, Any]:
        """Check if account has active trial"""
        try:
            query = """
                SELECT id, trial_token, activation_date, expiry_date, status, auto_renew
                FROM pro_trials
                WHERE account_id = ? AND status = 'active'
                ORDER BY created_at DESC
                LIMIT 1
            """
            cursor = self.db.execute(query, (account_id,))
            trial = cursor.fetchone()

            if trial:
                expiry_date = datetime.fromisoformat(trial[3])
                is_expired = datetime.now() > expiry_date

                return {
                    "success": True,
                    "has_trial": True,
                    "trial_id": trial[0],
                    "status": "expired" if is_expired else "active",
                    "expiry_date": trial[3],
                    "auto_renew": bool(trial[5]),
                }
            else:
                return {"success": True, "has_trial": False}

        except Exception as e:
            logger.error(f"Error checking trial status: {str(e)}", exc_info=True)
            raise

    def get_trial_history(
        self, account_id: Optional[int] = None, limit: int = 50
    ) -> Dict[str, Any]:
        """Get trial history"""
        try:
            if account_id:
                query = """
                    SELECT pt.id, pt.account_id, a.email, pt.status, 
                           pt.activation_date, pt.expiry_date, pt.error_message,
                           pt.created_at
                    FROM pro_trials pt
                    JOIN accounts a ON pt.account_id = a.id
                    WHERE pt.account_id = ?
                    ORDER BY pt.created_at DESC
                    LIMIT ?
                """
                cursor = self.db.execute(query, (account_id, limit))
            else:
                query = """
                    SELECT pt.id, pt.account_id, a.email, pt.status, 
                           pt.activation_date, pt.expiry_date, pt.error_message,
                           pt.created_at
                    FROM pro_trials pt
                    JOIN accounts a ON pt.account_id = a.id
                    ORDER BY pt.created_at DESC
                    LIMIT ?
                """
                cursor = self.db.execute(query, (limit,))

            trials = []
            for row in cursor.fetchall():
                trials.append(
                    {
                        "trial_id": row[0],
                        "account_id": row[1],
                        "account_email": row[2],
                        "status": row[3],
                        "activation_date": row[4],
                        "expiry_date": row[5],
                        "error_message": row[6],
                        "created_at": row[7],
                    }
                )

            logger.debug(f"Retrieved {len(trials)} trial records")
            return {"success": True, "trials": trials, "total": len(trials)}

        except Exception as e:
            logger.error(f"Error getting trial history: {str(e)}", exc_info=True)
            raise

    def renew_trial(self, account_id: int) -> Dict[str, Any]:
        """Renew expired trial"""
        try:
            # Check current trial status
            status = self.check_trial_status(account_id)

            if status["has_trial"] and status["status"] == "active":
                raise ValueError("Account already has active trial")

            # Create new trial activation
            return self.prepare_trial_activation(account_id)

        except Exception as e:
            logger.error(f"Error renewing trial: {str(e)}", exc_info=True)
            raise

    def set_auto_renew(self, account_id: int, auto_renew: bool) -> Dict[str, Any]:
        """Enable/disable auto-renew for account's trial"""
        try:
            query = """
                UPDATE pro_trials
                SET auto_renew = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE account_id = ? AND status = 'active'
            """
            cursor = self.db.execute(query, (int(auto_renew), account_id))

            if cursor.rowcount == 0:
                raise ValueError("No active trial found for this account")

            logger.info(f"Set auto_renew={auto_renew} for account_id={account_id}")
            return {"success": True, "auto_renew": auto_renew}

        except Exception as e:
            logger.error(f"Error setting auto-renew: {str(e)}", exc_info=True)
            raise

    def get_statistics(self) -> Dict[str, Any]:
        """Get pro trial statistics"""
        try:
            stats_query = """
                SELECT 
                    COUNT(*) as total_trials,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_trials,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_trials,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_trials,
                    SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_trials,
                    SUM(CASE WHEN auto_renew = 1 THEN 1 ELSE 0 END) as auto_renew_enabled
                FROM pro_trials
            """
            cursor = self.db.execute(stats_query)
            row = cursor.fetchone()

            total = row[0] if row else 0
            active = row[1] if row else 0
            success_rate = (active / total * 100) if total > 0 else 0

            return {
                "success": True,
                "total_trials": total,
                "active_trials": active,
                "pending_trials": row[2] if row else 0,
                "failed_trials": row[3] if row else 0,
                "expired_trials": row[4] if row else 0,
                "auto_renew_enabled": row[5] if row else 0,
                "success_rate": round(success_rate, 2),
            }

        except Exception as e:
            logger.error(f"Error getting trial statistics: {str(e)}", exc_info=True)
            raise

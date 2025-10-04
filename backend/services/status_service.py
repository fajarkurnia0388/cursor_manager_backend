"""
Status Service - Check and refresh account status
"""

import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class StatusService:
    """Service untuk check dan refresh account status"""

    def __init__(self, db, account_service):
        self.db = db
        self.account_service = account_service
        logger.info("StatusService initialized")

    def refresh_account_status(self, account_id: int) -> Dict[str, Any]:
        """
        Refresh single account status

        Note: Actual API call will be done by extension (has cookies)
        This method processes the result from extension
        """
        try:
            account = self.account_service.get_by_id(account_id)
            if not account:
                raise ValueError(f"Account not found: {account_id}")

            # Extension will call this method with API response data
            # For now, mark as pending refresh
            logger.info(f"Account {account_id} marked for status refresh")

            return {
                "success": True,
                "account_id": account_id,
                "email": account["email"],
                "status": "pending_refresh",
                "message": "Account marked for refresh. Extension will provide status update.",
            }

        except Exception as e:
            logger.error(f"Error refreshing account status: {str(e)}", exc_info=True)
            raise

    def update_account_status_from_api(
        self, account_id: int, api_response: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update account status based on API response from extension

        Args:
            account_id: Account ID
            api_response: Response from cursor.com API (sent by extension)
        """
        try:
            # Parse API response
            is_active = api_response.get("is_active", False)
            is_premium = api_response.get("is_premium", False)
            trial_active = api_response.get("trial_active", False)
            subscription_status = api_response.get("subscription_status", "unknown")

            # Determine status
            if is_premium:
                status = "premium"
            elif trial_active:
                status = "trial"
            elif is_active:
                status = "active"
            else:
                status = "inactive"

            # Update account
            self.account_service.update(
                account_id,
                {
                    "status": status,
                    "subscription_status": subscription_status,
                    "is_premium": is_premium,
                    "trial_active": trial_active,
                },
            )

            logger.info(f"Updated account {account_id} status to: {status}")

            return {
                "success": True,
                "account_id": account_id,
                "status": status,
                "subscription_status": subscription_status,
                "is_premium": is_premium,
                "trial_active": trial_active,
            }

        except Exception as e:
            logger.error(
                f"Error updating account status from API: {str(e)}", exc_info=True
            )
            raise

    def refresh_all_accounts(self, limit: Optional[int] = None) -> Dict[str, Any]:
        """Mark all accounts for status refresh"""
        try:
            accounts_data = self.account_service.get_all()
            accounts = accounts_data.get("accounts", [])

            if limit:
                accounts = accounts[:limit]

            account_ids = [acc["id"] for acc in accounts]

            logger.info(f"Marked {len(account_ids)} accounts for status refresh")

            return {
                "success": True,
                "account_ids": account_ids,
                "total": len(account_ids),
                "status": "pending_refresh",
                "message": "Accounts marked for refresh. Extension will provide updates.",
            }

        except Exception as e:
            logger.error(f"Error refreshing all accounts: {str(e)}", exc_info=True)
            raise

    def get_account_health(self, account_id: int) -> Dict[str, Any]:
        """Get detailed health check for account"""
        try:
            account = self.account_service.get_by_id(account_id)
            if not account:
                raise ValueError(f"Account not found: {account_id}")

            # Health metrics
            has_cookies = bool(account.get("cookies"))
            has_password = bool(account.get("password"))
            last_used = account.get("last_used")
            created_at = account.get("created_at")

            # Check if account has active trial
            trial_query = """
                SELECT id, status, expiry_date
                FROM pro_trials
                WHERE account_id = ? AND status = 'active'
                LIMIT 1
            """
            cursor = self.db.execute(trial_query, (account_id,))
            trial = cursor.fetchone()
            has_active_trial = bool(trial)

            # Calculate health score
            health_score = 0
            if has_cookies:
                health_score += 40
            if has_password:
                health_score += 20
            if last_used:
                health_score += 20
            if has_active_trial:
                health_score += 20

            # Determine health status
            if health_score >= 80:
                health_status = "excellent"
            elif health_score >= 60:
                health_status = "good"
            elif health_score >= 40:
                health_status = "fair"
            else:
                health_status = "poor"

            # Recommendations
            recommendations = []
            if not has_cookies:
                recommendations.append("Add cookies for full functionality")
            if not has_password:
                recommendations.append("Add password for backup login")
            if not last_used:
                recommendations.append("Activate account to test functionality")
            if not has_active_trial:
                recommendations.append("Consider activating pro trial")

            logger.debug(
                f"Account {account_id} health: {health_status} ({health_score}/100)"
            )

            return {
                "success": True,
                "account_id": account_id,
                "email": account["email"],
                "health_status": health_status,
                "health_score": health_score,
                "metrics": {
                    "has_cookies": has_cookies,
                    "has_password": has_password,
                    "last_used": last_used,
                    "has_active_trial": has_active_trial,
                    "created_at": created_at,
                },
                "recommendations": recommendations,
            }

        except Exception as e:
            logger.error(f"Error getting account health: {str(e)}", exc_info=True)
            raise

    def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health statistics"""
        try:
            # Get accounts stats
            accounts_stats = self.account_service.get_stats()

            # Get active trials count
            trials_query = """
                SELECT COUNT(*) FROM pro_trials WHERE status = 'active'
            """
            cursor = self.db.execute(trials_query)
            active_trials = cursor.fetchone()[0]

            # Get recent bypass tests success rate
            bypass_query = """
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful
                FROM bypass_results
                WHERE created_at >= datetime('now', '-7 days')
            """
            cursor = self.db.execute(bypass_query)
            row = cursor.fetchone()
            bypass_total = row[0] if row else 0
            bypass_success = row[1] if row else 0
            bypass_success_rate = (
                (bypass_success / bypass_total * 100) if bypass_total > 0 else 0
            )

            # Calculate system health score
            system_health_score = 0
            if accounts_stats.get("total_accounts", 0) > 0:
                system_health_score += 25
            if accounts_stats.get("accounts_with_cookies", 0) > 0:
                system_health_score += 25
            if active_trials > 0:
                system_health_score += 25
            if bypass_success_rate >= 50:
                system_health_score += 25

            # Determine system health
            if system_health_score >= 75:
                system_health = "healthy"
            elif system_health_score >= 50:
                system_health = "moderate"
            else:
                system_health = "needs_attention"

            return {
                "success": True,
                "system_health": system_health,
                "system_health_score": system_health_score,
                "statistics": {
                    "total_accounts": accounts_stats.get("total_accounts", 0),
                    "accounts_with_cookies": accounts_stats.get(
                        "accounts_with_cookies", 0
                    ),
                    "active_trials": active_trials,
                    "bypass_tests_7d": bypass_total,
                    "bypass_success_rate": round(bypass_success_rate, 2),
                },
            }

        except Exception as e:
            logger.error(f"Error getting system health: {str(e)}", exc_info=True)
            raise

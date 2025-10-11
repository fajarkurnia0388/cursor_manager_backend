"""
End-to-End Integration Tests
Tests full communication flow: Extension → Native Host → Services → Database
"""

import unittest
import json
import sys
from pathlib import Path
from io import BytesIO
import struct

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from native_host import NativeHost


class TestNativeMessagingIntegration(unittest.TestCase):
    """Test Native Messaging protocol end-to-end"""

    def setUp(self):
        """Setup test with isolated database"""
        # Create a new NativeHost with in-memory database for each test
        import tempfile
        import os

        # Use a unique temporary database for each test
        self.temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.temp_db.close()

        # Override the database path
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

        # Create host with temporary database
        self.host = NativeHost()
        self.host.db = Database(self.temp_db.name)

        # Reinitialize all services with the new database
        self.host.account_service = AccountService(self.host.db)
        self.host.cards_service = CardsService(self.host.db)
        self.host.card_generator = CardGenerator()
        self.host.bypass_service = BypassService(self.host.db)
        self.host.pro_trial_service = ProTrialService(
            self.host.db, self.host.cards_service
        )
        self.host.export_service = ExportService(
            self.host.db, self.host.account_service, self.host.cards_service
        )
        self.host.import_service = ImportService(
            self.host.db, self.host.account_service, self.host.cards_service
        )
        self.host.status_service = StatusService(
            self.host.db, self.host.account_service
        )
        self.host.batch_service = BatchService(
            self.host.db, self.host.account_service, self.host.cards_service
        )

    def tearDown(self):
        """Cleanup"""
        import os

        self.host.db.close()
        # Remove temporary database file
        try:
            os.unlink(self.temp_db.name)
        except:
            pass

    def test_ping_system(self):
        """Test system.ping RPC call"""
        request = {"jsonrpc": "2.0", "id": 1, "method": "system.ping", "params": {}}

        response = self.host.handle_request(request)

        self.assertEqual(response["jsonrpc"], "2.0")
        self.assertEqual(response["id"], 1)
        self.assertIn("result", response)
        self.assertEqual(response["result"]["status"], "ok")

    def test_version_system(self):
        """Test system.version RPC call"""
        request = {"jsonrpc": "2.0", "id": 2, "method": "system.version", "params": {}}

        response = self.host.handle_request(request)

        self.assertEqual(response["jsonrpc"], "2.0")
        self.assertEqual(response["id"], 2)
        self.assertIn("result", response)
        self.assertIn("version", response["result"])
        self.assertEqual(response["result"]["schema_version"], 2)

    def test_account_crud_flow(self):
        """Test complete account CRUD flow"""
        # Create account
        create_request = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "accounts.create",
            "params": {"email": "test@integration.com", "password": "testpass123"},
        }

        create_response = self.host.handle_request(create_request)
        self.assertIn("result", create_response)
        account_id = create_response["result"]["id"]
        self.assertIsNotNone(account_id)

        # Get account
        get_request = {
            "jsonrpc": "2.0",
            "id": 4,
            "method": "accounts.getById",
            "params": {"id": account_id},
        }

        get_response = self.host.handle_request(get_request)
        self.assertIn("result", get_response)
        self.assertEqual(get_response["result"]["email"], "test@integration.com")

        # Update account
        update_request = {
            "jsonrpc": "2.0",
            "id": 5,
            "method": "accounts.update",
            "params": {"id": account_id, "status": "limit pro"},
        }

        update_response = self.host.handle_request(update_request)
        self.assertIsNotNone(update_response["result"])

        # Verify update
        get_response2 = self.host.handle_request(get_request)
        self.assertEqual(get_response2["result"]["status"], "limit pro")

        # Delete account
        delete_request = {
            "jsonrpc": "2.0",
            "id": 6,
            "method": "accounts.delete",
            "params": {"id": account_id, "soft": False},
        }

        delete_response = self.host.handle_request(delete_request)
        self.assertTrue(delete_response["result"])

    def test_card_generation_and_storage(self):
        """Test card generation and saving to database"""
        # Generate cards
        gen_request = {
            "jsonrpc": "2.0",
            "id": 7,
            "method": "generator.generateMultiple",
            "params": {"bin": "552461", "quantity": 5},
        }

        gen_response = self.host.handle_request(gen_request)
        self.assertIn("result", gen_response)
        cards = gen_response["result"]
        self.assertEqual(len(cards), 5)

        # Save first card
        card = cards[0]
        save_request = {
            "jsonrpc": "2.0",
            "id": 8,
            "method": "cards.create",
            "params": {
                "card_number": card["number"],
                "card_holder": "Integration Test",
                "expiry": card["expiry"],
                "cvv": card["cvv"],
            },
        }

        save_response = self.host.handle_request(save_request)
        self.assertIn("result", save_response)
        self.assertIn("id", save_response["result"])

    def test_bypass_test_flow(self):
        """Test bypass testing flow"""
        # Get test suite
        suite_request = {
            "jsonrpc": "2.0",
            "id": 9,
            "method": "bypass.getTestSuite",
            "params": {"test_type": "parameter"},
        }

        suite_response = self.host.handle_request(suite_request)
        self.assertIn("result", suite_response)
        self.assertGreater(len(suite_response["result"]["tests"]), 0)

        # Store test result
        result_request = {
            "jsonrpc": "2.0",
            "id": 10,
            "method": "bypass.storeResult",
            "params": {
                "test_type": "parameter",
                "payload": "__proto__[test]=1",
                "target_url": "https://example.com",
                "success": True,
                "response_code": 200,
                "execution_time": 0.5,
            },
        }

        result_response = self.host.handle_request(result_request)
        self.assertIn("result", result_response)
        self.assertTrue(result_response["result"]["success"])

        # Get statistics
        stats_request = {
            "jsonrpc": "2.0",
            "id": 11,
            "method": "bypass.getStatistics",
            "params": {},
        }

        stats_response = self.host.handle_request(stats_request)
        self.assertIn("result", stats_response)
        self.assertIn("overall", stats_response["result"])

    def test_pro_trial_flow(self):
        """Test pro trial activation flow"""
        # Create account and card first
        account_response = self.host.handle_request(
            {
                "jsonrpc": "2.0",
                "id": 12,
                "method": "accounts.create",
                "params": {"email": "trial@test.com", "password": "pass123"},
            }
        )
        account_id = account_response["result"]["id"]

        self.host.handle_request(
            {
                "jsonrpc": "2.0",
                "id": 13,
                "method": "cards.create",
                "params": {
                    "card_number": "5524610123456789",
                    "card_holder": "Trial User",
                    "expiry": "12/25",
                    "cvv": "123",
                },
            }
        )

        # Prepare trial activation
        prepare_request = {
            "jsonrpc": "2.0",
            "id": 14,
            "method": "proTrial.prepareActivation",
            "params": {"account_id": account_id},
        }

        prepare_response = self.host.handle_request(prepare_request)
        self.assertIn("result", prepare_response)
        self.assertIn("trial_id", prepare_response["result"])
        self.assertIn("card_data", prepare_response["result"])

        trial_id = prepare_response["result"]["trial_id"]

        # Update trial status
        update_request = {
            "jsonrpc": "2.0",
            "id": 15,
            "method": "proTrial.updateStatus",
            "params": {"trial_id": trial_id, "status": "active"},
        }

        update_response = self.host.handle_request(update_request)
        self.assertTrue(update_response["result"]["success"])

    def test_export_import_flow(self):
        """Test export and import flow"""
        # Create test accounts
        for i in range(3):
            self.host.handle_request(
                {
                    "jsonrpc": "2.0",
                    "id": 16 + i,
                    "method": "accounts.create",
                    "params": {"email": f"export{i}@test.com", "password": f"pass{i}"},
                }
            )

        # Export accounts
        export_request = {
            "jsonrpc": "2.0",
            "id": 19,
            "method": "export.accounts",
            "params": {"format": "json"},
        }

        export_response = self.host.handle_request(export_request)
        self.assertIn("result", export_response)
        self.assertGreaterEqual(export_response["result"]["count"], 3)

        # Parse exported data
        export_data = json.loads(export_response["result"]["data"])
        self.assertIsInstance(export_data, list)

        # Import accounts (should skip duplicates)
        import_request = {
            "jsonrpc": "2.0",
            "id": 20,
            "method": "import.accounts",
            "params": {"data": export_data, "merge_strategy": "skip"},
        }

        import_response = self.host.handle_request(import_request)
        self.assertIn("result", import_response)
        self.assertTrue(import_response["result"]["success"])

    def test_batch_operations(self):
        """Test batch operations"""
        # Batch create accounts
        accounts_data = [
            {"email": f"batch{i}@test.com", "password": f"pass{i}"} for i in range(10)
        ]

        batch_request = {
            "jsonrpc": "2.0",
            "id": 21,
            "method": "batch.createAccounts",
            "params": {"accounts_data": accounts_data},
        }

        batch_response = self.host.handle_request(batch_request)
        self.assertIn("result", batch_response)
        self.assertEqual(batch_response["result"]["created"], 10)
        self.assertEqual(batch_response["result"]["failed"], 0)

        batch_id = batch_response["result"]["batch_id"]

        # Get batch progress
        progress_request = {
            "jsonrpc": "2.0",
            "id": 22,
            "method": "batch.getProgress",
            "params": {"batch_id": batch_id},
        }

        progress_response = self.host.handle_request(progress_request)
        self.assertIn("result", progress_response)
        self.assertEqual(progress_response["result"]["completed_items"], 10)

    def test_status_service(self):
        """Test status service"""
        # Create account
        account_response = self.host.handle_request(
            {
                "jsonrpc": "2.0",
                "id": 23,
                "method": "accounts.create",
                "params": {"email": "status@test.com", "password": "pass123"},
            }
        )
        account_id = account_response["result"]["id"]

        # Get account health
        health_request = {
            "jsonrpc": "2.0",
            "id": 24,
            "method": "status.getHealth",
            "params": {"account_id": account_id},
        }

        health_response = self.host.handle_request(health_request)
        self.assertIn("result", health_response)
        self.assertIn("health_status", health_response["result"])
        self.assertIn("health_score", health_response["result"])

        # Get system health
        system_health_request = {
            "jsonrpc": "2.0",
            "id": 25,
            "method": "status.getSystemHealth",
            "params": {},
        }

        system_health_response = self.host.handle_request(system_health_request)
        self.assertIn("result", system_health_response)
        self.assertIn("system_health", system_health_response["result"])

    def test_error_handling(self):
        """Test error handling for invalid requests"""
        # Invalid method
        invalid_request = {
            "jsonrpc": "2.0",
            "id": 26,
            "method": "invalid.method",
            "params": {},
        }

        response = self.host.handle_request(invalid_request)
        self.assertIn("error", response)
        self.assertEqual(response["error"]["code"], -32603)

        # Missing required params
        missing_params_request = {
            "jsonrpc": "2.0",
            "id": 27,
            "method": "accounts.create",
            "params": {},
        }

        response2 = self.host.handle_request(missing_params_request)
        self.assertIn("error", response2)


def run_integration_tests():
    """Run integration tests"""
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestNativeMessagingIntegration)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_integration_tests()
    sys.exit(0 if success else 1)

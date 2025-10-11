"""
Comprehensive test suite for backend services
"""

import unittest
import sys
import os
import json
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

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


class TestDatabase(unittest.TestCase):
    """Test database operations"""

    def setUp(self):
        """Setup test database"""
        self.db = Database(":memory:")

    def tearDown(self):
        """Cleanup"""
        self.db.close()

    def test_schema_version(self):
        """Test schema version"""
        version = self.db.get_schema_version()
        self.assertEqual(version, self.db.SCHEMA_VERSION)

    def test_tables_exist(self):
        """Test all tables exist"""
        tables = [
            "_metadata",
            "accounts",
            "cards",
            "bypass_tests",
            "bypass_results",
            "pro_trials",
            "batch_operations",
            "sync_events",
        ]

        for table in tables:
            query = (
                f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'"
            )
            result = self.db.fetch_one(query)
            self.assertIsNotNone(result, f"Table {table} should exist")


class TestAccountService(unittest.TestCase):
    """Test account service"""

    def setUp(self):
        """Setup test"""
        self.db = Database(":memory:")
        self.service = AccountService(self.db)

    def tearDown(self):
        """Cleanup"""
        self.db.close()

    def test_create_account(self):
        """Test create account"""
        result = self.service.create(
            "test@example.com", "password123", tags=["vip", "beta"]
        )
        self.assertIsNotNone(result)
        self.assertIn("id", result)
        self.assertEqual(result["email"], "test@example.com")
        self.assertEqual(result.get("tags"), ["vip", "beta"])

    def test_get_account(self):
        """Test get account"""
        result = self.service.create("test@example.com", "password123")
        account_id = result["id"]
        account = self.service.get_by_id(account_id)
        self.assertIsNotNone(account)
        self.assertEqual(account["email"], "test@example.com")

    def test_update_account(self):
        """Test update account"""
        result = self.service.create("test@example.com", "password123")
        account_id = result["id"]
        update_result = self.service.update(
            account_id, status="limit pro", tags=["premium"]
        )
        self.assertIsNotNone(update_result)

        account = self.service.get_by_id(account_id)
        self.assertEqual(account["status"], "limit pro")
        self.assertEqual(account["tags"], ["premium"])

    def test_delete_account(self):
        """Test delete account"""
        result = self.service.create("test@example.com", "password123")
        account_id = result["id"]
        delete_result = self.service.delete(account_id, soft=False)
        self.assertTrue(delete_result)

        account = self.service.get_by_id(account_id)
        self.assertIsNone(account)


class TestCardsService(unittest.TestCase):
    """Test cards service"""

    def setUp(self):
        """Setup test"""
        self.db = Database(":memory:")
        self.service = CardsService(self.db)

    def tearDown(self):
        """Cleanup"""
        self.db.close()

    def test_create_card(self):
        """Test create card"""
        result = self.service.create(
            "4532123456789012", "John Doe", "12/25", "123", tags=["primary"]
        )
        self.assertIsNotNone(result)
        self.assertIn("id", result)
        self.assertEqual(result["card_holder"], "John Doe")
        self.assertEqual(result["tags"], ["primary"])

    def test_get_card(self):
        """Test get card"""
        result = self.service.create("4532123456789012", "John Doe", "12/25", "123")
        card_id = result["id"]
        card = self.service.get_by_id(card_id)
        self.assertIsNotNone(card)
        self.assertEqual(card["card_holder"], "John Doe")
        self.assertEqual(card["tags"], [])

    def test_update_card_tags(self):
        """Test updating card tags"""
        result = self.service.create("4532123456789012", "John Doe", "12/25", "123")
        card_id = result["id"]
        updated = self.service.update(card_id, tags=["spare", "backup"])
        self.assertIsNotNone(updated)
        card = self.service.get_by_id(card_id)
        self.assertEqual(card["tags"], ["spare", "backup"])


class TestCardGenerator(unittest.TestCase):
    """Test card generator"""

    def setUp(self):
        """Setup test"""
        self.generator = CardGenerator()

    def test_generate_single_card(self):
        """Test generate single card"""
        card = self.generator.generate_card("552461")
        self.assertIsNotNone(card)
        self.assertIn("number", card)
        self.assertIn("expiry", card)
        self.assertIn("cvv", card)
        self.assertEqual(len(card["number"]), 16)

    def test_generate_multiple_cards(self):
        """Test generate multiple cards"""
        cards = self.generator.generate_multiple_cards(5, "552461")
        self.assertEqual(len(cards), 5)
        for card in cards:
            self.assertIn("number", card)
            self.assertEqual(len(card["number"]), 16)

    def test_luhn_validation(self):
        """Test Luhn checksum"""
        card = self.generator.generate_card("552461")
        # Validate Luhn algorithm
        digits = [int(d) for d in card["number"]]
        checksum = 0
        for i, digit in enumerate(reversed(digits)):
            if i % 2 == 1:
                digit *= 2
                if digit > 9:
                    digit -= 9
            checksum += digit
        self.assertEqual(checksum % 10, 0)


class TestBypassService(unittest.TestCase):
    """Test bypass service"""

    def setUp(self):
        """Setup test"""
        self.db = Database(":memory:")
        self.service = BypassService(self.db)

    def tearDown(self):
        """Cleanup"""
        self.db.close()

    def test_get_test_suite(self):
        """Test get test suite"""
        result = self.service.get_test_suite("parameter")
        self.assertTrue(result.get("success"))
        self.assertIn("tests", result)
        self.assertGreater(len(result["tests"]), 0)

    def test_store_test_result(self):
        """Test store test result"""
        test_data = {
            "test_type": "parameter",
            "payload": "__proto__[test]=1",
            "target_url": "https://example.com",
            "success": True,
            "response_code": 200,
            "execution_time": 0.5,
        }
        result = self.service.store_test_result(test_data)
        self.assertTrue(result.get("success"))
        self.assertIn("result_id", result)

    def test_get_statistics(self):
        """Test get statistics"""
        # Store some test results
        for i in range(5):
            test_data = {
                "test_type": "parameter",
                "payload": f"test{i}",
                "target_url": "https://example.com",
                "success": i % 2 == 0,
                "response_code": 200,
                "execution_time": 0.5,
            }
            self.service.store_test_result(test_data)

        stats = self.service.get_test_statistics()
        self.assertTrue(stats.get("success"))
        self.assertIn("overall", stats)
        self.assertEqual(stats["overall"]["total_tests"], 5)


class TestProTrialService(unittest.TestCase):
    """Test pro trial service"""

    def setUp(self):
        """Setup test"""
        self.db = Database(":memory:")
        self.account_service = AccountService(self.db)
        self.cards_service = CardsService(self.db)
        self.service = ProTrialService(self.db, self.cards_service)

    def tearDown(self):
        """Cleanup"""
        self.db.close()

    def test_prepare_trial_activation(self):
        """Test prepare trial activation"""
        # Create account and card
        account_result = self.account_service.create("test@example.com", "password123")
        account_id = account_result["id"]
        self.cards_service.create("4532123456789012", "John Doe", "12/25", "123")

        result = self.service.prepare_trial_activation(account_id)
        self.assertTrue(result.get("success"))
        self.assertIn("trial_id", result)
        self.assertIn("trial_token", result)
        self.assertIn("card_data", result)

    def test_check_trial_status(self):
        """Test check trial status"""
        account_result = self.account_service.create("test@example.com", "password123")
        account_id = account_result["id"]
        result = self.service.check_trial_status(account_id)
        self.assertTrue(result.get("success"))
        self.assertIn("has_trial", result)
        self.assertFalse(result["has_trial"])


class TestExportImportService(unittest.TestCase):
    """Test export and import services"""

    def setUp(self):
        """Setup test"""
        self.db = Database(":memory:")
        self.account_service = AccountService(self.db)
        self.cards_service = CardsService(self.db)
        self.export_service = ExportService(
            self.db, self.account_service, self.cards_service
        )
        self.import_service = ImportService(
            self.db, self.account_service, self.cards_service
        )

    def tearDown(self):
        """Cleanup"""
        self.db.close()

    def test_export_accounts_json(self):
        """Test export accounts to JSON"""
        # Create test data
        self.account_service.create(
            "test1@example.com", "password1", tags=["alpha"]
        )
        self.account_service.create(
            "test2@example.com", "password2", tags=["beta", "team"]
        )

        result = self.export_service.export_accounts("json")
        self.assertTrue(result.get("success"))
        self.assertGreaterEqual(result["count"], 2)
        self.assertIn("data", result)
        exported_accounts = json.loads(result["data"])
        self.assertTrue(any(acc.get("tags") for acc in exported_accounts))

    def test_import_accounts(self):
        """Test import accounts"""
        import_data = [
            {
                "email": "import1@example.com",
                "password": "pass1",
                "tags": ["vip"],
            },
            {
                "email": "import2@example.com",
                "password": "pass2",
                "tags": "beta, trial",
            },
        ]

        result = self.import_service.import_accounts(import_data)
        self.assertTrue(result.get("success"))
        self.assertEqual(result["created"], 2)
        account = self.account_service.get_by_email("import1@example.com")
        self.assertEqual(account.get("tags"), ["vip"])


class TestBatchService(unittest.TestCase):
    """Test batch service"""

    def setUp(self):
        """Setup test"""
        self.db = Database(":memory:")
        self.account_service = AccountService(self.db)
        self.cards_service = CardsService(self.db)
        self.service = BatchService(self.db, self.account_service, self.cards_service)

    def tearDown(self):
        """Cleanup"""
        self.db.close()

    def test_batch_create_accounts(self):
        """Test batch create accounts"""
        accounts_data = [
            {"email": f"test{i}@example.com", "password": f"pass{i}"} for i in range(5)
        ]

        result = self.service.batch_create_accounts(accounts_data)
        self.assertTrue(result.get("success"))
        self.assertEqual(result["created"], 5)
        self.assertEqual(result["failed"], 0)

    def test_batch_get_progress(self):
        """Test get batch progress"""
        accounts_data = [
            {"email": f"test{i}@example.com", "password": f"pass{i}"} for i in range(3)
        ]

        result = self.service.batch_create_accounts(accounts_data)
        batch_id = result["batch_id"]

        progress = self.service.get_batch_progress(batch_id)
        self.assertTrue(progress.get("success"))
        self.assertEqual(progress["completed_items"], 3)


def run_tests():
    """Run all tests"""
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromModule(sys.modules[__name__])
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

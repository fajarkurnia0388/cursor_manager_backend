#!/usr/bin/env python3
"""
Test runner script untuk backend tests
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from tests.test_services import run_tests

if __name__ == "__main__":
    print("=" * 70)
    print("Running Cursor Manager Backend Test Suite")
    print("=" * 70)
    print()

    success = run_tests()

    print()
    print("=" * 70)
    if success:
        print("[OK] ALL TESTS PASSED")
    else:
        print("[FAIL] SOME TESTS FAILED")
    print("=" * 70)

    sys.exit(0 if success else 1)

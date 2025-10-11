# Testing Commands and Guidelines

## Extension Testing

### Manual Testing

```bash
# Load extension in Chrome
# 1. Open Chrome Extensions page (chrome://extensions/)
# 2. Enable Developer mode
# 3. Click "Load unpacked" and select extension folder
# 4. Test functionality in browser

# Test in different environments
# - Regular browsing
# - Incognito mode
# - Different websites
# - Different browsers (Chrome, Edge, Firefox)
```

### Automated Testing

```bash
# Run extension tests
cd extension
# Open tests/advanced-testing-suite.html in browser
# Run all test suites

# Test specific modules
# Open tests/sqlite-only-test.html for database tests
```

### Test Coverage

- Test all service modules
- Test database operations
- Test error handling
- Test user interface interactions
- Test security features

## Backend Testing

### Unit Tests

```bash
# Run all unit tests
cd backend
python run_tests.py

# Run specific test file
python -m pytest tests/test_services.py -v

# Run with coverage
python -m pytest --cov=backend tests/ --cov-report=html
```

### Integration Tests

```bash
# Run integration tests
python -m pytest tests/test_integration.py -v

# Test database integration
python -c "from tests.test_integration import test_database_operations; test_database_operations()"

# Test API integration
python -c "from tests.test_integration import test_api_endpoints; test_api_endpoints()"
```

### Performance Tests

```bash
# Test database performance
python -c "from tests.test_performance import test_database_performance; test_database_performance()"

# Test memory usage
python -c "from tests.test_performance import test_memory_usage; test_memory_usage()"

# Test concurrent operations
python -c "from tests.test_performance import test_concurrent_operations; test_concurrent_operations()"
```

## Test Data Management

### Create Test Data

```bash
# Generate test accounts
python -c "from tests.test_data import generate_test_accounts; generate_test_accounts(100)"

# Generate test cards
python -c "from tests.test_data import generate_test_cards; generate_test_cards(50)"

# Create test database
python -c "from tests.test_data import create_test_database; create_test_database()"
```

### Clean Test Data

```bash
# Clear test data
python -c "from tests.test_data import clear_test_data; clear_test_data()"

# Reset test database
python -c "from tests.test_data import reset_test_database; reset_test_database()"
```

## Security Testing

### Test Security Features

```bash
# Test input validation
python -c "from tests.test_security import test_input_validation; test_input_validation()"

# Test SQL injection prevention
python -c "from tests.test_security import test_sql_injection; test_sql_injection()"

# Test authentication
python -c "from tests.test_security import test_authentication; test_authentication()"
```

### Test Threat Detection

```bash
# Test threat detector
python -c "from tests.test_security import test_threat_detector; test_threat_detector()"

# Test security manager
python -c "from tests.test_security import test_security_manager; test_security_manager()"
```

## Error Testing

### Test Error Handling

```bash
# Test database errors
python -c "from tests.test_errors import test_database_errors; test_database_errors()"

# Test network errors
python -c "from tests.test_errors import test_network_errors; test_network_errors()"

# Test validation errors
python -c "from tests.test_errors import test_validation_errors; test_validation_errors()"
```

### Test Edge Cases

```bash
# Test edge cases
python -c "from tests.test_edge_cases import test_edge_cases; test_edge_cases()"

# Test boundary conditions
python -c "from tests.test_edge_cases import test_boundary_conditions; test_boundary_conditions()"
```

## Continuous Integration

### Pre-commit Tests

```bash
# Run all tests before commit
python run_tests.py && echo "All tests passed"

# Check code quality
python -m flake8 . && python -m black --check . && echo "Code quality checks passed"
```

### Test Reporting

```bash
# Generate test report
python -m pytest --html=test_report.html --self-contained-html

# Generate coverage report
python -m pytest --cov=backend --cov-report=html --cov-report=term
```

## Debugging Tests

### Debug Failed Tests

```bash
# Run with debug output
python -m pytest -v -s tests/test_services.py::test_specific_function

# Run with pdb debugger
python -m pytest --pdb tests/test_services.py

# Run single test with detailed output
python -m pytest -v -s --tb=long tests/test_services.py::test_function_name
```

### Test Isolation

```bash
# Run tests in isolation
python -m pytest --forked tests/

# Run tests with fresh database
python -m pytest --fresh-db tests/
```

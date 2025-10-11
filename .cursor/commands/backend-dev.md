# Backend Development Commands

## Python Backend Development

### Environment Setup

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Set up environment variables
# Create .env file with necessary configurations
```

### Running the Backend

```bash
# Start native host server
cd backend
python native_host.py

# Start GUI application
cd backend
python gui.py

# Run CLI interface
cd backend
python cli.py --help
```

### Database Management

```bash
# Initialize database
python -c "from database import init_database; init_database()"

# Check database status
python -c "from database import get_database_status; print(get_database_status())"

# Backup database
python -c "from database import backup_database; backup_database()"

# Restore database
python -c "from database import restore_database; restore_database('backup_file.db')"
```

### Service Development

```bash
# Test specific service
python -c "from services.account_service import AccountService; print(AccountService.get_all_accounts())"

# Test batch operations
python -c "from services.batch_service import BatchService; print(BatchService.get_status())"

# Test bypass functionality
python -c "from services.bypass_service import BypassService; print(BypassService.test_connection())"
```

### Testing

```bash
# Run all tests
python run_tests.py

# Run specific test file
python -m pytest tests/test_services.py

# Run with coverage
python -m pytest --cov=backend tests/

# Run integration tests
python -m pytest tests/test_integration.py -v
```

### Code Quality

```bash
# Lint Python code
python -m flake8 .

# Format code
python -m black .

# Type checking
python -m mypy .

# Security check
python -m bandit -r .
```

### Installation and Distribution

```bash
# Install in development mode
pip install -e .

# Build package
python -m build

# Install from source
python install.py

# Create executable (Windows)
python -m PyInstaller --onefile native_host.py
```

## Native Host Configuration

### Windows Setup

```bash
# Register native host
python native_host.py --register

# Unregister native host
python native_host.py --unregister

# Check registration status
python native_host.py --status
```

### Debugging Native Host

```bash
# Run with debug logging
python native_host.py --debug

# Test native messaging
python -c "from native_host import test_messaging; test_messaging()"
```

## API Development

### Test API Endpoints

```bash
# Test account endpoints
curl -X GET http://localhost:8080/api/accounts

# Test card endpoints
curl -X GET http://localhost:8080/api/cards

# Test status endpoint
curl -X GET http://localhost:8080/api/status
```

### Generate API Documentation

```bash
# Generate API reference
python -c "from cli import generate_api_docs; generate_api_docs()"
```

## Performance Monitoring

### Monitor Performance

```bash
# Check memory usage
python -c "from performance_monitor import check_memory; print(check_memory())"

# Check CPU usage
python -c "from performance_monitor import check_cpu; print(check_cpu())"

# Generate performance report
python -c "from performance_monitor import generate_report; generate_report()"
```

### Log Analysis

```bash
# View recent logs
python -c "from logger import get_recent_logs; print(get_recent_logs())"

# Filter error logs
python -c "from logger import get_error_logs; print(get_error_logs())"

# Clear old logs
python -c "from logger import clear_old_logs; clear_old_logs()"
```

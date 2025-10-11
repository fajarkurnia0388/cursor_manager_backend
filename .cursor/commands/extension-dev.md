# Extension Development Commands

## Development Workflow

### Start Development Server

```bash
# Start the backend server
cd backend
python native_host.py

# In another terminal, start the extension development
cd extension
# Load the extension in Chrome/Edge developer mode
```

### Testing Commands

```bash
# Run backend tests
cd backend
python run_tests.py

# Run extension tests
cd extension
# Open tests/advanced-testing-suite.html in browser
```

### Database Operations

```bash
# Initialize database
cd backend
python -c "from database import init_database; init_database()"

# Reset database (careful!)
cd backend
python -c "from database import reset_database; reset_database()"
```

### Build and Package

```bash
# Package extension for distribution
cd extension
# Copy files to output directory
# Update manifest.json version
# Create zip file for Chrome Web Store
```

## Common Tasks

### Add New Service

1. Create service file in `extension/services/`
2. Follow existing service patterns
3. Add to service registry
4. Update documentation

### Add New Backend Feature

1. Create service in `backend/services/`
2. Add CLI commands in `cli.py`
3. Update API reference
4. Add tests

### Database Migration

1. Create migration file in `extension/services/migration/`
2. Update schema files
3. Test migration thoroughly
4. Update documentation

## Debugging

### Extension Debugging

- Use Chrome DevTools for extension debugging
- Check background script console
- Use the console service for logging
- Test in incognito mode

### Backend Debugging

- Use Python debugger (pdb)
- Check logs in console
- Use the logger service
- Test with CLI commands

## Code Quality

### Linting

```bash
# Check JavaScript files
npx eslint extension/**/*.js

# Check Python files
cd backend
python -m flake8 .
```

### Formatting

```bash
# Format JavaScript files
npx prettier --write extension/**/*.js

# Format Python files
cd backend
python -m black .
```

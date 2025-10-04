# Backend Installation Guide

Complete guide untuk install dan configure Cursor Manager Python Backend.

---

## Prerequisites

### Required

- **Python 3.8+** (Python 3.12 recommended)
- **pip** (Python package manager)
- **Chrome/Edge/Brave Browser** (Chromium-based)
- **Cursor Manager Extension** installed

### Optional

- Git (untuk clone repository)
- Virtual environment tool (venv, conda)

---

## Installation Methods

### Method 1: Automated Installation (Recommended)

1. **Navigate to backend directory**

   ```bash
   cd cursor_manager_ext/backend
   ```

2. **Run installer**

   ```bash
   python install.py
   ```

   The installer will:

   - Check Python version
   - Copy files to installation directory
   - Create native messaging manifests for all browsers
   - Generate run scripts
   - Create desktop shortcuts (Windows)

3. **Follow prompts**

   - Enter your extension ID when prompted
   - Choose browsers to configure
   - Confirm installation

4. **Reload extension**
   - Open browser extension manager
   - Click "Reload" on Cursor Manager extension

---

### Method 2: Manual Installation

#### Step 1: Copy Backend Files

**Windows:**

```bash
xcopy /E /I backend %USERPROFILE%\cursor_manager\backend
```

**Linux/macOS:**

```bash
mkdir -p ~/cursor_manager
cp -r backend ~/cursor_manager/
```

#### Step 2: Create Native Messaging Manifest

**Windows - Chrome:**

Create file: `%LOCALAPPDATA%\Google\Chrome\User Data\NativeMessagingHosts\com.cursor.manager.json`

```json
{
  "name": "com.cursor.manager",
  "description": "Cursor Manager Backend",
  "path": "C:\\Users\\YOUR_USERNAME\\cursor_manager\\backend\\native_host.bat",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://YOUR_EXTENSION_ID/"]
}
```

**Replace:**

- `YOUR_USERNAME` with your Windows username
- `YOUR_EXTENSION_ID` with your actual extension ID

**Linux - Chrome:**

Create file: `~/.config/google-chrome/NativeMessagingHosts/com.cursor.manager.json`

```json
{
  "name": "com.cursor.manager",
  "description": "Cursor Manager Backend",
  "path": "/home/YOUR_USERNAME/cursor_manager/backend/native_host.sh",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://YOUR_EXTENSION_ID/"]
}
```

**macOS - Chrome:**

Create file: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.cursor.manager.json`

#### Step 3: Create Wrapper Script

**Windows - `native_host.bat`:**

```batch
@echo off
python "%~dp0native_host.py" %*
```

**Linux/macOS - `native_host.sh`:**

```bash
#!/bin/bash
cd "$(dirname "$0")"
python3 native_host.py "$@"
```

Make executable:

```bash
chmod +x native_host.sh
```

#### Step 4: Test Installation

```bash
cd ~/cursor_manager/backend
python cli.py --help
```

---

## Multi-Browser Setup

### Microsoft Edge

**Manifest location (Windows):**

```
%LOCALAPPDATA%\Microsoft\Edge\User Data\NativeMessagingHosts\com.cursor.manager.json
```

### Brave Browser

**Manifest location (Windows):**

```
%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\NativeMessagingHosts\com.cursor.manager.json
```

**Manifest location (Linux):**

```
~/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts/com.cursor.manager.json
```

### Chromium

**Manifest location (Linux):**

```
~/.config/chromium/NativeMessagingHosts/com.cursor.manager.json
```

---

## Configuration

### Adding Extension IDs

#### Via Python GUI

1. Run GUI:

   ```bash
   python gui.py
   ```

2. Go to **Settings** tab

3. Click **Add Extension ID**

4. Choose browser and enter ID

5. Click **Save**

#### Via Manifest File

Edit manifest file directly and add extension ID to `allowed_origins`:

```json
{
  "allowed_origins": [
    "chrome-extension://EXTENSION_ID_1/",
    "chrome-extension://EXTENSION_ID_2/"
  ]
}
```

---

## Auto-Start Configuration

### Windows (Task Scheduler)

1. Open Task Scheduler

2. Create Basic Task:
   - **Name:** Cursor Manager Backend
   - **Trigger:** At log on
   - **Action:** Start a program
   - **Program:** `C:\Users\YOUR_USERNAME\cursor_manager\backend\run_gui.bat`

### Linux (systemd)

Create file: `~/.config/systemd/user/cursor-manager.service`

```ini
[Unit]
Description=Cursor Manager Backend
After=graphical-session.target

[Service]
Type=simple
ExecStart=/home/YOUR_USERNAME/cursor_manager/backend/native_host.sh
Restart=on-failure

[Install]
WantedBy=default.target
```

Enable:

```bash
systemctl --user enable cursor-manager
systemctl --user start cursor-manager
```

### macOS (LaunchAgent)

Create file: `~/Library/LaunchAgents/com.cursor.manager.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cursor.manager</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/YOUR_USERNAME/cursor_manager/backend/native_host.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

Load:

```bash
launchctl load ~/Library/LaunchAgents/com.cursor.manager.plist
```

---

## Verification

### Test Backend

```bash
cd backend
python run_tests.py
```

### Test Native Messaging

1. Open extension in browser

2. Open extension popup/sidepanel

3. Check console for:

   ```
   [Backend] Connected
   ```

4. Try account operations

### Check Logs

**Log location:**

- Windows: `%USERPROFILE%\cursor_manager\logs\backend.log`
- Linux/macOS: `~/cursor_manager/logs/backend.log`

**View logs:**

```bash
tail -f ~/cursor_manager/logs/backend.log
```

---

## Troubleshooting

### Backend Not Connecting

**Error:** "Specified native messaging host not found"

**Solutions:**

1. Check manifest path is correct
2. Verify extension ID in manifest
3. Ensure `native_host.bat` exists and is executable
4. Check Python is in PATH
5. Restart browser completely

### Python Not Found

**Error:** "python: command not found"

**Solutions:**

1. Install Python 3.8+
2. Add Python to PATH
3. Use `python3` instead of `python` (Linux/macOS)
4. Update wrapper script with full Python path

### Permission Denied

**Error:** Permission denied when running scripts

**Solutions:**

- **Linux/macOS:** `chmod +x native_host.sh`
- **Windows:** Run as Administrator (if needed)

### Database Errors

**Error:** Database locked or corrupted

**Solutions:**

1. Close all backend instances
2. Backup database: `~/cursor_manager/data.db`
3. Restore from backup if needed
4. Check file permissions

### Import/Export Fails

**Solutions:**

1. Check file format (JSON)
2. Validate JSON syntax
3. Check file permissions
4. Review error messages in log

---

## Uninstallation

### Automated Uninstall

```bash
python install.py --uninstall
```

### Manual Uninstall

1. **Remove backend directory:**

   ```bash
   rm -rf ~/cursor_manager
   ```

2. **Remove manifests:**

   - Windows: `%LOCALAPPDATA%\Google\Chrome\User Data\NativeMessagingHosts\com.cursor.manager.json`
   - Linux: `~/.config/google-chrome/NativeMessagingHosts/com.cursor.manager.json`
   - macOS: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.cursor.manager.json`

3. **Remove auto-start (if configured):**
   - Windows: Remove Task Scheduler task
   - Linux: `systemctl --user disable cursor-manager`
   - macOS: `launchctl unload ~/Library/LaunchAgents/com.cursor.manager.plist`

---

## Advanced Configuration

### Custom Database Location

Set environment variable:

```bash
export CURSOR_MANAGER_DB="/path/to/custom/data.db"
```

### Custom Log Location

Edit `native_host.py`:

```python
log_dir = Path("/custom/log/path")
```

### Performance Tuning

Edit `database.py` for connection pooling:

```python
POOL_SIZE = 10  # Increase for high concurrency
```

---

## Getting Help

- **GitHub Issues:** [Report bugs](https://github.com/...)
- **Documentation:** Check `docs/` folder
- **Logs:** Review `~/cursor_manager/logs/backend.log`
- **Diagnostics:** Run `python gui.py` → Settings → Diagnostics

---

**Last Updated:** 2025-10-04  
**Version:** 2.0.0

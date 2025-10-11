# Rencana Distribusi Portable - Cursor Manager Desktop

**Status:** 🔄 Planning Phase  
**Target:** Executable portabel untuk Windows (.exe), macOS (.app), Linux (AppImage/Binary)  
**Tool Utama:** PyInstaller + Platform-specific packaging  
**Timeline:** 4-6 minggu untuk implementasi penuh

---

## 1. Tujuan Distribusi

### Target Users
- **Non-technical users** - Tidak perlu install Python manual
- **Quick setup** - Double-click dan langsung jalan
- **Portable mode** - Bisa dijalankan dari USB drive
- **Auto-update ready** - Infrastructure untuk future updates

### Deliverables Per Platform
| Platform | Format | Size Target | Requirements |
|----------|--------|-------------|--------------|
| **Windows** | `.exe` (single file) | <50 MB | Windows 10+ (64-bit) |
| **macOS** | `.app` bundle | <60 MB | macOS 10.15+ (Catalina+) |
| **Linux** | AppImage atau binary | <55 MB | Ubuntu 20.04+ / Fedora 35+ |

---

## 2. Teknologi & Tools

### PyInstaller (Core Packaging)
```bash
pip install pyinstaller
pyinstaller --onefile --windowed gui.py
```

**Keunggulan:**
- ✅ Support semua major OS
- ✅ One-file mode (semua dependencies dalam 1 executable)
- ✅ Hook system untuk custom modules
- ✅ Active development & community

**Alternatif yang Dipertimbangkan:**
- **cx_Freeze** - More control, tapi complex setup
- **Nuitka** - Compile to C, fastest tapi experimental
- **PyOxidizer** - Rust-based, modern tapi learning curve steep
- **Verdict:** PyInstaller = best balance simplicity vs features

### Platform-Specific Tools

#### Windows
- **Tool:** PyInstaller + Inno Setup (installer)
- **Icon:** Convert `icons/icon64.png` to `.ico`
- **Code signing:** Optional (avoid SmartScreen warning)

#### macOS
- **Tool:** PyInstaller + `create-dmg`
- **Bundle:** `.app` with proper Info.plist
- **Notarization:** Required for macOS 10.15+ (Apple Developer account)

#### Linux
- **Tool:** PyInstaller + `appimagetool`
- **Format:** AppImage (portable, no install needed)
- **Desktop file:** `.desktop` entry untuk app launcher

---

## 3. Implementasi Detail

### 3.1 Project Structure

```
cursor_manager_/
├── backend/
│   ├── gui.py (entry point)
│   ├── *.py (all backend modules)
│   ├── requirements.txt
│   └── services/
├── build_tools/           # NEW DIRECTORY
│   ├── build.py           # Unified build script
│   ├── spec_files/
│   │   ├── windows.spec   # PyInstaller spec for Windows
│   │   ├── macos.spec     # PyInstaller spec for macOS
│   │   └── linux.spec     # PyInstaller spec for Linux
│   ├── icons/
│   │   ├── icon.ico       # Windows icon
│   │   ├── icon.icns      # macOS icon
│   │   └── icon.png       # Linux icon
│   ├── installers/
│   │   ├── windows_setup.iss  # Inno Setup script
│   │   └── macos_dmg.sh       # DMG creation script
│   └── hooks/             # PyInstaller hooks for CustomTkinter
│       └── hook-customtkinter.py
├── dist/                  # Build output (gitignored)
└── README_BUILD.md        # Build instructions
```

### 3.2 Build Script (`build_tools/build.py`)

```python
#!/usr/bin/env python3
"""
Unified build script untuk Cursor Manager Desktop
Usage: python build_tools/build.py --platform windows|macos|linux
"""

import sys
import os
import shutil
import subprocess
import platform
from pathlib import Path
import argparse

class Builder:
    def __init__(self, target_platform=None):
        self.root = Path(__file__).parent.parent
        self.backend = self.root / "backend"
        self.build_tools = self.root / "build_tools"
        self.dist = self.root / "dist"
        
        # Auto-detect platform jika tidak dispesifikasi
        self.platform = target_platform or self._detect_platform()
        
        # Version dari __init__.py
        self.version = self._get_version()
        
    def _detect_platform(self):
        """Detect current OS"""
        system = platform.system().lower()
        if system == "darwin":
            return "macos"
        elif system == "linux":
            return "linux"
        elif system == "windows":
            return "windows"
        else:
            raise ValueError(f"Unsupported platform: {system}")
    
    def _get_version(self):
        """Extract version dari __init__.py"""
        init_file = self.backend / "__init__.py"
        with open(init_file) as f:
            for line in f:
                if line.startswith("__version__"):
                    return line.split("=")[1].strip().strip('"\'')
        return "0.0.0"
    
    def clean(self):
        """Clean previous builds"""
        print("🧹 Cleaning previous builds...")
        dirs_to_clean = [
            self.root / "build",
            self.root / "dist",
            self.backend / "build",
            self.backend / "dist"
        ]
        for dir in dirs_to_clean:
            if dir.exists():
                shutil.rmtree(dir)
                print(f"  Removed {dir}")
    
    def build_windows(self):
        """Build Windows .exe"""
        print(f"🪟 Building for Windows (v{self.version})...")
        
        spec_file = self.build_tools / "spec_files" / "windows.spec"
        
        cmd = [
            "pyinstaller",
            str(spec_file),
            "--clean",
            "--noconfirm",
        ]
        
        subprocess.run(cmd, check=True, cwd=str(self.backend))
        
        # Copy ke dist folder dengan nama versioned
        exe_name = f"CursorManager-{self.version}-Windows.exe"
        src = self.backend / "dist" / "CursorManager.exe"
        dst = self.dist / exe_name
        
        self.dist.mkdir(exist_ok=True)
        shutil.copy2(src, dst)
        
        print(f"✅ Windows build complete: {dst}")
        print(f"   Size: {dst.stat().st_size / 1024 / 1024:.1f} MB")
        
        return dst
    
    def build_macos(self):
        """Build macOS .app bundle"""
        print(f"🍎 Building for macOS (v{self.version})...")
        
        spec_file = self.build_tools / "spec_files" / "macos.spec"
        
        cmd = [
            "pyinstaller",
            str(spec_file),
            "--clean",
            "--noconfirm",
        ]
        
        subprocess.run(cmd, check=True, cwd=str(self.backend))
        
        # Create DMG
        app_path = self.backend / "dist" / "CursorManager.app"
        dmg_name = f"CursorManager-{self.version}-macOS.dmg"
        dmg_path = self.dist / dmg_name
        
        self.dist.mkdir(exist_ok=True)
        
        # Simplified DMG creation (gunakan hdiutil)
        subprocess.run([
            "hdiutil", "create", 
            "-volname", "Cursor Manager",
            "-srcfolder", str(app_path),
            "-ov", "-format", "UDZO",
            str(dmg_path)
        ], check=True)
        
        print(f"✅ macOS build complete: {dmg_path}")
        print(f"   Size: {dmg_path.stat().st_size / 1024 / 1024:.1f} MB")
        
        return dmg_path
    
    def build_linux(self):
        """Build Linux AppImage"""
        print(f"🐧 Building for Linux (v{self.version})...")
        
        spec_file = self.build_tools / "spec_files" / "linux.spec"
        
        cmd = [
            "pyinstaller",
            str(spec_file),
            "--clean",
            "--noconfirm",
        ]
        
        subprocess.run(cmd, check=True, cwd=str(self.backend))
        
        # Create AppImage (simplified - assume appimagetool installed)
        binary_path = self.backend / "dist" / "CursorManager"
        appimage_name = f"CursorManager-{self.version}-Linux-x86_64.AppImage"
        appimage_path = self.dist / appimage_name
        
        self.dist.mkdir(exist_ok=True)
        
        # For now, just rename binary (full AppImage requires AppDir structure)
        shutil.copy2(binary_path, appimage_path)
        os.chmod(appimage_path, 0o755)  # Make executable
        
        print(f"✅ Linux build complete: {appimage_path}")
        print(f"   Size: {appimage_path.stat().st_size / 1024 / 1024:.1f} MB")
        
        return appimage_path
    
    def build(self):
        """Main build function"""
        self.clean()
        
        if self.platform == "windows":
            return self.build_windows()
        elif self.platform == "macos":
            return self.build_macos()
        elif self.platform == "linux":
            return self.build_linux()
    
    def build_all(self):
        """Cross-compile untuk semua platform (requires Docker)"""
        print("🌍 Building for all platforms (Docker required)...")
        # TODO: Implement Docker-based cross-compilation
        raise NotImplementedError("Cross-compilation not yet implemented")

def main():
    parser = argparse.ArgumentParser(description="Build Cursor Manager Desktop")
    parser.add_argument(
        "--platform",
        choices=["windows", "macos", "linux", "all"],
        help="Target platform (default: auto-detect)"
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Only clean build artifacts"
    )
    
    args = parser.parse_args()
    
    builder = Builder(args.platform if args.platform != "all" else None)
    
    if args.clean:
        builder.clean()
        return
    
    if args.platform == "all":
        builder.build_all()
    else:
        builder.build()

if __name__ == "__main__":
    main()
```

### 3.3 PyInstaller Spec Files

#### `build_tools/spec_files/windows.spec`
```python
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['../backend/gui.py'],
    pathex=[],
    binaries=[],
    datas=[
        # Include data files yang dibutuhkan
        ('../backend/services', 'services'),
        # CustomTkinter themes
        # (auto-detected by hook, but explicit is better)
    ],
    hiddenimports=[
        'customtkinter',
        'PIL._tkinter_finder',  # CustomTkinter dependency
        'tkinter',
        'tkinter.ttk',
        'sqlite3',
        'apscheduler',
        'apscheduler.schedulers.background',
        'apscheduler.triggers.interval',
    ],
    hookspath=['../build_tools/hooks'],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='CursorManager',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,  # UPX compression untuk smaller size
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # No console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='../build_tools/icons/icon.ico'  # Windows icon
)
```

#### `build_tools/spec_files/macos.spec`
```python
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['../backend/gui.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('../backend/services', 'services'),
    ],
    hiddenimports=[
        'customtkinter',
        'PIL._tkinter_finder',
        'tkinter',
        'tkinter.ttk',
        'sqlite3',
        'apscheduler',
        'apscheduler.schedulers.background',
        'apscheduler.triggers.interval',
    ],
    hookspath=['../build_tools/hooks'],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='CursorManager',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='CursorManager',
)

app = BUNDLE(
    coll,
    name='CursorManager.app',
    icon='../build_tools/icons/icon.icns',  # macOS icon
    bundle_identifier='com.cursormanager.desktop',
    info_plist={
        'CFBundleShortVersionString': '4.0.0',
        'CFBundleVersion': '4.0.0',
        'NSHighResolutionCapable': 'True',
        'LSMinimumSystemVersion': '10.15.0',  # Catalina+
    },
)
```

#### `build_tools/spec_files/linux.spec`
```python
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['../backend/gui.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('../backend/services', 'services'),
    ],
    hiddenimports=[
        'customtkinter',
        'PIL._tkinter_finder',
        'tkinter',
        'tkinter.ttk',
        'sqlite3',
        'apscheduler',
        'apscheduler.schedulers.background',
        'apscheduler.triggers.interval',
    ],
    hookspath=['../build_tools/hooks'],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='CursorManager',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
```

### 3.4 CustomTkinter Hook (`build_tools/hooks/hook-customtkinter.py`)

```python
"""
PyInstaller hook for CustomTkinter
Ensures all theme files and assets are included
"""

from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# Collect all CustomTkinter data files (themes, assets)
datas = collect_data_files('customtkinter')

# Collect all submodules
hiddenimports = collect_submodules('customtkinter')
```

---

## 4. Dependencies & Requirements

### Development Environment
```bash
# Install build dependencies
pip install pyinstaller pillow

# Platform-specific tools
# Windows: Inno Setup (optional, for installer)
# macOS: create-dmg (brew install create-dmg)
# Linux: appimagetool (wget https://github.com/AppImage/AppImageKit/releases)
```

### Runtime Dependencies (Already in requirements.txt)
```txt
customtkinter>=5.2.0
Pillow>=10.0.0
apscheduler>=3.10.0
```

---

## 5. Build Process

### Local Build (Per Platform)
```bash
# 1. Setup environment
cd cursor_manager_
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r backend/requirements.txt
pip install pyinstaller

# 2. Build untuk platform saat ini
python build_tools/build.py

# 3. Output ada di dist/
ls dist/
# Windows: CursorManager-4.0.0-Windows.exe
# macOS: CursorManager-4.0.0-macOS.dmg
# Linux: CursorManager-4.0.0-Linux-x86_64.AppImage
```

### CI/CD Build (GitHub Actions)
```yaml
# .github/workflows/build.yml
name: Build Distributables

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt pyinstaller
      - run: python build_tools/build.py --platform windows
      - uses: actions/upload-artifact@v3
        with:
          name: windows-build
          path: dist/*.exe
  
  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt pyinstaller
      - run: brew install create-dmg
      - run: python build_tools/build.py --platform macos
      - uses: actions/upload-artifact@v3
        with:
          name: macos-build
          path: dist/*.dmg
  
  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt pyinstaller
      - run: python build_tools/build.py --platform linux
      - uses: actions/upload-artifact@v3
        with:
          name: linux-build
          path: dist/*.AppImage
```

---

## 6. Testing Plan

### Pre-Release Testing Matrix

| Platform | Version | Test Cases |
|----------|---------|------------|
| Windows 10 | 64-bit | ✓ Launch, ✓ DB access, ✓ Theme switch, ✓ Scheduler |
| Windows 11 | 64-bit | ✓ Launch, ✓ DB access, ✓ Theme switch, ✓ Scheduler |
| macOS Monterey | 12.x | ✓ Launch, ✓ DB access, ✓ Theme switch, ✓ Scheduler |
| macOS Ventura | 13.x | ✓ Launch, ✓ DB access, ✓ Theme switch, ✓ Scheduler |
| Ubuntu 22.04 | LTS | ✓ Launch, ✓ DB access, ✓ Theme switch, ✓ Scheduler |
| Fedora 38 | Latest | ✓ Launch, ✓ DB access, ✓ Theme switch, ✓ Scheduler |

### Automated Tests
```python
# test_executable.py
import subprocess
import sys

def test_launch():
    """Test executable launches without errors"""
    if sys.platform == "win32":
        exe = "dist/CursorManager.exe"
    elif sys.platform == "darwin":
        exe = "dist/CursorManager.app/Contents/MacOS/CursorManager"
    else:
        exe = "dist/CursorManager"
    
    # Launch dan tunggu 5 detik
    proc = subprocess.Popen([exe])
    time.sleep(5)
    
    # Terminate
    proc.terminate()
    proc.wait()
    
    assert proc.returncode == 0 or proc.returncode is None, "Executable failed to launch"

def test_database_creation():
    """Test database dibuat di lokasi yang benar"""
    import os
    from pathlib import Path
    
    db_path = Path.home() / "cursor_manager" / "data.db"
    assert db_path.exists(), "Database not created"
    assert db_path.stat().st_size > 0, "Database is empty"
```

---

## 7. Distribution Strategy

### Release Channels
1. **GitHub Releases** - Primary distribution
   - Auto-upload dari CI/CD
   - Changelog dari commits
   - Checksums (SHA256) untuk verification

2. **Website / Docs** - Download links
   - Direct download links ke GitHub releases
   - Installation instructions per platform
   - Version comparison table

3. **Future:** Package managers
   - Windows: Winget, Chocolatey
   - macOS: Homebrew Cask
   - Linux: Flathub, Snap Store

### Auto-Update Mechanism (Future)
```python
# backend/updater.py
class AutoUpdater:
    def __init__(self):
        self.current_version = get_version()
        self.update_url = "https://api.github.com/repos/user/cursor_manager/releases/latest"
    
    def check_update(self):
        """Check if update available"""
        response = requests.get(self.update_url)
        latest = response.json()["tag_name"].lstrip("v")
        
        if self._compare_versions(latest, self.current_version) > 0:
            return {
                "available": True,
                "version": latest,
                "download_url": self._get_download_url(latest)
            }
        return {"available": False}
    
    def download_update(self, url):
        """Download update in background"""
        # Implementation untuk download + verify checksum
        pass
    
    def apply_update(self):
        """Replace current executable dengan yang baru"""
        # Platform-specific update logic
        pass
```

---

## 8. Known Issues & Solutions

### Issue 1: CustomTkinter Theme Loading
**Problem:** Themes tidak terdeteksi di executable  
**Solution:** Include explicit datas di spec file + hook

### Issue 2: SQLite Database Path
**Problem:** Database path berbeda di dev vs executable  
**Solution:** Always use `Path.home() / "cursor_manager"`

### Issue 3: Large Executable Size
**Problem:** Executable >100 MB karena include Python interpreter  
**Solution:**
- UPX compression (auto 30-40% reduction)
- Exclude unused modules (pandas, matplotlib jika tidak dipakai)
- Use `--onefile` mode

### Issue 4: macOS Gatekeeper
**Problem:** "App is damaged" warning  
**Solution:** Code signing + notarization (requires Apple Developer account)

### Issue 5: Windows SmartScreen
**Problem:** "Unknown publisher" warning  
**Solution:** Code signing certificate (optional, ~$200/year)

---

## 9. Implementation Timeline

### Phase 1: Basic Build (2 minggu)
- [x] Setup build_tools structure
- [ ] Create spec files untuk semua platform
- [ ] Implement build.py script
- [ ] Manual testing pada each platform
- [ ] Document build process

### Phase 2: CI/CD Integration (1 minggu)
- [ ] Setup GitHub Actions workflow
- [ ] Automated builds on tag push
- [ ] Artifact upload ke Releases
- [ ] Checksum generation

### Phase 3: Polish & Testing (1 minggu)
- [ ] Icon creation (.ico, .icns, .png)
- [ ] Inno Setup installer (Windows)
- [ ] DMG customization (macOS)
- [ ] AppImage packaging (Linux)
- [ ] Beta testing dengan users

### Phase 4: Distribution (1 minggu)
- [ ] GitHub Releases setup
- [ ] Documentation update
- [ ] Download page creation
- [ ] Version numbering strategy
- [ ] Changelog automation

### Optional Phase 5: Auto-Update (2 minggu)
- [ ] Update checker implementation
- [ ] Download + verify mechanism
- [ ] Platform-specific update application
- [ ] UI notification untuk updates

---

## 10. Maintenance & Updates

### Version Numbering (SemVer)
```
MAJOR.MINOR.PATCH
4.1.0
│ │ └─ Bug fixes
│ └─── New features (backward compatible)
└───── Breaking changes
```

### Release Checklist
- [ ] Update `backend/__init__.py` version
- [ ] Update CHANGELOG.md
- [ ] Run full test suite
- [ ] Build untuk semua platform
- [ ] Verify executables launch
- [ ] Create git tag: `git tag v4.1.0`
- [ ] Push tag: `git push origin v4.1.0`
- [ ] CI/CD auto-build & upload
- [ ] Announce release (Discord/Twitter/etc)

---

## 11. Resources & Documentation

### PyInstaller Docs
- https://pyinstaller.org/en/stable/
- https://pyinstaller.org/en/stable/spec-files.html
- https://pyinstaller.org/en/stable/hooks.html

### Platform-Specific Packaging
- Windows: https://jrsoftware.org/isinfo.php (Inno Setup)
- macOS: https://github.com/create-dmg/create-dmg
- Linux: https://appimage.org/ (AppImage)

### Related Tools
- UPX: https://upx.github.io/ (compression)
- Rcedit: https://github.com/electron/rcedit (Windows metadata)
- Create-DMG: https://github.com/create-dmg/create-dmg

---

**Status:** 🎯 Ready untuk implementasi  
**Estimated Effort:** 4-6 minggu total (dengan testing menyeluruh)  
**Priority:** HIGH - Needed untuk user adoption


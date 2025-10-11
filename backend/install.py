"""
Installer Script - Setup native messaging host untuk Chrome Extension
"""

import os
import sys
import json
import shutil
import platform
from pathlib import Path


class Installer:
    """Installer untuk native messaging host"""

    # Extension ID (ganti dengan ID extension yang sebenarnya)
    EXTENSION_ID = "ddckkemmcamldfngbkjjbhfblnkgcpfe"
    HOST_NAME = "com.cursor.manager"

    def __init__(self):
        self.system = platform.system()
        self.backend_dir = Path(__file__).parent.absolute()
        self.install_dir = Path.home() / "cursor_manager"

        # Define browser configurations
        self.browsers = {
            "chrome": {
                "windows": Path(os.getenv("APPDATA"))
                / r"Google\Chrome\NativeMessagingHosts",
                "macos": Path.home()
                / "Library/Application Support/Google/Chrome/NativeMessagingHosts",
                "linux": Path.home() / ".config/google-chrome/NativeMessagingHosts",
            },
            "edge": {
                "windows": Path(os.getenv("APPDATA"))
                / r"Microsoft\Edge\NativeMessagingHosts",
                "macos": Path.home()
                / "Library/Application Support/Microsoft Edge/NativeMessagingHosts",
                "linux": Path.home() / ".config/microsoft-edge/NativeMessagingHosts",
            },
            "brave": {
                "windows": Path(os.getenv("APPDATA"))
                / r"BraveSoftware\Brave-Browser\NativeMessagingHosts",
                "macos": Path.home()
                / "Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts",
                "linux": Path.home()
                / ".config/BraveSoftware/Brave-Browser/NativeMessagingHosts",
            },
            "firefox": {
                "windows": Path(os.getenv("APPDATA")) / r"Mozilla\NativeMessagingHosts",
                "macos": Path.home()
                / "Library/Application Support/Mozilla/NativeMessagingHosts",
                "linux": Path.home() / ".mozilla/native-messaging-hosts",
            },
            "opera": {
                "windows": Path(os.getenv("APPDATA"))
                / r"Opera Software\Opera Stable\NativeMessagingHosts",
                "macos": Path.home()
                / "Library/Application Support/com.operasoftware.Opera/NativeMessagingHosts",
                "linux": Path.home() / ".config/opera/NativeMessagingHosts",
            },
        }

        # Detect available browsers
        self.available_browsers = self._detect_available_browsers()

    def _detect_available_browsers(self):
        """Detect which browsers are available on the system"""
        available = []

        for browser_name, paths in self.browsers.items():
            if self.system.lower() in paths:
                manifest_dir = paths[self.system.lower()]

                # Check if browser is installed by looking for common browser directories
                if self._is_browser_installed(browser_name):
                    available.append(
                        {
                            "name": browser_name,
                            "manifest_dir": manifest_dir,
                            "display_name": browser_name.title(),
                        }
                    )

        return available

    def _is_browser_installed(self, browser_name):
        """Check if a specific browser is installed"""
        if self.system == "Windows":
            # Check for browser installation in common locations
            browser_paths = {
                "chrome": [
                    Path(os.getenv("PROGRAMFILES")) / "Google/Chrome/Application",
                    Path(os.getenv("PROGRAMFILES(X86)")) / "Google/Chrome/Application",
                    Path(os.getenv("LOCALAPPDATA")) / "Google/Chrome/Application",
                ],
                "edge": [
                    Path(os.getenv("PROGRAMFILES(X86)")) / "Microsoft/Edge/Application",
                    Path(os.getenv("LOCALAPPDATA")) / "Microsoft/Edge/Application",
                ],
                "brave": [
                    Path(os.getenv("PROGRAMFILES"))
                    / "BraveSoftware/Brave-Browser/Application",
                    Path(os.getenv("PROGRAMFILES(X86)"))
                    / "BraveSoftware/Brave-Browser/Application",
                    Path(os.getenv("LOCALAPPDATA"))
                    / "BraveSoftware/Brave-Browser/Application",
                ],
                "firefox": [
                    Path(os.getenv("PROGRAMFILES")) / "Mozilla Firefox",
                    Path(os.getenv("PROGRAMFILES(X86)")) / "Mozilla Firefox",
                    Path(os.getenv("LOCALAPPDATA")) / "Mozilla Firefox",
                ],
                "opera": [
                    Path(os.getenv("PROGRAMFILES")) / "Opera",
                    Path(os.getenv("PROGRAMFILES(X86)")) / "Opera",
                    Path(os.getenv("LOCALAPPDATA")) / "Opera Software/Opera",
                ],
            }

            if browser_name in browser_paths:
                for path in browser_paths[browser_name]:
                    if path.exists():
                        return True

        elif self.system == "Darwin":  # macOS
            browser_paths = {
                "chrome": Path("/Applications/Google Chrome.app"),
                "edge": Path("/Applications/Microsoft Edge.app"),
                "brave": Path("/Applications/Brave Browser.app"),
                "firefox": Path("/Applications/Firefox.app"),
                "opera": Path("/Applications/Opera.app"),
            }

            if browser_name in browser_paths:
                return browser_paths[browser_name].exists()

        else:  # Linux
            # Check for browser executables in PATH
            import shutil

            browser_executables = {
                "chrome": ["google-chrome", "google-chrome-stable", "chromium"],
                "edge": ["microsoft-edge", "microsoft-edge-stable"],
                "brave": ["brave-browser", "brave"],
                "firefox": ["firefox"],
                "opera": ["opera"],
            }

            if browser_name in browser_executables:
                for exe in browser_executables[browser_name]:
                    if shutil.which(exe):
                        return True

        return False

    def install(self):
        """Install native messaging host"""
        print("=" * 60)
        print("Cursor Manager - Native Messaging Host Installer")
        print("=" * 60)
        print()

        # Show detected browsers
        if self.available_browsers:
            print("Detected browsers:")
            for browser in self.available_browsers:
                print(f"  ✓ {browser['display_name']}")
            print()
        else:
            print("⚠️  No supported browsers detected!")
            print("Supported browsers: Chrome, Edge, Brave, Firefox, Opera")
            print()

        # Step 1: Copy backend files
        print("Step 1: Installing backend files...")
        self._copy_backend_files()
        print(f"✓ Backend installed to: {self.install_dir}")
        print()

        # Step 2: Create manifest files
        print("Step 2: Creating native messaging manifests...")
        self._create_manifests()
        print()

        # Step 3: Create shortcuts (Windows only)
        if self.system == "Windows":
            print("Step 3: Creating shortcuts...")
            self._create_shortcuts()
            print("✓ Shortcuts created")
            print()

        # Step 4: Test installation
        print("Testing installation...")
        if self._test_installation():
            print("✓ Installation test passed")
        else:
            print("✗ Installation test failed")
            return False

        print()
        print("=" * 60)
        print("Installation completed successfully!")
        print("=" * 60)
        print()
        print("Next steps:")
        print("1. Update EXTENSION_ID in install.py with your actual extension ID")
        print("2. Reload your Chrome extension")
        print("3. Open extension and verify connection to backend")
        print()
        print("CLI Usage:")
        print(f"  python {self.install_dir / 'cli.py'} --help")
        print()

        return True

    def _copy_backend_files(self):
        """Copy backend files ke install directory"""
        # Create install directory
        self.install_dir.mkdir(parents=True, exist_ok=True)

        # Files to copy
        files = [
            "__init__.py",
            "database.py",
            "account_service.py",
            "cards_service.py",
            "native_host.py",
            "cli.py",
            "requirements.txt",
        ]

        for file in files:
            src = self.backend_dir / file
            dst = self.install_dir / file
            if src.exists():
                shutil.copy2(src, dst)

    def _create_manifests(self):
        """Create native messaging manifest files for all detected browsers"""
        if self.system == "Windows":
            # Windows: Create batch wrapper for Python script
            # Chrome requires path to point to executable, not .py file
            bat_wrapper = self.install_dir / "native_host.bat"
            bat_content = f'@echo off\r\n"{sys.executable}" "{self.install_dir / "native_host.py"}" %*\r\n'
            with open(bat_wrapper, 'w') as f:
                f.write(bat_content)
            
            native_host_path = str(bat_wrapper).replace("\\", "/")
        else:
            # macOS/Linux: script with shebang works directly
            native_host_path = str(self.install_dir / "native_host.py")

        manifest = {
            "name": self.HOST_NAME,
            "description": "Native messaging host for Cursor Manager Extension",
            "path": native_host_path,
            "type": "stdio",
            "allowed_origins": [f"chrome-extension://{self.EXTENSION_ID}/"],
        }

        # Create manifests only for detected browsers
        if self.available_browsers:
            for browser in self.available_browsers:
                try:
                    browser["manifest_dir"].mkdir(parents=True, exist_ok=True)
                    manifest_file = browser["manifest_dir"] / f"{self.HOST_NAME}.json"
                    with open(manifest_file, "w") as f:
                        json.dump(manifest, f, indent=2)
                    print(
                        f"✓ {browser['display_name']} manifest created at: {browser['manifest_dir']}"
                    )
                except Exception as e:
                    print(f"✗ Failed to create {browser['display_name']} manifest: {e}")
        else:
            print("⚠️  No browsers detected, skipping manifest creation")

        # On Unix systems, make the host executable
        if self.system != "Windows":
            native_host_file = self.install_dir / "native_host.py"
            os.chmod(native_host_file, 0o755)

    def _create_shortcuts(self):
        """Create shortcuts (Windows only)"""
        if self.system != "Windows":
            return

        # Create CLI shortcut in install directory
        bat_content = f"""@echo off
"{sys.executable}" "{self.install_dir}\\cli.py" %*
"""

        bat_file = self.install_dir / "cursor-manager.bat"
        with open(bat_file, "w") as f:
            f.write(bat_content)

    def _test_installation(self) -> bool:
        """Test installation"""
        try:
            # Check if backend files exist
            required_files = [
                "database.py",
                "account_service.py",
                "native_host.py",
                "cli.py",
            ]

            for file in required_files:
                if not (self.install_dir / file).exists():
                    print(f"Missing file: {file}")
                    return False

            # Check if any manifest exists
            manifest_found = False
            if self.available_browsers:
                for browser in self.available_browsers:
                    manifest_file = browser["manifest_dir"] / f"{self.HOST_NAME}.json"
                    if manifest_file.exists():
                        manifest_found = True
                        break

            if not manifest_found:
                print("No manifest files found")
                return False

            # Try to import database module
            sys.path.insert(0, str(self.install_dir))
            from database import Database

            # Try to create database instance
            db = Database()
            version = db.get_schema_version()
            db.close()

            return True

        except Exception as e:
            print(f"Test error: {e}")
            return False

    def uninstall(self):
        """Uninstall native messaging host"""
        print("Uninstalling Cursor Manager Backend...")

        # Remove manifest
        manifest_file = self.manifest_dir / f"{self.HOST_NAME}.json"
        if manifest_file.exists():
            manifest_file.unlink()
            print(f"✓ Removed manifest: {manifest_file}")

        # Ask user about data
        print()
        print(f"Backend is installed at: {self.install_dir}")
        response = input("Do you want to remove backend files and data? (y/N): ")

        if response.lower() == "y":
            if self.install_dir.exists():
                shutil.rmtree(self.install_dir)
                print(f"✓ Removed backend directory: {self.install_dir}")
        else:
            print("Backend files and data kept.")

        print()
        print("Uninstallation completed.")


def main():
    """Main installer entry point"""
    if len(sys.argv) > 1 and sys.argv[1] == "uninstall":
        installer = Installer()
        installer.uninstall()
    else:
        installer = Installer()
        success = installer.install()
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

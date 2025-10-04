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
    EXTENSION_ID = "your_extension_id_here"
    HOST_NAME = "com.cursor.manager"

    def __init__(self):
        self.system = platform.system()
        self.backend_dir = Path(__file__).parent.absolute()

        if self.system == "Windows":
            self.install_dir = Path.home() / "cursor_manager"
            self.manifest_dir = (
                Path(os.getenv("APPDATA")) / r"Google\Chrome\NativeMessagingHosts"
            )
        elif self.system == "Darwin":  # macOS
            self.install_dir = Path.home() / "cursor_manager"
            self.manifest_dir = (
                Path.home()
                / "Library/Application Support/Google/Chrome/NativeMessagingHosts"
            )
        else:  # Linux
            self.install_dir = Path.home() / "cursor_manager"
            self.manifest_dir = (
                Path.home() / ".config/google-chrome/NativeMessagingHosts"
            )

    def install(self):
        """Install native messaging host"""
        print("=" * 60)
        print("Cursor Manager - Native Messaging Host Installer")
        print("=" * 60)
        print()

        # Step 1: Copy backend files
        print("Step 1: Installing backend files...")
        self._copy_backend_files()
        print(f"✓ Backend installed to: {self.install_dir}")
        print()

        # Step 2: Create manifest file
        print("Step 2: Creating native messaging manifest...")
        self._create_manifest()
        print(f"✓ Manifest created at: {self.manifest_dir}")
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

    def _create_manifest(self):
        """Create native messaging manifest file"""
        self.manifest_dir.mkdir(parents=True, exist_ok=True)

        if self.system == "Windows":
            # Windows: path must use forward slashes or escaped backslashes
            native_host_path = str(self.install_dir / "native_host.py").replace(
                "\\", "/"
            )
            command = [sys.executable, native_host_path]  # Python interpreter path
        else:
            # macOS/Linux
            native_host_path = str(self.install_dir / "native_host.py")
            command = [sys.executable, native_host_path]

        manifest = {
            "name": self.HOST_NAME,
            "description": "Native messaging host for Cursor Manager Extension",
            "path": native_host_path,
            "type": "stdio",
            "allowed_origins": [f"chrome-extension://{self.EXTENSION_ID}/"],
        }

        manifest_file = self.manifest_dir / f"{self.HOST_NAME}.json"
        with open(manifest_file, "w") as f:
            json.dump(manifest, f, indent=2)

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

            # Check if manifest exists
            manifest_file = self.manifest_dir / f"{self.HOST_NAME}.json"
            if not manifest_file.exists():
                print(f"Manifest file not found: {manifest_file}")
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

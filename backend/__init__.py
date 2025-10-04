"""
Cursor Manager Backend - Native Messaging Host

Python backend untuk Cursor Manager Chrome Extension.
Handles all data storage, business logic, dan feature processing.
"""

__version__ = "2.0.0"
__author__ = "Cursor Manager Development Team"
__license__ = "MIT"

# Version info
VERSION_MAJOR = 2
VERSION_MINOR = 0
VERSION_PATCH = 0
VERSION_INFO = (VERSION_MAJOR, VERSION_MINOR, VERSION_PATCH)

# Database schema version (must match database.py)
SCHEMA_VERSION = 2


def get_version():
    """Get version string"""
    return __version__


def get_version_info():
    """Get version info tuple"""
    return VERSION_INFO


def get_full_version_info():
    """Get full version information"""
    return {
        "version": __version__,
        "version_info": VERSION_INFO,
        "schema_version": SCHEMA_VERSION,
        "author": __author__,
        "license": __license__,
    }

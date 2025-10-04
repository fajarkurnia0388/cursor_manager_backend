// Database Sync Service - Sinkronisasi SQLite dengan file lokal
class DatabaseSyncService {
  constructor() {
    this.DB_FILENAME = 'cursor_accounts.db';
    this.DB_FOLDER = 'CursorAccountManager';
    this.isInitialized = false;
  }

  // Export database ke file lokal
  async exportDatabaseToFile() {
    try {
      console.log("Exporting database to local file...");
      
      // Get database from storage
      const result = await chrome.storage.local.get("sqlite_db");
      if (!result.sqlite_db) {
        throw new Error("No database found in storage");
      }

      // Convert array back to Uint8Array
      const dbData = new Uint8Array(result.sqlite_db);
      
      // Create blob
      const blob = new Blob([dbData], { type: 'application/x-sqlite3' });
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${this.DB_FOLDER}/${this.DB_FILENAME}`;
      const backupFilename = `${this.DB_FOLDER}/backup_${timestamp}_${this.DB_FILENAME}`;
      
      // Download main database file
      await this.downloadDatabase(blob, filename);
      
      // Also create timestamped backup
      await this.downloadDatabase(blob, backupFilename);
      
      console.log("Database exported successfully");
      return { success: true, filename: filename };
    } catch (error) {
      console.error("Error exporting database:", error);
      throw error;
    }
  }

  // Download database file
  async downloadDatabase(blob, filename) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        chrome.downloads.download({
          url: reader.result,
          filename: filename,
          saveAs: false,
          conflictAction: 'overwrite'
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            console.log(`Database saved: ${filename} (ID: ${downloadId})`);
            resolve(downloadId);
          }
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Import database from file
  async importDatabaseFromFile(fileData) {
    try {
      console.log("Importing database from file...");
      
      // Validate it's a SQLite database
      const header = new Uint8Array(fileData.slice(0, 16));
      const sqliteHeader = [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 
                            0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00];
      
      for (let i = 0; i < sqliteHeader.length; i++) {
        if (header[i] !== sqliteHeader[i]) {
          throw new Error("Invalid SQLite database file");
        }
      }
      
      // Convert to array for storage
      const dbArray = Array.from(new Uint8Array(fileData));
      
      // Backup current database before importing
      await this.backupCurrentDatabase();
      
      // Save to storage
      await chrome.storage.local.set({
        sqlite_db: dbArray,
        sqlite_db_imported_at: new Date().toISOString()
      });
      
      console.log("Database imported successfully");
      return { success: true };
    } catch (error) {
      console.error("Error importing database:", error);
      throw error;
    }
  }

  // Backup current database
  async backupCurrentDatabase() {
    try {
      const result = await chrome.storage.local.get("sqlite_db");
      if (result.sqlite_db) {
        const timestamp = Date.now();
        const backupKey = `sqlite_db_backup_${timestamp}`;
        
        await chrome.storage.local.set({
          [backupKey]: result.sqlite_db,
          last_backup_key: backupKey,
          last_backup_time: new Date().toISOString()
        });
        
        console.log(`Database backed up with key: ${backupKey}`);
        
        // Clean old backups (keep only last 5)
        await this.cleanOldBackups();
      }
    } catch (error) {
      console.error("Error backing up database:", error);
    }
  }

  // Clean old backups
  async cleanOldBackups() {
    try {
      const storage = await chrome.storage.local.get();
      const backupKeys = Object.keys(storage)
        .filter(key => key.startsWith('sqlite_db_backup_'))
        .sort()
        .reverse();
      
      if (backupKeys.length > 5) {
        const keysToRemove = backupKeys.slice(5);
        await chrome.storage.local.remove(keysToRemove);
        console.log(`Removed ${keysToRemove.length} old backups`);
      }
    } catch (error) {
      console.error("Error cleaning old backups:", error);
    }
  }

  // Auto-sync database to file periodically
  async enableAutoSync(intervalMinutes = 30) {
    // Set up alarm for periodic sync
    chrome.alarms.create('database-sync', {
      periodInMinutes: intervalMinutes
    });
    
    // Save auto-sync setting
    await chrome.storage.local.set({
      auto_sync_enabled: true,
      auto_sync_interval: intervalMinutes
    });
    
    console.log(`Auto-sync enabled: every ${intervalMinutes} minutes`);
  }

  // Disable auto-sync
  async disableAutoSync() {
    chrome.alarms.clear('database-sync');
    await chrome.storage.local.set({
      auto_sync_enabled: false
    });
    console.log("Auto-sync disabled");
  }

  // Get sync status
  async getSyncStatus() {
    const result = await chrome.storage.local.get([
      'sqlite_db_imported_at',
      'last_backup_time',
      'auto_sync_enabled',
      'auto_sync_interval'
    ]);
    
    return {
      lastImport: result.sqlite_db_imported_at || null,
      lastBackup: result.last_backup_time || null,
      autoSyncEnabled: result.auto_sync_enabled || false,
      autoSyncInterval: result.auto_sync_interval || 30
    };
  }

  // Check if database file exists in Downloads
  async checkDatabaseFile() {
    try {
      const downloads = await new Promise((resolve) => {
        chrome.downloads.search({
          query: [this.DB_FILENAME],
          exists: true,
          limit: 1,
          orderBy: ['-startTime']
        }, resolve);
      });
      
      if (downloads && downloads.length > 0) {
        return {
          exists: true,
          file: downloads[0],
          path: downloads[0].filename,
          size: downloads[0].fileSize,
          date: downloads[0].startTime
        };
      }
      
      return { exists: false };
    } catch (error) {
      console.error("Error checking database file:", error);
      return { exists: false, error: error.message };
    }
  }

  // Open database file location
  async openDatabaseLocation() {
    try {
      console.log("Opening database location...");
      
      // First, ensure database file exists
      const fileInfo = await this.checkDatabaseFile();
      
      if (!fileInfo.exists) {
        console.log("Database file not found, creating new one...");
        // Export new file if doesn't exist
        const exportResult = await this.exportDatabaseToFile();
        if (!exportResult.success) {
          throw new Error("Failed to create database file");
        }
        
        // Wait a bit for file to be created
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check again
        const newFileInfo = await this.checkDatabaseFile();
        if (newFileInfo.exists && newFileInfo.file) {
          console.log("Opening newly created file location...");
          chrome.downloads.show(newFileInfo.file.id);
          return { success: true, created: true, message: "Database file created and location opened" };
        } else {
          // If still not found, open Downloads folder
          chrome.downloads.showDefaultFolder();
          return { success: true, created: true, message: "Database exported to Downloads folder" };
        }
      } else {
        console.log("Opening existing file location...");
        // File exists, show it
        chrome.downloads.show(fileInfo.file.id);
        return { success: true, message: "Database location opened" };
      }
    } catch (error) {
      console.error("Error opening database location:", error);
      // Fallback: try to open Downloads folder
      try {
        chrome.downloads.showDefaultFolder();
        return { success: true, message: "Opened Downloads folder", error: error.message };
      } catch (fallbackError) {
        return { success: false, error: error.message };
      }
    }
  }
}

// Create global instance
const databaseSyncService = new DatabaseSyncService();

// Handle alarms for auto-sync
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'database-sync') {
    console.log("Running scheduled database sync...");
    databaseSyncService.exportDatabaseToFile()
      .then(() => console.log("Scheduled sync completed"))
      .catch(error => console.error("Scheduled sync failed:", error));
  }
});

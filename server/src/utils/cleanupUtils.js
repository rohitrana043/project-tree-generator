// utils/cleanupUtils.js
const fs = require('fs');
const path = require('path');

/**
 * Safely delete a file with proper error handling
 * @param {string} filePath - Path to file to delete
 * @param {boolean} logSuccess - Whether to log successful deletion
 * @returns {boolean} - Whether deletion was successful
 */
exports.safeDeleteFile = (filePath, logSuccess = true) => {
  if (!filePath) return false;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      if (logSuccess) console.log(`Successfully deleted file: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(
      `Warning: Failed to delete file at ${filePath}:`,
      error.message
    );
    return false;
  }
};

/**
 * Safely delete a directory with proper error handling
 * @param {string} dirPath - Path to directory to delete
 * @param {boolean} logSuccess - Whether to log successful deletion
 * @returns {boolean} - Whether deletion was successful
 */
exports.safeDeleteDirectory = (dirPath, logSuccess = true) => {
  if (!dirPath) return false;

  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      if (logSuccess) console.log(`Successfully deleted directory: ${dirPath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(
      `Warning: Failed to delete directory at ${dirPath}:`,
      error.message
    );
    return false;
  }
};

/**
 * Schedule cleanup of temp files to ensure downloads complete
 * @param {string} filePath - Path to file to delete
 * @param {string} dirPath - Path to directory to delete
 * @param {number} delayMs - Delay before deletion in milliseconds
 */
exports.scheduleCleanup = (filePath, dirPath, delayMs = 5000) => {
  setTimeout(() => {
    if (filePath) this.safeDeleteFile(filePath);
    if (dirPath) this.safeDeleteDirectory(dirPath);
  }, delayMs);
};

/**
 * Clean up old temp files from previous runs
 * @param {string} baseDir - Base temporary directory
 * @param {number} maxAgeHours - Maximum age in hours before deletion (default: 24)
 */
exports.cleanupOldTempFiles = (baseDir, maxAgeHours = 24) => {
  if (!baseDir || !fs.existsSync(baseDir)) return;

  try {
    console.log(`Cleaning up old temp files in: ${baseDir}`);
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    const items = fs.readdirSync(baseDir, { withFileTypes: true });

    let deletedCount = 0;
    for (const item of items) {
      // Skip .gitkeep files
      if (item.name === '.gitkeep') continue;

      const itemPath = path.join(baseDir, item.name);
      const stats = fs.statSync(itemPath);

      // Delete if older than maxAgeHours
      if (now - stats.mtimeMs > maxAgeMs) {
        if (item.isDirectory()) {
          this.safeDeleteDirectory(itemPath, false);
          deletedCount++;
        } else {
          this.safeDeleteFile(itemPath, false);
          deletedCount++;
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old items from ${baseDir}`);
    }
  } catch (error) {
    console.error(`Error cleaning up old temp files: ${error.message}`);
  }
};

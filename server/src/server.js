// Modified server.js with temp directory handling and periodic cleanup
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const dotenv = require('dotenv');
const fs = require('fs');
const os = require('os');

// Load environment variables with explicit path
const envPath = path.resolve(__dirname, '.env');
const result = dotenv.config({ path: envPath });

// Import routes
const githubRoutes = require('./routes/githubRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const builderRoutes = require('./routes/builderRoutes');

// Import cleanup utilities
const cleanupUtils = require('./utils/cleanupUtils');

const app = express();
const PORT = process.env.PORT || 5000;

// Set up the temp directories - using OS temp directory for cloud compatibility
// This is critical for platforms like Render where you need to use a writable directory
const BASE_TEMP_DIR = process.env.RENDER
  ? path.join(os.tmpdir(), 'project-tree-generator')
  : path.join(__dirname, 'tmp');
const UPLOADS_DIR = path.join(BASE_TEMP_DIR, 'uploads');
const EXTRACTED_DIR = path.join(BASE_TEMP_DIR, 'extracted');
const STRUCTURES_DIR = path.join(BASE_TEMP_DIR, 'structures');

// Override env vars with the new paths
process.env.TEMP_DIR = BASE_TEMP_DIR;
process.env.UPLOADS_DIR = UPLOADS_DIR;
process.env.EXTRACTED_DIR = EXTRACTED_DIR;
process.env.STRUCTURES_DIR = STRUCTURES_DIR;

// Create required directories
console.log('Setting up temp directories:');
[BASE_TEMP_DIR, UPLOADS_DIR, EXTRACTED_DIR, STRUCTURES_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  } else {
    console.log(`Directory exists: ${dir}`);
  }
});

// Run initial cleanup of any old temp files (from previous deployments)
console.log('Running initial cleanup of temporary directories');
cleanupUtils.cleanupOldTempFiles(UPLOADS_DIR, 12); // Delete files older than 12 hours
cleanupUtils.cleanupOldTempFiles(EXTRACTED_DIR, 12);
cleanupUtils.cleanupOldTempFiles(STRUCTURES_DIR, 12);

// Set up periodic cleanup every hour
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
setInterval(() => {
  console.log('Running scheduled temp directory cleanup');
  cleanupUtils.cleanupOldTempFiles(UPLOADS_DIR, 1); // Delete files older than 1 hour
  cleanupUtils.cleanupOldTempFiles(EXTRACTED_DIR, 1);
  cleanupUtils.cleanupOldTempFiles(STRUCTURES_DIR, 1);
}, CLEANUP_INTERVAL_MS);

if (!process.env.GITHUB_TOKEN) {
  console.warn(
    'Warning: No GitHub token found in environment variables.\n' +
      'GitHub API requests will be rate-limited to 60 requests per hour.\n' +
      'For higher limits, create a .env file with GITHUB_TOKEN=your_token'
  );
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// API Routes
app.use('/api/github', githubRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/builder', builderRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Temp directory: ${BASE_TEMP_DIR}`);
});

module.exports = app;

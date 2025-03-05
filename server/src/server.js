// Modified server.js with Vercel support and temp directory handling
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const dotenv = require('dotenv');
const fs = require('fs');
const os = require('os');

// Load environment variables
let result;
try {
  const envPath = path.resolve(__dirname, '.env');
  result = dotenv.config({ path: envPath });
} catch (error) {
  console.log('Error loading .env file, using environment variables');
}

// Import routes
const githubRoutes = require('./routes/githubRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const builderRoutes = require('./routes/builderRoutes');

// Import cleanup utilities
const cleanupUtils = require('./utils/cleanupUtils');

const app = express();
const PORT = process.env.PORT || 5000;

// Check if running on Vercel, Render, or local environment
const isVercel = process.env.VERCEL === 'true';
const isRender = process.env.RENDER === 'true';
const isServerless = isVercel || isRender;
console.log(`Environment: Vercel: ${isVercel}, Render: ${isRender}`);

// Set up the temp directories - using OS temp directory for cloud compatibility
// This is critical for serverless platforms where the filesystem is read-only
const BASE_TEMP_DIR = isServerless
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

// Run initial cleanup of any old temp files
console.log('Running initial cleanup of temporary directories');
cleanupUtils.cleanupOldTempFiles(UPLOADS_DIR, 12); // Delete files older than 12 hours
cleanupUtils.cleanupOldTempFiles(EXTRACTED_DIR, 12);
cleanupUtils.cleanupOldTempFiles(STRUCTURES_DIR, 12);

// Set up periodic cleanup if not in serverless environment
// In serverless environments, functions don't persist long enough for this to matter
if (!isServerless) {
  const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  setInterval(() => {
    console.log('Running scheduled temp directory cleanup');
    cleanupUtils.cleanupOldTempFiles(UPLOADS_DIR, 1);
    cleanupUtils.cleanupOldTempFiles(EXTRACTED_DIR, 1);
    cleanupUtils.cleanupOldTempFiles(STRUCTURES_DIR, 1);
  }, CLEANUP_INTERVAL_MS);
}

if (!process.env.GITHUB_TOKEN) {
  console.warn(
    'Warning: No GitHub token found in environment variables.\n' +
      'GitHub API requests will be rate-limited to 60 requests per hour.\n' +
      'For higher limits, create a .env file with GITHUB_TOKEN=your_token'
  );
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Only use morgan in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// API Routes - Add /api prefix for all routes
app.use('/api/github', githubRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/builder', builderRoutes);

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: isVercel ? 'vercel' : isRender ? 'render' : 'standard',
    timestamp: new Date().toISOString(),
  });
});

// Handle root path to prevent 404
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Project Tree Generator API is running',
    docs: 'Use /api endpoints to access the API functionality',
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production' && !isServerless) {
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

// For local development and non-serverless environments
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Temp directory: ${BASE_TEMP_DIR}`);
  });
}

// Export for serverless environments
module.exports = app;

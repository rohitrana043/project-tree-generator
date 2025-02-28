// Modified server.js with explicit .env path configuration
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables with explicit path
const envPath = path.resolve(__dirname, '.env');
const result = dotenv.config({ path: envPath });

// Import routes
const githubRoutes = require('./routes/githubRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const builderRoutes = require('./routes/builderRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Create required directories if they don't exist
const requiredDirs = [
  process.env.TEMP_DIR || './tmp',
  process.env.UPLOADS_DIR || './tmp/uploads',
  process.env.EXTRACTED_DIR || './tmp/extracted',
  process.env.STRUCTURES_DIR || './tmp/structures',
];

requiredDirs.forEach((dir) => {
  const dirPath = path.resolve(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

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
});

module.exports = app;

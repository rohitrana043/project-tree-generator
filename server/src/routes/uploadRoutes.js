const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const multer = require('multer');
const path = require('path');
const os = require('os');

// Determine uploads directory based on environment
const isServerless =
  process.env.VERCEL === 'true' || process.env.RENDER === 'true';
const BASE_UPLOADS_DIR = isServerless
  ? path.join(os.tmpdir(), 'project-tree-generator', 'uploads')
  : process.env.UPLOADS_DIR;

// Ensure directory exists
const fs = require('fs');
if (!fs.existsSync(BASE_UPLOADS_DIR)) {
  fs.mkdirSync(BASE_UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, BASE_UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
    );
  },
});

// Get max upload size from environment variables
const MAX_UPLOAD_SIZE =
  parseInt(process.env.MAX_UPLOAD_SIZE) || 50 * 1024 * 1024; // 50MB default

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: function (req, file, cb) {
    // Accept only zip files
    if (
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.originalname.endsWith('.zip')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'), false);
    }
  },
});

// Generate tree structure from uploaded file
router.post('/tree', upload.single('file'), uploadController.generateTree);

module.exports = router;

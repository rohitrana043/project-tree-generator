const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use environment variable for uploads directory
    cb(null, process.env.UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

// Get max upload size from environment variables
const MAX_UPLOAD_SIZE =
  parseInt(process.env.MAX_UPLOAD_SIZE) || 10 * 1024 * 1024; // 10MB default

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

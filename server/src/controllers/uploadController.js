// controllers/uploadController.js - Modified for serverless compatibility
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const treeGenerator = require('../services/treeGenerator');
const cleanupUtils = require('../utils/cleanupUtils');

// Generate tree structure from uploaded file
exports.generateTree = async (req, res, next) => {
  let filePath = null;
  let extractPath = null;

  try {
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    filePath = req.file.path;
    const fileName = path.parse(req.file.originalname).name;

    // Verify file exists before proceeding
    if (!fs.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}`);
      return res.status(500).json({
        message: 'Uploaded file not found on server',
        path: filePath,
      });
    }

    // Create a unique extraction directory
    const timestamp = Date.now();
    extractPath = path.resolve(
      process.env.EXTRACTED_DIR ||
        path.join(require('os').tmpdir(), 'extracted'),
      timestamp.toString()
    );

    // Ensure extract directory exists
    fs.mkdirSync(extractPath, { recursive: true });

    // Extract zip file to temporary directory
    try {
      const zip = new AdmZip(filePath);
      zip.extractAllTo(extractPath, true);
    } catch (extractError) {
      console.error('Error extracting zip file:', extractError);
      // Clean up the uploaded file since we're returning an error
      cleanupUtils.safeDeleteFile(filePath);
      cleanupUtils.safeDeleteDirectory(extractPath);
      return res.status(400).json({
        message: 'Invalid or corrupted zip file',
        error: extractError.message,
      });
    }
    const treeText = treeGenerator.generateTreeFromDirectory(
      extractPath,
      fileName
    );

    // Send response with tree structure first
    res.status(200).json({
      treeText,
      fileName,
    });

    // In serverless environments, rely on ephemeral nature of function
    // For non-serverless, clean up explicitly
    if (process.env.VERCEL !== 'true' && process.env.RENDER !== 'true') {
      process.nextTick(() => {
        console.log('Performing cleanup after response sent');
        cleanupUtils.safeDeleteFile(filePath);
        cleanupUtils.safeDeleteDirectory(extractPath);
      });
    }
  } catch (error) {
    console.error('Error in generateTree:', error);

    // Clean up temporary files if an error occurs
    cleanupUtils.safeDeleteFile(filePath);
    cleanupUtils.safeDeleteDirectory(extractPath);

    next(error);
  }
};

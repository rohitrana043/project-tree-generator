// controllers/uploadController.js - Improved file upload controller with better cleanup
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
    console.log('Upload request received');

    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('File details:', {
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      path: req.file.path,
      size: req.file.size,
    });

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

    console.log(`File verified at: ${filePath}`);

    // Create a unique extraction directory
    const timestamp = Date.now();
    extractPath = path.resolve(
      process.env.EXTRACTED_DIR || path.join(__dirname, '../tmp/extracted'),
      timestamp.toString()
    );

    // Ensure extract directory exists
    console.log(`Creating extraction directory: ${extractPath}`);
    fs.mkdirSync(extractPath, { recursive: true });

    // Extract zip file to temporary directory
    try {
      console.log(`Extracting zip file to: ${extractPath}`);
      const zip = new AdmZip(filePath);
      zip.extractAllTo(extractPath, true);
      console.log('Zip file extracted successfully');
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

    // Generate tree structure
    console.log('Generating tree structure from extracted files');
    const treeText = treeGenerator.generateTreeFromDirectory(
      extractPath,
      fileName
    );
    console.log('Tree structure generated successfully');

    // Send response with tree structure first
    res.status(200).json({
      treeText,
      fileName,
    });

    // Clean up temporary files after response has been sent
    // This ensures the response is not delayed by cleanup operations
    process.nextTick(() => {
      console.log('Performing cleanup after response sent');
      cleanupUtils.safeDeleteFile(filePath);
      cleanupUtils.safeDeleteDirectory(extractPath);
    });
  } catch (error) {
    console.error('Error in generateTree:', error);

    // Clean up temporary files if an error occurs
    cleanupUtils.safeDeleteFile(filePath);
    cleanupUtils.safeDeleteDirectory(extractPath);

    next(error);
  }
};

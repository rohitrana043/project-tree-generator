// controllers/uploadController.js - Improved file upload controller
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const treeGenerator = require('../services/treeGenerator');

// Generate tree structure from uploaded file
exports.generateTree = async (req, res, next) => {
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

    const filePath = req.file.path;
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
    const extractPath = path.resolve(
      process.env.EXTRACTED_DIR || path.join(__dirname, './tmp/extracted'),
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

    // Clean up temporary files
    try {
      console.log(`Cleaning up: Removing ${filePath}`);
      fs.unlinkSync(filePath);

      console.log(`Cleaning up: Removing ${extractPath}`);
      fs.rmSync(extractPath, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn('Warning: Error during cleanup:', cleanupError.message);
      // Continue despite cleanup errors
    }

    console.log('Sending response with tree structure');
    res.status(200).json({
      treeText,
      fileName,
    });
  } catch (error) {
    console.error('Error in generateTree:', error);

    // Clean up temporary files if an error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn(
          'Warning: Error cleaning up file after error:',
          cleanupError.message
        );
      }
    }

    next(error);
  }
};

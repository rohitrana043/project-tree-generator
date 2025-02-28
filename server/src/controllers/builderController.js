// controllers/builderController.js - Universal tree structure handler
const structureBuilder = require('../services/structureBuilder');
const treeGenerator = require('../services/treeGenerator');
const fs = require('fs');
const path = require('path');

// Generate empty structure from tree text
exports.generateStructure = async (req, res, next) => {
  let tempDir = null;
  let zipFilePath = null;

  try {
    const { treeText, projectName } = req.body;

    console.log(`Generate structure request for project: ${projectName}`);

    if (!treeText || !projectName) {
      return res
        .status(400)
        .json({ message: 'Tree text and project name are required' });
    }

    // Check if project name contains invalid characters
    if (/[<>:"|?*]/.test(projectName)) {
      return res.status(400).json({
        message: 'Project name contains invalid characters',
      });
    }

    // Set timeout for the request (5 minutes)
    req.setTimeout(300000);

    // Create temporary directory with unique name for this request
    tempDir = path.join(
      process.env.STRUCTURES_DIR || './tmp/structures',
      `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
    );

    // Ensure the directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    console.log(`Created temporary directory: ${tempDir}`);

    // Build structure and create zip file
    zipFilePath = await structureBuilder.buildStructure(
      treeText,
      projectName,
      tempDir
    );

    // Check if the zip file exists and has content
    if (!fs.existsSync(zipFilePath)) {
      throw new Error('Failed to create zip file');
    }

    const zipStats = fs.statSync(zipFilePath);
    if (zipStats.size === 0) {
      throw new Error('Generated zip file is empty');
    }

    // Log the build result
    console.log(
      `Structure built for project "${projectName}" at ${zipFilePath}, size: ${zipStats.size} bytes`
    );

    // Send zip file to client
    res.download(zipFilePath, `${projectName}.zip`, (err) => {
      if (err) {
        console.error('Error sending zip file:', err);
        // We can't send an error response here since headers have already been sent
      }

      // Clean up temporary files after download (with a delay to ensure download completes)
      setTimeout(() => {
        try {
          if (zipFilePath && fs.existsSync(zipFilePath)) {
            fs.unlinkSync(zipFilePath);
            console.log(`Deleted zip file: ${zipFilePath}`);
          }

          if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
            console.log(`Deleted temporary directory: ${tempDir}`);
          }
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
      }, 5000); // 5 second delay
    });
  } catch (error) {
    console.error('Error generating structure:', error);

    // Clean up in case of error
    try {
      if (zipFilePath && fs.existsSync(zipFilePath)) {
        fs.unlinkSync(zipFilePath);
      }

      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error('Error during error cleanup:', cleanupError);
    }

    // Send error response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Failed to generate project structure',
        error: error.message,
      });
    } else {
      // Log the error if headers have already been sent
      console.error('Error after headers sent:', error);
    }
  }
};

// Preview structure from tree text
exports.previewStructure = async (req, res, next) => {
  try {
    const { treeText } = req.body;

    if (!treeText) {
      return res.status(400).json({ message: 'Tree text is required' });
    }

    // Parse the tree text to validate structure
    try {
      const cleanedText = treeGenerator.cleanTreeText(treeText);
      const { rootName, tree } = treeGenerator.parseTreeText(cleanedText);

      // Calculate structure statistics
      const stats = calculateStructureStats(tree);

      res.status(200).json({
        rootName,
        stats: {
          totalFolders: stats.folderCount,
          totalFiles: stats.fileCount,
          depth: stats.maxDepth,
          breadth: stats.maxBreadth,
        },
      });
    } catch (parseError) {
      // If parsing fails, return approximate statistics
      return res.status(200).json({
        rootName: extractRootName(treeText),
        stats: {
          totalFolders: approximateFolderCount(treeText),
          totalFiles: approximateFileCount(treeText),
          depth: 2, // Simplified estimate
          breadth: Math.min(20, countLines(treeText) / 3), // Simplified estimate
        },
        approximated: true,
        message: parseError.message,
      });
    }
  } catch (error) {
    console.error('Error previewing structure:', error);
    if (!res.headersSent) {
      next(error);
    }
  }
};

// Helper functions for approximating structure stats
function extractRootName(treeText) {
  const lines = treeText.split('\n');
  // Try to find a line that looks like a root directory
  const rootLine = lines.find((line) => /^[^/\s]+\/\s*$/.test(line.trim()));

  if (rootLine) {
    const match = rootLine.match(/^([^/]+)/);
    if (match) return match[1];
  }

  // If no clear root found, make a best guess from first line
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    // Remove any trailing slash and return the name
    return firstLine.replace(/\/+$/, '');
  }

  return 'project'; // Default fallback
}

function countLines(treeText) {
  return treeText.split('\n').filter((line) => line.trim()).length;
}

function approximateFolderCount(treeText) {
  // Count lines that end with slash
  return treeText.split('\n').filter((line) => line.trim().endsWith('/'))
    .length;
}

function approximateFileCount(treeText) {
  // Count lines that don't end with slash minus the root line
  return treeText
    .split('\n')
    .filter((line) => line.trim() && !line.trim().endsWith('/')).length;
}

// Calculate structure statistics
function calculateStructureStats(tree) {
  let folderCount = 0;
  let fileCount = 0;
  let maxDepth = 0;
  let maxBreadth = 0;

  function traverseTree(node, depth = 0) {
    const entries = Object.entries(node);
    maxBreadth = Math.max(maxBreadth, entries.length);

    for (const [_, value] of entries) {
      if (value === null) {
        fileCount++;
      } else {
        folderCount++;
        traverseTree(value, depth + 1);
        maxDepth = Math.max(maxDepth, depth + 1);
      }
    }
  }

  traverseTree(tree);

  return {
    folderCount,
    fileCount,
    maxDepth,
    maxBreadth,
  };
}

// Validate tree structure
exports.validateStructure = async (req, res, next) => {
  try {
    const { treeText } = req.body;

    if (!treeText) {
      return res.status(400).json({ message: 'Tree text is required' });
    }

    try {
      // Try to extract root name using standard parsing
      const cleanedText = treeGenerator.cleanTreeText(treeText);
      const { rootName } = treeGenerator.parseTreeText(cleanedText);

      res.status(200).json({
        valid: true,
        message: `Valid tree structure found with root "${rootName}"`,
      });
    } catch (parseError) {
      // If standard parsing fails, check if we can at least find a root name
      const rootName = extractRootName(treeText);

      if (rootName && rootName !== 'project') {
        // We found something that looks like a root name
        res.status(200).json({
          valid: true,
          message: `Structure appears valid with root "${rootName}" (simplified validation)`,
          simplified: true,
        });
      } else {
        res.status(200).json({
          valid: false,
          message: parseError.message,
        });
      }
    }
  } catch (error) {
    console.error('Error validating structure:', error);
    if (!res.headersSent) {
      next(error);
    }
  }
};

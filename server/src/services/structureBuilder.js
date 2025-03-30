// services/structureBuilder.js - Simplistic approach that just works
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Build structure from tree text
exports.buildStructure = async (treeText, projectName, tempDir) => {
  const zipFilePath = path.join(tempDir, `${projectName}.zip`);
  const projectDir = path.join(tempDir, projectName);

  // Create project directory
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
  fs.mkdirSync(projectDir, { recursive: true });

  try {
    // Basic cleaning of the tree text
    const cleanedText = cleanTreeText(treeText);

    // Simplistic line-by-line processing
    simplifiedTreeProcessing(cleanedText, projectDir);
    listDirectoryContents(projectDir);

    // Create zip file
    await createZipFile(projectDir, zipFilePath);

    return zipFilePath;
  } catch (error) {
    // Clean up in case of error
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
    throw error;
  }
};

// Clean tree text - basic handling of markdown and comments
function cleanTreeText(treeText) {
  if (!treeText) return '';

  // Handle markdown code blocks
  if (treeText.includes('```')) {
    // Try to extract content from code blocks
    const codeBlockMatch = treeText.match(/```[\w]*\n([\s\S]*?)\n```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      treeText = codeBlockMatch[1];
    } else {
      // Just remove the code block markers
      treeText = treeText.replace(/^```[\w]*\n|\n```$/g, '');
    }
  }

  // Split into lines and filter out empty lines and comments
  const lines = treeText.split('\n').filter((line) => {
    const trimmedLine = line.trim();
    return trimmedLine && !trimmedLine.startsWith('#');
  });

  return lines.join('\n');
}

/**
 * Ultra-simplistic tree processing that ignores tree characters and just uses indentation
 * @param {string} treeText - Tree structure text
 * @param {string} rootDir - Root directory path
 */
function simplifiedTreeProcessing(treeText, rootDir) {
  const lines = treeText.split('\n').filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error('No valid lines found');
  }

  // Get just the root name (no slash, no tree chars)
  let rootName = '';
  const firstLine = lines[0].trim();
  if (firstLine.endsWith('/')) {
    rootName = firstLine.substring(0, firstLine.length - 1);
  } else {
    rootName = firstLine;
  }

  // Create the file structure by tracking indentation precisely
  const pathSegments = [];
  const indentLevels = {};

  // Process line by line (skip the root)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Count visual indentation (leading spaces, including tree chars)
    const indent = countLeadingSpaces(line);

    // Extract name (ultra aggressively remove all tree chars)
    let name = extractNameAggressively(line);
    const isDirectory = name.endsWith('/');

    if (isDirectory) {
      name = name.slice(0, -1);
    }

    // Skip empty names
    if (!name) continue;

    // Map indentation to level
    let level = 1; // Default to level 1 (direct child of root)

    // Find closest smaller indent level
    const indents = Object.keys(indentLevels)
      .map(Number)
      .sort((a, b) => b - a);
    for (const prevIndent of indents) {
      if (indent > prevIndent) {
        level = indentLevels[prevIndent] + 1;
        break;
      } else if (indent === prevIndent) {
        level = indentLevels[prevIndent];
        break;
      }
    }

    // Store this level
    indentLevels[indent] = level;

    // Adjust path segments array
    pathSegments.length = level; // Truncate to current level
    pathSegments[level - 1] = name;

    // Build full path without root name (it's already the base dir)
    const itemPath = path.join(rootDir, ...pathSegments);

    try {
      if (isDirectory) {
        // Create directory
        fs.mkdirSync(itemPath, { recursive: true });
      } else {
        // Create file - ensure parent dir exists
        const parentDir = path.dirname(itemPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(itemPath, '');
      }
    } catch (err) {
      console.warn(`Error creating item at ${itemPath}: ${err.message}`);
    }
  }
}

/**
 * Count leading whitespace and tree characters
 * @param {string} line - Line to analyze
 * @returns {number} - Number of leading characters
 */
function countLeadingSpaces(line) {
  let count = 0;
  while (count < line.length) {
    const char = line.charAt(count);
    if (
      char === ' ' ||
      char === '\t' ||
      char === '│' ||
      char === '├' ||
      char === '└' ||
      char === '─'
    ) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Ultra-aggressively extract name by removing all tree characters
 * @param {string} line - Line to extract name from
 * @returns {string} - Clean name
 */
function extractNameAggressively(line) {
  // Keep only alphanumeric, dots, dashes, underscores, and slashes
  const cleanLine = line.replace(/[│├└─\s]/g, '');

  // If line is now empty, try a more lenient approach
  if (!cleanLine) {
    // More lenient approach - just remove known tree chars
    return line.replace(/^[\s│├└─]*/, '').trim();
  }

  return cleanLine;
}

/**
 * Create zip file from directory
 * @param {string} sourceDir - Source directory path
 * @param {string} outputPath - Output zip file path
 * @returns {Promise} - Promise resolving to zip file path
 */
function createZipFile(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      resolve(outputPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Use false parameter to ensure files are at the root of the zip
    archive.directory(sourceDir, false);

    archive.finalize();
  });
}

/**
 * List directory contents recursively (for debugging)
 * @param {string} dir - Directory to list
 * @param {string} indent - Indentation for nested output
 */
function listDirectoryContents(dir, indent = '') {
  try {
    const items = fs.readdirSync(dir);

    items.forEach((item) => {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        listDirectoryContents(itemPath, `${indent}  `);
      } else {
        console.log(`${indent}${item}`);
      }
    });
  } catch (error) {
    console.error(`Error listing directory ${dir}:`, error);
  }
}

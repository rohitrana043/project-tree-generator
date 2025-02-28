// services/structureBuilder.js - Universal structure builder
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const treeGenerator = require('./treeGenerator');

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
    // Clean and parse the tree
    const cleanedText = treeGenerator.cleanTreeText(treeText);
    console.log('Tree text cleaned. Parsing structure...');

    // Parse tree and create files
    const { rootName, tree } = treeGenerator.parseTreeText(cleanedText);
    console.log(`Parsed tree structure with root "${rootName}"`);

    // Create the file structure based on the parsed tree
    createFilesFromTree(tree, projectDir);
    console.log('Created file structure in project directory');

    // Create zip file
    await createZipFile(projectDir, zipFilePath);
    console.log(`Created zip file at: ${zipFilePath}`);

    return zipFilePath;
  } catch (error) {
    console.error('Error building structure:', error);

    // Fall back to direct line-by-line processing if parsing fails
    try {
      console.log('Falling back to line-by-line processing...');
      processTreeLineByLine(treeText, projectDir);

      // Create zip file
      await createZipFile(projectDir, zipFilePath);
      console.log(`Created zip file with fallback method: ${zipFilePath}`);

      return zipFilePath;
    } catch (fallbackError) {
      console.error('Fallback processing failed:', fallbackError);

      // Clean up in case of error
      if (fs.existsSync(projectDir)) {
        fs.rmSync(projectDir, { recursive: true, force: true });
      }
      throw error; // Throw the original error
    }
  }
};

// Create files and directories recursively from the parsed tree
function createFilesFromTree(tree, baseDir) {
  for (const [name, value] of Object.entries(tree)) {
    // Skip completely if the name is empty or contains indentation characters
    if (!name || !name.trim() || /^[\s│|├└─]+$/.test(name)) {
      continue;
    }

    // Clean and sanitize the name
    const safeName = name.trim().replace(/[<>:"|?*]/g, '_');

    if (!safeName) continue; // Skip if empty after cleaning

    try {
      const itemPath = path.join(baseDir, safeName);

      if (value === null) {
        // This is a file
        // Ensure parent directory exists (for safety)
        const parentDir = path.dirname(itemPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(itemPath, '');
      } else {
        // This is a directory
        fs.mkdirSync(itemPath, { recursive: true });
        createFilesFromTree(value, itemPath);
      }
    } catch (error) {
      console.warn(`Error creating item "${name}":`, error.message);
      // Continue processing other items
    }
  }
}

// Fallback: process tree line by line (simpler, more tolerant approach)
function processTreeLineByLine(treeText, rootDir) {
  // Split into lines, filter empty lines
  const lines = treeText.split('\n').filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error('No valid lines found in tree structure');
  }

  // Create a map to store paths and their parent relationships
  const items = [];

  // Process each line to extract items
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Skip the root line (first line) - we've already created the root dir
    if (i === 0 && line.endsWith('/')) continue;

    // Check if this is a file/folder entry (starts with connector)
    if (!line.match(/^(├|└|─|\||>|-)/)) {
      // Not a clear file/folder line, try to extract any valid name
      const possibleName = line.replace(/[^\w\-.]/g, '_').trim();
      if (possibleName) {
        items.push({
          name: possibleName,
          isDirectory: false,
          level: 0, // Root level as fallback
        });
      }
      continue;
    }

    // Extract just the name part (after connectors and indentation)
    // This aggressive regex removes all connector characters and indentation
    let name = line.replace(/^[├└─\s│|\-\s>]+/, '').trim();

    // Check if this is a directory
    const isDirectory = name.endsWith('/');

    // Remove trailing slash for directory
    if (isDirectory) {
      name = name.slice(0, -1).trim();
    }

    // Skip if name is empty or contains only separators
    if (!name || /^[\s│|├└─]+$/.test(name)) {
      continue;
    }

    // Clean the name
    const safeName = name.replace(/[<>:"|?*]/g, '_').trim();
    if (!safeName) continue;

    // Count indentation level (very approximate)
    const indentLevel = (line.match(/[│|]/g) || []).length;

    // Store this item
    items.push({
      name: safeName,
      isDirectory,
      level: indentLevel,
    });
  }

  // Create the items (flat first, then try to organize)
  for (const item of items) {
    try {
      const itemPath = path.join(rootDir, item.name);

      if (item.isDirectory) {
        fs.mkdirSync(itemPath, { recursive: true });
      } else {
        // Ensure parent directory exists
        const parentDir = path.dirname(itemPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(itemPath, '');
      }
    } catch (error) {
      console.warn(`Error creating item "${item.name}":`, error.message);
      // Continue with next item
    }
  }

  // Try to organize items into common folders based on naming patterns
  organizeCommonFolders(rootDir);
}

// Organize files into common folders based on naming patterns
function organizeCommonFolders(rootDir) {
  // Get all files in the root directory
  const rootItems = fs.readdirSync(rootDir, { withFileTypes: true });
  const fileItems = rootItems.filter((item) => item.isFile());
  const folderItems = rootItems.filter((item) => item.isDirectory());

  // Common folder patterns to match
  const commonFolders = [
    'config',
    'controller',
    'service',
    'repository',
    'model',
    'dto',
    'java',
    'resources',
    'impl',
    'util',
    'entity',
    'exception',
  ];

  // For each folder, find files that might belong in it
  for (const folder of folderItems) {
    const folderName = folder.name.toLowerCase();

    // Skip if not a common folder
    if (!commonFolders.includes(folderName)) continue;

    // For each file, see if it should go in this folder
    for (const file of fileItems) {
      const fileName = file.name.toLowerCase();

      // If file name contains folder name or ends with it
      if (fileName.includes(folderName) || fileName.endsWith(folderName)) {
        try {
          // Move the file to the folder
          const sourcePath = path.join(rootDir, file.name);
          const targetPath = path.join(rootDir, folder.name, file.name);

          fs.writeFileSync(targetPath, fs.readFileSync(sourcePath));
          fs.unlinkSync(sourcePath);
        } catch (error) {
          console.warn(`Error moving file ${file.name}:`, error.message);
        }
      }
    }
  }
}

// Create zip file from directory
function createZipFile(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Compression level
    });

    output.on('close', () => {
      resolve(outputPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// services/treeGenerator.js - Fixed tree parser for better indentation
const path = require('path');
const fs = require('fs');

/**
 * Format tree structure as text with proper indentation and symbols
 * @param {string} rootName - The name of the root directory
 * @param {object} tree - The tree structure object
 * @returns {string} - Formatted tree text
 */
exports.formatTree = (rootName, tree) => {
  let result = `${rootName}/\n`;

  function formatNode(node, prefix = '') {
    const entries = Object.entries(node);

    entries.forEach(([key, value], index) => {
      const isLastItem = index === entries.length - 1;
      // Use └── for the last item, ├── for all others
      const connector = isLastItem ? '└── ' : '├── ';
      const line = `${prefix}${connector}${key}${value === null ? '' : '/'}\n`;
      result += line;

      if (value !== null) {
        // For the prefix of children:
        // - If this was the last item, use spaces (no vertical line)
        // - Otherwise, use a vertical line to connect to subsequent siblings
        const childPrefix = `${prefix}${isLastItem ? '    ' : '│   '}`;
        formatNode(value, childPrefix);
      }
    });
  }

  formatNode(tree);
  return result;
};

/**
 * Universal cleaner for tree text that handles multiple formats
 * @param {string} treeText - The tree text in any format
 * @returns {string} - Cleaned tree text
 */
exports.cleanTreeText = function (treeText) {
  // Handle null or undefined input
  if (!treeText) return '';

  let cleanedText = treeText;

  // Handle markdown code blocks
  if (cleanedText.includes('```')) {
    // Look for code blocks and extract content
    const codeBlockMatch = cleanedText.match(/```[\w]*\n([\s\S]*?)\n```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleanedText = codeBlockMatch[1];
    } else {
      // Just remove the code block markers
      cleanedText = cleanedText.replace(/```[\w]*\n|\n```$/g, '');
    }
  }

  // Split into lines
  const lines = cleanedText.split('\n');

  // Filter out empty lines and comments
  const filteredLines = lines
    .filter((line) => {
      const trimmedLine = line.trim();
      return trimmedLine && !trimmedLine.startsWith('#');
    })
    .map((line) => {
      // Remove any content after # symbol (comments)
      const hashIndex = line.indexOf('#');
      return hashIndex > -1 ? line.substring(0, hashIndex).trim() : line;
    });

  // Find the first line with a directory name (ends with /)
  let rootLineIndex = filteredLines.findIndex((line) =>
    /^[^/\s]+\/\s*$/.test(line.trim())
  );

  if (rootLineIndex === -1) {
    // No root directory found, try to find a line that looks like a root
    rootLineIndex = filteredLines.findIndex((line) =>
      /^[^/\s]+/.test(line.trim())
    );

    if (rootLineIndex >= 0) {
      // Add trailing slash if missing
      const rootLine = filteredLines[rootLineIndex].trim();
      if (!rootLine.endsWith('/')) {
        filteredLines[rootLineIndex] = rootLine + '/';
      }
    } else if (filteredLines.length > 0) {
      // Use the first line as root
      rootLineIndex = 0;
      filteredLines[0] = filteredLines[0].trim() + '/';
    } else {
      throw new Error('No valid content found in tree structure');
    }
  }

  // Extract all lines from the root directory onwards
  return filteredLines.slice(rootLineIndex).join('\n');
};

/**
 * Enhanced tree text parser that handles standard format
 * @param {string} treeText - The tree text to parse
 * @returns {object} - Parsed tree structure
 */
exports.parseTreeText = (treeText) => {
  const cleanedText = this.cleanTreeText(treeText);
  const lines = cleanedText.split('\n').filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error('No valid content found in tree structure');
  }

  // Extract root name
  const rootLine = lines[0].trim();
  const rootMatch = rootLine.match(/^([^/]+)\/\s*$/);

  if (!rootMatch) {
    throw new Error('Invalid tree format: Root directory not found');
  }

  const rootName = rootMatch[1].replace(/[│├└─\s]+/g, ''); // Clean root name
  const tree = {};

  // More flexible path tracking with state machine approach
  const pathStack = [{ node: tree, level: 0 }];

  // Process each line after the root
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Detect the indentation level more accurately
    let level = 0;
    let entryName = '';
    let isDirectory = false;

    // Calculate level by looking at indentation
    const indentMatch = line.match(/^((?:│\s{3}|\s{4}|│\s*)*)/);
    if (indentMatch) {
      level = Math.ceil(indentMatch[0].length / 4);
    }

    // Extract name, removing all connector characters
    entryName = line.replace(/^(?:│\s*)*(?:├──|└──|├─|└─|─|│)*\s*/, '').trim();

    // Check if it's a directory
    isDirectory = entryName.endsWith('/');
    if (isDirectory) {
      entryName = entryName.slice(0, -1); // Remove trailing slash
    }

    // Skip empty names or purely decorative lines
    if (!entryName || /^[│├└─\s]+$/.test(entryName)) continue;

    // Clean any special characters that aren't allowed in file/folder names
    entryName = entryName.replace(/[<>:"|?*\\]/g, '_');

    // Find the parent node based on level
    while (
      pathStack.length > 1 &&
      pathStack[pathStack.length - 1].level >= level
    ) {
      pathStack.pop();
    }

    const parent = pathStack[pathStack.length - 1].node;

    if (isDirectory) {
      // Create directory node
      parent[entryName] = {};
      // Push this directory onto the stack for its children
      pathStack.push({ node: parent[entryName], level: level });
    } else {
      // Create file (leaf) node
      parent[entryName] = null;
    }
  }

  return { rootName, tree };
};

/**
 * Generate tree structure from GitHub API response
 * @param {Array} repoContents - GitHub API contents
 * @param {string} rootName - Name for root directory
 * @returns {string} - Formatted tree text
 */
exports.generateTreeFromGithub = (repoContents, rootName) => {
  // Build a tree structure
  const tree = {};

  // Sort contents by path
  repoContents.sort((a, b) => a.path.localeCompare(b.path));

  // Build tree structure
  for (const item of repoContents) {
    const pathParts = item.path.split('/');
    let current = tree;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];

      if (i === pathParts.length - 1) {
        // This is the last part, add file or directory
        current[part] = item.type === 'dir' ? {} : null;
      } else {
        // This is a directory in the path
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
  }

  // Format tree structure as text
  return this.formatTree(rootName, tree);
};

/**
 * Generate tree structure from local directory
 * @param {string} dirPath - Directory path
 * @param {string} rootName - Name for root directory
 * @returns {string} - Formatted tree text
 */
exports.generateTreeFromDirectory = (dirPath, rootName) => {
  function scanDirectory(dir) {
    const result = {};
    const items = fs.readdirSync(dir, { withFileTypes: true });

    // Sort items: directories first, then files, all alphabetically
    items.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const item of items) {
      const itemPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        result[item.name] = scanDirectory(itemPath);
      } else {
        result[item.name] = null;
      }
    }

    return result;
  }

  const tree = scanDirectory(dirPath);
  return this.formatTree(rootName, tree);
};

// services/treeGenerator.js - Universal tree parser for multiple formats
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
      // Use └─ for the last item, ├─ for all others
      const connector = isLastItem ? '└─ ' : '├─ ';
      const line = `${prefix}${connector}${key}${value === null ? '' : '/'}\n`;
      result += line;

      if (value !== null) {
        // For the prefix of children:
        // - If this was the last item, use spaces (no vertical line)
        // - Otherwise, use a vertical line to connect to subsequent siblings
        const childPrefix = `${prefix}${isLastItem ? '   ' : '│  '}`;
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

  console.log(`filteredLines=${filteredLines}`);

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
 * Parse tree text into a structured object
 * Works with multiple tree formats
 * @param {string} treeText - The tree text to parse
 * @returns {object} - Parsed tree structure
 */
exports.parseTreeText = (treeText) => {
  const cleanedText = this.cleanTreeText(treeText);
  const lines = cleanedText.split('\n').filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error('No valid content found in tree structure');
  }

  // More robust root parsing
  const rootLine = lines[0].trim();
  const rootMatch = rootLine.match(/^([^/]+)\/\s*$/);

  if (!rootMatch) {
    throw new Error('Invalid tree format: Root directory not found');
  }

  const rootName = rootMatch[1];
  const tree = {};

  // Track path and depth more flexibly
  const pathAtLevel = [tree];
  const depthAtLevel = [0];

  // Process each line after the root
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) continue;

    // More flexible indentation calculation
    let indentLevel = 0;
    let j = 0;

    // Count indentation using a flexible approach
    while (j < line.length) {
      if (line[j] === ' ' || line[j] === '\t') {
        // Skip whitespace but don't count for level
        j++;
      } else if (line[j] === '│' || line[j] === '|') {
        // Vertical lines indicate hierarchy
        indentLevel++;
        j++;
      } else if (
        line.substring(j).match(/^(├[─\-]+|└[─\-]+|--|\|-|`-|\+\|──|\|─+)/)
      ) {
        // Found an item connector, we're done counting
        break;
      } else {
        // Some other character, probably part of the name
        break;
      }
    }

    // Extract the file/folder name with more flexible parsing
    let name = '';
    let isDirectory = false;

    // Skip connector characters to get to the name
    const connectorMatch = line
      .substring(j)
      .match(/^(?:├[─\-]+|└[─\-]+|--|\|-|`-|\+\|──|\|─+|[│|])[\s]*/);
    if (connectorMatch) {
      j += connectorMatch[0].length;
    }

    // The rest of the line is the name (possibly with a trailing slash)
    name = line.substring(j).trimEnd();

    // Check if this is a directory
    if (name.endsWith('/')) {
      isDirectory = true;
      name = name.slice(0, -1); // Remove trailing slash
    }

    // Clean up the name
    name = name.trim();

    // Skip if we have an empty name after all that
    if (!name) continue;

    // Adjust current position in the tree based on indent level
    while (
      depthAtLevel.length > 1 &&
      depthAtLevel[depthAtLevel.length - 1] >= indentLevel
    ) {
      pathAtLevel.pop();
      depthAtLevel.pop();
    }

    // Get the current parent node
    const parentNode = pathAtLevel[pathAtLevel.length - 1];

    if (isDirectory) {
      // Add directory and push it onto our path
      parentNode[name] = {};
      pathAtLevel.push(parentNode[name]);
      depthAtLevel.push(indentLevel);
    } else {
      // Add file
      parentNode[name] = null;
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

/**
 * Clean tree text by removing markdown delimiters and comments
 * @param {string} treeText - The raw tree text
 * @returns {string} - Cleaned tree text
 */
export const cleanTreeText = (treeText) => {
  if (!treeText) return '';

  // Check if this is likely a markdown file with code blocks
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
};

/**
 * Enhanced validation for tree structure with better format recognition
 * @param {string} treeText - Tree structure text
 * @returns {object} Validation result with isValid and errors
 */
export const validateTreeStructure = (treeText) => {
  if (!treeText || !treeText.trim()) {
    return {
      isValid: false,
      errors: ['Tree structure cannot be empty'],
    };
  }

  // Clean the tree text first
  const cleanedText = cleanTreeText(treeText);

  if (!cleanedText || !cleanedText.trim()) {
    return {
      isValid: false,
      errors: ['Tree structure contains only comments or markdown delimiters'],
    };
  }

  const lines = cleanedText.split('\n').filter((line) => line.trim());
  const errors = [];

  // Check if first line contains a root folder
  if (!lines[0] || !lines[0].trim().endsWith('/')) {
    errors.push('First line must be a root folder ending with "/"');
  }

  // Enhanced pattern matching for standard tree formats
  const rootPattern = /^([^/]+)\/\s*$/;
  const standardEntryPattern =
    /^(?:(?:│|┃|┆|┇|┊|┋|\|)\s*)*(?:├──|└──|├─|└─)\s+([^/\n]+)(\/)?\s*$/;
  const simplifiedEntryPattern =
    /^[\s│|]*(?:[-─]|\|—+|├─+|└─+)\s+([^/\n]+)(\/)?\s*$/;
  const fallbackEntryPattern = /^[\s│|]*([^│├└─\s][^/\n]+)(\/)?\s*$/;

  if (!rootPattern.test(lines[0].trim())) {
    errors.push('Root directory must be in the format "folder-name/"');
  }

  // Initialize tracking variables
  let previousIndentLevel = 0;
  const levels = [0]; // Track indentation levels in a stack

  // Skip first line (root) and check remaining lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Try to match against the patterns in order of preference
    let match =
      line.match(standardEntryPattern) ||
      line.match(simplifiedEntryPattern) ||
      line.match(fallbackEntryPattern);

    if (!match) {
      errors.push(`Line ${i + 1} has invalid format`);
      continue;
    }

    // Calculate indentation level - more reliable method
    let indentLevel = 0;
    const lineNoTrim = lines[i];

    // Count leading connectors/spaces to determine indent level
    // More reliable method: count vertical lines and spaces in groups of 4
    const leadingContent = lineNoTrim.substring(
      0,
      lineNoTrim.indexOf(match[1])
    );
    indentLevel = Math.floor(leadingContent.length / 4);

    // Verify indentation consistency
    if (indentLevel > previousIndentLevel + 1) {
      errors.push(
        `Line ${i + 1} has too deep indentation, expected at most ${
          previousIndentLevel + 1
        } levels but got ${indentLevel}`
      );
    }

    // Update for next iteration
    levels.push(indentLevel);
    previousIndentLevel = indentLevel;
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Normalize tree structure to a consistent format
 * @param {string} treeText - Tree structure text
 * @returns {string} Normalized tree structure
 */
export const normalizeTreeStructure = (treeText) => {
  // First clean the text to remove markdown delimiters and comments
  const cleanedText = cleanTreeText(treeText);

  // Split into lines and filter empty lines
  const lines = cleanedText.split('\n').filter((line) => line.trim());
  const normalized = [];

  // Process first line (root)
  const rootMatch = lines[0].match(/^([^/]+).*$/);
  if (rootMatch) {
    normalized.push(`${rootMatch[1]}/`);
  } else {
    normalized.push(lines[0]);
  }

  // Determine the current indentation pattern to consistently normalize
  let previousLevel = 0;
  const levelMap = {}; // Maps original level to normalized level

  // Process rest of the lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Calculate indentation level
    const leadingSpaces = line.match(/^(\s*)/)[1].length;
    const originalLevel = Math.floor(leadingSpaces / 2); // Original indentation unit

    // Map to normalized level
    if (!(originalLevel in levelMap)) {
      if (Object.keys(levelMap).length === 0) {
        levelMap[originalLevel] = 1; // First indentation level
      } else {
        // Find closest existing level
        const existingLevels = Object.keys(levelMap)
          .map(Number)
          .sort((a, b) => a - b);
        const closestLevel = existingLevels.reduce((prev, curr) => {
          return Math.abs(curr - originalLevel) < Math.abs(prev - originalLevel)
            ? curr
            : prev;
        }, existingLevels[0]);

        if (originalLevel > closestLevel) {
          levelMap[originalLevel] = levelMap[closestLevel] + 1;
        } else {
          levelMap[originalLevel] = Math.max(1, levelMap[closestLevel] - 1);
        }
      }
    }

    const normalizedLevel = levelMap[originalLevel];

    // Extract name and check if directory
    let name = line
      .trim()
      .replace(/^[│├└─\|\s]+/, '')
      .trim();
    const isDirectory = name.endsWith('/');

    if (isDirectory) {
      name = name.slice(0, -1); // Remove trailing slash
    }

    // Skip empty names
    if (!name) continue;

    // Generate normalized line
    let normalizedLine = '';
    for (let j = 0; j < normalizedLevel; j++) {
      if (j < normalizedLevel - 1) {
        normalizedLine += '│   ';
      } else {
        const isLast =
          i === lines.length - 1 ||
          Math.floor(lines[i + 1].match(/^(\s*)/)[1].length / 2) <=
            originalLevel;
        normalizedLine += isLast ? '└── ' : '├── ';
      }
    }

    normalizedLine += name + (isDirectory ? '/' : '');
    normalized.push(normalizedLine);

    previousLevel = originalLevel;
  }

  return normalized.join('\n');
};

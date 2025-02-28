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
 * Validate tree structure
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

  // More flexible regex to handle various connector symbols
  const indentPattern =
    /^(?:[│|][\s]*)*(?:├[─\-]+|└[─\-]+|--|\|-|`-|\+\|──|\|─+|[│|])[\s]*([^/\n]+)(\/)?\s*$/;
  const rootPattern = /^([^/]+)\/\s*$/;

  if (!rootPattern.test(lines[0].trim())) {
    errors.push('Root directory must be in the format "folder-name/"');
  }

  let previousLevel = 0;
  let hasMismatchedIndentation = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check line format with more flexible matching
    if (!indentPattern.test(line)) {
      errors.push(`Line ${i + 1} has invalid format`);
      continue;
    }

    // Calculate indentation level
    let depth = 0;
    let j = 0;

    // Count vertical lines and spaces for depth
    while (
      j < line.length &&
      (line[j] === ' ' || line[j] === '│' || line[j] === '|')
    ) {
      if (line[j] === '│' || line[j] === '|') {
        depth++;
      }
      j++;
    }

    // Additional depth for connectors
    if (
      line.includes('├') ||
      line.includes('└') ||
      line.includes('─') ||
      line.includes('-') ||
      line.includes('+|──') ||
      line.includes('|─')
    ) {
      depth++;
    }

    // Check that levels don't increase by more than 1
    if (depth > previousLevel + 1 && !hasMismatchedIndentation) {
      errors.push(`Line ${i + 1} has inconsistent indentation`);
      hasMismatchedIndentation = true; // Only report this once
    }

    previousLevel = depth;
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Normalize tree structure
 * @param {string} treeText - Tree structure text
 * @returns {string} Normalized tree structure
 */
export const normalizeTreeStructure = (treeText) => {
  // First clean the text to remove markdown delimiters and comments
  const cleanedText = cleanTreeText(treeText);

  // Split into lines and filter empty lines
  const lines = cleanedText.split('\n').filter((line) => line.trim());
  let normalized = [];

  // Process first line (root)
  const rootMatch = lines[0].match(/^([^/]+).*$/);
  if (rootMatch) {
    normalized.push(`${rootMatch[1]}/`);
  } else {
    normalized.push(lines[0]);
  }

  // Process rest of the lines
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];

    // Remove any extra whitespace or characters
    line = line.replace(/\s+$/, '');

    // Normalize different connector variations
    line = line.replace(/--/g, '─ ');
    line = line.replace(/\|-/g, '├─ ');
    line = line.replace(/`-/g, '└─ ');
    line = line.replace(/\+\|──/g, '├─ ');
    line = line.replace(/\|─+/g, '├─ ');

    // Replace multiple different dash/line characters with standard box-drawing
    line = line.replace(/[├└][-─\s]+/g, (match) => {
      const firstChar = match[0];
      return firstChar + '─ ';
    });

    normalized.push(line);
  }

  return normalized.join('\n');
};

import { Editor } from '@monaco-editor/react';
import React, { useRef, useState } from 'react';
import {
  FaCheckCircle,
  FaDownload,
  FaExclamationTriangle,
  FaInfoCircle,
  FaUpload,
} from 'react-icons/fa';
import SEO from '../components/common/SEO';
import AlertMessage from '../components/common/AlertMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { builderApi } from '../utils/api';
import { readTextFile } from '../utils/fileUtils';
import './GenerateStructurePage.css';

const GenerateStructurePage = () => {
  const [treeText, setTreeText] = useState('');
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isValid, setIsValid] = useState(true);
  const [validation, setValidation] = useState(null);
  const editorRef = useRef(null);
  const [showFormat, setShowFormat] = useState(false);

  const [cursorPosition, setCursorPosition] = useState(null);

  // Store editor instance and set up cursor position tracking
  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;

    // Set up cursor position change listener
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition(e.position);
    });
  };

  const handleEditorChange = (value) => {
    setTreeText(value);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];

    if (file) {
      try {
        const content = await readTextFile(file);
        setTreeText(content);

        // Try to extract project name from first non-comment line
        const lines = content.split('\n');
        let rootLine = '';

        // Skip comments and code block markers to find root directory line
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (
            trimmedLine &&
            !trimmedLine.startsWith('#') &&
            !trimmedLine.startsWith('```')
          ) {
            rootLine = trimmedLine;
            break;
          }
        }

        const match = rootLine.match(/^([^/]+)\//);
        if (match && match[1] && !projectName) {
          setProjectName(match[1]);
        }

        setNotification({
          type: 'success',
          message: `File "${file.name}" loaded successfully.`,
        });
      } catch (err) {
        setError(`Failed to read the file: ${err.message}`);
      }
    }
  };

  const validateTree = async () => {
    if (!treeText.trim()) {
      setValidation({
        valid: false,
        message: 'Tree structure cannot be empty',
      });
      setIsValid(false);
      return false;
    }

    try {
      const result = await builderApi.validateTree(treeText);
      setValidation(result);
      setIsValid(result.valid);
      return result.valid;
    } catch (err) {
      setValidation({
        valid: false,
        message: err.message,
      });
      setIsValid(false);
      return false;
    }
  };

  const handleValidationResult = (result) => {
    setIsValid(result.isValid);
  };

  const handleGenerateStructure = async () => {
    if (!treeText.trim()) {
      setError('Please provide a tree structure');
      return;
    }

    if (!projectName.trim()) {
      setError('Please provide a project name');
      return;
    }

    // Validate tree structure before generating
    const isTreeValid = await validateTree();
    if (!isTreeValid) {
      setError(
        'Please fix the validation errors before generating the structure'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the blob directly from the axios response
      const blob = await builderApi.generateStructure(treeText, projectName);

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${projectName}.zip`;

      // Append to the document and trigger download
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setNotification({
        type: 'success',
        message: `Project structure "${projectName}.zip" has been downloaded.`,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearNotification = () => {
    setNotification(null);
  };

  // Get current folder hierarchy based on cursor position
  const getCurrentFolder = () => {
    if (!editorRef.current) return null;

    const position = cursorPosition || editorRef.current.getPosition();
    const model = editorRef.current.getModel();
    if (!model || !position) return null;

    // Get line content at current position
    const lineContent = model.getLineContent(position.lineNumber);

    // Calculate current line's indentation level (counting by 4 spaces or │ characters)
    const currentLineRaw = lineContent;
    const currentIndentMatch = currentLineRaw.match(/^((?:│\s{3}|\s{4})*)/) || [
      '',
    ];
    const currentIndentLength = currentIndentMatch[0].length;
    const currentLevel = Math.floor(currentIndentLength / 4);

    // Folder path segments from root to current
    const folderPath = [];
    let rootFolder = null;

    // First, find the root folder (first line)
    if (model.getLineCount() > 0) {
      const firstLine = model.getLineContent(1).trim();
      if (firstLine.endsWith('/')) {
        // Clean the root folder name (remove any connector characters)
        rootFolder = firstLine.replace(/[│├└─]/g, '').trim();
        folderPath.push(rootFolder);
      }
    }

    // Extract clean name from a line (remove connectors and indentation)
    const extractCleanName = (line) => {
      return line
        .trim()
        .replace(/^(?:│\s*)*(?:├─+|└─+|─+)\s+/, '') // Remove connectors and indentation
        .trim();
    };

    // If current line is a folder, add it directly
    if (lineContent.trim().endsWith('/')) {
      // Extract just the folder name from the line
      const folderName = extractCleanName(lineContent);

      // Find all parent folders by traversing up
      const parentFolders = [];
      for (let i = position.lineNumber - 1; i > 0; i--) {
        const line = model.getLineContent(i);
        if (line.trim().endsWith('/')) {
          // Calculate this line's indent level
          const indentMatch = line.match(/^((?:│\s{3}|\s{4})*)/) || [''];
          const indentLength = indentMatch[0].length;
          const level = Math.floor(indentLength / 4);

          // If this is a parent level (less indented than the current)
          if (level < currentLevel) {
            // Extract clean folder name
            const parentName = extractCleanName(line);

            // Add at the beginning (we're going from current to root)
            parentFolders.unshift({
              name: parentName,
              level: level,
            });

            // If we've reached the root level, we're done
            if (level === 0) break;
          }
        }
      }

      // Build the full path array
      const pathArray = [rootFolder];
      parentFolders.forEach((folder) => {
        if (folder.name !== rootFolder) {
          pathArray.push(folder.name);
        }
      });
      if (!pathArray.includes(folderName)) {
        pathArray.push(folderName);
      }

      return {
        current: folderName,
        pathArray: pathArray,
        isFolder: true,
      };
    }

    // Otherwise, look for the nearest parent folder
    const parentFolders = [];
    let closestParent = null;

    for (let i = position.lineNumber - 1; i > 0; i--) {
      const line = model.getLineContent(i);
      if (line.trim().endsWith('/')) {
        // Calculate this line's indent level
        const indentMatch = line.match(/^((?:│\s{3}|\s{4})*)/) || [''];
        const indentLength = indentMatch[0].length;
        const level = Math.floor(indentLength / 4);

        // Extract clean folder name
        const folderName = extractCleanName(line);

        // If this is a parent level (less or equal to currentLevel)
        // We're in a file and folders are always one level up from their contents
        if (level <= currentLevel) {
          if (closestParent === null) {
            closestParent = {
              name: folderName,
              level: level,
            };
          }

          // Add parent to the path (at the beginning)
          parentFolders.unshift({
            name: folderName,
            level: level,
          });

          // If we've reached the root level, we're done
          if (level === 0) break;
        }
      }
    }

    if (closestParent) {
      // Extract the file name from the current line
      const fileName = extractCleanName(lineContent);

      const isFile = !fileName.endsWith('/');

      // Build the path array
      const pathArray = [rootFolder];
      parentFolders.forEach((folder) => {
        if (folder.name !== rootFolder) {
          pathArray.push(folder.name);
        }
      });

      if (isFile && fileName) {
        pathArray.push(fileName);
      }

      return {
        current: closestParent.name,
        pathArray: pathArray,
        file: isFile ? fileName : null,
        isFolder: false,
      };
    }

    return null;
  };

  const insertStandardFormatExample = () => {
    const standardFormat = `ecommerce-project/
├── client/
│   ├── public/
│   │   ├── images/
│   │   ├── favicon.ico
│   │   └── robots.txt
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── product/
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   └── auth/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── utils/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── README.md
├── server/
│   ├── config/
│   │   ├── db.js
│   │   └── env.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── cartController.js
│   │   └── orderController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Cart.js
│   │   └── Order.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── cart.js
│   │   └── orders.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── error.js
│   ├── utils/
│   ├── services/
│   │   ├── paymentService.js
│   │   └── emailService.js
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   └── README.md
├── shared/
│   ├── constants/
│   ├── types/
│   └── utils/
├── docs/
│   ├── api/
│   └── deployment/
├── scripts/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .github/
│   └── workflows/
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── README.md
├── package.json
└── .env.example`;

    if (projectName) {
      // Replace example project name with the entered project name
      const updatedFormat = standardFormat.replace(
        /^ecommerce-project/,
        projectName
      );
      setTreeText(updatedFormat);
    } else {
      setTreeText(standardFormat);
      setProjectName('ecommerce-project');
    }
  };

  return (
    <div className="generate-structure-container">
      <SEO
        title="Build Empty Project Structures"
        description="Create empty project structures from tree files. Generate folder structures for new projects quickly based on a predefined tree structure."
        keywords="project scaffolding, folder structure generator, project structure builder, code skeleton generator, empty project template"
        canonical="/generate-structure"
      />

      <h1>Generate Empty Project Structure</h1>

      {notification && (
        <AlertMessage
          type={notification.type}
          message={notification.message}
          onClose={clearNotification}
        />
      )}

      <div className="input-section">
        <div className="form-group">
          <label htmlFor="project-name">Project Name</label>
          <input
            type="text"
            id="project-name"
            placeholder="my-project"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
            aria-required="true"
            aria-invalid={!projectName.trim()}
          />
        </div>

        <div className="tree-input-actions">
          <div className="action-buttons-left">
            <label className="upload-btn">
              <FaUpload />
              Upload Tree File
              <input
                type="file"
                accept=".txt,.md"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                aria-label="Upload tree structure file"
              />
            </label>
            <button
              className="btn-secondary format-btn"
              onClick={() => setShowFormat(!showFormat)}
              aria-expanded={showFormat}
            >
              <FaInfoCircle />
              {showFormat ? 'Hide Format Guide' : 'Show Format Guide'}
            </button>
            <button
              className="btn-secondary example-btn"
              onClick={insertStandardFormatExample}
            >
              Insert Example Structure
            </button>
          </div>

          <button
            className="btn-primary"
            onClick={handleGenerateStructure}
            disabled={loading || !treeText.trim() || !projectName.trim()}
            aria-disabled={loading || !treeText.trim() || !projectName.trim()}
          >
            <FaDownload />
            Generate & Download
          </button>
        </div>

        {error && (
          <div className="error-message" aria-live="assertive">
            {error}
          </div>
        )}

        {validation && (
          <div
            className={`validation-result ${
              validation.valid ? 'valid' : 'invalid'
            }`}
            aria-live="polite"
          >
            {validation.valid ? (
              <FaCheckCircle className="icon-success" aria-hidden="true" />
            ) : (
              <FaExclamationTriangle
                className="icon-warning"
                aria-hidden="true"
              />
            )}
            <span>{validation.message}</span>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner text="Generating project structure..." />
      ) : (
        <div className="editor-container">
          <h2>Tree Structure</h2>
          <div className="markdown-note">
            <FaInfoCircle aria-hidden="true" />
            <span>
              Use the standardized format with folder names ending in "/" and
              files without trailing slash. The tree structure follows
              indentation where each level is properly nested under its parent.
            </span>
          </div>

          {showFormat && (
            <div className="format-guide">
              <h3>Standardized Format Guide</h3>
              <p>For maximum reliability, follow these format rules:</p>
              <ul>
                <li>
                  First line should be your root project name with trailing
                  slash (e.g., "my-project/")
                </li>
                <li>Use "├──" for items that have siblings below them</li>
                <li>Use "└──" for the last item in a directory</li>
                <li>Use "│ " for vertical lines connecting items</li>
                <li>
                  Each indentation level should be 4 spaces (or │ followed by 3
                  spaces)
                </li>
                <li>Directory names should end with "/" (e.g., "src/")</li>
                <li>
                  File names should not have trailing slash (e.g., "index.js")
                </li>
                <li>
                  <strong>Important:</strong> Don't worry if your tree structure
                  uses different symbols - our generator will handle it!
                </li>
              </ul>
              <p className="format-example">
                Example:
                <br />
                <code>
                  project-name/
                  <br />
                  ├── src/
                  <br />
                  │ ├── components/
                  <br />
                  │ └── index.js
                  <br />
                  └── package.json
                </code>
              </p>
            </div>
          )}

          <div className="editor-wrapper">
            {getCurrentFolder() && (
              <div className="current-folder" aria-live="polite">
                <span className="folder-icon" aria-hidden="true">
                  {getCurrentFolder().isFolder ? '📁' : '📄'}
                </span>
                <span className="folder-path">
                  {getCurrentFolder().pathArray.length > 3 ? (
                    <>
                      {/* Always show root */}
                      <span className="folder-breadcrumb">
                        {getCurrentFolder().pathArray[0]}
                      </span>
                      <span className="separator">›</span>
                      {/* Show ellipsis for intermediate folders */}
                      <span className="folder-breadcrumb ellipsis">...</span>
                      <span className="separator">›</span>
                      {/* Show last two folders/file */}
                      {getCurrentFolder()
                        .pathArray.slice(-2)
                        .map((part, index, array) => (
                          <React.Fragment key={index}>
                            <span className="folder-breadcrumb">{part}</span>
                            {index < array.length - 1 && (
                              <span className="separator">›</span>
                            )}
                          </React.Fragment>
                        ))}
                    </>
                  ) : (
                    // Show full path if 3 or fewer segments
                    getCurrentFolder().pathArray.map((part, index, array) => (
                      <React.Fragment key={index}>
                        <span className="folder-breadcrumb">{part}</span>
                        {index < array.length - 1 && (
                          <span className="separator">›</span>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </span>
              </div>
            )}

            <Editor
              height="400px"
              defaultLanguage="plaintext"
              value={treeText}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                renderWhitespace: 'boundary',
                rulers: [],
                folding: true,
                padding: { top: 40 }, // Add padding at the top for the folder indicator
                fixedOverflowWidgets: true, // Keep overflow widgets (like the folder path) in the editor
              }}
              aria-label="Tree structure editor"
            />
          </div>

          <div className="editor-help">
            <h3>Format Examples:</h3>
            <p>Our generator now handles multiple tree formats:</p>
            <pre className="tree-example">
              {`# Standard format
project-name/
├── src/
│   ├── components/
│   │   ├── Header.js
│   │   └── Footer.js
│   ├── pages/
│   │   ├── Home.js
│   │   └── About.js
│   └── index.js
├── public/
│   ├── images/
│   │   └── logo.png
│   └── index.html
└── package.json`}
            </pre>
            <pre className="tree-example">
              {`# Simplified format (works too!)
project-name/
  src/
    components/
      Header.js
      Footer.js
    pages/
      Home.js
      About.js
    index.js
  public/
    images/
      logo.png
    index.html
  package.json`}
            </pre>
            <p className="format-note">
              Tree formats with different connectors or simplified indentation
              all work now!
            </p>
          </div>
        </div>
      )}

      <div className="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-item">
          <h3>Why wasn't my project structure generating correctly?</h3>
          <p>
            We've completely redesigned our structure generator to handle all
            types of tree formats reliably. The new system focuses on
            indentation and folder/file names rather than the specific tree
            visualization characters. This means it will work with standard tree
            formats, manual indentation, or even trees generated by different
            tools.
          </p>
        </div>
        <div className="faq-item">
          <h3>How do I format the tree structure correctly?</h3>
          <p>
            Your tree structure should start with a root folder name followed by
            a slash (e.g., "my-project/"). Indent child items consistently -
            each level of indentation represents nesting. Directories should
            have a trailing slash, files should not. The tool will automatically
            handle tree visualization characters (├, └, │, ─) so you don't need
            to worry about using the exact symbols.
          </p>
        </div>
        <div className="faq-item">
          <h3>Can I import tree structures from other tools?</h3>
          <p>
            Yes! Our improved generator now handles tree structures from various
            sources including Unix <code>tree</code> command output, GitHub
            project trees, and manually created structures. The focus is on
            consistent indentation rather than specific tree symbols. The
            "Insert Example Structure" button provides a reliable template to
            start with.
          </p>
        </div>
      </div>

      {/* Schema.org structured data */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Project Structure Generator',
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Web',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          description:
            'Create empty project structures from tree files. Generate folder structures for new projects.',
        })}
      </script>
    </div>
  );
};

export default GenerateStructurePage;

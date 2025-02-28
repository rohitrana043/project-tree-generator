// pages/GenerateStructurePage.jsx - Updated with markdown support
import { Editor } from '@monaco-editor/react';
import React, { useRef, useState } from 'react';
import {
  FaCheckCircle,
  FaDownload,
  FaExclamationTriangle,
  FaInfoCircle,
  FaUpload,
} from 'react-icons/fa';
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

  // Store editor instance
  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
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

  // Get current folder indicator based on cursor position
  const getCurrentFolder = () => {
    if (!editorRef.current) return null;

    const position = editorRef.current.getPosition();
    const model = editorRef.current.getModel();
    if (!model) return null;

    // Get line content at current position
    const lineContent = model.getLineContent(position.lineNumber);

    // Check if this is a folder line
    if (lineContent.trim().endsWith('/')) {
      return lineContent.trim();
    }

    // Otherwise, look for the nearest parent folder
    for (let i = position.lineNumber - 1; i > 0; i--) {
      const line = model.getLineContent(i);
      if (line.trim().endsWith('/')) {
        // Calculate indentation level
        const currentIndent = (lineContent.match(/^((?:│  |   )*)/) || [''])[0]
          .length;
        const folderIndent = (line.match(/^((?:│  |   )*)/) || [''])[0].length;

        // Only return if this folder is a parent (less indented)
        if (folderIndent < currentIndent) {
          return line.trim();
        }
      }
    }

    return null;
  };

  return (
    <div className="generate-structure-container">
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
          />
        </div>

        <div className="tree-input-actions">
          <label className="upload-btn">
            <FaUpload />
            Upload Tree File
            <input
              type="file"
              accept=".txt,.md"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>

          <button
            className="btn-primary"
            onClick={handleGenerateStructure}
            disabled={loading || !treeText.trim() || !projectName.trim()}
          >
            <FaDownload />
            Generate & Download
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {validation && (
          <div
            className={`validation-result ${
              validation.valid ? 'valid' : 'invalid'
            }`}
          >
            {validation.valid ? (
              <FaCheckCircle className="icon-success" />
            ) : (
              <FaExclamationTriangle className="icon-warning" />
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
            <FaInfoCircle />
            <span>
              You can paste tree structures from markdown documents. Comments
              (lines starting with #) and code blocks (```) will be
              automatically handled.
            </span>
          </div>

          <div className="editor-wrapper">
            {getCurrentFolder() && (
              <div className="current-folder">
                <span className="folder-icon">📁</span>
                {getCurrentFolder()}
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
              }}
            />
          </div>

          <div className="editor-help">
            <h3>Format Example:</h3>
            <pre>
              {`# Project structure with comments
\`\`\`
project-name/
├─ folder1/
│  ├─ file1.js
│  └─ file2.js
├─ folder2/
│  ├─ subfolder/
│  │  └─ file3.js
│  └─ file4.js
└─ README.md
\`\`\`
The tree can be enclosed in code blocks and include comments.`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerateStructurePage;

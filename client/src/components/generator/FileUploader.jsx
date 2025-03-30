import React, { useRef, useState } from 'react';
import { FaUpload } from 'react-icons/fa';
import './FileUploader.css';

const FileUploader = ({ onUpload }) => {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    setError(null);

    // Check file type (zip, folder, etc.)
    const validTypes = [
      'application/zip',
      'application/x-zip-compressed',
      'multipart/x-zip',
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.zip')) {
      setError('Please upload a zip file');
      return;
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50MB limit');
      return;
    }

    setFile(file);
  };

  const handleUpload = () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    onUpload(file);
  };

  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="file-uploader-container">
      <div
        className={`drop-zone ${dragging ? 'dragging' : ''} ${
          file ? 'has-file' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".zip"
          className="file-input"
        />

        <div className="drop-zone-content">
          <FaUpload className="upload-icon" />

          {file ? (
            <div className="file-info">
              <span className="file-name">{file.name}</span>
              <span className="file-size">
                ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
          ) : (
            <>
              <p>Drag & drop your ZIP file here</p>
              <p>or</p>
              <button
                type="button"
                className="browse-btn"
                onClick={handleBrowseClick}
              >
                Browse Files
              </button>
              <p className="file-requirements">
                Maximum file size: 50MB
                <br />
                Supported format: ZIP
              </p>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {file && (
        <div className="upload-actions">
          <button className="btn-secondary" onClick={() => setFile(null)}>
            Clear
          </button>
          <button className="btn-primary" onClick={handleUpload}>
            Generate Tree
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;

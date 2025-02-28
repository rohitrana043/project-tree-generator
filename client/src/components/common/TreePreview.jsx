import React, { useState } from 'react';
import { FaCopy, FaDownload } from 'react-icons/fa';
import { saveAs } from 'file-saver';
import './TreePreview.css';

const TreePreview = ({ treeText }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(treeText);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([treeText], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'project-tree.txt');
  };

  return (
    <div className="tree-preview-container">
      <div className="tree-preview-actions">
        <button className="action-btn" onClick={handleCopy}>
          <FaCopy />
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button className="action-btn" onClick={handleDownload}>
          <FaDownload />
          Download
        </button>
      </div>

      <div className="tree-content">
        <pre>{treeText}</pre>
      </div>
    </div>
  );
};

export default TreePreview;

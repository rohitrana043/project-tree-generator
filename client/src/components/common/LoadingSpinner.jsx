import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ text = 'Loading...' }) => {
  return (
    <div className="loading-spinner-container">
      <div className="spinner"></div>
      <p className="loading-text">{text}</p>
    </div>
  );
};

export default LoadingSpinner;

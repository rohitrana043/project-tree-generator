import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaSearch } from 'react-icons/fa';
import './NotFoundPage.css';

const NotFoundPage = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>
          The page you are looking for might have been removed, had its name
          changed, or is temporarily unavailable.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn-primary">
            <FaHome /> Back to Home
          </Link>
          <Link to="/generate-tree" className="btn-secondary">
            <FaSearch /> Generate Project Tree
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;

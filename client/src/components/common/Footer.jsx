import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-links">
          <Link to="/" className="footer-link">
            Home
          </Link>
          <Link to="/generate-tree" className="footer-link">
            Generate Tree
          </Link>
          <Link to="/generate-structure" className="footer-link">
            Build Structure
          </Link>
          <a
            href="https://github.com/rohitrana043/project-tree-generator"
            className="footer-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>

        <div className="footer-copyright">
          &copy; {currentYear} Project Tree Generator. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;

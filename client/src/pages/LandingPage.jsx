import React from 'react';
import { Link } from 'react-router-dom';
import { FaGithub, FaFolderOpen, FaFileCode } from 'react-icons/fa';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-container">
      <h1>Project Tree Generator & Structure Builder</h1>
      <p className="description">
        Generate project tree structures from GitHub repositories or folder
        uploads, and create empty project structures from tree files.
      </p>

      <div className="feature-cards">
        <Link to="/generate-tree" className="feature-card">
          <div className="card-icon">
            <FaGithub />
            <FaFolderOpen />
          </div>
          <h2>Generate Project Tree</h2>
          <p>
            Create a project tree structure from a GitHub repository or by
            uploading a folder/zip file.
          </p>
          <button className="btn-primary">Get Started</button>
        </Link>

        <Link to="/generate-structure" className="feature-card">
          <div className="card-icon">
            <FaFileCode />
          </div>
          <h2>Build Project Structure</h2>
          <p>Generate an empty project structure from a tree text file.</p>
          <button className="btn-primary">Get Started</button>
        </Link>
      </div>

      <div className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <p>
              Choose to generate a tree structure or build a project structure
            </p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <p>
              Provide a GitHub URL or upload a folder/zip file for tree
              generation
            </p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <p>Edit the tree structure if needed (for structure building)</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <p>Download your tree text file or empty project structure zip</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

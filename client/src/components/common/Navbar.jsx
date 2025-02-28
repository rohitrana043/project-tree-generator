import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FaCode, FaGithub } from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <FaCode />
          <span>Project Tree Generator</span>
        </Link>

        <ul className="navbar-menu">
          <li className="navbar-item">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? 'navbar-link active' : 'navbar-link'
              }
              end
            >
              Home
            </NavLink>
          </li>
          <li className="navbar-item">
            <NavLink
              to="/generate-tree"
              className={({ isActive }) =>
                isActive ? 'navbar-link active' : 'navbar-link'
              }
            >
              Generate Tree
            </NavLink>
          </li>
          <li className="navbar-item">
            <NavLink
              to="/generate-structure"
              className={({ isActive }) =>
                isActive ? 'navbar-link active' : 'navbar-link'
              }
            >
              Build Structure
            </NavLink>
          </li>
          <li className="navbar-item">
            <a
              href="https://github.com/rohitrana043/project-tree-generator"
              className="navbar-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaGithub />
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

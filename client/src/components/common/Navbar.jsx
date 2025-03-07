import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FaCode, FaGithub, FaBars, FaTimes } from 'react-icons/fa';
import { TbWorldWww } from 'react-icons/tb';
import './Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <FaCode />
          <span>Project Tree Generator</span>
        </Link>

        <div className="menu-icon" onClick={toggleMenu}>
          {isOpen ? <FaTimes /> : <FaBars />}
        </div>

        <ul className={isOpen ? 'navbar-menu active' : 'navbar-menu'}>
          <li className="navbar-item">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? 'navbar-link active' : 'navbar-link'
              }
              end
              onClick={closeMenu}
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
              onClick={closeMenu}
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
              onClick={closeMenu}
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
              onClick={closeMenu}
            >
              <FaGithub />
            </a>
          </li>
          <li className="navbar-item">
            <a
              href="https://rohitrana.dev"
              className="navbar-link"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
            >
              <TbWorldWww />
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

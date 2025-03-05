import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import LandingPage from './pages/LandingPage';
import GenerateTreePage from './pages/GenerateTreePage';
import GenerateStructurePage from './pages/GenerateStructurePage';
import NotFoundPage from './components/common/NotFoundPage';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import './App.css';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/generate-tree" element={<GenerateTreePage />} />
              <Route
                path="/generate-structure"
                element={<GenerateStructurePage />}
              />
              {/* Add a catch-all route for pages that don't exist */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </HelmetProvider>
  );
}

export default App;

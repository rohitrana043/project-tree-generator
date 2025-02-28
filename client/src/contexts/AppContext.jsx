import React, { createContext, useContext, useState } from 'react';

// Create context
export const AppContext = createContext();

// Custom hook for using the context
export const useAppContext = () => useContext(AppContext);

// Context provider component
export const AppProvider = ({ children }) => {
  const [treeText, setTreeText] = useState('');
  const [recentGenerations, setRecentGenerations] = useState([]);
  const [notification, setNotification] = useState(null);

  // Add to recent generations
  const addRecentGeneration = (name, text, type) => {
    const newGeneration = {
      id: Date.now(),
      name,
      text,
      type,
      timestamp: new Date().toISOString(),
    };

    setRecentGenerations((prev) => [newGeneration, ...prev].slice(0, 5));
  };

  // Set notification
  const showNotification = (message, type = 'info', duration = 5000) => {
    setNotification({ message, type, duration });

    if (duration > 0) {
      setTimeout(() => {
        setNotification(null);
      }, duration);
    }
  };

  // Clear notification
  const clearNotification = () => {
    setNotification(null);
  };

  // Context value
  const contextValue = {
    treeText,
    setTreeText,
    recentGenerations,
    addRecentGeneration,
    notification,
    showNotification,
    clearNotification,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

export default AppProvider;

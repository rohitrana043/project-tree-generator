import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';
// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// GitHub API utilities
export const githubApi = {
  getBranches: async (owner, repo) => {
    try {
      const response = await api.get(
        `/github/branches?owner=${owner}&repo=${repo}`
      );

      // Process response to ensure we return a consistent array format
      let branchesArray = [];
      const data = response.data;

      if (Array.isArray(data)) {
        branchesArray = data;
      } else if (data && data.branches && Array.isArray(data.branches)) {
        branchesArray = data.branches;
      } else if (data && typeof data === 'object') {
        // Try to extract branches data from object
        branchesArray = Object.values(data).filter(
          (item) => item && typeof item === 'object' && 'name' in item
        );
      }

      return branchesArray;
    } catch (error) {
      console.error('API error fetching branches:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch branches'
      );
    }
  },

  generateTree: async (url, branch, path) => {
    try {
      const response = await api.post('/github/tree', { url, branch, path });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to generate tree'
      );
    }
  },
};

// Upload API utilities
export const uploadApi = {
  uploadFile: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_URL}/upload/tree`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to upload file');
    }
  },
};

// Builder API utilities
export const builderApi = {
  generateStructure: async (treeText, projectName) => {
    try {
      const response = await api.post(
        '/builder/generate',
        { treeText, projectName },
        { responseType: 'blob' }
      );

      return response.data;
    } catch (error) {
      throw new Error('Failed to generate project structure');
    }
  },
  validateTree: async (treeText) => {
    try {
      const response = await api.post('/builder/validate', { treeText });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to validate tree structure'
      );
    }
  },
};

export default api;

import React, { useEffect, useState } from 'react';
import { githubApi } from '../../utils/api';
import './GithubForm.css';

const GithubForm = ({ onSubmit }) => {
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [path, setPath] = useState('');
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [error, setError] = useState(null);

  const extractRepoInfo = (url) => {
    // Extract owner and repo from GitHub URL
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    return match
      ? { owner: match[1], repo: match[2].replace('.git', '') }
      : null;
  };

  useEffect(() => {
    const fetchBranches = async () => {
      if (!url) return;

      const repoInfo = extractRepoInfo(url);
      if (!repoInfo) return;

      setLoadingBranches(true);
      setError(null);

      try {
        const response = await githubApi.getBranches(
          repoInfo.owner,
          repoInfo.repo
        );

        // Check what structure the API is actually returning
        console.log('Branches response:', response);

        // Handle different possible response structures
        let branchesArray = [];
        if (Array.isArray(response)) {
          branchesArray = response;
        } else if (response.branches && Array.isArray(response.branches)) {
          branchesArray = response.branches;
        } else if (typeof response === 'object') {
          // Try to extract branches data from object
          branchesArray = Object.values(response).filter(
            (item) => item && typeof item === 'object' && 'name' in item
          );
        }

        setBranches(branchesArray);

        // Set default branch if available
        if (branchesArray.length > 0) {
          const defaultBranch =
            branchesArray.find((b) => b.isDefault) || branchesArray[0];
          setBranch(defaultBranch.name);
        }
      } catch (err) {
        console.error('Error fetching branches:', err);
        setError(err.message);
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
  }, [url]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!url) {
      setError('GitHub URL is required');
      return;
    }

    if (!branch) {
      setError('Branch is required');
      return;
    }

    onSubmit({ url, branch, path });
  };

  return (
    <div className="github-form-container">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="github-url">GitHub Repository URL</label>
          <input
            type="text"
            id="github-url"
            placeholder="https://github.com/username/repository"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="branch">Branch</label>
          <select
            id="branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            disabled={loadingBranches || branches.length === 0}
            required
          >
            {loadingBranches ? (
              <option>Loading branches...</option>
            ) : branches.length === 0 ? (
              <option>Enter a valid GitHub URL first</option>
            ) : (
              branches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name} {branch.isDefault ? '(default)' : ''}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="path">Subfolder Path (optional)</label>
          <input
            type="text"
            id="path"
            placeholder="e.g., src/components"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
          <small>Leave empty to generate tree for the entire repository</small>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          type="submit"
          className="btn-primary"
          disabled={loadingBranches}
        >
          Generate Tree
        </button>
      </form>
    </div>
  );
};

export default GithubForm;

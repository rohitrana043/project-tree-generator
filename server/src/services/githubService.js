const { Octokit } = require('@octokit/rest');
// Create Octokit instance with token if available
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || '',
  request: {
    retries: 3,
    retryAfter: 5,
  },
});

// Get branches for a repository
exports.getBranches = async (owner, repo) => {
  try {
    const response = await octokit.repos.listBranches({
      owner,
      repo,
    });

    // Get default branch
    const repoInfo = await octokit.repos.get({
      owner,
      repo,
    });

    const defaultBranch = repoInfo.data.default_branch;

    // Map branches and mark default
    return response.data.map((branch) => ({
      name: branch.name,
      isDefault: branch.name === defaultBranch,
    }));
  } catch (error) {
    console.error('Error fetching branches:', error);
    // Check for rate limit
    if (
      error.status === 403 &&
      error.response?.data?.message?.includes('API rate limit exceeded')
    ) {
      throw new Error(
        'GitHub API rate limit exceeded. Please provide a GitHub token in the .env file.'
      );
    }
    throw new Error('Failed to fetch repository branches');
  }
};

// Get repository contents recursively
exports.getRepositoryContents = async (owner, repo, branch, path = '') => {
  try {
    // Check if we're using a token
    const hasToken = !!process.env.GITHUB_TOKEN;

    // Alternative approach: use the Git Tree API to fetch the entire tree in one request
    // This is more efficient than recursive fetching for large repositories
    const treeResponse = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: 1,
    });

    if (treeResponse.data.truncated) {
      console.warn(
        'Warning: Repository tree is too large and was truncated by GitHub API'
      );
    }

    // Filter by path if specified
    let items = treeResponse.data.tree;
    if (path) {
      // Only include items that start with the specified path
      items = items.filter(
        (item) => item.path.startsWith(`${path}/`) || item.path === path
      );

      // Adjust paths to be relative to the specified path
      if (path !== '') {
        const pathPrefix = `${path}/`;
        items = items.map((item) => {
          if (item.path.startsWith(pathPrefix)) {
            return {
              ...item,
              originalPath: item.path,
              path: item.path.substring(pathPrefix.length),
            };
          }
          return item;
        });
      }
    }

    // Transform to a format similar to the contents API
    return items.map((item) => ({
      name: item.path.split('/').pop(),
      path: item.path,
      type: item.type === 'blob' ? 'file' : 'dir',
      size: item.size || 0,
    }));
  } catch (error) {
    console.error(`Error fetching repository tree:`, error);

    // Handle specific errors
    if (
      error.status === 403 &&
      error.response?.data?.message?.includes('API rate limit exceeded')
    ) {
      throw new Error(
        'GitHub API rate limit exceeded. Please add a GitHub token to the .env file.\n' +
          'Instructions: Create a token at https://github.com/settings/tokens and add it to .env as GITHUB_TOKEN=your_token'
      );
    } else if (error.status === 404) {
      throw new Error(
        'Repository or branch not found. Please check the URL and branch name.'
      );
    }

    throw new Error(`Failed to fetch repository contents: ${error.message}`);
  }
};

// Format the repository contents into a tree structure
exports.formatRepositoryTree = (contents, rootName) => {
  // Build a nested tree structure
  const tree = {};

  // Sort contents by path to ensure proper hierarchical order
  contents.sort((a, b) => a.path.localeCompare(b.path));

  // Process each item and build the tree
  contents.forEach((item) => {
    const pathParts = item.path.split('/');
    let current = tree;

    // Create directory structure
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    // Add the last part (file or empty dir)
    const lastPart = pathParts[pathParts.length - 1];
    current[lastPart] = item.type === 'dir' ? {} : null;
  });

  return tree;
};

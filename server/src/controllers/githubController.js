// controllers/githubController.js - Updated GitHub operations controller
const githubService = require('../services/githubService');
const treeGenerator = require('../services/treeGenerator');

// Get branches for a GitHub repository
exports.getBranches = async (req, res, next) => {
  try {
    const { owner, repo } = req.query;

    if (!owner || !repo) {
      return res
        .status(400)
        .json({ message: 'Owner and repo parameters are required' });
    }

    const branches = await githubService.getBranches(owner, repo);
    res.status(200).json({ branches });
  } catch (error) {
    console.error('Error in getBranches:', error);

    // Handle rate limit error specifically
    if (error.message.includes('API rate limit exceeded')) {
      return res.status(429).json({
        message:
          'GitHub API rate limit exceeded. Please try again later or add a GitHub token.',
        documentation:
          'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting',
      });
    }

    next(error);
  }
};

// Generate tree structure from GitHub repository
exports.generateTree = async (req, res, next) => {
  try {
    const { url, branch, path } = req.body;

    if (!url || !branch) {
      return res.status(400).json({ message: 'URL and branch are required' });
    }

    // Extract owner and repo from URL
    const urlPattern = /github\.com\/([^/]+)\/([^/]+)/;
    const match = url.match(urlPattern);

    if (!match) {
      return res.status(400).json({ message: 'Invalid GitHub URL format' });
    }

    const owner = match[1];
    const repo = match[2].replace('.git', '');

    // Get repository contents
    const repoContents = await githubService.getRepositoryContents(
      owner,
      repo,
      branch,
      path
    );

    // Generate tree structure from formatted repository tree
    const repoTree = githubService.formatRepositoryTree(
      repoContents,
      path || repo
    );
    const treeText = treeGenerator.formatTree(path || repo, repoTree);

    res.status(200).json({
      treeText,
      repoName: repo,
    });
  } catch (error) {
    console.error('Error in generateTree:', error);

    // Handle different types of errors
    if (error.message.includes('API rate limit exceeded')) {
      return res.status(429).json({
        message:
          'GitHub API rate limit exceeded. Please try again later or add a GitHub token.',
        documentation:
          'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting',
      });
    } else if (error.message.includes('Repository or branch not found')) {
      return res.status(404).json({ message: error.message });
    }

    next(error);
  }
};

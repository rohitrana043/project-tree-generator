const express = require('express');
const router = express.Router();
const githubController = require('../controllers/githubController');

// Get branches for a GitHub repository
router.get('/branches', githubController.getBranches);

// Generate tree structure from GitHub repository
router.post('/tree', githubController.generateTree);

module.exports = router;

// routes/builderRoutes.js - Updated with validation endpoint
const express = require('express');
const router = express.Router();
const builderController = require('../controllers/builderController');

// Generate empty structure from tree text
router.post('/generate', builderController.generateStructure);

// Validate tree structure
router.post('/validate', builderController.validateStructure);

// Preview structure details from tree text
router.post('/preview', builderController.previewStructure);

module.exports = router;

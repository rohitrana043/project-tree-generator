// This file serves as the entry point for Vercel serverless functions
const app = require('../src/server');

// Export the Express app as a Vercel serverless function
module.exports = app;

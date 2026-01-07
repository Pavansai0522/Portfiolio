// Vercel Serverless Function - Catch-all API Handler
// This file handles all /api/* routes and passes them to the Express app

const app = require('../server');

// Export as Vercel serverless function
// Vercel will route all /api/* requests here
module.exports = app;


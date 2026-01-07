// Vercel Serverless Function - Catch-all API Handler
// This file handles all /api/* routes and passes them to the Express app

const app = require('../server');

// Export the Express app directly
// Vercel will handle routing /api/* requests to this function
// The catch-all pattern [...path] means this handles all paths under /api
module.exports = app;


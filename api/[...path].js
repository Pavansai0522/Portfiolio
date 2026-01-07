// Vercel Serverless Function - Catch-all API Handler
// This file handles all /api/* routes and passes them to the Express app

const app = require('../server');

// For Vercel catch-all routes [...path], the path parameter contains segments after /api
// But our Express routes are defined with /api prefix, so we need to restore it
module.exports = (req, res) => {
  // Restore the /api prefix if it was stripped by Vercel
  if (!req.path.startsWith('/api')) {
    req.url = '/api' + req.url;
    req.path = '/api' + req.path;
  }
  return app(req, res);
};


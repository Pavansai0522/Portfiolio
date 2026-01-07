// Vercel Serverless Function - Catch-all API Handler
// This file handles all /api/* routes and passes them to the Express app

const app = require('../server');

// For Vercel catch-all routes [...path], requests to /api/* are routed here
// The original URL path is preserved in req.url
module.exports = (req, res) => {
  // Log for debugging (will appear in Vercel function logs)
  console.log('API Request:', req.method, req.url, req.path);
  
  // Ensure the path starts with /api for Express routes
  const originalUrl = req.url;
  const originalPath = req.path;
  
  if (!req.path.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    req.path = '/api' + (req.path.startsWith('/') ? req.path : '/' + req.path);
    console.log('Adjusted path:', req.path);
  }
  
  // Handle the request with Express
  return app(req, res);
};


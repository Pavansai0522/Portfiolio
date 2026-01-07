// Vercel Serverless Function - Catch-all API Handler
// This file handles all /api/* routes and passes them to the Express app

const app = require('../server');

// For Vercel catch-all routes [...path], requests to /api/* are routed here
// The full path including /api is preserved in req.url
module.exports = (req, res) => {
  // Log for debugging
  console.log('API Handler - Method:', req.method, 'URL:', req.url, 'Path:', req.path);
  
  // Vercel's catch-all route preserves the full path in req.url
  // Express routes are defined with /api prefix, so this should work directly
  // But let's ensure req.path matches req.url for Express routing
  if (req.url && !req.path) {
    // Extract path from URL if path is not set
    const urlMatch = req.url.match(/^[^?]*/);
    req.path = urlMatch ? urlMatch[0] : req.url;
  }
  
  // Ensure path starts with /api
  if (req.path && !req.path.startsWith('/api')) {
    req.path = '/api' + req.path;
  }
  if (req.url && !req.url.startsWith('/api') && !req.url.includes('://')) {
    req.url = '/api' + req.url;
  }
  
  console.log('Forwarding to Express - Method:', req.method, 'Path:', req.path);
  
  // Forward to Express app
  return app(req, res);
};


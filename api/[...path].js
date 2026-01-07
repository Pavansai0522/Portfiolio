// Vercel Serverless Function - Catch-all API Handler
// This file handles all /api/* routes and passes them to the Express app

const app = require('../server');

// For Vercel catch-all routes [...path], requests to /api/* are routed here
// The path segments are available in req.query.path or we reconstruct from req.url
module.exports = async (req, res) => {
  try {
    // Log for debugging
    console.log('API Request received:', {
      method: req.method,
      url: req.url,
      path: req.path,
      originalUrl: req.originalUrl,
      query: req.query
    });
    
    // Vercel preserves the full URL in req.url, so Express should handle it correctly
    // But let's ensure the path is correct for Express routing
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    
    // Ensure path starts with /api (Express routes are defined with /api prefix)
    if (!pathname.startsWith('/api')) {
      req.url = '/api' + pathname;
      req.path = '/api' + pathname;
    } else {
      req.url = pathname;
      req.path = pathname;
    }
    
    console.log('Processing with Express:', req.method, req.path);
    
    // Handle the request with Express
    app(req, res);
  } catch (error) {
    console.error('Error in API handler:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};


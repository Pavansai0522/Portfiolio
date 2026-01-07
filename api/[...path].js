// Vercel Serverless Function - Catch-all API Handler
// This file handles all /api/* routes and passes them to the Express app

const app = require('../server');
const connectDB = require('../config/database');
const mongoose = require('mongoose');

// Ensure database connection is established before handling requests
// This is important for serverless functions where connections may be cold
let connectionPromise = null;

// Export the Express app as a handler function for Vercel
// Vercel will handle routing /api/* requests to this function
// The catch-all pattern [...path] means this handles all paths under /api
module.exports = async (req, res) => {
  // Log request for debugging
  console.log('API Request received:', {
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    query: req.query
  });
  
  // Vercel passes the path after /api to the catch-all handler
  // So /api/auth/login becomes /auth/login in req.path
  // We need to reconstruct the full path for Express
  const originalPath = req.path;
  if (!req.path.startsWith('/api')) {
    // Reconstruct the full API path
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    req.path = '/api' + (req.path.startsWith('/') ? req.path : '/' + req.path);
    req.originalUrl = '/api' + (req.originalUrl.startsWith('/') ? req.originalUrl : '/' + req.originalUrl);
  }
  
  console.log('Normalized path:', {
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl
  });
  
  // Check if already connected
  if (mongoose.connection.readyState === 1) {
    // Already connected, handle request immediately
    return app(req, res);
  }

  // Ensure database is connected before handling the request
  if (!connectionPromise) {
    console.log('Initializing database connection...');
    connectionPromise = connectDB().catch(err => {
      console.error('Database connection failed:', err);
      connectionPromise = null; // Reset to allow retry
      throw err;
    });
  }
  
  // Wait for connection with timeout
  try {
    await Promise.race([
      connectionPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 15s')), 15000)
      )
    ]);
    console.log('Database connection established');
  } catch (err) {
    // Connection failed or timed out
    console.error('Database connection error in handler:', err.message);
    console.error('Error stack:', err.stack);
    console.error('MONGODB_URI present:', !!process.env.MONGODB_URI);
    
    // Still continue - some routes might work without DB, or return error
    if (req.path === '/api/health') {
      // For health check, return detailed status
      return res.json({
        status: 'ok',
        message: 'Portfolio API is running',
        database: {
          status: mongoose.connection.readyState === 1 ? 'connected' : 
                  mongoose.connection.readyState === 2 ? 'connecting' : 'disconnected',
          error: err.message,
          errorType: err.name,
          hasMongoUri: !!process.env.MONGODB_URI
        }
      });
    }
  }
  
  // Handle the request with Express
  return app(req, res);
};


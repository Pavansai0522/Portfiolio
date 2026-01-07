// Vercel Serverless Function for GET /api/tech-news
let app;
let connectDB;
let mongoose;

// Lazy load to catch initialization errors
try {
  app = require('../server');
  connectDB = require('../config/database');
  mongoose = require('mongoose');
} catch (error) {
  console.error('Failed to load dependencies:', error);
  throw error;
}

let connectionPromise = null;

module.exports = async (req, res) => {
  try {
    console.log('=== Tech News endpoint called ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    // Tech news doesn't require database, but we can try to connect if not connected
    // (non-blocking for this endpoint)
    if (mongoose.connection.readyState !== 1 && !connectionPromise) {
      connectionPromise = connectDB().catch(err => {
        console.error('Database connection failed:', err);
        connectionPromise = null;
      });
    }
    
    // Set the path to match Express route
    req.path = '/api/tech-news';
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    req.url = '/api/tech-news' + queryString;
    req.originalUrl = '/api/tech-news' + queryString;
    
    console.log('Routing to Express with path:', req.path);
    
    // Handle the request with Express
    app(req, res);
    
  } catch (error) {
    console.error('Unhandled error in tech-news handler:', error);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Internal server error', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
};


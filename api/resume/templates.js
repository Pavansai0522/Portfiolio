// Vercel Serverless Function for GET /api/resume/templates
const app = require('../../server');
const connectDB = require('../../config/database');
const mongoose = require('mongoose');

let connectionPromise = null;

module.exports = async (req, res) => {
  try {
    console.log('=== Resume templates endpoint called ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    // Templates endpoint doesn't require database, but we can try to connect if not connected
    // (non-blocking for this endpoint)
    if (mongoose.connection.readyState !== 1 && !connectionPromise) {
      connectionPromise = connectDB().catch(err => {
        console.error('Database connection failed:', err);
        connectionPromise = null;
      });
    }
    
    // Set the path to match Express route
    req.path = '/api/resume/templates';
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    req.url = '/api/resume/templates' + queryString;
    req.originalUrl = '/api/resume/templates' + queryString;
    
    console.log('Routing to Express with path:', req.path);
    
    // Handle the request with Express
    return new Promise((resolve, reject) => {
      const originalEnd = res.end;
      res.end = function(...args) {
        originalEnd.apply(this, args);
        resolve();
      };

      const errorHandler = (err) => {
        console.error('Express error in templates handler:', err);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Internal server error',
            details: err.message
          });
        }
        resolve();
      };

      try {
        app(req, res);
      } catch (err) {
        errorHandler(err);
      }
    });
    
  } catch (error) {
    console.error('Unhandled error in templates handler:', error);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Internal server error', 
        details: error.message
      });
    }
  }
};



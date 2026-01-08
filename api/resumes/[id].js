// Vercel Serverless Function for /api/resumes/:id and /api/resumes/:id/download
let app;
let connectDB;
let mongoose;

// Lazy load to catch initialization errors
try {
  app = require('../../server');
  connectDB = require('../../config/database');
  mongoose = require('mongoose');
} catch (error) {
  console.error('Failed to load dependencies:', error);
  throw error;
}

let connectionPromise = null;

module.exports = async (req, res) => {
  try {
    console.log('=== Resume by ID endpoint called ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Query:', req.query);
    
    // Ensure database is connected
    if (mongoose.connection.readyState !== 1) {
      if (!connectionPromise) {
        console.log('Starting database connection...');
        connectionPromise = connectDB().catch(err => {
          console.error('Database connection failed:', err);
          connectionPromise = null;
          throw err;
        });
      }

      try {
        await Promise.race([
          connectionPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 15000)
          )
        ]);
        console.log('Database connected successfully');
      } catch (err) {
        console.error('Database connection error:', err.message);
        if (!res.headersSent) {
          return res.status(500).json({ error: 'Database connection failed', details: err.message });
        }
        return;
      }
    }
    
    // Extract resume ID from query or URL
    let resumeId = null;
    if (req.query && req.query.id) {
      resumeId = req.query.id;
    } else if (req.url) {
      // Extract from URL like /api/resumes/123/download or /api/resumes/123
      const urlMatch = req.url.match(/\/api\/resumes\/([^\/\?]+)/);
      if (urlMatch) {
        resumeId = urlMatch[1];
      }
    }
    
    if (!resumeId) {
      return res.status(400).json({ error: 'Resume ID is required' });
    }
    
    // Set up params
    if (!req.params) {
      req.params = {};
    }
    req.params.id = resumeId;
    
    // Determine the full path
    let fullPath = '/api/resumes/' + resumeId;
    if (req.url.includes('/download')) {
      fullPath = '/api/resumes/' + resumeId + '/download';
    }
    
    req.path = fullPath;
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    req.url = fullPath + queryString;
    req.originalUrl = fullPath + queryString;
    
    console.log('Routing to Express with path:', fullPath);
    console.log('Resume ID:', resumeId);
    
    // Handle the request with Express
    return new Promise((resolve, reject) => {
      const originalEnd = res.end;
      res.end = function(...args) {
        originalEnd.apply(this, args);
        resolve();
      };

      const errorHandler = (err) => {
        console.error('Express error in resume by ID handler:', err);
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
    console.error('Unhandled error in resume by ID handler:', error);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Internal server error', 
        details: error.message
      });
    }
  }
};


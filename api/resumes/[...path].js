// Vercel Serverless Function for /api/resumes and all nested routes
// This handles /api/resumes, /api/resumes/upload, /api/resumes/:id, /api/resumes/:id/download
const app = require('../../server');
const connectDB = require('../../config/database');
const mongoose = require('mongoose');

let connectionPromise = null;

module.exports = async (req, res) => {
  try {
    console.log('=== Resumes endpoint called ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Path:', req.path);
    console.log('Original URL:', req.originalUrl);
    console.log('Query:', JSON.stringify(req.query, null, 2));
    
    // Reconstruct the full path from query or URL
    let fullPath = '/api/resumes';
    
    if (req.query && req.query.path) {
      const pathSegments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
      const validSegments = pathSegments.filter(s => s && s.trim() !== '');
      if (validSegments.length > 0) {
        fullPath = '/api/resumes/' + validSegments.join('/');
        console.log('Reconstructed path from query.path:', fullPath);
      }
    } else if (req.url && req.url.startsWith('/api/resumes')) {
      const urlPath = req.url.split('?')[0];
      if (urlPath.startsWith('/api/resumes')) {
        fullPath = urlPath;
        console.log('Using path from URL:', fullPath);
      }
    }
    
    // Extract dynamic route parameters (e.g., /api/resumes/:id or /api/resumes/:id/download)
    if (!req.params) {
      req.params = {};
    }
    const pathMatch = fullPath.match(/^\/api\/resumes\/([^\/\?]+)(?:\/(download))?/);
    if (pathMatch) {
      const [, resumeId, action] = pathMatch;
      // Only set id if it's not 'upload'
      if (resumeId !== 'upload') {
        req.params.id = resumeId;
        console.log(`Extracted dynamic parameter: id=${resumeId}`);
        if (action === 'download') {
          fullPath = `/api/resumes/${resumeId}/download`;
        } else {
          fullPath = `/api/resumes/${resumeId}`;
        }
      }
    }
    
    // Set the path properties for Express
    req.path = fullPath;
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    req.url = fullPath + queryString;
    req.originalUrl = fullPath + queryString;
    
    console.log('Final path being sent to Express:', fullPath);
    console.log('Body keys:', req.body ? Object.keys(req.body) : 'No body');

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
        console.error('Error stack:', err.stack);
        if (!res.headersSent) {
          return res.status(500).json({ error: 'Database connection failed', details: err.message });
        }
        return;
      }
    }

    console.log('Routing to Express with path:', fullPath);

    // Handle the request with Express
    // Wrap in Promise to handle async errors properly
    return new Promise((resolve, reject) => {
      // Set up error handlers
      const originalEnd = res.end;
      res.end = function(...args) {
        originalEnd.apply(this, args);
        resolve();
      };

      // Handle Express errors
      const errorHandler = (err) => {
        console.error('Express error in resumes handler:', err);
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Internal server error',
            details: err.message,
            errorType: err.name
          });
        }
        resolve();
      };

      // Call Express app
      try {
        app(req, res);
      } catch (err) {
        errorHandler(err);
      }
    });

  } catch (error) {
    console.error('Unhandled error in resumes handler:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message,
        errorType: error.name
      });
    }
  }
};


// Vercel Serverless Function - Unified Auth Handler
// Handles all /api/auth/* routes: login, register, verify, verify-email, resend-verification
const app = require('../../server');
const connectDB = require('../../config/database');
const mongoose = require('mongoose');

let connectionPromise = null;

module.exports = async (req, res) => {
  try {
    console.log('=== Auth endpoint called ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Path:', req.path);
    console.log('Query:', req.query);
    
    // Reconstruct the full path from query or URL
    let fullPath = '/api/auth';
    
    if (req.query && req.query.path) {
      const pathSegments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
      const validSegments = pathSegments.filter(s => s && s.trim() !== '');
      if (validSegments.length > 0) {
        fullPath = '/api/auth/' + validSegments.join('/');
        console.log('Reconstructed path from query.path:', fullPath);
      }
    } else if (req.url && req.url.startsWith('/api/auth')) {
      const urlPath = req.url.split('?')[0];
      if (urlPath.startsWith('/api/auth')) {
        fullPath = urlPath;
        console.log('Using path from URL:', fullPath);
      }
    }
    
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

    // Set the path properties for Express
    req.path = fullPath;
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    req.url = fullPath + queryString;
    req.originalUrl = fullPath + queryString;

    console.log('Routing to Express with path:', fullPath);

    // Handle the request with Express
    return new Promise((resolve, reject) => {
      const originalEnd = res.end;
      res.end = function(...args) {
        originalEnd.apply(this, args);
        resolve();
      };

      const errorHandler = (err) => {
        console.error('Express error in auth handler:', err);
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

      try {
        app(req, res);
      } catch (err) {
        errorHandler(err);
      }
    });

  } catch (error) {
    console.error('Unhandled error in auth handler:', error);
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


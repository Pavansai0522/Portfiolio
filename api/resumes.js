// Vercel Serverless Function for /api/resumes
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
    console.log('=== Resumes endpoint called ===');
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
    
    // Set the path to match Express route
    let fullPath = '/api/resumes';
    
    // Handle upload route
    if (req.method === 'POST' && req.url.includes('/upload')) {
      fullPath = '/api/resumes/upload';
    }
    
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
        console.error('Express error in resumes handler:', err);
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
    console.error('Unhandled error in resumes handler:', error);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Internal server error', 
        details: error.message
      });
    }
  }
};


// Vercel Serverless Function for /api/resume
const app = require('../server');
const connectDB = require('../config/database');
const mongoose = require('mongoose');

let connectionPromise = null;

module.exports = async (req, res) => {
  try {
    console.log('=== Resume generator endpoint called ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    // Ensure database is connected (optional for resume generation, but good practice)
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
            setTimeout(() => reject(new Error('Connection timeout')), 10000)
          )
        ]);
        console.log('Database connected successfully');
      } catch (err) {
        console.error('Database connection error:', err.message);
        // Continue anyway - resume generation doesn't require DB
      }
    }

    // Set the path for Express
    req.path = '/api/resume';
    if (req.url && req.url.includes('?')) {
      req.url = '/api/resume' + req.url.substring(req.url.indexOf('?'));
    } else {
      req.url = '/api/resume';
    }
    req.originalUrl = req.url;

    console.log('Routing to Express with path:', req.path);

    // Handle the request with Express
    return new Promise((resolve, reject) => {
      const originalEnd = res.end;
      res.end = function(...args) {
        originalEnd.apply(this, args);
        resolve();
      };

      const errorHandler = (err) => {
        console.error('Express error in resume handler:', err);
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
    console.error('Unhandled error in resume handler:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }
};



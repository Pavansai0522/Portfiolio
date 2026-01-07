// Vercel Serverless Function for POST /api/auth/register
const app = require('../../server');
const connectDB = require('../../config/database');
const mongoose = require('mongoose');

let connectionPromise = null;

module.exports = async (req, res) => {
  try {
    console.log('Register endpoint called:', req.method, req.url);
    
    // Ensure database is connected
    if (mongoose.connection.readyState !== 1) {
      if (!connectionPromise) {
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
        return res.status(500).json({ error: 'Database connection failed', details: err.message });
      }
    }
    
    // Set the path to match Express route
    req.path = '/api/auth/register';
    req.url = '/api/auth/register' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
    req.originalUrl = '/api/auth/register' + (req.originalUrl.includes('?') ? req.originalUrl.substring(req.originalUrl.indexOf('?')) : '');
    
    console.log('Routing to Express with path:', req.path);
    
    // Handle the request with Express - wrap in promise to catch errors
    return new Promise((resolve, reject) => {
      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          console.error('Request timeout - no response sent');
          res.status(504).json({ error: 'Request timeout' });
          resolve();
        }
      }, 25000);
      
      // Override res.end to know when response is sent
      const originalEnd = res.end;
      res.end = function(...args) {
        clearTimeout(timeout);
        originalEnd.apply(this, args);
        resolve();
      };
      
      // Handle errors
      res.on('error', (err) => {
        clearTimeout(timeout);
        console.error('Response error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error', details: err.message });
        }
        resolve();
      });
      
      // Call Express app
      try {
        app(req, res);
        
        // If response was sent synchronously, resolve immediately
        if (res.headersSent) {
          clearTimeout(timeout);
          resolve();
        }
      } catch (err) {
        clearTimeout(timeout);
        console.error('Error calling Express app:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error', details: err.message });
        }
        resolve();
      }
    });
  } catch (error) {
    console.error('Unhandled error in register handler:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }
};


// Vercel Serverless Function for POST /api/auth/register
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
    console.log('=== Register endpoint called ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Path:', req.path);
    
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
    req.path = '/api/auth/register';
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    req.url = '/api/auth/register' + queryString;
    req.originalUrl = '/api/auth/register' + queryString;
    
    console.log('Routing to Express with path:', req.path);
    
    // Handle the request with Express
    app(req, res);
    
  } catch (error) {
    console.error('Unhandled error in register handler:', error);
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


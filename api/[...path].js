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
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]);
    console.log('Database connection established');
  } catch (err) {
    // Connection failed or timed out
    console.error('Database connection error in handler:', err.message);
    // Still continue - some routes might work without DB, or return error
    if (req.path === '/api/health') {
      // For health check, return current status
      return res.json({
        status: 'ok',
        message: 'Portfolio API is running',
        database: mongoose.connection.readyState === 1 ? 'connected' : 
                 mongoose.connection.readyState === 2 ? 'connecting' : 'disconnected',
        error: err.message
      });
    }
  }
  
  // Handle the request with Express
  return app(req, res);
};


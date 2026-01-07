// Vercel Serverless Function for PUT /api/portfolio
const app = require('../server');
const connectDB = require('../config/database');
const mongoose = require('mongoose');

let connectionPromise = null;

module.exports = async (req, res) => {
  try {
    console.log('Portfolio endpoint called:', req.method, req.url);

    // Only handle PUT requests
    if (req.method !== 'PUT') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

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
    req.path = '/api/portfolio';
    req.url = '/api/portfolio' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
    req.originalUrl = '/api/portfolio' + (req.originalUrl.includes('?') ? req.originalUrl.substring(req.originalUrl.indexOf('?')) : '');

    console.log('Routing to Express with path:', req.path);

    // Handle the request with Express
    return app(req, res);
  } catch (error) {
    console.error('Unhandled error in portfolio handler:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }
};


// Vercel Serverless Function for GET /api/health
const app = require('../server');
const connectDB = require('../config/database');
const mongoose = require('mongoose');

let connectionPromise = null;

module.exports = async (req, res) => {
  // Try to connect if not connected (non-blocking for health check)
  if (mongoose.connection.readyState !== 1 && !connectionPromise) {
    connectionPromise = connectDB().catch(err => {
      console.error('Database connection failed:', err);
      connectionPromise = null;
    });
  }
  
  // Set the path to match Express route
  req.path = '/api/health';
  req.url = '/api/health' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
  req.originalUrl = '/api/health' + (req.originalUrl.includes('?') ? req.originalUrl.substring(req.originalUrl.indexOf('?')) : '');
  
  // Handle the request with Express
  return app(req, res);
};


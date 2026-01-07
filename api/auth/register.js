// Vercel Serverless Function for POST /api/auth/register
const app = require('../../server');
const connectDB = require('../../config/database');
const mongoose = require('mongoose');

let connectionPromise = null;

module.exports = async (req, res) => {
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
    } catch (err) {
      console.error('Database connection error:', err.message);
      return res.status(500).json({ error: 'Database connection failed' });
    }
  }
  
  // Set the path to match Express route
  req.path = '/api/auth/register';
  req.url = '/api/auth/register' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
  req.originalUrl = '/api/auth/register' + (req.originalUrl.includes('?') ? req.originalUrl.substring(req.originalUrl.indexOf('?')) : '');
  
  // Handle the request with Express
  return app(req, res);
};


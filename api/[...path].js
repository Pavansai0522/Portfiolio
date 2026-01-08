// Vercel Serverless Function - Unified API Handler
// This single function handles ALL /api/* routes to stay within Vercel's 12 function limit
// Handles: /api/auth/*, /api/portfolio/*, /api/resume, /api/resumes/*, /api/jobs, /api/tech-news, /api/health
const app = require('../server');
const connectDB = require('../config/database');
const mongoose = require('mongoose');

let connectionPromise = null;

module.exports = async (req, res) => {
  try {
    console.log('=== Unified API endpoint called ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Query:', req.query);
    
    // Reconstruct the full path from Vercel's path parameter
    // Vercel passes the catch-all route segments as req.query.path
    let fullPath = '/api';
    
    if (req.query && req.query.path) {
      const pathSegments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
      const validSegments = pathSegments.filter(s => s && s.trim() !== '');
      if (validSegments.length > 0) {
        fullPath = '/api/' + validSegments.join('/');
        console.log('Reconstructed path from query.path:', fullPath);
      }
    } else if (req.url) {
      // Fallback: try to extract path from URL
      const urlPath = req.url.split('?')[0];
      if (urlPath.startsWith('/api')) {
        fullPath = urlPath;
        console.log('Using path from URL:', fullPath);
      }
    }
    
    // Extract dynamic route parameters for nested routes
    // Examples: /api/portfolio/experience/:id, /api/resumes/:id/download
    if (!req.params) {
      req.params = {};
    }
    
    // Extract ID parameters from paths like /api/portfolio/experience/123
    const idMatch = fullPath.match(/^\/api\/portfolio\/(experience|education|achievements|projects|items)\/([^\/\?]+)/);
    if (idMatch) {
      const [, resourceType, resourceId] = idMatch;
      req.params.id = resourceId;
      console.log(`Extracted dynamic parameter: id=${resourceId} for ${resourceType}`);
    }
    
    // Extract ID parameters from paths like /api/resumes/:id or /api/resumes/:id/download
    const resumeMatch = fullPath.match(/^\/api\/resumes\/([^\/\?]+)(?:\/(download))?/);
    if (resumeMatch) {
      const [, resumeId, action] = resumeMatch;
      if (resumeId !== 'upload') {
        req.params.id = resumeId;
        console.log(`Extracted dynamic parameter: id=${resumeId}`);
        if (action === 'download') {
          fullPath = `/api/resumes/${resumeId}/download`;
        } else if (action !== 'download') {
          // It's a DELETE or other operation on /api/resumes/:id
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

    // Ensure database is connected (for routes that need it)
    // Some routes like /api/jobs and /api/tech-news don't require DB, but we'll connect anyway
    if (mongoose.connection.readyState !== 1) {
      if (!connectionPromise) {
        console.log('Starting database connection...');
        connectionPromise = connectDB().catch(err => {
          console.error('Database connection failed:', err);
          connectionPromise = null;
          // Don't throw for routes that don't need DB (jobs, tech-news, health)
          if (!fullPath.includes('/jobs') && !fullPath.includes('/tech-news') && !fullPath.includes('/health')) {
            throw err;
          }
        });
      }

      // For routes that need DB, wait for connection
      if (!fullPath.includes('/jobs') && !fullPath.includes('/tech-news') && !fullPath.includes('/health')) {
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
        console.error('Express error in unified API handler:', err);
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
    console.error('Unhandled error in unified API handler:', error);
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


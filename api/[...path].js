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
  // Log request for debugging
  console.log('=== API Request received (catch-all) ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Path:', req.path);
  console.log('Original URL:', req.originalUrl);
  console.log('Query:', JSON.stringify(req.query, null, 2));
  console.log('Query.path:', req.query?.path);
  console.log('Query.path type:', Array.isArray(req.query?.path) ? 'array' : typeof req.query?.path);
  
  // IMPORTANT: This catch-all should handle ALL /api/* routes that don't have specific handlers
  // Including /api/portfolio/experience, /api/portfolio/education, /api/portfolio/achievements
  
  // In Vercel, when using [...path], the path segments are in req.query.path
  // For /api/portfolio/experience, req.query.path will be ['portfolio', 'experience']
  let fullPath = null;
  
  // Priority 1: Check if we have path segments in query (Vercel catch-all pattern)
  // This is the most reliable way to get the path in Vercel serverless functions
  // For /api/portfolio/experience, req.query.path will be ['portfolio', 'experience']
  if (req.query && req.query.path !== undefined && req.query.path !== null) {
    const pathSegments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
    // Filter out empty segments
    const validSegments = pathSegments.filter(s => s && s.trim() !== '');
    if (validSegments.length > 0) {
      fullPath = '/api/' + validSegments.join('/');
      console.log('✓ Reconstructed path from query.path:', fullPath, 'segments:', validSegments);
    }
  }
  
  // Priority 2: Try to extract from URL if query.path didn't work
  if (!fullPath && req.url) {
    const urlPath = req.url.split('?')[0].split('#')[0]; // Remove query and hash
    if (urlPath && urlPath.startsWith('/api')) {
      fullPath = urlPath;
      console.log('✓ Using path from URL:', fullPath);
    }
  }
  
  // Priority 3: Use req.path if it starts with /api
  if (!fullPath && req.path && req.path.startsWith('/api')) {
    fullPath = req.path;
    console.log('✓ Using path from req.path:', fullPath);
  }
  
  // Priority 4: Use originalUrl if it starts with /api
  if (!fullPath && req.originalUrl && req.originalUrl.startsWith('/api')) {
    const originalPath = req.originalUrl.split('?')[0].split('#')[0];
    if (originalPath.startsWith('/api')) {
      fullPath = originalPath;
      console.log('✓ Using path from originalUrl:', fullPath);
    }
  }
  
  // Priority 5: Fallback - reconstruct from req.path
  if (!fullPath) {
    const pathFromReq = req.path || '';
    fullPath = '/api' + (pathFromReq.startsWith('/') ? pathFromReq : '/' + pathFromReq);
    console.log('⚠ Fallback reconstructed path:', fullPath);
  }
  
  // Final validation
  if (!fullPath || !fullPath.startsWith('/api')) {
    console.error('❌ Failed to reconstruct valid path. Using fallback.');
    fullPath = '/api' + (req.url ? req.url.split('?')[0] : '/unknown');
  }
  
  // Extract dynamic route parameters from path segments
  // For routes like /api/portfolio/experience/:id, extract the ID
  // Initialize req.params if it doesn't exist
  if (!req.params) {
    req.params = {};
  }
  const pathMatch = fullPath.match(/^\/api\/portfolio\/(experience|education|achievements|projects)\/([^\/\?]+)/);
  if (pathMatch) {
    const [, resourceType, resourceId] = pathMatch;
    req.params.id = resourceId;
    console.log(`Extracted dynamic parameter: id=${resourceId} for ${resourceType}`);
  }
  
  // Update all path-related properties
  req.url = fullPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
  req.path = fullPath;
  req.originalUrl = fullPath + (req.originalUrl.includes('?') ? req.originalUrl.substring(req.originalUrl.indexOf('?')) : '');
  
  console.log('=== Normalized path ===');
  console.log('Full path:', fullPath);
  console.log('Updated URL:', req.url);
  console.log('Updated path:', req.path);
  console.log('Updated originalUrl:', req.originalUrl);
  
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
        setTimeout(() => reject(new Error('Connection timeout after 15s')), 15000)
      )
    ]);
    console.log('Database connection established');
  } catch (err) {
    // Connection failed or timed out
    console.error('Database connection error in handler:', err.message);
    console.error('Error stack:', err.stack);
    console.error('MONGODB_URI present:', !!process.env.MONGODB_URI);
    
    // Still continue - some routes might work without DB, or return error
    if (req.path === '/api/health') {
      // For health check, return detailed status
      return res.json({
        status: 'ok',
        message: 'Portfolio API is running',
        database: {
          status: mongoose.connection.readyState === 1 ? 'connected' : 
                  mongoose.connection.readyState === 2 ? 'connecting' : 'disconnected',
          error: err.message,
          errorType: err.name,
          hasMongoUri: !!process.env.MONGODB_URI
        }
      });
    }
  }
  
  // Handle the request with Express
  // Wrap in try-catch to handle any errors
  try {
    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        console.error('Request timeout - no response sent');
        res.status(504).json({ error: 'Request timeout' });
      }
    }, 25000); // 25 second timeout
    
    // Handle the request
    await new Promise((resolve, reject) => {
      let responseSent = false;
      
      // Override res.end to know when response is sent
      const originalEnd = res.end;
      res.end = function(...args) {
        clearTimeout(timeout);
        responseSent = true;
        originalEnd.apply(this, args);
        resolve();
      };
      
      // Override res.status to track response
      const originalStatus = res.status;
      res.status = function(code) {
        console.log(`Response status set to: ${code} for path: ${fullPath}`);
        return originalStatus.apply(this, arguments);
      };
      
      // Add a check after a short delay to see if Express handled it
      setTimeout(() => {
        if (!responseSent && !res.headersSent) {
          console.warn('No response sent after 1 second, Express might not have matched the route');
          console.warn('Final path being sent to Express:', fullPath);
          console.warn('Request method:', req.method);
        }
      }, 1000);
      
      // Handle Express app
      app(req, res);
      
      // If response is already sent (synchronous), resolve immediately
      if (res.headersSent) {
        clearTimeout(timeout);
        resolve();
      }
    });
  } catch (error) {
    console.error('Error handling request:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message,
        errorType: error.name,
        path: fullPath
      });
    }
  }
};


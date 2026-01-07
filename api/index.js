// Vercel Serverless Function - Main API Handler
// This handles /api requests and routes to Express app

const app = require('../server');

module.exports = (req, res) => {
  console.log('API index called:', req.method, req.url, req.path);
  return app(req, res);
};


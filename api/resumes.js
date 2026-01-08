// Vercel Serverless Function for /api/resumes (base route)
// For nested routes, this delegates to resumes/[...path].js
// This handles GET /api/resumes and POST /api/resumes/upload
const resumesHandler = require('./resumes/[...path]');

module.exports = resumesHandler;


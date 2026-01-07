// Vercel Serverless Function - Catch-all API Handler
// This file handles all /api/* routes and passes them to the Express app

const app = require('../server');

// For Vercel, the catch-all route [...path] means this handles /api/*
// The path parameter contains the matched segments, but Express routes already include /api
// So we just export the app directly and it should work
module.exports = app;


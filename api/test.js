// Simple test endpoint to verify Vercel serverless functions work
module.exports = (req, res) => {
  console.log('Test endpoint called:', req.method, req.url);
  res.json({ 
    message: 'API is working!', 
    method: req.method,
    url: req.url,
    path: req.path 
  });
};


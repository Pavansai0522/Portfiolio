require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const https = require('https');
const connectDB = require('./config/database');
const Portfolio = require('./models/Portfolio');
const User = require('./models/User');
const Resume = require('./models/Resume');
const { sendVerificationEmail, generateVerificationToken } = require('./utils/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration - allow frontend URL from environment or default to localhost
// For Vercel, allow requests from any origin (or specify your Vercel domain)
const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL, 'http://localhost:4200']
  : ['http://localhost:4200'];

// If FRONTEND_URL contains wildcard or is not set, allow all origins (for Vercel)
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins if FRONTEND_URL is not set (for Vercel deployment)
    if (!process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for Vercel deployment
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
// Use memory storage for Vercel (serverless) or disk storage for local development
const isVercel = process.env.VERCEL || process.env.NOW_REGION;
let storage;

if (isVercel) {
  // Use memory storage in Vercel (serverless environment)
  storage = multer.memoryStorage();
} else {
  // Use disk storage for local development
  const uploadsDir = path.join(__dirname, 'uploads', 'resumes');
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `resume-${uniqueSuffix}${ext}`);
      }
    });
  } catch (error) {
    console.warn('Failed to create uploads directory, using memory storage:', error.message);
    storage = multer.memoryStorage();
  }
}

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
};

// Optional authentication middleware - doesn't fail if no token provided
const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
      return next();
    }
    req.user = user;
    next();
  });
};

// Connect to MongoDB
// Note: In serverless environments (Vercel), connection is handled in api/[...path].js
// This call is for local development only
if (require.main === module) {
connectDB();
}

// API Routes

// ==================== Authentication Routes ====================

// POST /api/auth/register - Register a new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // 24 hours expiry

    // Create new user
    const user = new User({ 
      email, 
      password,
      verificationToken,
      verificationTokenExpiry
    });
    await user.save();

    // Send verification email (optional - if email service is configured)
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const emailResult = await sendVerificationEmail(email, verificationToken, baseUrl);
    
    // Generate JWT token (login is allowed even without verification) - convert ObjectId to string
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified
      },
      emailSent: emailResult.success,
      emailMessage: emailResult.message
    });
  } catch (error) {
    console.error('Error registering user:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/login - Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login route handler called');
    console.log('Request body:', JSON.stringify(req.body));
    
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      console.log('Validation failed: missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('Finding user by email:', email);
    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('User found, comparing password');
    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('Invalid password');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('Password valid, updating last login');
    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log('Generating JWT token');
    // Generate JWT token - convert ObjectId to string
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful');
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to login',
        details: error.message,
        errorType: error.name
      });
    }
  }
});

// GET /api/auth/verify-email - Verify email address
app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find user by verification token
    const user = await User.findOne({ 
      verificationToken: token,
      verificationTokenExpiry: { $gt: new Date() } // Token not expired
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Update user as verified
    user.isEmailVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;
    await user.save();

    res.json({
      message: 'Email verified successfully',
      verified: true
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// POST /api/auth/resend-verification - Resend verification email
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24);

    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = verificationTokenExpiry;
    await user.save();

    // Send verification email
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const emailResult = await sendVerificationEmail(email, verificationToken, baseUrl);

    res.json({
      message: 'Verification email sent successfully',
      emailSent: emailResult.success,
      emailMessage: emailResult.message
    });
  } catch (error) {
    console.error('Error resending verification email:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// ==================== Portfolio Routes (Protected) ====================

// GET /api/portfolio - Get portfolio data for authenticated user
app.get('/api/portfolio', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    // TEMPORARY: userEmail used for migration of old portfolios
    // TODO: PRODUCTION - Remove userEmail parameter after migration
    const userEmail = req.user.email;
    if (!userId) {
      console.error('Portfolio GET: User ID not found in token', req.user);
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    console.log('Portfolio GET: Fetching portfolio for userId:', userId, 'email:', userEmail);
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    // Convert MongoDB _id to id for projects, experience, education, and achievements
    const portfolioData = portfolio.toObject();
    if (portfolioData.projects) {
      portfolioData.projects = portfolioData.projects.map(project => ({
        ...project,
        id: project._id.toString()
      }));
    }
    if (portfolioData.experience) {
      portfolioData.experience = portfolioData.experience.map(exp => ({
        ...exp,
        id: exp._id.toString()
      }));
    }
    if (portfolioData.education) {
      portfolioData.education = portfolioData.education.map(edu => ({
        ...edu,
        id: edu._id.toString()
      }));
    }
    if (portfolioData.achievements) {
      portfolioData.achievements = portfolioData.achievements.map(ach => ({
        ...ach,
        id: ach._id.toString()
      }));
    }
    res.json(portfolioData);
  } catch (error) {
    console.error('Error reading portfolio data:', error);
    res.status(500).json({ error: 'Failed to read portfolio data' });
  }
});

// PUT /api/portfolio - Update portfolio data for authenticated user
app.put('/api/portfolio', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    // TEMPORARY: userEmail used for migration
    // TODO: PRODUCTION - Remove after migration
    const userEmail = req.user.email;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    console.log('PUT /api/portfolio - User ID:', userId);
    console.log('PUT /api/portfolio - Request body keys:', Object.keys(req.body));
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    console.log('PUT /api/portfolio - Portfolio found:', !!portfolio);
    
    // Update portfolio fields (exclude userId, projects, experience, education, achievements, and MongoDB fields)
    const excludedKeys = ['projects', 'experience', 'education', 'achievements', '_id', '__v', 'userId'];
    Object.keys(req.body).forEach(key => {
      if (!excludedKeys.includes(key)) {
        // Handle socialLinks specially - ensure it's an object
        if (key === 'socialLinks' && req.body[key]) {
          portfolio[key] = req.body[key];
        } else if (key !== 'socialLinks') {
          portfolio[key] = req.body[key];
        }
      }
    });
    
    console.log('PUT /api/portfolio - Attempting to save portfolio...');
    await portfolio.save();
    console.log('PUT /api/portfolio - Portfolio saved successfully');
    
    // Convert to object and format projects, experience, education, and achievements
    const portfolioData = portfolio.toObject();
    if (portfolioData.projects) {
      portfolioData.projects = portfolioData.projects.map(project => ({
        ...project,
        id: project._id.toString()
      }));
    }
    if (portfolioData.experience) {
      portfolioData.experience = portfolioData.experience.map(exp => ({
        ...exp,
        id: exp._id.toString()
      }));
    }
    if (portfolioData.education) {
      portfolioData.education = portfolioData.education.map(edu => ({
        ...edu,
        id: edu._id.toString()
      }));
    }
    if (portfolioData.achievements) {
      portfolioData.achievements = portfolioData.achievements.map(ach => ({
        ...ach,
        id: ach._id.toString()
      }));
    }
    
    res.json(portfolioData);
  } catch (error) {
    console.error('Error updating portfolio data:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to update portfolio data';
    let errorDetails = error.message;
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      errorMessage = 'Validation error';
      errorDetails = Object.values(error.errors || {}).map((e) => e.message).join(', ');
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid data format';
      errorDetails = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails,
      errorType: error.name
    });
  }
});

// POST /api/portfolio/projects - Add a new project for authenticated user
app.post('/api/portfolio/projects', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    // TEMPORARY: userEmail used for migration
    // TODO: PRODUCTION - Remove after migration
    const userEmail = req.user.email;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    
    const newProject = {
      title: req.body.title || '',
      description: req.body.description || '',
      technologies: req.body.technologies || [],
      image: req.body.image || null,
      link: req.body.link || ''
    };
    
    portfolio.projects.push(newProject);
    await portfolio.save();
    
    // Get the last added project
    const addedProject = portfolio.projects[portfolio.projects.length - 1];
    const projectData = addedProject.toObject();
    projectData.id = projectData._id.toString();
    
    res.status(201).json(projectData);
  } catch (error) {
    console.error('Error adding project:', error);
    res.status(500).json({ error: 'Failed to add project' });
  }
});

// PUT /api/portfolio/projects/:id - Update a project for authenticated user
app.put('/api/portfolio/projects/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    // TEMPORARY: userEmail used for migration
    // TODO: PRODUCTION - Remove after migration
    const userEmail = req.user.email;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    const projectId = req.params.id;
    
    const project = portfolio.projects.id(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Update project fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'id' && key !== '_id' && key !== '__v') {
        project[key] = req.body[key];
      }
    });
    
    await portfolio.save();
    
    const projectData = project.toObject();
    projectData.id = projectData._id.toString();
    
    res.json(projectData);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/portfolio/projects/:id - Delete a project for authenticated user
app.delete('/api/portfolio/projects/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    // TEMPORARY: userEmail used for migration
    // TODO: PRODUCTION - Remove after migration
    const userEmail = req.user.email;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    const projectId = req.params.id;
    
    const project = portfolio.projects.id(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    portfolio.projects.pull(projectId);
    await portfolio.save();
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ==================== Unified Portfolio Items API ====================
// This unified endpoint handles experience, education, and achievements
// POST /api/portfolio/items - Add a new item (experience, education, or achievement)
app.post('/api/portfolio/items', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    const { type } = req.body;
    if (!type || !['experience', 'education', 'achievement'].includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid type. Must be "experience", "education", or "achievement"' 
      });
    }
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    
    let newItem;
    let itemData;
    
    if (type === 'experience') {
      // Validate required fields
      if (!req.body.company || !req.body.position) {
        return res.status(400).json({ error: 'Company and Position are required for experience' });
      }
      
      newItem = {
        company: req.body.company || '',
        position: req.body.position || '',
        description: req.body.description || '',
        startDate: req.body.startDate || '',
        endDate: req.body.endDate || '',
        isCurrent: req.body.isCurrent || false,
        location: req.body.location || ''
      };
      
      portfolio.experience.push(newItem);
      await portfolio.save();
      
      const addedItem = portfolio.experience[portfolio.experience.length - 1];
      itemData = addedItem.toObject();
      itemData.id = itemData._id.toString();
      
    } else if (type === 'education') {
      // Validate required fields
      if (!req.body.institution || !req.body.degree) {
        return res.status(400).json({ error: 'Institution and Degree are required for education' });
      }
      
      newItem = {
        institution: req.body.institution || '',
        degree: req.body.degree || '',
        field: req.body.field || '',
        description: req.body.description || '',
        startDate: req.body.startDate || '',
        endDate: req.body.endDate || '',
        isCurrent: req.body.isCurrent || false,
        location: req.body.location || ''
      };
      
      portfolio.education.push(newItem);
      await portfolio.save();
      
      const addedItem = portfolio.education[portfolio.education.length - 1];
      itemData = addedItem.toObject();
      itemData.id = itemData._id.toString();
      
    } else if (type === 'achievement') {
      // Validate required fields
      if (!req.body.title) {
        return res.status(400).json({ error: 'Title is required for achievement' });
      }
      
      newItem = {
        title: req.body.title || '',
        issuer: req.body.issuer || '',
        description: req.body.description || '',
        date: req.body.date || '',
        url: req.body.url || '',
        type: req.body.type || 'achievement'
      };
      
      portfolio.achievements.push(newItem);
      await portfolio.save();
      
      const addedItem = portfolio.achievements[portfolio.achievements.length - 1];
      itemData = addedItem.toObject();
      itemData.id = itemData._id.toString();
    }
    
    res.status(201).json(itemData);
  } catch (error) {
    console.error(`Error adding ${req.body.type}:`, error);
    res.status(500).json({ error: `Failed to add ${req.body.type}` });
  }
});

// PUT /api/portfolio/items/:id - Update an item (experience, education, or achievement)
app.put('/api/portfolio/items/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    const { type } = req.body;
    if (!type || !['experience', 'education', 'achievement'].includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid type. Must be "experience", "education", or "achievement"' 
      });
    }
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    const itemId = req.params.id;
    
    let item;
    let itemData;
    
    if (type === 'experience') {
      item = portfolio.experience.id(itemId);
      if (!item) {
        return res.status(404).json({ error: 'Experience not found' });
      }
      
      Object.keys(req.body).forEach(key => {
        if (key !== 'id' && key !== '_id' && key !== '__v' && key !== 'type') {
          item[key] = req.body[key];
        }
      });
      
      await portfolio.save();
      itemData = item.toObject();
      itemData.id = itemData._id.toString();
      
    } else if (type === 'education') {
      item = portfolio.education.id(itemId);
      if (!item) {
        return res.status(404).json({ error: 'Education not found' });
      }
      
      Object.keys(req.body).forEach(key => {
        if (key !== 'id' && key !== '_id' && key !== '__v' && key !== 'type') {
          item[key] = req.body[key];
        }
      });
      
      await portfolio.save();
      itemData = item.toObject();
      itemData.id = itemData._id.toString();
      
    } else if (type === 'achievement') {
      item = portfolio.achievements.id(itemId);
      if (!item) {
        return res.status(404).json({ error: 'Achievement not found' });
      }
      
      Object.keys(req.body).forEach(key => {
        if (key !== 'id' && key !== '_id' && key !== '__v' && key !== 'type') {
          item[key] = req.body[key];
        }
      });
      
      await portfolio.save();
      itemData = item.toObject();
      itemData.id = itemData._id.toString();
    }
    
    res.json(itemData);
  } catch (error) {
    console.error(`Error updating ${req.body.type}:`, error);
    res.status(500).json({ error: `Failed to update ${req.body.type}` });
  }
});

// DELETE /api/portfolio/items/:id - Delete an item (experience, education, or achievement)
app.delete('/api/portfolio/items/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    const { type } = req.query; // Get type from query parameter for DELETE
    if (!type || !['experience', 'education', 'achievement'].includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid type. Must be "experience", "education", or "achievement". Provide as query parameter: ?type=experience' 
      });
    }
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    const itemId = req.params.id;
    
    if (type === 'experience') {
      const item = portfolio.experience.id(itemId);
      if (!item) {
        return res.status(404).json({ error: 'Experience not found' });
      }
      portfolio.experience.pull(itemId);
    } else if (type === 'education') {
      const item = portfolio.education.id(itemId);
      if (!item) {
        return res.status(404).json({ error: 'Education not found' });
      }
      portfolio.education.pull(itemId);
    } else if (type === 'achievement') {
      const item = portfolio.achievements.id(itemId);
      if (!item) {
        return res.status(404).json({ error: 'Achievement not found' });
      }
      portfolio.achievements.pull(itemId);
    }
    
    await portfolio.save();
    
    res.json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully` });
  } catch (error) {
    console.error(`Error deleting ${req.query.type}:`, error);
    res.status(500).json({ error: `Failed to delete ${req.query.type}` });
  }
});

// ==================== Experience Routes ====================

// POST /api/portfolio/experience - Add a new experience for authenticated user
app.post('/api/portfolio/experience', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    
    const newExperience = {
      company: req.body.company || '',
      position: req.body.position || '',
      description: req.body.description || '',
      startDate: req.body.startDate || '',
      endDate: req.body.endDate || '',
      isCurrent: req.body.isCurrent || false,
      location: req.body.location || ''
    };
    
    portfolio.experience.push(newExperience);
    await portfolio.save();
    
    const addedExperience = portfolio.experience[portfolio.experience.length - 1];
    const experienceData = addedExperience.toObject();
    experienceData.id = experienceData._id.toString();
    
    res.status(201).json(experienceData);
  } catch (error) {
    console.error('Error adding experience:', error);
    res.status(500).json({ error: 'Failed to add experience' });
  }
});

// PUT /api/portfolio/experience/:id - Update an experience for authenticated user
app.put('/api/portfolio/experience/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    const experienceId = req.params.id;
    
    const experience = portfolio.experience.id(experienceId);
    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }
    
    Object.keys(req.body).forEach(key => {
      if (key !== 'id' && key !== '_id' && key !== '__v') {
        experience[key] = req.body[key];
      }
    });
    
    await portfolio.save();
    
    const experienceData = experience.toObject();
    experienceData.id = experienceData._id.toString();
    
    res.json(experienceData);
  } catch (error) {
    console.error('Error updating experience:', error);
    res.status(500).json({ error: 'Failed to update experience' });
  }
});

// DELETE /api/portfolio/experience/:id - Delete an experience for authenticated user
app.delete('/api/portfolio/experience/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    const experienceId = req.params.id;
    
    const experience = portfolio.experience.id(experienceId);
    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }
    
    portfolio.experience.pull(experienceId);
    await portfolio.save();
    
    res.json({ message: 'Experience deleted successfully' });
  } catch (error) {
    console.error('Error deleting experience:', error);
    res.status(500).json({ error: 'Failed to delete experience' });
  }
});

// ==================== Education Routes ====================

// POST /api/portfolio/education - Add a new education for authenticated user
app.post('/api/portfolio/education', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    
    const newEducation = {
      institution: req.body.institution || '',
      degree: req.body.degree || '',
      field: req.body.field || '',
      description: req.body.description || '',
      startDate: req.body.startDate || '',
      endDate: req.body.endDate || '',
      isCurrent: req.body.isCurrent || false,
      location: req.body.location || ''
    };
    
    portfolio.education.push(newEducation);
    await portfolio.save();
    
    const addedEducation = portfolio.education[portfolio.education.length - 1];
    const educationData = addedEducation.toObject();
    educationData.id = educationData._id.toString();
    
    res.status(201).json(educationData);
  } catch (error) {
    console.error('Error adding education:', error);
    res.status(500).json({ error: 'Failed to add education' });
  }
});

// PUT /api/portfolio/education/:id - Update an education for authenticated user
app.put('/api/portfolio/education/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    const educationId = req.params.id;
    
    const education = portfolio.education.id(educationId);
    if (!education) {
      return res.status(404).json({ error: 'Education not found' });
    }
    
    Object.keys(req.body).forEach(key => {
      if (key !== 'id' && key !== '_id' && key !== '__v') {
        education[key] = req.body[key];
      }
    });
    
    await portfolio.save();
    
    const educationData = education.toObject();
    educationData.id = educationData._id.toString();
    
    res.json(educationData);
  } catch (error) {
    console.error('Error updating education:', error);
    res.status(500).json({ error: 'Failed to update education' });
  }
});

// DELETE /api/portfolio/education/:id - Delete an education for authenticated user
app.delete('/api/portfolio/education/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    const educationId = req.params.id;
    
    const education = portfolio.education.id(educationId);
    if (!education) {
      return res.status(404).json({ error: 'Education not found' });
    }
    
    portfolio.education.pull(educationId);
    await portfolio.save();
    
    res.json({ message: 'Education deleted successfully' });
  } catch (error) {
    console.error('Error deleting education:', error);
    res.status(500).json({ error: 'Failed to delete education' });
  }
});

// ==================== Achievements Routes ====================

// POST /api/portfolio/achievements - Add a new achievement for authenticated user
app.post('/api/portfolio/achievements', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    
    const newAchievement = {
      title: req.body.title || '',
      issuer: req.body.issuer || '',
      description: req.body.description || '',
      date: req.body.date || '',
      url: req.body.url || '',
      type: req.body.type || 'achievement'
    };
    
    portfolio.achievements.push(newAchievement);
    await portfolio.save();
    
    const addedAchievement = portfolio.achievements[portfolio.achievements.length - 1];
    const achievementData = addedAchievement.toObject();
    achievementData.id = achievementData._id.toString();
    
    res.status(201).json(achievementData);
  } catch (error) {
    console.error('Error adding achievement:', error);
    res.status(500).json({ error: 'Failed to add achievement' });
  }
});

// PUT /api/portfolio/achievements/:id - Update an achievement for authenticated user
app.put('/api/portfolio/achievements/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    const achievementId = req.params.id;
    
    const achievement = portfolio.achievements.id(achievementId);
    if (!achievement) {
      return res.status(404).json({ error: 'Achievement not found' });
    }
    
    Object.keys(req.body).forEach(key => {
      if (key !== 'id' && key !== '_id' && key !== '__v') {
        achievement[key] = req.body[key];
      }
    });
    
    await portfolio.save();
    
    const achievementData = achievement.toObject();
    achievementData.id = achievementData._id.toString();
    
    res.json(achievementData);
  } catch (error) {
    console.error('Error updating achievement:', error);
    res.status(500).json({ error: 'Failed to update achievement' });
  }
});

// DELETE /api/portfolio/achievements/:id - Delete an achievement for authenticated user
app.delete('/api/portfolio/achievements/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    const achievementId = req.params.id;
    
    const achievement = portfolio.achievements.id(achievementId);
    if (!achievement) {
      return res.status(404).json({ error: 'Achievement not found' });
    }
    
    portfolio.achievements.pull(achievementId);
    await portfolio.save();
    
    res.json({ message: 'Achievement deleted successfully' });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    res.status(500).json({ error: 'Failed to delete achievement' });
  }
});

// Helper function to get thumbnail for URL using Microlink API
async function getThumbnail(url) {
  try {
    // Use Microlink API (free, no API key needed)
    const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
    const response = await fetch(microlinkUrl, {
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      // Microlink returns image in data.image.url
      if (data.data && data.data.image && data.data.image.url) {
        return data.data.image.url;
      }
      // Fallback to logo if available
      if (data.data && data.data.logo && data.data.logo.url) {
        return data.data.logo.url;
      }
    }
  } catch (error) {
    console.error(`Error fetching thumbnail from Microlink for ${url}:`, error.message);
  }
  
  // Fallback to a gradient placeholder
  return `https://via.placeholder.com/400x200/6366f1/ffffff?text=Tech+News`;
}

// Helper function to shuffle array (Fisher-Yates algorithm)
// Function to calculate match percentage between portfolio and job description
function calculateMatchPercentage(portfolio, jobDescription) {
  if (!portfolio || !jobDescription) {
    return 0;
  }

  // Strip HTML from job description first
  const cleanJobDescription = stripHtml(jobDescription);
  if (!cleanJobDescription || cleanJobDescription.trim().length === 0) {
    return 0;
  }

  // Normalize text for comparison (lowercase, remove special chars)
  const normalize = (text) => {
    if (!text) return '';
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Extract keywords from job description (filter out common words)
  const commonWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'let', 'put', 'say', 'she', 'too', 'use', 'with', 'this', 'that', 'from', 'have', 'will', 'been', 'more', 'what', 'when', 'where', 'which', 'there', 'their', 'them', 'they', 'than', 'then', 'these', 'those']);
  const jobText = normalize(cleanJobDescription);
  // Extract words of length 3+ and also keep important technical terms (even if 2 chars like "js", "ui", "ux")
  const jobWords = new Set();
  const words = jobText.split(/\s+/);
  words.forEach(w => {
    if (w.length >= 3 && !commonWords.has(w)) {
      jobWords.add(w);
    } else if (w.length === 2 && ['js', 'ui', 'ux', 'ai', 'ml', 'db', 'api', 'ci', 'cd'].includes(w)) {
      jobWords.add(w);
    }
  });

  if (jobWords.size === 0) {
    return 0;
  }

  // Collect all user skills and keywords
  const userKeywords = new Set();
  const userSkills = new Set(); // Keep skills separate for better matching
  
  // Add skills (keep full skill names for exact matching)
  if (portfolio.skills && Array.isArray(portfolio.skills)) {
    portfolio.skills.forEach(skill => {
      const normalized = normalize(skill);
      if (normalized) {
        // Add full skill name (handle multi-word skills like "react.js", "node.js")
        userSkills.add(normalized);
        // Also add individual words
        normalized.split(/[\s\-_\.]+/).forEach(word => {
          if (word.length >= 2) {
            userKeywords.add(word);
            userSkills.add(word);
          }
        });
      }
    });
  }

  // Add technologies from projects
  if (portfolio.projects && Array.isArray(portfolio.projects)) {
    portfolio.projects.forEach(project => {
      if (project.technologies && Array.isArray(project.technologies)) {
        project.technologies.forEach(tech => {
          const normalized = normalize(tech);
          if (normalized) {
            userSkills.add(normalized);
            normalized.split(/\s+/).forEach(word => {
              if (word.length > 2) {
                userKeywords.add(word);
                userSkills.add(word);
              }
            });
          }
        });
      }
      // Also add project description keywords
      if (project.description) {
        const normalized = normalize(project.description);
        normalized.split(/\s+/).forEach(word => {
          if (word.length > 3) userKeywords.add(word);
        });
      }
    });
  }

  // Add experience keywords
  if (portfolio.experience && Array.isArray(portfolio.experience)) {
    portfolio.experience.forEach(exp => {
      // Add position title keywords
      if (exp.position) {
        const normalized = normalize(exp.position);
        normalized.split(/\s+/).forEach(word => {
          if (word.length > 2) userKeywords.add(word);
        });
      }
      // Add description keywords
      if (exp.description) {
        const normalized = normalize(exp.description);
        normalized.split(/\s+/).forEach(word => {
          if (word.length > 3) userKeywords.add(word);
        });
      }
    });
  }

  // Add education field keywords
  if (portfolio.education && Array.isArray(portfolio.education)) {
    portfolio.education.forEach(edu => {
      if (edu.field) {
        const normalized = normalize(edu.field);
        normalized.split(/\s+/).forEach(word => {
          if (word.length > 2) userKeywords.add(word);
        });
      }
      if (edu.degree) {
        const normalized = normalize(edu.degree);
        normalized.split(/\s+/).forEach(word => {
          if (word.length > 2) userKeywords.add(word);
        });
      }
    });
  }

  // Calculate matches - check both individual words and full skill names
  const matchedWords = new Set();
  let exactMatches = 0;
  let skillMatches = 0;
  
  // First, check for exact keyword matches
  jobWords.forEach(jobWord => {
    if (userKeywords.has(jobWord)) {
      matchedWords.add(jobWord);
      exactMatches++;
    }
  });
  
  // Then check for skill matches (full skill names in job description)
  // This handles cases like "javascript" matching "javascript developer" or "react" matching "reactjs"
  jobWords.forEach(jobWord => {
    // Skip if already matched
    if (matchedWords.has(jobWord)) return;
    
    // Check if any user skill matches this job word
    for (const skill of userSkills) {
      // Exact match
      if (skill === jobWord) {
        matchedWords.add(jobWord);
        skillMatches++;
        break;
      }
      // Partial match for longer words (e.g., "javascript" in "javascript developer")
      if (skill.length >= 4 && jobWord.length >= 4) {
        // Check if skill is a substring of job word or vice versa
        if (jobWord.includes(skill) || skill.includes(jobWord)) {
          matchedWords.add(jobWord);
          skillMatches++;
          break;
        }
      }
      // Handle variations like "react" vs "reactjs", "node" vs "nodejs"
      if (skill.length >= 3 && jobWord.length >= 3) {
        const skillBase = skill.replace(/[^a-z0-9]/g, '');
        const jobBase = jobWord.replace(/[^a-z0-9]/g, '');
        if (skillBase === jobBase || skillBase.includes(jobBase) || jobBase.includes(skillBase)) {
          matchedWords.add(jobWord);
          skillMatches++;
          break;
        }
      }
    }
  });

  const totalMatches = exactMatches + skillMatches;
  
  // Only return match if there are actual matches
  if (totalMatches === 0) {
    return 0;
  }

  // Calculate base match percentage based on matched keywords
  // Use a weighted approach: exact matches count more than partial matches
  const exactMatchWeight = 1.0;
  const skillMatchWeight = 0.8;
  const weightedMatches = (exactMatches * exactMatchWeight) + (skillMatches * skillMatchWeight);
  
  if (jobWords.size === 0) {
    return 0;
  }
  
  const baseMatch = (weightedMatches / jobWords.size) * 100;
  
  // Add bonus for having multiple skills matched (up to 20% bonus)
  const skillsCount = portfolio.skills ? portfolio.skills.length : 0;
  const skillBonus = Math.min(20, Math.min(skillsCount, totalMatches) * 4);
  
  // Add boost if user has relevant experience (max 15%)
  let experienceBoost = 0;
  if (portfolio.experience && portfolio.experience.length > 0 && totalMatches > 0) {
    experienceBoost = Math.min(15, portfolio.experience.length * 3);
  }
  
  // Add boost for projects with technologies (max 10%)
  let projectBoost = 0;
  if (portfolio.projects && portfolio.projects.length > 0 && totalMatches > 0) {
    const projectTechCount = portfolio.projects.reduce((count, p) => {
      return count + (p.technologies ? p.technologies.length : 0);
    }, 0);
    projectBoost = Math.min(10, projectTechCount * 2);
  }
  
  // Calculate total match
  let totalMatch = baseMatch + skillBonus + experienceBoost + projectBoost;
  
  // Cap at 100% - no forced minimum, but ensure at least 15% if there are any matches
  if (totalMatches > 0) {
    totalMatch = Math.min(100, Math.max(15, totalMatch));
  } else {
    return 0;
  }
  
  // Round to nearest 5 for cleaner display
  return Math.round(totalMatch / 5) * 5;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// GET /api/tech-news - Get tech news from Hacker News API
app.get('/api/tech-news', async (req, res) => {
  try {
    // Fetch top stories from Hacker News
    const topStoriesResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    const topStoryIds = await topStoriesResponse.json();
    
    // Fetch more stories (top 30) to have variety
    const storyIds = topStoryIds.slice(0, 30);
    
    // Fetch story details in parallel
    const storyPromises = storyIds.map(async (id) => {
      try {
        const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        const story = await storyResponse.json();
        return story;
      } catch (error) {
        console.error(`Error fetching story ${id}:`, error);
        return null;
      }
    });
    
    const stories = await Promise.all(storyPromises);
    
    // Filter out null values and stories without URLs
    const validStories = stories.filter(story => story && story.type === 'story' && story.url);
    
    // Shuffle the stories to get different ones on each refresh
    const shuffledStories = shuffleArray(validStories);
    
    // Take 6 random stories
    const selectedStories = shuffledStories.slice(0, 6);
    
    // Format stories and fetch thumbnails
    const storyFormatPromises = selectedStories.map(async (story) => {
      const thumbnail = await getThumbnail(story.url);
      
      return {
        id: story.id,
        title: story.title || 'Untitled',
        description: story.title || 'No description available',
        source: 'Hacker News',
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        publishedAt: new Date(story.time * 1000).toISOString(),
        image: thumbnail,
        score: story.score || 0,
        comments: story.descendants || 0
      };
    });
    
    const techNews = await Promise.all(storyFormatPromises);
    
    res.json({
      success: true,
      articles: techNews,
      total: techNews.length
    });
  } catch (error) {
    console.error('Error fetching tech news:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch tech news' 
    });
  }
});

// Helper function to strip HTML tags from text
function stripHtml(html) {
  if (!html) return '';
  let text = html;
  
  // Remove HTML tags first
  text = text.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities
  const entityMap = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp': ' ',
    '&amp': '&',
    '&lt': '<',
    '&gt': '>',
    '&quot': '"'
  };
  
  // Replace named entities
  for (const [entity, char] of Object.entries(entityMap)) {
    text = text.replace(new RegExp(entity, 'gi'), char);
  }
  
  // Decode numeric entities (&#39;, &#160;, etc.)
  text = text.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  // Decode hex entities (&#x27;, &#xA0;, etc.)
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // Remove any remaining HTML entities
  text = text.replace(/&[#\w]+;/g, '');
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// GET /api/jobs - Get job listings from Remotive API
app.get('/api/jobs', optionalAuthenticateToken, async (req, res) => {
  try {
    // Get portfolio data for matching (if user is authenticated)
    let portfolio = null;
    if (req.user && req.user.userId) {
      try {
        const userEmail = req.user.email;
        portfolio = await Portfolio.getPortfolio(req.user.userId, userEmail);
      } catch (portfolioError) {
        console.error('Error fetching portfolio for matching:', portfolioError);
        // Continue without portfolio
      }
    }
    
    // Fetch jobs from Remotive API with cache-busting
    const searchQuery = req.query.search;
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    
    // If search query provided, use it; otherwise fetch all jobs
    let remotiveUrl;
    if (searchQuery) {
      remotiveUrl = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(searchQuery)}&_t=${timestamp}`;
    } else {
      // Fetch all remote jobs without search filter
      remotiveUrl = `https://remotive.com/api/remote-jobs?_t=${timestamp}`;
    }
    
    console.log('Fetching jobs from:', remotiveUrl);
    
    const response = await fetch(remotiveUrl, {
      signal: AbortSignal.timeout(10000), // 10 second timeout
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Remotive API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Get all jobs and shuffle them to show different ones on each refresh
    const allJobs = data.jobs || [];
    console.log(`Remotive API returned ${allJobs.length} total jobs`);
    
    if (allJobs.length === 0) {
      return res.json({
        success: true,
        jobs: [],
        total: 0,
        message: 'No jobs found'
      });
    }
    
    const shuffledJobs = shuffleArray(allJobs);
    
    // Format jobs from Remotive API response (take up to 50 jobs for better variety)
    const maxJobs = Math.min(50, shuffledJobs.length);
    console.log(`Returning ${maxJobs} jobs after shuffling`);
    const jobs = shuffledJobs.slice(0, maxJobs).map((job, index) => {
      // Calculate match percentage if portfolio exists
      let matchPercentage = null;
      if (portfolio) {
        // Use full job description for matching
        const fullDescription = job.description || '';
        matchPercentage = calculateMatchPercentage(portfolio, fullDescription);
      }
      
      // Strip HTML from description before truncating
      let cleanDescription = job.description ? stripHtml(job.description) : '';
      if (cleanDescription && cleanDescription.length > 200) {
        cleanDescription = cleanDescription.substring(0, 200) + '...';
      } else if (!cleanDescription) {
        cleanDescription = 'No description available';
      }
      
      // Strip HTML from title as well
      const cleanTitle = job.title ? stripHtml(job.title) : 'Untitled Position';
      
      return {
        id: job.id || index + 1,
        title: cleanTitle,
        company: job.company_name || 'Company Not Specified',
        location: job.candidate_required_location || 'Remote',
        type: job.job_type || 'Full-time',
        description: cleanDescription,
        url: job.url || `https://remotive.com/remote-jobs/${job.id}`,
        postedAt: job.publication_date || new Date().toISOString(),
        salary: job.salary || null,
        category: job.category || null,
        matchPercentage: matchPercentage
      };
    });
    
    res.json({
      success: true,
      jobs: jobs,
      total: jobs.length
    });
  } catch (error) {
    console.error('Error fetching jobs from Remotive:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch job listings' 
    });
  }
});

// ==================== Resume Routes (Protected) ====================

// GET /api/resumes - Get all resumes for authenticated user
app.get('/api/resumes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    const resumes = await Resume.getResumesByUserId(userId);
    
    const resumesData = resumes.map(resume => ({
      id: resume._id.toString(),
      name: resume.name,
      uploadedAt: resume.uploadedAt.toISOString(),
      size: resume.size,
      type: resume.type,
      url: `${req.protocol}://${req.get('host')}/api/resumes/${resume._id}/download`
    }));

    res.json({
      success: true,
      resumes: resumesData,
      total: resumesData.length
    });
  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch resumes' 
    });
  }
});

// POST /api/resumes/upload - Upload a resume file
app.post('/api/resumes/upload', authenticateToken, upload.single('resume'), async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
    }

    // Handle memory storage (Vercel) vs disk storage (local)
    const isVercel = process.env.VERCEL || process.env.NOW_REGION;
    let filePath;
    
    if (isVercel || !req.file.path) {
      // Memory storage - store file buffer in MongoDB or use /tmp
      // For now, store as base64 in a temporary field or use /tmp
      const tmpDir = '/tmp';
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(req.file.originalname);
      filePath = path.join(tmpDir, `resume-${uniqueSuffix}${ext}`);
      
      try {
        fs.writeFileSync(filePath, req.file.buffer);
      } catch (writeError) {
        console.error('Error writing file to /tmp:', writeError);
        // Fallback: store buffer reference (file will be lost on serverless restart)
        filePath = `memory:${uniqueSuffix}`;
      }
    } else {
      // Disk storage (local development)
      filePath = req.file.path;
    }

    const resume = new Resume({
      userId: userId,
      name: req.file.originalname,
      originalName: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      filePath: filePath
    });

    await resume.save();

    const resumeData = {
      id: resume._id.toString(),
      name: resume.name,
      uploadedAt: resume.uploadedAt.toISOString(),
      size: resume.size,
      type: resume.type,
      url: `${req.protocol}://${req.get('host')}/api/resumes/${resume._id}/download`
    };

    res.status(201).json({
      success: true,
      resume: resumeData,
      message: 'Resume uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    
    // Clean up uploaded file if resume creation failed
    if (req.file) {
      if (req.file.path && fs.existsSync && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      } else if (req.file.buffer && req.file.buffer.tmpPath) {
        // Clean up /tmp file if it exists
        try {
          if (fs.existsSync && fs.existsSync(req.file.buffer.tmpPath)) {
            fs.unlinkSync(req.file.buffer.tmpPath);
          }
        } catch (unlinkError) {
          console.error('Error deleting temp file:', unlinkError);
        }
      }
    }

    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to upload resume' 
    });
  }
});

// GET /api/resumes/:id/download - Download a resume file
app.get('/api/resumes/:id/download', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const resumeId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    const resume = await Resume.getResumeById(resumeId, userId);
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Handle memory storage paths (Vercel) or disk storage paths
    if (resume.filePath && resume.filePath.startsWith('memory:')) {
      return res.status(404).json({ error: 'Resume file not available (stored in memory, server restarted)' });
    }

    // Check if file exists
    let fileExists = false;
    try {
      fileExists = fs.existsSync && fs.existsSync(resume.filePath);
    } catch (err) {
      console.error('Error checking file existence:', err);
    }

    if (!fileExists) {
      console.error('File not found at path:', resume.filePath);
      return res.status(404).json({ error: 'Resume file not found on server' });
    }

    // Set headers for file download/viewing
    // Use query parameter to determine if it's for viewing (open) or downloading
    const isDownload = req.query.download === 'true' || req.query.download === '1';
    const disposition = isDownload ? 'attachment' : 'inline';
    
    res.setHeader('Content-Type', resume.type);
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(resume.originalName)}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Stream the file
    try {
      const fileStream = fs.createReadStream(resume.filePath);
      fileStream.on('error', (err) => {
        console.error('Error streaming file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to read resume file' });
        }
      });
      fileStream.pipe(res);
    } catch (err) {
      console.error('Error creating file stream:', err);
      res.status(500).json({ error: 'Failed to download resume' });
    }
  } catch (error) {
    console.error('Error downloading resume:', error);
    res.status(500).json({ error: 'Failed to download resume' });
  }
});

// DELETE /api/resumes/:id - Delete a resume
app.delete('/api/resumes/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const resumeId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    const resume = await Resume.getResumeById(resumeId, userId);
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Delete file from filesystem
    if (resume.filePath) {
      try {
        // Check if file exists before trying to delete
        if (fs.existsSync && fs.existsSync(resume.filePath)) {
          fs.unlinkSync(resume.filePath);
        } else if (resume.filePath.startsWith('/tmp/')) {
          // Try to delete /tmp file even if existsSync fails
          try {
            fs.unlinkSync(resume.filePath);
          } catch (tmpError) {
            console.warn('Could not delete /tmp file:', tmpError.message);
          }
        }
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    await Resume.findByIdAndDelete(resumeId);

    res.json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete resume' 
    });
  }
});

// ==================== Resume Generator Routes ====================

// POST /api/resume - Generate resume as PDF or DOCX
app.post('/api/resume', async (req, res) => {
  try {
    const { name, email, phone, skills, experience, education, templateId, format } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    if (!templateId || !['classic', 'modern', 'minimal', 'executive', 'creative'].includes(templateId)) {
      return res.status(400).json({ error: 'Valid templateId (classic, modern, minimal, executive, or creative) is required' });
    }

    if (!format || !['pdf', 'docx'].includes(format)) {
      return res.status(400).json({ error: 'Valid format (pdf or docx) is required' });
    }

    // Prepare resume data
    const resumeData = {
      name: name || '',
      email: email || '',
      phone: phone || '',
      skills: Array.isArray(skills) ? skills : (skills ? [skills] : []),
      experience: Array.isArray(experience) ? experience : [],
      education: Array.isArray(education) ? education : []
    };

    // Load template utility
    const { renderResume } = require('./utils/resumeTemplates');
    
    // Render HTML from template
    const htmlContent = renderResume(templateId, resumeData);

    if (format === 'pdf') {
      // Generate PDF using Puppeteer
      const puppeteer = require('puppeteer');
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in'
          }
        });
        
        await browser.close();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="resume-${Date.now()}.pdf"`);
        res.send(pdfBuffer);
      } catch (pdfError) {
        await browser.close();
        throw pdfError;
      }
    } else if (format === 'docx') {
      // Generate DOCX using docxtemplater
      const Docxtemplater = require('docxtemplater');
      const PizZip = require('pizzip');
      
      // Create a simple DOCX structure programmatically
      // For a production app, you'd have a .docx template file
      // Here we'll create a simple DOCX from HTML content
      const { createDocxFromHtml } = require('./utils/docxGenerator');
      const docxBuffer = await createDocxFromHtml(htmlContent, resumeData);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="resume-${Date.now()}.docx"`);
      res.send(docxBuffer);
    }
  } catch (error) {
    console.error('Error generating resume:', error);
    res.status(500).json({ 
      error: 'Failed to generate resume',
      details: error.message 
    });
  }
});

// GET /api/resume/templates - Get available templates
app.get('/api/resume/templates', (req, res) => {
  try {
    const { getAvailableTemplates } = require('./utils/resumeTemplates');
    const templates = getAvailableTemplates();
    res.json({ 
      success: true,
      templates: templates.map(id => ({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1)
      }))
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get templates' 
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbStatus] || 'unknown';
    
    // Return status immediately without blocking
    const connectionInfo = {
      status: dbStatusText,
      hasMongoUri: !!process.env.MONGODB_URI,
      readyState: dbStatus
    };
    
    // If connecting, don't wait - just report status
    if (dbStatus === 2) {
      connectionInfo.message = 'Connection in progress (this may take a few seconds on cold start)';
    } else if (dbStatus === 1) {
      connectionInfo.message = 'Connected';
      connectionInfo.host = mongoose.connection.host;
    } else if (dbStatus === 0) {
      connectionInfo.message = 'Not connected - connection will be established on first API request';
    }
    
    if (!process.env.MONGODB_URI) {
      connectionInfo.error = 'MONGODB_URI environment variable is not set';
    }
    
    res.json({ 
      status: 'ok', 
      message: 'Portfolio API is running',
      database: connectionInfo
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'API health check failed',
      error: error.message 
    });
  }
});

// 404 handler for unmatched API routes (must be after all API route definitions)
app.use('/api/*', (req, res) => {
  console.log('404 - API route not found:', req.method, req.path);
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/verify-email',
      'POST /api/auth/resend-verification',
      'GET /api/health'
    ]
  });
});

// Serve static files from Angular build (for production deployment)
// This allows serving the frontend from the same server
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const fs = require('fs');
  
  // Try both possible build output locations (Angular 17 structure may vary)
  let distPath = path.join(__dirname, 'dist', 'portfolio-app', 'browser');
  if (!fs.existsSync(distPath)) {
    distPath = path.join(__dirname, 'dist', 'portfolio-app');
  }
  
  // Only serve static files if dist directory exists
  if (fs.existsSync(distPath)) {
    // Serve static files
    app.use(express.static(distPath));
    
    // Handle Angular routing - return index.html for all non-API routes
    // This should only run in non-serverless environments
    // In Vercel, API routes are handled by serverless functions
    app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ 
          error: 'API endpoint not found',
          path: req.path,
          method: req.method
        });
      }
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({ error: 'Frontend not built. Run: npm run build:prod' });
      }
    });
  }
}

// 404 handler for unmatched API routes (should not happen in serverless, but helps with debugging)
app.use('/api/*', (req, res) => {
  console.error('404 - API route not found:', req.method, req.path);
  console.error('Available routes should be handled by serverless functions');
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    message: 'This route should be handled by a serverless function. Check Vercel function logs.'
  });
});

// Export app for serverless functions (Vercel)
module.exports = app;

// Start server only if not in serverless environment
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`📦 Using MongoDB database`);
  });
}

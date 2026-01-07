require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const https = require('https');
const connectDB = require('./config/database');
const Portfolio = require('./models/Portfolio');
const User = require('./models/User');
const { sendVerificationEmail, generateVerificationToken } = require('./utils/emailService');

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

// Connect to MongoDB
connectDB();

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
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token - convert ObjectId to string
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

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
    res.status(500).json({ error: 'Failed to login' });
  }
});

// GET /api/auth/verify - Verify JWT token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
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
    
    const portfolio = await Portfolio.getPortfolio(userId, userEmail);
    
    // Update portfolio fields (exclude userId, projects, experience, education, achievements, and MongoDB fields)
    Object.keys(req.body).forEach(key => {
      if (key !== 'projects' && key !== 'experience' && key !== 'education' && key !== 'achievements' && key !== '_id' && key !== '__v' && key !== 'userId') {
        portfolio[key] = req.body[key];
      }
    });
    
    await portfolio.save();
    
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
    res.status(500).json({ error: 'Failed to update portfolio data' });
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

// GET /api/jobs - Get job listings from Remotive API
app.get('/api/jobs', async (req, res) => {
  try {
    // Fetch jobs from Remotive API with cache-busting
    const searchQuery = req.query.search || 'developer';
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const remotiveUrl = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(searchQuery)}&_t=${timestamp}`;
    
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
    const shuffledJobs = shuffleArray(allJobs);
    
    // Format jobs from Remotive API response (take 10 random jobs)
    const jobs = shuffledJobs.slice(0, 10).map((job, index) => ({
      id: job.id || index + 1,
      title: job.title || 'Untitled Position',
      company: job.company_name || 'Company Not Specified',
      location: job.candidate_required_location || 'Remote',
      type: job.job_type || 'Full-time',
      description: job.description ? job.description.substring(0, 200) + '...' : 'No description available',
      url: job.url || `https://remotive.com/remote-jobs/${job.id}`,
      postedAt: job.publication_date || new Date().toISOString(),
      salary: job.salary || null,
      category: job.category || null
    }));
    
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

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbStatus] || 'unknown';
    
    res.json({ 
      status: 'ok', 
      message: 'Portfolio API is running',
      database: dbStatusText
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'API health check failed',
      error: error.message 
    });
  }
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
    app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
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

// Export app for serverless functions (Vercel)
module.exports = app;

// Start server only if not in serverless environment
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`📦 Using MongoDB database`);
  });
}

# Complete Codebase Analysis

## Project Overview

This is a **full-stack portfolio management application** with resume generation capabilities, built as a modern web application with authentication, portfolio management, job matching, and tech news integration.

## Architecture

### Technology Stack

**Frontend:**
- **Angular 17** - Modern TypeScript framework
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Angular Material 17** - UI component library
- **RxJS 7.8** - Reactive programming
- **SCSS** - Styling with component-scoped styles

**Backend:**
- **Node.js** - JavaScript runtime
- **Express.js 4.18** - Web framework
- **MongoDB** with **Mongoose 8.0** - Database and ODM
- **JWT (jsonwebtoken 9.0)** - Authentication
- **bcrypt 6.0** - Password hashing
- **Multer 2.0** - File upload handling
- **Nodemailer 7.0** - Email service
- **Puppeteer 21.5** - PDF generation
- **Handlebars 4.7** - Template engine
- **docxtemplater 3.42** - DOCX generation

**Development Tools:**
- **TypeScript 5.2** - Type safety
- **Concurrently 8.2** - Run multiple commands
- **PostCSS** & **Autoprefixer** - CSS processing

**Deployment:**
- **Vercel** - Frontend hosting (serverless functions for API)
- **Railway/Render** - Backend hosting options
- **MongoDB Atlas** - Cloud database

## Project Structure

```
portfolio-app/
├── api/                    # Vercel serverless functions
│   ├── auth/[...path].js  # Unified auth handler
│   ├── jobs.js            # Job listings API
│   ├── portfolio/         # Portfolio CRUD endpoints
│   ├── resume/            # Resume management
│   └── resumes.js         # Resume file operations
├── config/
│   └── database.js        # MongoDB connection
├── models/                # Mongoose schemas
│   ├── User.js           # User authentication model
│   ├── Portfolio.js      # Portfolio data model
│   └── Resume.js         # Resume file model
├── utils/                 # Utility functions
│   ├── emailService.js   # Email sending
│   ├── resumeTemplates.js # Resume template rendering
│   └── docxGenerator.js   # DOCX generation
├── templates/             # Resume HTML templates
│   ├── classic.html
│   ├── modern.html
│   ├── minimal.html
│   ├── executive.html
│   └── creative.html
├── src/                   # Angular frontend
│   ├── app/
│   │   ├── components/   # 17 Angular components
│   │   ├── services/     # 7 Angular services
│   │   ├── guards/       # Route guards
│   │   └── app.routes.ts # Routing configuration
│   └── environments/      # Environment configs
├── server.js              # Express backend server
├── vercel.json            # Vercel configuration
└── package.json           # Dependencies
```

## Core Features Implemented

### 1. Authentication System
- **User Registration** with email/password
- **User Login** with JWT tokens
- **Email Verification** (optional, requires email service)
- **Password Hashing** using bcrypt (salt rounds: 10)
- **JWT Token Management** (24-hour expiry)
- **Session Management** using sessionStorage
- **Auth Guards** for protected routes

**Files:**
- `models/User.js` - User schema with password hashing
- `server.js` - Auth endpoints (register, login, verify-email)
- `src/app/services/auth.service.ts` - Frontend auth service
- `src/app/guards/auth.guard.ts` - Route protection

### 2. Portfolio Management
- **Profile Information** (name, title, bio, contact info)
- **Skills Management** (array of skills)
- **Projects CRUD** (title, description, technologies, images, links)
- **Work Experience** (company, position, dates, description)
- **Education** (institution, degree, field, dates)
- **Achievements/Certifications** (title, issuer, date, URL)
- **Social Links** (LinkedIn, GitHub, Twitter, Website)
- **Profile Image Upload** (base64 encoding)

**Files:**
- `models/Portfolio.js` - Portfolio schema with nested schemas
- `server.js` - Portfolio CRUD endpoints
- `src/app/components/portfolio/` - Portfolio UI
- `src/app/services/portfolio-data.service.ts` - Portfolio state management

### 3. Resume Generator
- **5 Resume Templates** (Classic, Modern, Minimal, Executive, Creative)
- **PDF Generation** using Puppeteer
- **DOCX Generation** using docxtemplater
- **Template Rendering** using Handlebars
- **Resume Data Integration** from portfolio

**Files:**
- `templates/*.html` - Resume HTML templates
- `utils/resumeTemplates.js` - Template rendering
- `utils/docxGenerator.js` - DOCX creation
- `src/app/components/resume-generator/` - Generator UI
- `src/app/services/resume-generator.service.ts` - Generation logic

### 4. Resume File Management
- **Resume Upload** (PDF, DOC, DOCX)
- **Resume Storage** (disk for local, memory/tmp for serverless)
- **Resume Download/View**
- **Resume List** for authenticated users
- **Resume Deletion**

**Files:**
- `models/Resume.js` - Resume file model
- `server.js` - Resume upload/download endpoints
- `src/app/components/resume-card/` - Resume display
- `src/app/services/resume.service.ts` - Resume operations

### 5. Job Matching System
- **Job Listings** from Remotive API
- **Intelligent Matching Algorithm**:
  - Skills matching (exact and partial)
  - Experience relevance
  - Project technologies matching
  - Education field matching
  - Match percentage calculation (0-100%)
- **Job Search** functionality
- **Applied Jobs Tracking** (local storage)

**Files:**
- `server.js` - `/api/jobs` endpoint with matching logic
- `src/app/components/jobs/` - Job listings UI
- `src/app/services/applied-jobs.service.ts` - Applied jobs tracking

### 6. Tech News Integration
- **Hacker News API** integration
- **Top Stories** fetching
- **Thumbnail Generation** using Microlink API
- **Randomized Display** (6 stories per load)

**Files:**
- `server.js` - `/api/tech-news` endpoint
- `src/app/components/tech-news/` - News display

### 7. User Interface Components
- **Home Page** - Landing page
- **Login/Signup** - Authentication forms
- **Dashboard** - User overview
- **Profile** - Profile management
- **Portfolio** - Portfolio editor
- **Settings** - App settings (theme, etc.)
- **Header** - Navigation component
- **About/Contact** - Static pages

**Files:**
- `src/app/components/*/` - 17 Angular components

## Database Schema

### User Model (`models/User.js`)
```javascript
{
  email: String (unique, required, lowercase),
  password: String (hashed, required, min 6 chars),
  isEmailVerified: Boolean (default: false),
  verificationToken: String,
  verificationTokenExpiry: Date,
  createdAt: Date,
  lastLogin: Date
}
```

### Portfolio Model (`models/Portfolio.js`)
```javascript
{
  userId: ObjectId (ref: User, unique, indexed),
  name, title, bio, email, phone, location: String,
  profileImage: String (base64),
  skills: [String],
  projects: [{
    title, description, technologies, image, link
  }],
  experience: [{
    company, position, description, startDate, endDate,
    isCurrent, location
  }],
  education: [{
    institution, degree, field, description,
    startDate, endDate, isCurrent, location
  }],
  achievements: [{
    title, issuer, description, date, url, type
  }],
  socialLinks: {
    linkedin, github, twitter, website
  }
}
```

### Resume Model (`models/Resume.js`)
```javascript
{
  userId: ObjectId (ref: User, indexed),
  name: String,
  originalName: String,
  size: Number,
  type: String (MIME type),
  filePath: String,
  uploadedAt: Date
}
```

## API Endpoints

### Authentication (`/api/auth/*`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify-email?token=...` - Verify email
- `POST /api/auth/resend-verification` - Resend verification

### Portfolio (`/api/portfolio/*`)
- `GET /api/portfolio` - Get user portfolio (protected)
- `PUT /api/portfolio` - Update portfolio (protected)
- `POST /api/portfolio/projects` - Add project (protected)
- `PUT /api/portfolio/projects/:id` - Update project (protected)
- `DELETE /api/portfolio/projects/:id` - Delete project (protected)
- `POST /api/portfolio/items` - Add experience/education/achievement (protected)
- `PUT /api/portfolio/items/:id` - Update item (protected)
- `DELETE /api/portfolio/items/:id?type=...` - Delete item (protected)

### Resume Files (`/api/resumes/*`)
- `GET /api/resumes` - List user resumes (protected)
- `POST /api/resumes/upload` - Upload resume (protected)
- `GET /api/resumes/:id/download` - Download/view resume (protected)
- `DELETE /api/resumes/:id` - Delete resume (protected)

### Resume Generator (`/api/resume/*`)
- `POST /api/resume` - Generate PDF/DOCX resume
- `GET /api/resume/templates` - Get available templates

### External Data (`/api/*`)
- `GET /api/jobs` - Get job listings (optional auth for matching)
- `GET /api/tech-news` - Get tech news articles
- `GET /api/health` - Health check

## Key Services (Angular)

### AuthService (`src/app/services/auth.service.ts`)
- Manages authentication state using Angular signals
- Handles login, register, logout
- Token management
- User state management

### ApiService (`src/app/services/api.service.ts`)
- Centralized HTTP client
- Handles all API calls
- Auth header injection
- Response type handling

### PortfolioDataService (`src/app/services/portfolio-data.service.ts`)
- Portfolio state management
- Data caching
- CRUD operations

### ResumeGeneratorService (`src/app/services/resume-generator.service.ts`)
- Resume generation logic
- Template selection
- Format conversion

### ThemeService (`src/app/services/theme.service.ts`)
- Dark/light theme management
- Theme persistence

### AppliedJobsService (`src/app/services/applied-jobs.service.ts`)
- Tracks applied jobs
- Local storage management

## Security Features

1. **Password Hashing** - bcrypt with salt rounds 10
2. **JWT Authentication** - Token-based auth with 24h expiry
3. **Route Guards** - Protected routes require authentication
4. **CORS Configuration** - Configurable allowed origins
5. **File Upload Validation** - Type and size restrictions
6. **Input Validation** - Server-side validation for all inputs
7. **Email Verification** - Optional email verification system

## Deployment Configuration

### Vercel Setup (`vercel.json`)
- Frontend build configuration
- Serverless function routing
- Static file serving
- SPA routing support

### Serverless Functions (`api/auth/[...path].js`)
- Unified auth handler for Vercel
- Database connection management
- Request routing

### Environment Variables
- `MONGODB_URI` - Database connection
- `JWT_SECRET` - JWT signing secret
- `FRONTEND_URL` - CORS configuration
- `EMAIL_HOST/USER/PASS` - Email service (optional)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode

## Development Workflow

### Local Development
```bash
npm run start:dev  # Runs both frontend and backend
npm run start:backend  # Backend only (port 3001)
npm start  # Frontend only (port 4200)
```

### Production Build
```bash
npm run build:prod  # Build Angular for production
```

## Notable Implementation Details

1. **Migration Support** - Portfolio model includes temporary migration logic for email-based portfolios
2. **Serverless Compatibility** - File storage adapts to serverless (memory) vs traditional (disk)
3. **Match Algorithm** - Sophisticated job matching with weighted scoring
4. **Template System** - Handlebars-based resume templates with helpers
5. **State Management** - Angular signals for reactive state
6. **Error Handling** - Comprehensive error handling throughout
7. **Caching Strategy** - Portfolio data caching with reload capability

## Documentation Files

- `README.md` - Main project documentation
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `VERCEL_DEPLOYMENT.md` - Vercel-specific guide
- `DATABASE_SETUP.md` - MongoDB setup
- `EMAIL_VERIFICATION_SETUP.md` - Email configuration
- `POSTMAN_GUIDE.md` - API testing guide
- `RESUME_GENERATOR_README.md` - Resume generator docs

## Summary

This is a **production-ready, full-stack portfolio management application** with:

- ✅ Complete authentication system
- ✅ Comprehensive portfolio management
- ✅ Resume generation (PDF/DOCX)
- ✅ Job matching intelligence
- ✅ Tech news integration
- ✅ File upload/download
- ✅ Modern UI with Tailwind CSS
- ✅ Serverless deployment ready
- ✅ MongoDB database integration
- ✅ Email verification support

The codebase demonstrates modern web development practices with TypeScript, Angular 17, Express.js, and MongoDB, designed for scalability and deployment on platforms like Vercel and Railway.

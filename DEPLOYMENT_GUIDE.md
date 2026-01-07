# Deployment Guide

This guide covers multiple deployment options for your Portfolio Application (Angular frontend + Express backend).

## Table of Contents
1. [Quick Deploy Options](#quick-deploy-options)
2. [Full-Stack Deployment](#full-stack-deployment)
3. [Separate Frontend/Backend Deployment](#separate-frontendbackend-deployment)
4. [Environment Variables Setup](#environment-variables-setup)
5. [Pre-Deployment Checklist](#pre-deployment-checklist)

---

## Quick Deploy Options

### Option 1: Railway (Recommended - Easiest Full-Stack)
**Best for:** Complete full-stack deployment with minimal configuration

1. **Sign up at [Railway.app](https://railway.app)**
2. **Deploy Backend:**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect Node.js
   - Add environment variables (see [Environment Variables](#environment-variables-setup))
   - Set start command: `node server.js`
   - Railway provides a URL like: `https://your-app.up.railway.app`

3. **Deploy Frontend:**
   - Create a new service in the same project
   - Build command: `npm run build`
   - Output directory: `dist/portfolio-app`
   - Add environment variable: `API_URL=https://your-backend.up.railway.app/api`
   - Railway will serve your Angular app

**Cost:** Free tier available, then pay-as-you-go

---

### Option 2: Render (Free Tier Available)
**Best for:** Free hosting with good performance

1. **Sign up at [Render.com](https://render.com)**

2. **Deploy Backend:**
   - New → Web Service
   - Connect your GitHub repo
   - Settings:
     - Build Command: `npm install`
     - Start Command: `node server.js`
     - Environment: Node
   - Add environment variables
   - Render provides: `https://your-app.onrender.com`

3. **Deploy Frontend:**
   - New → Static Site
   - Connect your GitHub repo
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist/portfolio-app`
   - Add environment variable for API URL

**Cost:** Free tier (spins down after inactivity), paid plans available

---

### Option 3: Vercel (Frontend) + Railway/Render (Backend)
**Best for:** Best performance for frontend, flexible backend

1. **Deploy Backend** (Railway or Render - see above)

2. **Deploy Frontend on Vercel:**
   - Sign up at [Vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Framework Preset: Angular
   - Build Command: `npm run build`
   - Output Directory: `dist/portfolio-app`
   - Environment Variables:
     - Add `API_URL` pointing to your backend
   - Update `environment.prod.ts` to use the environment variable

**Cost:** Free tier for frontend, backend costs vary

---

## Full-Stack Deployment

### Using Railway (All-in-One)

1. **Prepare your repository:**
   ```bash
   # Make sure all changes are committed
   git add .
   git commit -m "Prepare for deployment"
   git push
   ```

2. **Create Railway project:**
   - Go to Railway.app
   - New Project → Deploy from GitHub
   - Select your repo

3. **Configure Backend Service:**
   - Environment Variables:
     ```
     MONGODB_URI=your_mongodb_atlas_connection_string
     JWT_SECRET=your_strong_random_secret_key
     PORT=3001
     FRONTEND_URL=https://your-frontend-domain.com
     NODE_ENV=production
     ```
   - Start Command: `node server.js`

4. **Configure Frontend Service:**
   - Build Command: `npm install && npm run build -- --configuration production`
   - Output Directory: `dist/portfolio-app`
   - Environment Variables:
     ```
     API_URL=https://your-backend-service.up.railway.app/api
     ```

5. **Update CORS in server.js:**
   ```javascript
   // Update CORS to allow your frontend domain
   app.use(cors({
     origin: ['https://your-frontend-domain.com', 'http://localhost:4200'],
     credentials: true
   }));
   ```

---

## Separate Frontend/Backend Deployment

### Backend Deployment

#### Option A: Railway/Render (Recommended)
- Follow steps above for backend service
- Get your backend URL: `https://your-backend.up.railway.app`

#### Option B: Heroku
1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Set environment variables: `heroku config:set MONGODB_URI=...`
5. Deploy: `git push heroku main`

### Frontend Deployment

#### Option A: Vercel (Recommended)
1. Connect GitHub repo to Vercel
2. Framework: Angular
3. Build settings:
   - Build Command: `npm run build`
   - Output: `dist/portfolio-app`
4. Environment Variables:
   - `API_URL`: Your backend URL

#### Option B: Netlify
1. Connect GitHub repo to Netlify
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist/portfolio-app`
3. Add environment variables in Netlify dashboard

#### Option C: GitHub Pages
1. Build: `npm run build -- --configuration production --base-href=/your-repo-name/`
2. Install: `npm install -g angular-cli-ghpages`
3. Deploy: `ngh --dir=dist/portfolio-app`

---

## Environment Variables Setup

### Backend Environment Variables

Create a `.env` file or set in your hosting platform:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/portfolio?retryWrites=true&w=majority

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Port
PORT=3001

# Frontend URL (for CORS and email links)
FRONTEND_URL=https://your-frontend-domain.com

# Node Environment
NODE_ENV=production

# Email Configuration (if using email verification)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Frontend Environment Variables

Update `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-domain.com/api'
};
```

Or use environment variables in build:
- Vercel/Netlify: Set `API_URL` in dashboard
- Update build to use: `apiUrl: process.env['API_URL'] || '/api'`

---

## Pre-Deployment Checklist

### 1. Update Environment Files
- [ ] Update `environment.prod.ts` with production API URL
- [ ] Ensure `.env` file has all required variables
- [ ] **Never commit `.env` file to Git** (add to `.gitignore`)

### 2. Database Setup
- [ ] Set up MongoDB Atlas (free tier available)
- [ ] Get connection string
- [ ] Whitelist your deployment IPs (or use 0.0.0.0/0 for all)
- [ ] Test connection locally

### 3. Security
- [ ] Generate strong JWT_SECRET (use: `openssl rand -base64 32`)
- [ ] Update CORS settings to allow only your frontend domain
- [ ] Review and remove any hardcoded secrets
- [ ] Enable HTTPS (most platforms do this automatically)

### 4. Build Configuration
- [ ] Test production build locally: `npm run build`
- [ ] Verify `dist/portfolio-app` contains all files
- [ ] Check that API calls use production URL

### 5. Code Updates
- [ ] Update CORS in `server.js`:
  ```javascript
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://your-frontend.com',
    credentials: true
  }));
  ```

### 6. Testing
- [ ] Test API endpoints
- [ ] Test authentication flow
- [ ] Test portfolio CRUD operations
- [ ] Test image uploads (if applicable)

---

## Quick Start: Railway Deployment

### Step-by-Step:

1. **Prepare MongoDB Atlas:**
   ```bash
   # Go to mongodb.com/cloud/atlas
   # Create free cluster
   # Get connection string
   # Replace <password> with your password
   ```

2. **Deploy Backend:**
   - Railway.app → New Project → GitHub
   - Add environment variables
   - Deploy

3. **Deploy Frontend:**
   - Same project → New Service
   - Configure build
   - Add API_URL environment variable

4. **Update CORS:**
   - In `server.js`, update CORS origin to your frontend URL

5. **Test:**
   - Visit your frontend URL
   - Test login/register
   - Test portfolio features

---

## Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Update CORS origin in `server.js`
   - Check frontend API URL is correct

2. **Database Connection Failed:**
   - Verify MongoDB Atlas connection string
   - Check IP whitelist in Atlas
   - Verify network access in Atlas

3. **Build Fails:**
   - Check Node.js version (should be 18+)
   - Verify all dependencies in `package.json`
   - Check build logs for specific errors

4. **Environment Variables Not Working:**
   - Verify variable names match exactly
   - Check for typos
   - Restart service after adding variables

5. **API 404 Errors:**
   - Verify backend is running
   - Check API URL in frontend environment
   - Verify routes in `server.js`

---

## Recommended Setup for Production

**Best Combination:**
- **Frontend:** Vercel (fast, free, great CDN)
- **Backend:** Railway or Render (easy, reliable)
- **Database:** MongoDB Atlas (free tier, managed)

**Alternative:**
- **Full-Stack:** Railway (everything in one place)

---

## Next Steps After Deployment

1. Set up custom domain (optional)
2. Configure SSL/HTTPS (usually automatic)
3. Set up monitoring/logging
4. Configure backups for database
5. Set up CI/CD for automatic deployments

---

## Support

If you encounter issues:
1. Check platform logs (Railway/Render/Vercel dashboards)
2. Verify environment variables
3. Test API endpoints directly
4. Check browser console for frontend errors
5. Review server logs for backend errors


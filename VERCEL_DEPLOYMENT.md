# Vercel Deployment Guide

Complete guide to deploy your Portfolio Application using Vercel for the frontend.

## Overview

- **Frontend:** Vercel (Angular app)
- **Backend:** Railway or Render (Express API)
- **Database:** MongoDB Atlas

---

## Step 1: Set Up MongoDB Atlas

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new cluster (choose **FREE M0** tier)
4. Wait for cluster to be created (~3-5 minutes)
5. Click **"Connect"** → **"Connect your application"**
6. Copy the connection string
   - It looks like: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
7. Replace `<password>` with your database user password
8. Add database name: Change `?retryWrites=true` to `/portfolio?retryWrites=true`
9. **Network Access:** Click "Network Access" → "Add IP Address" → "Allow Access from Anywhere" (0.0.0.0/0)

**Save your connection string!** You'll need it in Step 2.

---

## Step 2: Deploy Backend (Railway - Recommended)

### Option A: Railway (Easiest)

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your repository
5. Railway will auto-detect Node.js
6. Click on the service → **"Variables"** tab
7. Add these environment variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/portfolio?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-random-string-here
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-app-name.vercel.app
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

8. Railway will automatically deploy
9. Wait for deployment (2-3 minutes)
10. Click **"Settings"** → Copy your **"Public Domain"** (e.g., `https://your-backend.up.railway.app`)
11. **Save this URL!** You'll need it for Vercel.

### Option B: Render (Alternative)

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click **"New"** → **"Web Service"**
4. Connect your GitHub repository
5. Configure:
   - **Name:** portfolio-backend
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
6. Add environment variables (same as Railway above)
7. Click **"Create Web Service"**
8. Wait for deployment
9. Copy your service URL (e.g., `https://portfolio-backend.onrender.com`)

---

## Step 3: Update Frontend Environment

Before deploying to Vercel, update your production environment file:

1. **First, deploy your backend** (Step 2) to get the backend URL
2. Open `src/environments/environment.prod.ts`
3. Update it with your backend URL:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend.up.railway.app/api'  // Replace with your actual backend URL from Step 2
};
```

**Important:** Replace `your-backend.up.railway.app` with your actual Railway/Render backend URL!

4. Save and commit:
```bash
git add src/environments/environment.prod.ts
git commit -m "Update production API URL for Vercel deployment"
git push
```

**Alternative:** You can also set this as an environment variable in Vercel (see Step 4), but updating the file is simpler.

---

## Step 4: Deploy Frontend to Vercel

### Initial Setup

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub (recommended) or email
3. Click **"Add New Project"**
4. Import your GitHub repository
5. Vercel will auto-detect Angular

### Configure Build Settings

**Good News:** A `vercel.json` configuration file is already included in your project!

Vercel should auto-detect Angular and use the configuration. However, verify these settings:

- **Framework Preset:** Angular
- **Root Directory:** `./` (leave as default)
- **Build Command:** `npm run build -- --configuration production`
- **Output Directory:** `dist/portfolio-app/browser` (Angular 17) or `dist/portfolio-app` (if build fails)
- **Install Command:** `npm install`

**Note:** The `vercel.json` file handles routing for Angular's client-side routing. If the build fails with "output directory not found":
1. Check the build logs to see the actual output path
2. Try changing Output Directory to: `dist/portfolio-app`
3. The build logs will show where files were actually created

### Environment Variables (Optional)

If you want to use environment variables instead of hardcoding the API URL:

1. In Vercel dashboard → Your Project → Settings → Environment Variables
2. Add:
   ```
   API_URL=https://your-backend.up.railway.app/api
   ```
3. Update `environment.prod.ts` to use it:
   ```typescript
   export const environment = {
     production: true,
     apiUrl: process.env['API_URL'] || '/api'
   };
   ```

**Note:** For simplicity, just updating `environment.prod.ts` directly (as in Step 3) is recommended. Environment variables are useful if you have multiple environments (staging, production).

### Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-5 minutes)
3. Vercel will provide a URL like: `https://your-app-name.vercel.app`
4. **Save this URL!**

---

## Step 5: Update Backend CORS

Now that you have your Vercel frontend URL, update your backend:

1. Go back to Railway/Render dashboard
2. Update the `FRONTEND_URL` environment variable:
   ```
   FRONTEND_URL=https://your-app-name.vercel.app
   ```
3. Railway/Render will automatically redeploy

**Note:** The server.js already has CORS configured to use `FRONTEND_URL`, so this should work automatically.

---

## Step 6: Test Your Deployment

1. Visit your Vercel URL: `https://your-app-name.vercel.app`
2. Test registration/login
3. Test portfolio features
4. Check browser console for any errors

### Common Issues:

**CORS Errors:**
- Verify `FRONTEND_URL` in backend matches your Vercel URL exactly
- Check backend logs to see if CORS is working

**API 404 Errors:**
- Verify API URL in `environment.prod.ts`
- Check backend is running (visit backend URL + `/api/health`)

**Build Errors:**
- Check Vercel build logs
- Verify Node.js version (should be 18+)
- Check for missing dependencies

---

## Step 7: Custom Domain (Optional)

1. In Vercel dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `FRONTEND_URL` in backend with your custom domain
5. Update `environment.prod.ts` if needed

---

## Environment Variables Summary

### Backend (Railway/Render):
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-random-secret
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend (Vercel - Optional):
```
API_URL=https://your-backend.up.railway.app/api
```

---

## Updating Your Deployment

### Update Frontend:
1. Make changes to your code
2. Commit and push to GitHub
3. Vercel automatically redeploys

### Update Backend:
1. Make changes to your code
2. Commit and push to GitHub
3. Railway/Render automatically redeploys

---

## Vercel-Specific Features

### Preview Deployments
- Every pull request gets a preview URL
- Perfect for testing before merging

### Analytics (Optional)
- Enable in Vercel dashboard
- See traffic and performance metrics

### Environment Variables per Branch
- Set different API URLs for staging/production
- Configure in Vercel dashboard → Settings → Environment Variables

---

## Troubleshooting

### Build Fails on Vercel

**Error: "Output directory not found"**
- Check build logs in Vercel dashboard - they show where files were created
- Try changing Output Directory in Vercel settings:
  - First try: `dist/portfolio-app/browser` (Angular 17)
  - If that fails: `dist/portfolio-app`
- The `vercel.json` file should handle this automatically, but you can override in Vercel dashboard

**Error: "Module not found"**
- Ensure all dependencies are in `package.json`
- Check `node_modules` is not in `.gitignore` (it shouldn't be)
- Run `npm install` locally to verify

**Error: "Angular CLI not found"**
- Vercel should auto-install, but verify build command includes `npm install`

### Runtime Errors

**API calls failing:**
- Check `environment.prod.ts` has correct backend URL
- Verify backend is running
- Check CORS settings in backend
- Check browser console for specific errors

**Authentication not working:**
- Verify JWT_SECRET is set in backend
- Check backend logs for authentication errors
- Verify token is being sent in requests

### Database Connection Issues

**Connection timeout:**
- Check MongoDB Atlas IP whitelist (should allow all: 0.0.0.0/0)
- Verify connection string is correct
- Check MongoDB Atlas cluster is running

---

## Cost Estimate

- **Vercel:** FREE (Hobby plan - generous limits)
  - Unlimited deployments
  - 100GB bandwidth/month
  - Custom domains
- **Railway:** FREE tier, then ~$5/month
- **Render:** FREE tier (spins down after inactivity), then ~$7/month
- **MongoDB Atlas:** FREE (M0 tier - 512MB storage)

**Total: FREE to start!**

---

## Next Steps

1. ✅ Set up monitoring (Vercel Analytics)
2. ✅ Configure custom domain
3. ✅ Set up email service (for email verification)
4. ✅ Enable backups for MongoDB
5. ✅ Set up CI/CD workflows

---

## Quick Reference

**Frontend URL:** `https://your-app-name.vercel.app`  
**Backend URL:** `https://your-backend.up.railway.app`  
**API Endpoint:** `https://your-backend.up.railway.app/api`  
**Health Check:** `https://your-backend.up.railway.app/api/health`

---

## Support

If you encounter issues:
1. Check Vercel build logs
2. Check Railway/Render deployment logs
3. Check browser console
4. Verify all environment variables are set
5. Test API endpoints directly (use Postman or curl)

Your app should now be live! 🚀


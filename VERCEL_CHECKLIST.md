# Vercel Deployment Checklist

Quick checklist to deploy your app to Vercel.

## Pre-Deployment

- [ ] MongoDB Atlas account created
- [ ] MongoDB cluster created and running
- [ ] MongoDB connection string ready
- [ ] JWT secret generated (use: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)

## Step 1: Deploy Backend

- [ ] Railway/Render account created
- [ ] Backend deployed on Railway/Render
- [ ] Environment variables set:
  - [ ] `MONGODB_URI`
  - [ ] `JWT_SECRET`
  - [ ] `PORT=3001`
  - [ ] `NODE_ENV=production`
  - [ ] `FRONTEND_URL` (will update after Vercel deployment)
- [ ] Backend URL copied (e.g., `https://your-backend.up.railway.app`)

## Step 2: Update Frontend

- [ ] `src/environments/environment.prod.ts` updated with backend URL
- [ ] Changes committed and pushed to GitHub

## Step 3: Deploy to Vercel

- [ ] Vercel account created
- [ ] GitHub repository connected
- [ ] Project imported
- [ ] Build settings verified:
  - [ ] Framework: Angular
  - [ ] Build Command: `npm run build -- --configuration production`
  - [ ] Output Directory: `dist/portfolio-app/browser` (or `dist/portfolio-app` if that fails)
- [ ] Deployment started
- [ ] Build successful
- [ ] Vercel URL copied (e.g., `https://your-app.vercel.app`)

## Step 4: Final Configuration

- [ ] `FRONTEND_URL` updated in backend with Vercel URL
- [ ] Backend redeployed (automatic on Railway/Render)
- [ ] Application tested:
  - [ ] Registration works
  - [ ] Login works
  - [ ] Portfolio features work
  - [ ] No console errors

## Troubleshooting

If something doesn't work:
- [ ] Check Vercel build logs
- [ ] Check backend deployment logs
- [ ] Check browser console for errors
- [ ] Verify API URL in `environment.prod.ts`
- [ ] Verify CORS settings in backend
- [ ] Test backend health endpoint: `https://your-backend.up.railway.app/api/health`

## Done! 🎉

Your app is now live at: `https://your-app.vercel.app`







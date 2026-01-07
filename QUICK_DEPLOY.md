# Quick Deployment Guide

## Fastest Way: Railway (5 minutes)

### Step 1: Set up MongoDB Atlas (Free)
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up (free tier available)
3. Create a cluster (choose free M0)
4. Create a database user (username/password)
5. Get connection string:
   - Click "Connect" → "Connect your application"
   - Copy connection string
   - Replace `<password>` with your password
   - Example: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/portfolio?retryWrites=true&w=majority`

### Step 2: Deploy Backend on Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway auto-detects Node.js
6. Add Environment Variables:
   ```
   MONGODB_URI=your_mongodb_atlas_connection_string_here
   JWT_SECRET=generate_a_random_string_here
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://your-app-name.up.railway.app
   ```
7. Click "Deploy"
8. Wait for deployment (2-3 minutes)
9. Copy your backend URL (e.g., `https://your-app-name.up.railway.app`)

### Step 3: Deploy Frontend on Railway
1. In the same Railway project, click "+ New" → "Empty Service"
2. Connect to the same GitHub repo
3. Settings:
   - **Build Command:** `npm install && npm run build -- --configuration production`
   - **Start Command:** `npx serve -s dist/portfolio-app -l $PORT` (or use Railway's static file serving)
   - **Output Directory:** `dist/portfolio-app`
   - **Root Directory:** (leave empty)
4. Add Environment Variable:
   ```
   API_URL=https://your-backend-url.up.railway.app/api
   ```
5. Deploy

**Alternative:** Use Railway's static site feature (if available) - it will automatically serve the files.

### Step 4: Update Frontend Environment
Update `src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-url.up.railway.app/api'
};
```

Commit and push:
```bash
git add src/environments/environment.prod.ts
git commit -m "Update production API URL"
git push
```

Railway will auto-redeploy.

### Step 5: Update CORS
The server.js already handles CORS, but verify `FRONTEND_URL` matches your frontend URL.

### Step 6: Test
1. Visit your frontend URL
2. Register a new account
3. Test portfolio features

---

## Alternative: Vercel (Frontend) + Railway (Backend)

### Backend: Same as Step 2 above

### Frontend: Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. "Add New Project" → Import your repo
4. Framework: Angular
5. Build Settings:
   - Build Command: `npm run build`
   - Output Directory: `dist/portfolio-app`
6. Environment Variables:
   - `API_URL`: Your Railway backend URL + `/api`
7. Deploy

---

## Generate JWT Secret

Run this command to generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Or use an online generator: [randomkeygen.com](https://randomkeygen.com)

---

## Environment Variables Summary

### Backend (Railway):
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - Random secure string
- `PORT` - 3001 (or leave default)
- `NODE_ENV` - production
- `FRONTEND_URL` - Your frontend URL

### Frontend (Railway/Vercel):
- `API_URL` - Your backend URL + `/api`

---

## Troubleshooting

**CORS Errors:**
- Check `FRONTEND_URL` matches your actual frontend domain
- Verify API URL in frontend environment file

**Database Connection Failed:**
- Check MongoDB Atlas connection string
- Verify IP whitelist (add 0.0.0.0/0 for all IPs in Atlas)
- Check username/password in connection string

**Build Fails:**
- Check Railway/Vercel logs
- Verify Node.js version (should be 18+)
- Check for missing dependencies

**404 on API:**
- Verify backend is running (check Railway logs)
- Check API URL in frontend environment
- Ensure routes start with `/api`

---

## Cost Estimate

- **MongoDB Atlas:** Free (M0 tier)
- **Railway:** Free tier available, then ~$5-10/month
- **Vercel:** Free tier (generous limits)

**Total: FREE to start, ~$5-10/month for production**

---

## Next Steps

1. Set up custom domain (optional)
2. Configure email service (for email verification)
3. Set up monitoring
4. Configure automatic backups

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.


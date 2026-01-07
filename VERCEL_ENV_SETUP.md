# Vercel Environment Variables Setup Guide

## Quick Steps to Add Environment Variables in Vercel

### Step 1: Access Your Vercel Project
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click on your project: **Portfiolio**
3. Click on **Settings** (top navigation)
4. Click on **Environment Variables** (left sidebar)

### Step 2: Add Each Environment Variable

Click **"Add New"** for each variable below:

#### 1. MONGODB_URI
- **Key:** `MONGODB_URI`
- **Value:** Your MongoDB Atlas connection string
  - Format: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/portfolio?retryWrites=true&w=majority`
  - Get this from: MongoDB Atlas → Connect → Connect your application
- **Environment:** Select all (Production, Preview, Development)
- Click **Save**

#### 2. JWT_SECRET
- **Key:** `JWT_SECRET`
- **Value:** `+y9Fo6XrPRhz06BIvqPjbN/hGB1RyXwtBWdgalVBx0E=`
  - (Or generate a new one using: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
- **Environment:** Select all (Production, Preview, Development)
- Click **Save**

#### 3. NODE_ENV
- **Key:** `NODE_ENV`
- **Value:** `production`
- **Environment:** Select all (Production, Preview, Development)
- Click **Save**

#### 4. FRONTEND_URL
- **Key:** `FRONTEND_URL`
- **Value:** `https://portfiolio-pavansais-projects-2abe6514.vercel.app`
- **Environment:** Select all (Production, Preview, Development)
- Click **Save**

### Step 3: Redeploy Your Application

After adding all environment variables:

1. Go to **Deployments** tab
2. Click the **three dots (⋯)** on your latest deployment
3. Click **Redeploy**
4. Or simply push a new commit to trigger automatic redeployment

## Visual Guide

```
Vercel Dashboard
├── Your Project (Portfiolio)
    ├── Settings
    │   ├── General
    │   ├── Environment Variables  ← Click here
    │   │   ├── Add New
    │   │   │   ├── Key: MONGODB_URI
    │   │   │   ├── Value: mongodb+srv://...
    │   │   │   └── Environment: [✓] Production [✓] Preview [✓] Development
    │   │   ├── Add New (repeat for each variable)
    │   │   └── ...
    │   └── ...
    └── Deployments
        └── Redeploy (after adding variables)
```

## Important Notes

1. **MongoDB Atlas Setup:**
   - Make sure your MongoDB Atlas cluster allows connections from anywhere (0.0.0.0/0)
   - Go to: MongoDB Atlas → Network Access → Add IP Address → Allow Access from Anywhere

2. **JWT_SECRET:**
   - Keep this secret secure
   - Don't commit it to Git
   - Use the generated value above or create a new one

3. **After Adding Variables:**
   - You MUST redeploy for changes to take effect
   - Environment variables are only loaded during deployment

4. **Testing:**
   - After redeployment, test login at: `https://portfiolio-pavansais-projects-2abe6514.vercel.app/login`
   - Check Vercel Function Logs if you encounter errors

## Troubleshooting

**Variables not working?**
- Make sure you selected all environments (Production, Preview, Development)
- Redeploy after adding variables
- Check Vercel Function Logs for errors

**MongoDB connection errors?**
- Verify your connection string is correct
- Check MongoDB Atlas Network Access settings
- Ensure database name is included in connection string: `/portfolio?retryWrites=true&w=majority`

**Still getting 405 error?**
- Verify all environment variables are set correctly
- Check that `api/[...path].js` file exists
- Review Vercel deployment logs




# Vercel Function Consolidation

## Problem
Vercel Hobby plan has a limit of 12 Serverless Functions per deployment. The project had 13+ individual API route files, each being deployed as a separate function, exceeding this limit.

## Solution
Consolidated all API routes into a single unified serverless function.

## Changes Made

### 1. Unified API Handler
- **File**: `api/[...path].js`
- **Purpose**: Single catch-all function that handles ALL `/api/*` routes
- **How it works**: 
  - Uses Vercel's catch-all route syntax `[...path]` to capture all API paths
  - Reconstructs the full path from Vercel's path parameters
  - Routes requests to the Express app in `server.js`
  - Handles database connections and error handling

### 2. Archived Individual Files
- **Location**: `_api_archive/` (moved outside `api/` directory)
- **Reason**: Vercel automatically detects ANY file in the `api/` directory as a serverless function
- **Files archived**:
  - `api/auth/[...path].js`
  - `api/health.js`
  - `api/jobs.js`
  - `api/portfolio.js` and nested routes
  - `api/resume.js`
  - `api/resumes.js`
  - `api/tech-news.js`

### 3. Updated Configuration
- **vercel.json**: Added function configuration for the unified handler
- **.vercelignore**: Added `_api_archive/` to ignore list

## Result
- **Before**: 13+ serverless functions (exceeded limit)
- **After**: 1 serverless function (within limit)

## How It Works

When a request comes to `/api/*`, Vercel routes it to `api/[...path].js`. The handler:

1. Extracts the path from `req.query.path` (Vercel's catch-all parameter)
2. Reconstructs the full API path (e.g., `/api/portfolio/experience/123`)
3. Extracts dynamic route parameters (e.g., `id` from `/api/resumes/:id`)
4. Sets up the request object for Express
5. Routes to the Express app which handles the actual business logic

## Testing

All existing API endpoints should continue to work without any frontend changes:
- `/api/auth/*` - Authentication routes
- `/api/portfolio/*` - Portfolio management
- `/api/resume` - Resume generation
- `/api/resumes/*` - Resume file management
- `/api/jobs` - Job listings
- `/api/tech-news` - Tech news feed
- `/api/health` - Health check

## Deployment

1. Ensure only `api/[...path].js` exists in the `api/` directory
2. Deploy to Vercel - it should now detect only 1 serverless function
3. All API routes will be handled by the unified function

## Troubleshooting

If you see errors about function limits:
1. Verify `api/` directory only contains `[...path].js`
2. Check that `_api_archive/` is outside the `api/` directory
3. Verify `.vercelignore` includes `_api_archive/`
4. Check Vercel deployment logs to see which functions are being detected



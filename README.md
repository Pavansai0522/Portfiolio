# Portfolio Application

A modern portfolio website built with Angular 17, Tailwind CSS, and Express.js backend.

## Features

- ✨ Modern, responsive UI with Tailwind CSS
- 📝 Edit and manage your portfolio data
- 🖼️ Upload profile and project images
- 💼 Add and manage projects
- 🔗 Social media links
- 💾 Backend API with Express.js
- 🚀 Real-time data synchronization

## Prerequisites

- Node.js (v18 or higher)
- npm
- MongoDB (local or MongoDB Atlas account)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up MongoDB:
   - **Option A:** Install MongoDB locally (see [DATABASE_SETUP.md](DATABASE_SETUP.md))
   - **Option B:** Use MongoDB Atlas (free cloud database - see [DATABASE_SETUP.md](DATABASE_SETUP.md))

3. Configure environment:
   - The `.env` file is already created with default settings
   - For MongoDB Atlas, update `MONGODB_URI` in `.env` file

## Running the Application

### Option 1: Run Both Frontend and Backend Together (Recommended)
```bash
npm run start:dev
```
This will start both the backend server (port 3001) and Angular dev server (port 4200) simultaneously.

### Option 2: Run Separately

**Backend Server:**
```bash
npm run start:backend
```
Backend runs on `http://localhost:3001`

**Frontend (Angular):**
```bash
npm start
```
Frontend runs on `http://localhost:4200`

## API Endpoints

The backend API provides the following endpoints:

- `GET /api/portfolio` - Get portfolio data
- `PUT /api/portfolio` - Update portfolio data
- `POST /api/portfolio/projects` - Add a new project
- `PUT /api/portfolio/projects/:id` - Update a project
- `DELETE /api/portfolio/projects/:id` - Delete a project
- `GET /api/health` - Health check

## Data Storage

Portfolio data is stored in **MongoDB** database. The database connection is configured in `.env` file.

- **Local MongoDB:** `mongodb://localhost:27017/portfolio`
- **MongoDB Atlas:** Update `MONGODB_URI` in `.env` with your Atlas connection string

See [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed setup instructions.

## Project Structure

```
├── server.js              # Express backend server
├── src/                   # Angular frontend
│   ├── app/
│   │   ├── components/   # Angular components
│   │   └── services/     # Angular services
│   └── environments/     # Environment configuration
└── data/                  # Backend data storage (auto-created)
```

## Development

- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:3001/api`

## Building for Production

```bash
npm run build:prod
```

The production build will be in the `dist/portfolio-app` directory.

## Deployment

Ready to deploy your application? Check out our deployment guides:

- **[Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md)** ⭐ - Complete guide for deploying with Vercel (Recommended)
- **[Quick Deploy Guide](./QUICK_DEPLOY.md)** - Get live in 5 minutes with Railway
- **[Full Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Comprehensive guide with multiple hosting options
- **[Vercel Checklist](./VERCEL_CHECKLIST.md)** - Quick checklist for Vercel deployment

### Quick Start (Vercel):
1. Set up MongoDB Atlas (free)
2. Deploy backend on Railway/Render
3. Update `environment.prod.ts` with backend URL
4. Deploy frontend to Vercel
5. Update backend `FRONTEND_URL`
6. Done! 🚀

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed step-by-step instructions.

## Environment Configuration

- Development: `src/environments/environment.ts` (API: `http://localhost:3001/api`)
- Production: `src/environments/environment.prod.ts` (API: Update with your backend URL)


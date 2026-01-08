# Database Setup Guide

This application uses **MongoDB** as the database. You have two options:

## Option 1: Local MongoDB (Recommended for Development)

### Step 1: Install MongoDB

**Windows:**
1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Run the installer and follow the setup wizard
3. MongoDB will be installed as a Windows service

**macOS:**
```bash
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### Step 2: Verify MongoDB is Running

Open a terminal and run:
```bash
mongosh
```

If you see the MongoDB shell, you're good to go! Type `exit` to leave.

### Step 3: Configure Connection

The `.env` file is already configured for local MongoDB:
```
MONGODB_URI=mongodb://localhost:27017/portfolio
```

### Step 4: Start the Server

```bash
npm run start:backend
```

You should see:
```
✅ MongoDB Connected: localhost:27017
🚀 Backend server running on http://localhost:3001
```

---

## Option 2: MongoDB Atlas (Cloud - Free)

### Step 1: Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up for a free account
3. Create a free cluster (M0 - Free tier)

### Step 2: Get Connection String

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database password
5. Replace `<dbname>` with `portfolio` (or any name you prefer)

Example:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/portfolio?retryWrites=true&w=majority
```

### Step 3: Update .env File

Edit `.env` and replace `MONGODB_URI` with your Atlas connection string:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/portfolio?retryWrites=true&w=majority
PORT=3001
```

### Step 4: Configure Network Access

1. In MongoDB Atlas, go to "Network Access"
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
   - Or add your specific IP address for production

### Step 5: Start the Server

```bash
npm run start:backend
```

---

## Verify Database Connection

### Check Health Endpoint

In Postman or browser, visit:
```
GET http://localhost:3001/api/health
```

Response should include:
```json
{
  "status": "ok",
  "message": "Portfolio API is running",
  "database": "connected"
}
```

### Test with Postman

1. **GET** `/api/portfolio` - Should return empty/default portfolio
2. **PUT** `/api/portfolio` - Update portfolio data
3. **POST** `/api/portfolio/projects` - Add a project
4. **GET** `/api/portfolio` - Verify data was saved

---

## Database Structure

The database uses a single collection called `portfolios` with this structure:

```javascript
{
  name: String,
  title: String,
  bio: String,
  email: String,
  phone: String,
  location: String,
  profileImage: String (base64),
  skills: [String],
  projects: [
    {
      _id: ObjectId,
      title: String,
      description: String,
      technologies: [String],
      image: String,
      link: String,
      createdAt: Date,
      updatedAt: Date
    }
  ],
  socialLinks: {
    linkedin: String,
    github: String,
    twitter: String,
    website: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## Troubleshooting

### Error: "MongoServerError: connect ECONNREFUSED"

**Solution:** MongoDB is not running
- Windows: Check Services, start MongoDB service
- macOS/Linux: `brew services start mongodb-community` or `sudo systemctl start mongodb`

### Error: "MongooseError: Operation `portfolios.findOne()` buffering timed out"

**Solution:** Check your connection string in `.env` file
- Verify MongoDB is running
- Check if the connection string is correct
- For Atlas: Verify network access is configured

### Error: "Authentication failed"

**Solution:** 
- For Atlas: Check username/password in connection string
- Verify database user has proper permissions

### Port Already in Use

**Solution:** Change PORT in `.env` file or stop the process using port 3001

---

## Migration from JSON File

If you have existing data in `data/portfolio.json`, you can migrate it:

1. Start MongoDB
2. Start the backend server
3. Use Postman to POST your existing data:
   - **PUT** `/api/portfolio` with your JSON data
4. The data will be automatically saved to MongoDB

---

## Next Steps

Once MongoDB is connected:
- ✅ Data persists in database
- ✅ Multiple users can access the same data
- ✅ Better performance and scalability
- ✅ Automatic backups (with Atlas)

Your portfolio data is now stored in a proper database! 🎉







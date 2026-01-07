const mongoose = require('mongoose');

// Cache the connection promise to avoid multiple connection attempts
let cachedConnection = null;

const connectDB = async () => {
  // If already connected, return the existing connection
  if (mongoose.connection.readyState === 1) {
    console.log('MongoDB already connected');
    return mongoose.connection;
  }

  // If connection is in progress, return the cached promise
  if (cachedConnection) {
    console.log('MongoDB connection in progress, waiting...');
    return cachedConnection;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    const error = new Error('MONGODB_URI environment variable is not set');
    console.error('❌', error.message);
    throw error;
  }

  console.log('Connecting to MongoDB...');
  console.log('MongoDB URI:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials in logs

  // Create new connection promise
  cachedConnection = mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // 10 second timeout
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    maxPoolSize: 1, // Limit connections for serverless
    minPoolSize: 0, // Allow connection pool to close
  }).then((conn) => {
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    cachedConnection = null; // Clear cache on success
    return conn;
  }).catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Error details:', error);
    // Don't exit process in serverless - just log the error
    // The connection will be retried on next request
    cachedConnection = null;
    throw error;
  });

  return cachedConnection;
};

module.exports = connectDB;




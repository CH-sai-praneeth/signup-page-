const mongoose = require('mongoose');

//Connect to MongoDB Database
//Uses your Docker MongoDB container
const connectDB = async () => {
  try {
    // Get database URL from environment variables
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oauth';
    
    // Connection options for better performance and reliability
    const options = {
      useNewUrlParser: true,           // Use new URL parser
      useUnifiedTopology: true,        // Use new connection management
      maxPoolSize: 10,                 // Maximum connections in pool
      serverSelectionTimeoutMS: 5000,  // Timeout for server selection
      socketTimeoutMS: 45000,          // Socket timeout
    };

    // Connect to MongoDB
    console.log(' Connecting to MongoDB...');
    const connection = await mongoose.connect(mongoURI, options);
    
    // Success message
    console.log(' MongoDB Connected Successfully!');
    console.log(` Database Host: ${connection.connection.host}`);
    console.log(` Database Name: ${connection.connection.name}`);
    console.log(` Database Port: ${connection.connection.port}`);
    
    return connection;
    
  } catch (error) {
    // Error handling
    console.error(' MongoDB Connection Error:');
    console.error(' Error Message:', error.message);
    
    // Different error messages for common issues
    if (error.message.includes('ECONNREFUSED')) {
      console.error(' Make sure MongoDB Docker container is running!');
      console.error(' Run: docker-compose up mongodb');
    } else if (error.message.includes('authentication')) {
      console.error(' Check your database credentials in .env file');
    } else if (error.message.includes('timeout')) {
      console.error(' Database connection timeout - check network/Docker');
    }
    
    // Exit process if can't connect to database
    console.error(' Exiting application...');
    process.exit(1);
  }
};

//Handle MongoDB connection events
const setupDatabaseEvents = () => {
  // When MongoDB connects
  mongoose.connection.on('connected', () => {
    console.log(' Mongoose connected to MongoDB');
  });

  // When MongoDB disconnects
  mongoose.connection.on('disconnected', () => {
    console.log(' Mongoose disconnected from MongoDB');
  });

  // When MongoDB connection has error
  mongoose.connection.on('error', (error) => {
    console.error(' Mongoose connection error:', error.message);
  });

  // Graceful shutdown - close connection when app shuts down
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      console.log(' MongoDB connection closed due to app termination');
      process.exit(0);
    } catch (error) {
      console.error(' Error during graceful shutdown:', error.message);
      process.exit(1);
    }
  });
};

//Initialize database connection with events
const initializeDatabase = async () => {
  console.log('Database connection disabled for testing');
  return;
};

// Export functions for use in other files
module.exports = {
  connectDB,
  initializeDatabase
};

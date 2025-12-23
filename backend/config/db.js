const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);

    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB Atlas');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ Mongoose disconnected from MongoDB Atlas');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🛑 MongoDB Atlas connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error.message);
    process.exit(1);
  }
};

// Database health check
const checkDBHealth = async () => {
  try {
    const adminDB = mongoose.connection.db.admin();
    const result = await adminDB.ping();
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error.message);
    return false;
  }
};

// Get database statistics
const getDBStats = async () => {
  try {
    const stats = await mongoose.connection.db.stats();
    return {
      collections: stats.collections,
      dataSizeMB: (stats.dataSize / 1024 / 1024).toFixed(2),
      storageSizeMB: (stats.storageSize / 1024 / 1024).toFixed(2),
      indexes: stats.indexes,
    };
  } catch (error) {
    console.error('❌ Error getting database statistics:', error.message);
    return null;
  }
};

module.exports = { connectDB, checkDBHealth, getDBStats };

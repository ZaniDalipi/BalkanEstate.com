import mongoose from 'mongoose';
import { initializeDatabase } from '../utils/initDatabase';
import { dbLogger } from '../utils/logger';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';

    await mongoose.connect(mongoURI);

    dbLogger.info('MongoDB connected successfully');

    // Initialize database (fix indexes, etc.)
    await initializeDatabase();

    mongoose.connection.on('error', (err) => {
      dbLogger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      dbLogger.info('MongoDB disconnected');
    });

  } catch (error) {
    dbLogger.error('Error connecting to MongoDB:', error);
    dbLogger.error('⚠️  Server will continue running but database operations will fail');
    dbLogger.error('💡 Make sure MongoDB is running: brew services start mongodb-community (macOS) or sudo systemctl start mongod (Linux)');
    // Don't exit - allow server to start for debugging
  }
};

export default connectDB;

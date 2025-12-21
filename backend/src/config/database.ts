import mongoose from 'mongoose';
import { initializeDatabase } from '../utils/initDatabase';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';

    await mongoose.connect(mongoURI);

    console.log('MongoDB connected successfully');

    // Initialize database (fix indexes, etc.)
    await initializeDatabase();

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    console.error('⚠️  Server will continue running but database operations will fail');
    console.error('💡 Make sure MongoDB is running: brew services start mongodb-community (macOS) or sudo systemctl start mongod (Linux)');
    // Don't exit - allow server to start for debugging
  }
};

export default connectDB;

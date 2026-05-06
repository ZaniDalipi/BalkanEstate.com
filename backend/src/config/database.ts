import mongoose from 'mongoose';
import { initializeDatabase } from '../utils/initDatabase';
import { dbLogger } from '../utils/logger';
import { encodeId } from '../utils/idObfuscation';

// Global Mongoose toJSON transform:
// 1. Strips internal __v field
// 2. Obfuscates _id → id so raw MongoDB ObjectIds never appear in JSON responses
// This applies whenever a Mongoose document is serialized via res.json().
mongoose.set('toJSON', {
  transform(_doc: any, ret: any) {
    if (ret._id) {
      ret.id = encodeId(String(ret._id));
      delete ret._id;
    }
    delete ret.__v;
    return ret;
  },
});
// toObject is used for internal backend manipulation — keep raw _id intact here.
mongoose.set('toObject', {
  transform(_doc: any, ret: any) {
    delete ret.__v;
    return ret;
  },
});

const connectDB = async (): Promise<void> => {
  let mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';

  // In development, fall back to in-memory MongoDB if local connection fails
  const isDev = process.env.NODE_ENV !== 'production';

  try {
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
    dbLogger.info('MongoDB connected successfully');
  } catch (error) {
    if (isDev && !process.env.MONGODB_URI) {
      dbLogger.warn('Local MongoDB unavailable — starting in-memory MongoDB for development');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const memServer = await MongoMemoryServer.create({
          binary: { version: '7.0.14', platform: 'linux', arch: 'x64', os: { os: 'linux', dist: 'ubuntu', release: '22.04' } },
        });
        mongoURI = memServer.getUri();
        process.env.MONGODB_URI = mongoURI;
        await mongoose.connect(mongoURI);
        dbLogger.info('✅ Connected to in-memory MongoDB (data resets on restart)');
      } catch (memError) {
        dbLogger.error('Failed to start in-memory MongoDB:', memError);
        dbLogger.error('⚠️  Server will continue running but database operations will fail');
        return;
      }
    } else {
      dbLogger.error('Error connecting to MongoDB:', error);
      dbLogger.error('⚠️  Server will continue running but database operations will fail');
      return;
    }
  }

  try {
    await initializeDatabase();
  } catch (initError) {
    dbLogger.warn('Database initialization skipped:', initError);
  }

  mongoose.connection.on('error', (err) => {
    dbLogger.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    dbLogger.info('MongoDB disconnected');
  });
};

export default connectDB;

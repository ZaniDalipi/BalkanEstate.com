import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('FixUserIndex');

// Load environment variables
dotenv.config();

const fixUserIndex = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    log.info('Connected to MongoDB');

    // Get the User collection
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const usersCollection = db.collection('users');

    // Drop the old compound index
    try {
      await usersCollection.dropIndex('provider_1_providerId_1');
      log.info('✅ Dropped old provider_providerId index');
    } catch (error: any) {
      if (error.code === 27) {
        log.info('ℹ️  Index does not exist, skipping drop');
      } else {
        throw error;
      }
    }

    // Create the new partial index
    await usersCollection.createIndex(
      { provider: 1, providerId: 1 },
      {
        unique: true,
        partialFilterExpression: { providerId: { $ne: null } },
        name: 'provider_1_providerId_1'
      }
    );
    log.info('✅ Created new partial index for OAuth users');

    // Verify the indexes
    const indexes = await usersCollection.indexes();
    log.info('\nCurrent indexes:');
    indexes.forEach((index) => {
      log.info(`  - ${index.name}:`, JSON.stringify(index.key));
      if (index.partialFilterExpression) {
        log.info(`    Partial filter: ${JSON.stringify(index.partialFilterExpression)}`);
      }
    });

    log.info('\n✅ Index fix completed successfully!');
    process.exit(0);
  } catch (error) {
    log.error('❌ Error fixing index:', error);
    process.exit(1);
  }
};

fixUserIndex();

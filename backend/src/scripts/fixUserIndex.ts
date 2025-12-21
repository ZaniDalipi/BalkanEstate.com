import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const fixUserIndex = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get the User collection
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const usersCollection = db.collection('users');

    // Drop the old compound index
    try {
      await usersCollection.dropIndex('provider_1_providerId_1');
      console.log('✅ Dropped old provider_providerId index');
    } catch (error: any) {
      if (error.code === 27) {
        console.log('ℹ️  Index does not exist, skipping drop');
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
    console.log('✅ Created new partial index for OAuth users');

    // Verify the indexes
    const indexes = await usersCollection.indexes();
    console.log('\nCurrent indexes:');
    indexes.forEach((index) => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
      if (index.partialFilterExpression) {
        console.log(`    Partial filter: ${JSON.stringify(index.partialFilterExpression)}`);
      }
    });

    console.log('\n✅ Index fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing index:', error);
    process.exit(1);
  }
};

fixUserIndex();

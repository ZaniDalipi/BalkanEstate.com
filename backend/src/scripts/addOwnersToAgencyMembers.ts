import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Agency from '../models/Agency';

// Load environment variables
dotenv.config();

const addOwnersToAgencyMembers = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all agencies
    const agencies = await Agency.find({});
    console.log(`Found ${agencies.length} agencies to process`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const agency of agencies) {
      // Check if owner is already in agents array
      const ownerIdString = agency.ownerId.toString();
      const isOwnerInAgents = agency.agents.some(
        (agentId: mongoose.Types.ObjectId) => agentId.toString() === ownerIdString
      );

      if (!isOwnerInAgents) {
        console.log(`➕ Adding owner to agency: ${agency.name}`);
        // Add owner to agents array
        agency.agents.unshift(agency.ownerId); // Add at the beginning
        agency.totalAgents = agency.agents.length;
        await agency.save();
        updatedCount++;
      } else {
        console.log(`✓ Owner already in agency: ${agency.name}`);
        skippedCount++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total agencies: ${agencies.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped (already correct): ${skippedCount}`);
    console.log('✅ Migration completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
};

addOwnersToAgencyMembers();

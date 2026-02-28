import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Agency from '../models/Agency';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('AddOwners');

// Load environment variables
dotenv.config();

const addOwnersToAgencyMembers = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    log.info('Connected to MongoDB');

    // Find all agencies
    const agencies = await Agency.find({});
    log.info(`Found ${agencies.length} agencies to process`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const agency of agencies) {
      // Check if owner is already in agents array
      const ownerIdString = agency.ownerId.toString();
      const isOwnerInAgents = agency.agents.some(
        (agentId: mongoose.Types.ObjectId) => agentId.toString() === ownerIdString
      );

      if (!isOwnerInAgents) {
        log.info(`➕ Adding owner to agency: ${agency.name}`);
        // Add owner to agents array
        agency.agents.unshift(agency.ownerId); // Add at the beginning
        agency.totalAgents = agency.agents.length;
        await agency.save();
        updatedCount++;
      } else {
        log.info(`✓ Owner already in agency: ${agency.name}`);
        skippedCount++;
      }
    }

    log.info('\n=== Migration Summary ===');
    log.info(`Total agencies: ${agencies.length}`);
    log.info(`Updated: ${updatedCount}`);
    log.info(`Skipped (already correct): ${skippedCount}`);
    log.info('✅ Migration completed successfully!');

    process.exit(0);
  } catch (error) {
    log.error('❌ Error during migration:', error);
    process.exit(1);
  }
};

addOwnersToAgencyMembers();

/**
 * Migration Script: Sync Agent Records
 *
 * This script ensures all users with role='agent' have corresponding
 * records in the Agent collection. This fixes the issue where agents
 * appear in the app but not in the agents list or database Agent collection.
 *
 * Usage: node dist/scripts/syncAgents.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Agent from '../models/Agent';
import Agency from '../models/Agency';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('SyncAgents');

dotenv.config();

const syncAgents = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    log.info('✅ Connected to MongoDB');

    // Find all users with agent role
    const agentUsers = await User.find({ role: 'agent' });
    log.info(`\n📊 Found ${agentUsers.length} users with agent role`);

    let synced = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of agentUsers) {
      try {
        // Check if Agent record already exists
        const existingAgent = await Agent.findOne({ userId: user._id });

        if (existingAgent) {
          // Update existing agent with latest user info
          let needsUpdate = false;

          if (existingAgent.agencyName !== user.agencyName) {
            existingAgent.agencyName = user.agencyName || 'Independent Agent';
            needsUpdate = true;
          }

          if (user.agencyId && existingAgent.agencyId?.toString() !== user.agencyId.toString()) {
            existingAgent.agencyId = user.agencyId;
            needsUpdate = true;
          }

          if (existingAgent.agentId !== user.agentId) {
            existingAgent.agentId = user.agentId || `AG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            needsUpdate = true;
          }

          if (existingAgent.licenseNumber !== user.licenseNumber) {
            existingAgent.licenseNumber = user.licenseNumber || '';
            needsUpdate = true;
          }

          if (existingAgent.licenseVerified !== user.licenseVerified) {
            existingAgent.licenseVerified = user.licenseVerified || false;
            needsUpdate = true;
          }

          if (!existingAgent.isActive) {
            existingAgent.isActive = true;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await existingAgent.save();
            log.info(`  ✏️  Updated agent record for ${user.email} (${user.agentId})`);
            updated++;
          } else {
            log.info(`  ⏭️  Agent record already up-to-date for ${user.email}`);
            skipped++;
          }
        } else {
          // Create new Agent record
          const agentId = user.agentId || `AG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          const agencyName = user.agencyName || 'Independent Agent';

          // Update user if agentId was missing
          if (!user.agentId) {
            user.agentId = agentId;
            await user.save();
          }

          // Create agent record
          await Agent.create({
            userId: user._id,
            agencyName: agencyName,
            agencyId: user.agencyId || undefined,
            agentId: agentId,
            licenseNumber: user.licenseNumber || '',
            licenseVerified: user.licenseVerified || false,
            licenseVerificationDate: user.licenseVerificationDate || undefined,
            isActive: true,
            rating: 0,
            totalSales: 0,
            totalSalesValue: 0,
            activeListings: 0,
          });

          log.info(`  ✅ Created agent record for ${user.email} (${agentId})`);

          // If user is part of an agency, ensure they're in the agency's agents array
          if (user.agencyId) {
            const agency = await Agency.findById(user.agencyId);
            if (agency) {
              const userObjectId = user._id as unknown as mongoose.Types.ObjectId;
              if (!agency.agents.some((agentId: mongoose.Types.ObjectId) => agentId.toString() === userObjectId.toString())) {
                agency.agents.push(userObjectId);
                agency.totalAgents = agency.agents.length;
                await agency.save();
                log.info(`    ➕ Added agent to ${agency.name} agency`);
              }
            }
          }

          synced++;
        }
      } catch (err) {
        log.error(`  ❌ Error processing ${user.email}:`, err instanceof Error ? err.message : err);
        errors++;
      }
    }

    // Print summary
    log.info('\n' + '='.repeat(60));
    log.info('📈 SYNC SUMMARY');
    log.info('='.repeat(60));
    log.info(`Total agent users found:     ${agentUsers.length}`);
    log.info(`New agent records created:   ${synced}`);
    log.info(`Existing records updated:    ${updated}`);
    log.info(`Records already up-to-date:  ${skipped}`);
    log.info(`Errors:                      ${errors}`);
    log.info('='.repeat(60));

    if (synced > 0 || updated > 0) {
      log.info('\n✅ Agent sync completed successfully!');
      log.info('All agents should now appear in the agents page.');
    } else if (errors === 0) {
      log.info('\n✅ All agents are already synced!');
    } else {
      log.info('\n⚠️  Sync completed with errors. Please review the logs above.');
    }

  } catch (error) {
    log.error('❌ Fatal error during sync:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('\n🔌 Disconnected from MongoDB');
  }
};

// Run the sync
syncAgents();

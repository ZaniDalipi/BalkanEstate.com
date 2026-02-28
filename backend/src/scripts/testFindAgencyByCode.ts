/**
 * Test script to verify the findAgencyByInvitationCode endpoint
 *
 * Usage: npm run test:find-agency
 */

import mongoose from 'mongoose';
import Agency from '../models/Agency';
import dotenv from 'dotenv';
import path from 'path';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('TestFindAgency');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const testFindAgencyByCode = async () => {
  try {
    log.info('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan_estate');
    log.info('✅ Connected to MongoDB\n');

    // Find the first agency with an invitation code
    const agency = await Agency.findOne({ invitationCode: { $exists: true, $ne: null } });

    if (!agency) {
      log.info('❌ No agencies found with invitation codes');
      log.info('Creating a test agency...\n');

      const testAgency = new Agency({
        ownerId: new mongoose.Types.ObjectId(),
        name: 'Test Real Estate Agency',
        description: 'Test agency for invitation code verification',
        email: 'test@agency.com',
        phone: '+123456789',
        city: 'Belgrade',
        country: 'Serbia',
        lat: 44.7866,
        lng: 20.4489,
      });

      await testAgency.save();
      log.info('✅ Created test agency');
      log.info(`📋 Invitation Code: ${testAgency.invitationCode}\n`);

      log.info('🧪 You can now test the endpoint with:');
      log.info(`   Code: ${testAgency.invitationCode}`);
    } else {
      log.info('✅ Found agency with invitation code:');
      log.info(`   Name: ${agency.name}`);
      log.info(`   Code: ${agency.invitationCode}`);
      log.info(`   ID: ${agency._id}\n`);

      log.info('🧪 Test the endpoint with:');
      log.info('   Method: POST');
      log.info('   URL: http://localhost:5001/api/agencies/find-by-code');
      log.info('   Body: { "code": "' + agency.invitationCode + '" }');
      log.info('   Headers: { "Authorization": "Bearer YOUR_TOKEN" }\n');
    }

    // List all agencies with their invitation codes
    log.info('📋 All agencies with invitation codes:');
    const allAgencies = await Agency.find({ invitationCode: { $exists: true } })
      .select('name invitationCode city country')
      .limit(10);

    allAgencies.forEach((ag: any, index: number) => {
      log.info(`   ${index + 1}. ${ag.name} - ${ag.invitationCode} (${ag.city}, ${ag.country})`);
    });

    log.info('\n✅ Test completed successfully');
  } catch (error) {
    log.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    log.info('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

testFindAgencyByCode();

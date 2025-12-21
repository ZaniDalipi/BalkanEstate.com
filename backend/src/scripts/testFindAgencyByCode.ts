/**
 * Test script to verify the findAgencyByInvitationCode endpoint
 *
 * Usage: npm run test:find-agency
 */

import mongoose from 'mongoose';
import Agency from '../models/Agency';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const testFindAgencyByCode = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan_estate');
    console.log('✅ Connected to MongoDB\n');

    // Find the first agency with an invitation code
    const agency = await Agency.findOne({ invitationCode: { $exists: true, $ne: null } });

    if (!agency) {
      console.log('❌ No agencies found with invitation codes');
      console.log('Creating a test agency...\n');

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
      console.log('✅ Created test agency');
      console.log(`📋 Invitation Code: ${testAgency.invitationCode}\n`);

      console.log('🧪 You can now test the endpoint with:');
      console.log(`   Code: ${testAgency.invitationCode}`);
    } else {
      console.log('✅ Found agency with invitation code:');
      console.log(`   Name: ${agency.name}`);
      console.log(`   Code: ${agency.invitationCode}`);
      console.log(`   ID: ${agency._id}\n`);

      console.log('🧪 Test the endpoint with:');
      console.log('   Method: POST');
      console.log('   URL: http://localhost:5001/api/agencies/find-by-code');
      console.log('   Body: { "code": "' + agency.invitationCode + '" }');
      console.log('   Headers: { "Authorization": "Bearer YOUR_TOKEN" }\n');
    }

    // List all agencies with their invitation codes
    console.log('📋 All agencies with invitation codes:');
    const allAgencies = await Agency.find({ invitationCode: { $exists: true } })
      .select('name invitationCode city country')
      .limit(10);

    allAgencies.forEach((ag: any, index: number) => {
      console.log(`   ${index + 1}. ${ag.name} - ${ag.invitationCode} (${ag.city}, ${ag.country})`);
    });

    console.log('\n✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

testFindAgencyByCode();

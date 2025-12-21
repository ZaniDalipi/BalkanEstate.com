import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Agent from '../models/Agent';
import User from '../models/User';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/balkan-estate';

async function removeAllAgents() {
  try {
    console.log('🔌 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database');

    // Count agents before deletion
    const agentCount = await Agent.countDocuments();
    console.log(`\n📊 Found ${agentCount} agents in database`);

    if (agentCount === 0) {
      console.log('✅ No agents to remove');
      await mongoose.disconnect();
      return;
    }

    // Get all agent userIds before deleting
    const agents = await Agent.find({});
    const userIds = agents.map(agent => agent.userId);

    // Delete all agents
    const agentResult = await Agent.deleteMany({});
    console.log(`\n✅ Deleted ${agentResult.deletedCount} agents`);

    // Update users who were agents back to buyer role
    if (userIds.length > 0) {
      const userResult = await User.updateMany(
        { _id: { $in: userIds }, role: 'agent' },
        {
          $set: { role: 'buyer' },
          $unset: {
            agentId: '',
            licenseNumber: '',
            licenseVerified: '',
            licenseVerificationDate: ''
          }
        }
      );
      console.log(`✅ Updated ${userResult.modifiedCount} users (changed role from agent to buyer)`);
    }

    console.log('\n✨ All agents removed successfully!');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  } catch (error) {
    console.error('❌ Error removing agents:', error);
    process.exit(1);
  }
}

// Run the script
removeAllAgents();

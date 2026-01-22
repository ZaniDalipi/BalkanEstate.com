import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

// Get email from environment variable
const email = process.env.SET_ADMIN_EMAIL;
const targetRole = (process.env.SET_ADMIN_ROLE === 'super_admin' ? 'super_admin' : 'admin') as 'admin' | 'super_admin';

if (!email) {
  console.error('❌ Error: SET_ADMIN_EMAIL environment variable is required');
  console.error('   Usage: SET_ADMIN_EMAIL=user@example.com npm run set-admin');
  console.error('   For super_admin: SET_ADMIN_EMAIL=user@example.com SET_ADMIN_ROLE=super_admin npm run set-admin');
  process.exit(1);
}

const setAdminRole = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      console.log('Please create this user first or use a different email.');
      process.exit(1);
    }

    console.log(`\nFound user: ${user.name} (${user.email})`);
    console.log(`Current role: ${user.role}`);

    // Update role
    if (user.role === targetRole) {
      console.log(`✓ User already has ${targetRole} role`);
    } else {
      user.role = targetRole;
      user.availableRoles = ['buyer', 'private_seller', 'agent', 'admin', 'super_admin'];
      user.activeRole = targetRole;
      user.primaryRole = targetRole;
      await user.save();
      console.log(`✅ Updated user role to: ${targetRole}`);
    }

    console.log('\n═══════════════════════════════════════════');
    console.log(targetRole === 'super_admin' ? '       👑 SUPER ADMIN ACCESS GRANTED' : '       🔐 ADMIN ACCESS GRANTED');
    console.log('═══════════════════════════════════════════');
    console.log(`   Email: ${user.email}`);
    console.log(`   Role:  ${user.role}`);
    console.log('═══════════════════════════════════════════');
    console.log('\n🌐 Admin panel: /admin');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

setAdminRole();

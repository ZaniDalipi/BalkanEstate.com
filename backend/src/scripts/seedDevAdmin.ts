import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

console.log(`🌍 Environment: ${env.toUpperCase()}`);

// Get credentials from environment variables
const adminEmail = process.env.DEV_ADMIN_EMAIL || 'dev@balkanestateai.com';
const adminPassword = process.env.DEV_ADMIN_PASSWORD;

if (!adminPassword) {
  console.error('❌ Error: DEV_ADMIN_PASSWORD environment variable is required');
  console.error('   Usage: DEV_ADMIN_PASSWORD=yourpassword npm run seed:dev-admin');
  console.error('   Or add DEV_ADMIN_PASSWORD to your .env file');
  process.exit(1);
}

if (adminPassword.length < 6) {
  console.error('❌ Error: Password must be at least 6 characters');
  process.exit(1);
}

const DEV_ADMIN = {
  email: adminEmail,
  password: adminPassword,
  name: 'Dev Admin',
  role: 'admin' as const,
  availableRoles: ['buyer', 'private_seller', 'agent', 'admin'] as const,
  activeRole: 'admin' as const,
  primaryRole: 'admin' as const,
  isEmailVerified: true,
  provider: 'local' as const,
  subscription: {
    tier: 'pro' as const,
    status: 'active' as const,
    listingsLimit: 999,
    activeListingsCount: 0,
    privateSellerCount: 0,
    agentCount: 0,
    promotionCoupons: {
      monthly: 99,
      available: 99,
      used: 0,
      rollover: 0,
      lastRefresh: new Date(),
    },
    savedSearchesLimit: -1, // Unlimited
    totalPaid: 0,
  },
  activeListingsLimit: 999,
};

async function seedDevAdmin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    let user = await User.findOne({ email: DEV_ADMIN.email });

    if (user) {
      console.log(`\n📝 Found existing user: ${user.email}`);
      console.log(`   Current role: ${user.role}`);

      // Update to admin if not already
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        user.role = 'admin';
        user.availableRoles = ['buyer', 'private_seller', 'agent', 'admin'];
        user.activeRole = 'admin';
        user.primaryRole = 'admin';
        await user.save();
        console.log(`✅ Updated user role to: admin`);
      } else {
        console.log(`✓ User already has admin access (${user.role})`);
      }

      // Update password
      user.password = DEV_ADMIN.password;
      await user.save();
      console.log(`✅ Password updated`);
    } else {
      // Create new admin user
      user = await User.create(DEV_ADMIN);
      console.log(`\n✅ Created new admin user`);
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('       🔐 DEV ADMIN READY');
    console.log('═══════════════════════════════════════════');
    console.log(`   Email:    ${DEV_ADMIN.email}`);
    console.log(`   Password: (set via DEV_ADMIN_PASSWORD)`);
    console.log(`   Role:     ${user.role}`);
    console.log('═══════════════════════════════════════════');
    console.log('\n🌐 Admin panel: /admin');
    console.log('');

  } catch (error) {
    console.error('❌ Error seeding dev admin:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the seed function
seedDevAdmin();

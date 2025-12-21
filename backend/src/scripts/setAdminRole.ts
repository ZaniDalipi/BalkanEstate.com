import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

// Load environment variables
dotenv.config();

const setAdminRole = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const email = 'zano@zano.com';

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      console.log('Please create this user first or use a different email.');
      process.exit(1);
    }

    console.log(`\nFound user: ${user.name} (${user.email})`);
    console.log(`Current role: ${user.role}`);

    // Update role to admin if not already
    if (user.role === 'admin' || user.role === 'super_admin') {
      console.log(`✓ User already has admin access (${user.role})`);
    } else {
      user.role = 'admin';
      await user.save();
      console.log(`✅ Updated user role to: admin`);
    }

    console.log('\n=== Admin Access Granted ===');
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`\nYou can now access the admin panel at: /admin`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

setAdminRole();

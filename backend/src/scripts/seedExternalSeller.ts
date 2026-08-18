/* eslint-disable no-console */
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from '../config/database';
import User from '../models/User';

const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env.production'
    : process.env.NODE_ENV === 'staging'
      ? '.env.staging'
      : '.env.development';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config();

const EMAIL = process.env.EXTERNAL_SELLER_EMAIL || 'external@balkanestateai.com';
const NAME = 'External Source';

const main = async () => {
  await connectDB();
  let user = await User.findOne({ email: EMAIL });
  if (user) {
    console.log(`✅ External seller already exists (${EMAIL}, _id=${user._id})`);
  } else {
    const password = await bcrypt.hash(`ext-${Date.now()}-${Math.random()}`, 12);
    user = await User.create({
      email: EMAIL,
      name: NAME,
      password,
      role: 'private_seller',
      availableRoles: ['private_seller'],
      activeRole: 'private_seller',
      primaryRole: 'private_seller',
      isEmailVerified: true,
    });
    console.log(`✅ Created external seller account (${EMAIL}, _id=${user._id})`);
  }

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error('❌ seedExternalSeller failed:', err);
  process.exit(1);
});

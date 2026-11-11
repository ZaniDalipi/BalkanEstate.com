/**
 * Remove an admin's authenticator app when nobody else can (for example the
 * only super admin lost their phone). They set it up again from Admin ›
 * Security, which needs a code emailed to them.
 *
 *   RESET_AUTH_EMAIL=you@example.com npm run reset-admin-authenticator
 *   (production: add CONFIRM_PRODUCTION=yes)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('ResetAdminAuthenticator');
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(__dirname, '../../', env === 'development' ? '.env' : `.env.${env}`) });

async function main(): Promise<void> {
  const email = process.env.RESET_AUTH_EMAIL?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    log.error('Usage: RESET_AUTH_EMAIL=you@example.com npm run reset-admin-authenticator');
    process.exit(1);
  }
  if (env === 'production' && process.env.CONFIRM_PRODUCTION !== 'yes') {
    log.error('Production: add CONFIRM_PRODUCTION=yes to proceed.');
    process.exit(1);
  }
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    log.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const result = await User.updateOne({ email, role: { $in: ['admin', 'super_admin'] } }, { $unset: { adminTotp: 1 } });
  if (result.matchedCount === 0) log.error(`No admin account with email ${email}.`);
  else log.info(`✅ Authenticator removed for ${email}. Set it up again from Admin › Security.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  log.error('Failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import { defaultAvatarOptionsForUser } from '../utils/defaultAvatar';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('BackfillAvatarOptions');

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';

/**
 * A person's avatar used to be derived, never stored: each surface generated a
 * face from whichever id its payload carried — obfuscated on a listing card,
 * raw for the signed-in user — so the same agent looked like one person on
 * their profile and somebody else on the "Contact Seller" panel.
 *
 * New accounts now get their character at creation and existing ones are filled
 * in the next time they load the app. This does the same for everyone who has
 * not been back since, so the fix does not wait on them signing in. The seed is
 * the raw id, the one their own profile has always generated from, so nobody's
 * face changes — it just stops changing between pages.
 *
 * Users with an uploaded photo are skipped: their photo already answers this,
 * and writing options would put a face behind a picture nobody sees.
 */
async function backfillAvatarOptions(): Promise<void> {
  log.info(`🌍 Environment: ${env.toUpperCase()}`);

  try {
    await mongoose.connect(MONGODB_URI);
    log.info('✅ Connected to MongoDB');

    const filter = {
      $and: [
        { $or: [{ avatarOptions: { $exists: false } }, { avatarOptions: null }, { avatarOptions: '' }] },
        { $or: [{ avatarUrl: { $exists: false } }, { avatarUrl: null }, { avatarUrl: '' }] },
      ],
    };

    const pending = await User.countDocuments(filter);
    log.info(`📊 ${pending} user(s) without a stored avatar`);

    if (pending === 0) {
      log.info('✨ Nothing to do — everyone already has one.');
      return;
    }

    // Each user needs their own value, so this is one write per user rather
    // than an updateMany; batched through a bulk op to keep it to a few trips.
    const cursor = User.find(filter).select('_id gender').lean().cursor();
    const operations: mongoose.AnyBulkWriteOperation[] = [];
    let written = 0;

    const flush = async () => {
      if (operations.length === 0) return;
      const result = await User.bulkWrite(operations);
      written += result.modifiedCount ?? 0;
      operations.length = 0;
    };

    for await (const user of cursor) {
      operations.push({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              avatarOptions: defaultAvatarOptionsForUser(String(user._id), user.gender),
            },
          },
        },
      });
      if (operations.length >= 500) await flush();
    }
    await flush();

    log.info(`🎉 Stored an avatar for ${written} user(s)`);
  } catch (error) {
    log.error('❌ Backfill error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('👋 Disconnected from MongoDB');
  }
}

backfillAvatarOptions();

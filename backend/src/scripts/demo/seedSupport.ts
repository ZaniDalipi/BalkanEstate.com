/**
 * Shared plumbing for the demo-residence seeds (`seed:developments`,
 * `seed:plaza`): who owns the demo, wiping a previous run, and building
 * published explorer views. Each seed keeps only its own data and geometry.
 */
import mongoose from 'mongoose';
import User, { type IUser } from '../../models/User';
import Development from '../../models/Development';
import DevelopmentBuilding from '../../models/DevelopmentBuilding';
import DevelopmentEntrance from '../../models/DevelopmentEntrance';
import DevelopmentFloor from '../../models/DevelopmentFloor';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentMembership from '../../models/DevelopmentMembership';
import DevelopmentScene from '../../models/DevelopmentScene';
import DevelopmentFollow from '../../models/DevelopmentFollow';
import Property from '../../models/Property';
import { scriptLogger as log } from '../../utils/logger';

export type Oid = mongoose.Types.ObjectId;
export type Point = [number, number];

export const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

/**
 * The demo owner: `DEV_SEED_EMAIL` when set (created with
 * `DEV_SEED_CREATE=true`), otherwise the most recently created user. Exits
 * with a helpful message when there is nobody to own it.
 */
export async function resolveSeedOwner(script: string): Promise<IUser> {
  const email = process.env.DEV_SEED_EMAIL;
  let owner = email ? await User.findOne({ email: email.toLowerCase() }) : await User.findOne({}).sort({ createdAt: -1 });
  if (owner) return owner;

  if (email && process.env.DEV_SEED_CREATE === 'true') {
    // Opt-in local convenience; sign-in still needs a password reset.
    owner = new User({
      email: email.toLowerCase(),
      name: email.split('@')[0] || 'Demo Owner',
      password: `Seed!${Math.random().toString(36).slice(2, 10)}A1`,
      isVerified: true,
    } as never);
    await owner.save();
    log.info(`👤 Created a new user ${email} (DEV_SEED_CREATE=true).`);
    return owner;
  }
  if (email) {
    const others = await User.find({}).sort({ createdAt: -1 }).limit(15).select('email').lean();
    log.error(`❌ No user found with email ${email}.`);
    if (others.length > 0) {
      log.error('   Run it without an email to use the most recent user, or pick one:');
      others.forEach((u) => log.error(`     • ${u.email}`));
    } else {
      log.error('   This database has no users yet. Sign up in the app first,');
      log.error(`   or create one: DEV_SEED_CREATE=true DEV_SEED_EMAIL=you@example.com npm run ${script}`);
    }
  } else {
    log.error('❌ This database has no users yet — sign up in the app first, then re-run.');
  }
  process.exit(1);
}

/**
 * Remove a previous run of a demo (by slug) and everything under it. Listings
 * that pointed into it are detached, not deleted.
 */
export async function removeDemoDevelopment(slug: string): Promise<void> {
  const existing = await Development.findOne({ slug });
  if (!existing) return;
  const developmentId = existing._id;
  await Promise.all([
    DevelopmentBuilding.deleteMany({ developmentId }),
    DevelopmentEntrance.deleteMany({ developmentId }),
    DevelopmentFloor.deleteMany({ developmentId }),
    DevelopmentUnit.deleteMany({ developmentId }),
    DevelopmentMembership.deleteMany({ developmentId }),
    DevelopmentScene.deleteMany({ developmentId }),
    DevelopmentFollow.deleteMany({ developmentId }),
    Property.updateMany({ developmentId }, { $unset: { developmentId: '', buildingId: '', entranceId: '', floorId: '', unitId: '' } }),
    Development.deleteOne({ _id: developmentId }),
  ]);
  log.info(`Removed the previous "${existing.name}".`);
}

/** Pixel polygon on a `width`×`height` picture → normalised 0–1 points. */
export const normalise = (poly: Point[], width: number, height: number): number[][] =>
  poly.map(([x, y]) => [round4(Math.min(1, Math.max(0, x / width))), round4(Math.min(1, Math.max(0, y / height)))]);

export interface SeedRegion {
  id: string;
  shape: 'polygon' | 'rect';
  points: number[][];
  label?: string;
  linkType: 'building' | 'floor' | 'unit' | 'listing';
  linkId: string;
  z: number;
}

export interface SeedView {
  developmentId: Oid;
  targetType: 'development' | 'building' | 'floor';
  targetId: Oid;
  viewKey: string;
  viewName: string;
  viewDirection: string;
  sortOrder: number;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  regions: SeedRegion[];
}

/** Create a view whose draft and published versions both carry `regions`. */
export const createPublishedView = ({ regions, ...view }: SeedView) =>
  DevelopmentScene.create({
    ...view,
    draft: { hotspots: regions, version: 1 },
    published: { hotspots: regions, version: 1, publishedAt: new Date() },
    version: 1,
  });

/** Where the web app serves `public/`, so demo pictures pass the app's image URL rules. */
export const publicAssetUrl = (path: string): string =>
  `${(process.env.PUBLIC_WEB_URL || 'http://localhost:3000').replace(/\/+$/, '')}${path}`;

/**
 * Seed a demo residential development so the Developments feature can be seen
 * populated end to end (public page, units browser, availability, follow).
 *
 * Usage:
 *   DEV_SEED_EMAIL=you@example.com npm run seed:developments
 *
 * Idempotent: it removes any previous demo (slug `east-gate-living-demo`) and
 * its buildings/floors/units/scenes/follows before re-creating it, so you can
 * run it repeatedly.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Development from '../models/Development';
import DevelopmentBuilding from '../models/DevelopmentBuilding';
import DevelopmentFloor from '../models/DevelopmentFloor';
import DevelopmentUnit from '../models/DevelopmentUnit';
import DevelopmentMembership from '../models/DevelopmentMembership';
import DevelopmentScene from '../models/DevelopmentScene';
import DevelopmentFollow from '../models/DevelopmentFollow';
import { scriptLogger as log } from '../utils/logger';

dotenv.config();

const SLUG = 'east-gate-living-demo';

const AVAILABILITY = ['available', 'available', 'available', 'reserved', 'sold', 'not_released'] as const;
const ORIENTATIONS = ['north', 'south', 'east', 'west', 'southEast', 'southWest'];

const pick = <T>(arr: readonly T[], i: number): T => arr[i % arr.length];
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function run(): Promise<void> {
  const email = process.env.DEV_SEED_EMAIL;
  if (!email) {
    log.error('❌ DEV_SEED_EMAIL is required. Usage: DEV_SEED_EMAIL=you@example.com npm run seed:developments');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
  await mongoose.connect(mongoUri);
  log.info(`Connected to ${mongoUri}`);

  try {
    const owner = await User.findOne({ email: email.toLowerCase() });
    if (!owner) {
      log.error(`❌ No user found with email ${email}. Create/sign up that user first.`);
      process.exit(1);
    }

    // --- Clean any previous demo -----------------------------------------
    const existing = await Development.findOne({ slug: SLUG });
    if (existing) {
      const devId = existing._id;
      await Promise.all([
        DevelopmentBuilding.deleteMany({ developmentId: devId }),
        DevelopmentFloor.deleteMany({ developmentId: devId }),
        DevelopmentUnit.deleteMany({ developmentId: devId }),
        DevelopmentMembership.deleteMany({ developmentId: devId }),
        DevelopmentScene.deleteMany({ developmentId: devId }),
        DevelopmentFollow.deleteMany({ developmentId: devId }),
        Development.deleteOne({ _id: devId }),
      ]);
      log.info('Removed previous demo development.');
    }

    // --- Development ------------------------------------------------------
    const development = await Development.create({
      ownerId: owner._id,
      ownerType: 'user',
      name: 'East Gate Living (Demo)',
      slug: SLUG,
      description:
        'A modern residential and commercial complex in the heart of Skopje, with green areas, retail, and premium amenities. This is demo data seeded for previewing the Residences feature.',
      country: 'North Macedonia',
      city: 'Skopje',
      address: 'Bulevar Jane Sandanski',
      lat: 41.9981,
      lng: 21.4254,
      category: 'mixed_use',
      constructionStatus: 'under_construction',
      expectedCompletionDate: new Date('2027-06-30'),
      amenities: ['Green areas', 'Retail', 'Underground parking', '24/7 security', 'Playground', 'Gym'],
      website: 'https://example.com',
      status: 'published',
      publishedAt: new Date(),
      stats: { buildings: 0, units: 0, available: 0 },
    });

    await DevelopmentMembership.updateOne(
      { developmentId: development._id, userId: owner._id },
      { $setOnInsert: { developmentId: development._id, userId: owner._id, role: 'owner', status: 'active' } },
      { upsert: true }
    );

    // --- Buildings → floors → units --------------------------------------
    const buildingDefs = [
      { name: 'Building A', code: 'A', floors: 5 },
      { name: 'Building B', code: 'B', floors: 6 },
      { name: 'Building C', code: 'C', floors: 5 },
    ];

    let unitCount = 0;
    let availableCount = 0;
    let availIdx = 0;

    for (const [bi, bd] of buildingDefs.entries()) {
      const building = await DevelopmentBuilding.create({
        developmentId: development._id,
        name: bd.name,
        code: bd.code,
        slug: `block-${bd.code.toLowerCase()}`,
        totalFloors: bd.floors,
        order: bi,
      });

      for (let level = 1; level <= bd.floors; level += 1) {
        const floor = await DevelopmentFloor.create({
          developmentId: development._id,
          buildingId: building._id,
          label: `Floor ${level}`,
          level,
          kind: 'standard',
          order: level,
        });

        const unitsOnFloor = rnd(3, 5);
        for (let u = 1; u <= unitsOnFloor; u += 1) {
          const availability = pick(AVAILABILITY, availIdx++);
          const beds = rnd(1, 4);
          const area = 45 + beds * 20 + rnd(0, 15);
          const price = Math.round((1800 + rnd(0, 600)) * area) / 1 / 1000 * 1000; // ~€/m² × area
          await DevelopmentUnit.create({
            developmentId: development._id,
            buildingId: building._id,
            floorId: floor._id,
            unitNumber: `${bd.code}${level}0${u}`,
            unitType: 'apartment',
            beds,
            baths: Math.max(1, beds - 1),
            netArea: area,
            totalArea: area,
            orientation: pick(ORIENTATIONS, availIdx + u),
            price: Math.round(price / 1000) * 1000,
            currency: 'EUR',
            availability,
          });
          unitCount += 1;
          if (availability === 'available') availableCount += 1;
        }
      }
    }

    await Development.updateOne(
      { _id: development._id },
      { $set: { stats: { buildings: buildingDefs.length, units: unitCount, available: availableCount } } }
    );

    const base = process.env.PUBLIC_WEB_URL || 'http://localhost:3000';
    log.info('✅ Demo development seeded:');
    log.info(`   Buildings: ${buildingDefs.length} · Units: ${unitCount} · Available: ${availableCount}`);
    log.info(`   Public page: ${base}/en/developments/${SLUG}`);
    log.info(`   Dashboard:   ${base}/en/dashboard/developments`);
  } catch (error) {
    log.error('Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();

/**
 * Seed a demo residential development so the Developments feature can be seen
 * populated end to end: public page, key facts, availability bar, the B2-style
 * explorer filters, the interactive site/building scenes with clickable units,
 * attached listings on the facade, and follow/alerts.
 *
 * Usage:
 *   DEV_SEED_EMAIL=you@example.com npm run seed:developments
 *
 * Idempotent: it removes any previous demo (slug `east-gate-living-demo`) and
 * its buildings/floors/units/scenes/follows before re-creating it, so you can
 * run it repeatedly. Listings owned by the seed user are detached from the demo
 * on cleanup so re-runs don't leave dangling references.
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
import Property from '../models/Property';
import { encodeId } from '../utils/idObfuscation';
import { scriptLogger as log } from '../utils/logger';

dotenv.config();

const SLUG = 'east-gate-living-demo';

const AVAILABILITY = ['available', 'available', 'available', 'reserved', 'sold', 'not_released'] as const;
const ORIENTATIONS = ['north', 'south', 'east', 'west', 'southEast', 'southWest'];
const VIEWS = ['city', 'park', 'sea', 'courtyard'];

// A stable placeholder facade/aerial so the interactive scenes have an image
// without a real upload. Swap for your own render in the editor.
const AERIAL_IMG = 'https://picsum.photos/seed/eastgate-aerial/1280/820';
const FACADE_IMG = 'https://picsum.photos/seed/eastgate-facade/1200/900';
const IMG_W = 1280;
const IMG_H = 820;

const pick = <T>(arr: readonly T[], i: number): T => arr[i % arr.length];
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Choose a unit type so the apartment-type filter has real variety. */
const unitTypeFor = (level: number, topFloor: number, posOnFloor: number, beds: number): string => {
  if (level === topFloor) return 'penthouse';
  if (posOnFloor === 1 && beds >= 3) return 'duplex';
  if (beds <= 1) return 'studio';
  return 'apartment';
};

interface SeededUnit {
  id: mongoose.Types.ObjectId;
  level: number;
  posOnFloor: number;
  availability: string;
  floorId: mongoose.Types.ObjectId;
}

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
        // Detach any listings previously wired into this demo.
        Property.updateMany(
          { developmentId: devId },
          { $unset: { developmentId: '', buildingId: '', entranceId: '', floorId: '', unitId: '' } }
        ),
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
      amenities: ['Green areas', 'Retail', 'Underground parking', '24/7 security', 'Playground', 'Gym', 'EV charging', 'Rooftop terrace'],
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
    // Taller, varied towers so the floor-range and type filters have range.
    const buildingDefs = [
      { name: 'Seaside Tower 1', code: 'S1', floors: 12, perFloor: 4 },
      { name: 'Seaside Tower 2', code: 'S2', floors: 10, perFloor: 4 },
      { name: 'Park Residence', code: 'P', floors: 8, perFloor: 3 },
      { name: 'Garden Villas', code: 'G', floors: 3, perFloor: 2 },
    ];

    let unitCount = 0;
    let availableCount = 0;
    let availIdx = 0;

    // Keep the first building's layout to build an interactive facade scene,
    // and collect available units across the project to attach listings to.
    const firstBuilding: { id: mongoose.Types.ObjectId; units: SeededUnit[]; floors: number; perFloor: number } = {
      id: new mongoose.Types.ObjectId(),
      units: [],
      floors: buildingDefs[0].floors,
      perFloor: buildingDefs[0].perFloor,
    };
    const buildingIdsForAerial: { id: mongoose.Types.ObjectId; name: string }[] = [];
    const attachableUnits: SeededUnit[] = [];

    for (const [bi, bd] of buildingDefs.entries()) {
      const building = await DevelopmentBuilding.create({
        developmentId: development._id,
        name: bd.name,
        code: bd.code,
        slug: `block-${bd.code.toLowerCase()}`,
        totalFloors: bd.floors,
        order: bi,
      });
      buildingIdsForAerial.push({ id: building._id, name: bd.name });
      if (bi === 0) firstBuilding.id = building._id;

      for (let level = 1; level <= bd.floors; level += 1) {
        const floor = await DevelopmentFloor.create({
          developmentId: development._id,
          buildingId: building._id,
          label: `Floor ${level}`,
          level,
          kind: 'standard',
          order: level,
        });

        for (let u = 1; u <= bd.perFloor; u += 1) {
          const availability = pick(AVAILABILITY, availIdx++);
          const beds = rnd(0, 4);
          const area = round2(38 + beds * 22 + rnd(0, 18) + level * 0.8);
          const pricePerSqm = 1700 + rnd(0, 700) + level * 20;
          const unit = await DevelopmentUnit.create({
            developmentId: development._id,
            buildingId: building._id,
            floorId: floor._id,
            unitNumber: `${bd.code}${level}0${u}`,
            unitType: unitTypeFor(level, bd.floors, u, beds),
            beds,
            baths: Math.max(1, beds - 1),
            netArea: round2(area * 0.85),
            totalArea: area,
            grossArea: round2(area * 1.1),
            orientation: pick(ORIENTATIONS, availIdx + u),
            viewType: pick(VIEWS, level + u),
            price: Math.round((pricePerSqm * area) / 1000) * 1000,
            currency: 'EUR',
            pricePerSqm,
            availability,
          });
          unitCount += 1;
          if (availability === 'available') {
            availableCount += 1;
            if (attachableUnits.length < 6) attachableUnits.push({ id: unit._id, level, posOnFloor: u, availability, floorId: floor._id });
          }
          if (bi === 0) {
            firstBuilding.units.push({ id: unit._id, level, posOnFloor: u, availability, floorId: floor._id });
          }
        }
      }
    }

    // --- Attach a few of the owner's listings to units -------------------
    // Demonstrates "place my listing on the facade": the unit gets a primary
    // listing, and the listing points back into the development hierarchy.
    let attachedCount = 0;
    const ownerListings = await Property.find({
      sellerId: owner._id,
      status: { $in: ['active', 'pending'] },
      developmentId: { $exists: false },
    })
      .select('_id')
      .limit(attachableUnits.length)
      .lean();

    for (let i = 0; i < ownerListings.length && i < attachableUnits.length; i += 1) {
      const listing = ownerListings[i];
      const target = attachableUnits[i];
      const unitDoc = await DevelopmentUnit.findById(target.id);
      if (!unitDoc) continue;
      await Property.updateOne(
        { _id: listing._id },
        {
          $set: {
            developmentId: development._id,
            buildingId: unitDoc.buildingId,
            floorId: unitDoc.floorId,
            unitId: unitDoc._id,
          },
        }
      );
      unitDoc.listingIds = [listing._id];
      unitDoc.primaryListingId = listing._id;
      await unitDoc.save();
      attachedCount += 1;
    }

    // --- Interactive scenes (published) ----------------------------------
    // 1) Site aerial: one clickable region per building, drilling into it.
    const aerialHotspots = buildingIdsForAerial.map((b, idx) => {
      const cols = buildingIdsForAerial.length;
      const x0 = round2(idx / cols + 0.03);
      const x1 = round2((idx + 1) / cols - 0.03);
      return {
        id: `h_b_${idx}`,
        shape: 'rect' as const,
        points: [
          [x0, 0.28],
          [x1, 0.92],
        ],
        label: b.name,
        linkType: 'building' as const,
        linkId: encodeId(String(b.id)),
        z: idx,
      };
    });
    await DevelopmentScene.create({
      developmentId: development._id,
      targetType: 'development',
      targetId: development._id,
      imageUrl: AERIAL_IMG,
      imageWidth: IMG_W,
      imageHeight: IMG_H,
      draft: { hotspots: aerialHotspots, version: 1 },
      published: { hotspots: aerialHotspots, version: 1, publishedAt: new Date() },
      version: 1,
    });

    // 2) First building facade: a grid of clickable unit regions, each linking
    //    to its unit. This is what the explorer filters dim/undim live.
    const cols = firstBuilding.perFloor;
    const rows = firstBuilding.floors;
    const padX = 0.012;
    const padY = 0.006;
    const facadeHotspots = firstBuilding.units.map((u, idx) => {
      const col = u.posOnFloor - 1;
      // Level 1 sits at the bottom of the facade, the top floor at the top.
      const rowFromTop = rows - u.level;
      const x0 = round2(col / cols + padX);
      const x1 = round2((col + 1) / cols - padX);
      const y0 = round2(rowFromTop / rows + padY);
      const y1 = round2((rowFromTop + 1) / rows - padY);
      return {
        id: `h_u_${idx}`,
        shape: 'rect' as const,
        points: [
          [x0, y0],
          [x1, y1],
        ],
        label: undefined,
        linkType: 'unit' as const,
        linkId: encodeId(String(u.id)),
        z: idx,
      };
    });
    await DevelopmentScene.create({
      developmentId: development._id,
      targetType: 'building',
      targetId: firstBuilding.id,
      imageUrl: FACADE_IMG,
      imageWidth: IMG_W,
      imageHeight: IMG_H,
      draft: { hotspots: facadeHotspots, version: 1 },
      published: { hotspots: facadeHotspots, version: 1, publishedAt: new Date() },
      version: 1,
    });

    await Development.updateOne(
      { _id: development._id },
      { $set: { stats: { buildings: buildingDefs.length, units: unitCount, available: availableCount } } }
    );

    const base = process.env.PUBLIC_WEB_URL || 'http://localhost:3000';
    log.info('✅ Demo development seeded:');
    log.info(`   Buildings: ${buildingDefs.length} · Units: ${unitCount} · Available: ${availableCount}`);
    log.info(`   Listings attached to units: ${attachedCount}`);
    log.info(`   Scenes: site aerial (${aerialHotspots.length} buildings) + ${buildingDefs[0].name} facade (${facadeHotspots.length} units)`);
    log.info(`   Public page: ${base}/en/developments/${SLUG}`);
    log.info(`   Dashboard:   ${base}/en/dashboard/developments`);
    if (attachedCount === 0) {
      log.info('   (No owned listings were free to attach — create a couple of listings as this user to see them on the facade.)');
    }
  } catch (error) {
    log.error('Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();

/**
 * Seed a demo residential development so the Developments feature can be seen
 * populated end to end: public page, key facts, availability bar, the B2-style
 * explorer filters, the interactive site/building scenes with clickable units,
 * attached listings on the facade, and follow/alerts.
 *
 * Usage:
 *   npm run seed:developments                              # most recent user
 *   DEV_SEED_EMAIL=you@example.com npm run seed:developments   # a specific user
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
const FACADE_BACK_IMG = 'https://picsum.photos/seed/eastgate-facade-back/1200/900';
const AERIAL_W = 1280;
const AERIAL_H = 820;
const FACADE_W = 1200;
const FACADE_H = 900;

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
  // DEV_SEED_EMAIL is optional. With it, the demo is owned by that user; without
  // it, the seed owns the demo with the most recently created user, so a plain
  // `npm run seed:developments` just works.
  const email = process.env.DEV_SEED_EMAIL;

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
  await mongoose.connect(mongoUri);
  log.info(`Connected to ${mongoUri}`);

  try {
    let owner = email
      ? await User.findOne({ email: email.toLowerCase() })
      : await User.findOne({}).sort({ createdAt: -1 });

    if (!owner) {
      if (email && process.env.DEV_SEED_CREATE === 'true') {
        // Opt-in: create a minimal user so seeding is never blocked. This is a
        // local demo convenience; sign-in still needs a password reset.
        const created = new User({
          email: email.toLowerCase(),
          name: email.split('@')[0] || 'Demo Owner',
          password: `Seed!${Math.random().toString(36).slice(2, 10)}A1`,
          isVerified: true,
        } as never);
        await created.save();
        owner = created;
        log.info(`👤 Created a new user ${email} (DEV_SEED_CREATE=true).`);
      } else if (email) {
        // The named user doesn't exist — show which ones do.
        const others = await User.find({}).sort({ createdAt: -1 }).limit(15).select('email').lean();
        log.error(`❌ No user found with email ${email}.`);
        if (others.length > 0) {
          log.error('   Run it without an email to use the most recent user, or pick one:');
          others.forEach((u) => log.error(`     • ${u.email}`));
        } else {
          log.error('   This database has no users yet. Sign up in the app first,');
          log.error('   or create one: DEV_SEED_CREATE=true DEV_SEED_EMAIL=you@example.com npm run seed:developments');
        }
        process.exit(1);
      } else {
        log.error('❌ This database has no users yet — sign up in the app first, then re-run.');
        process.exit(1);
      }
    }
    if (!owner) throw new Error('Owner resolution failed');
    log.info(`Seeding demo owned by ${owner.email}`);

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
          const uType = unitTypeFor(level, bd.floors, u, beds);

          // Feature flags so the "Apartment type" filter has real variety.
          const features: string[] = [];
          if (uType === 'duplex') features.push('duplex');
          if (uType === 'penthouse') features.push('penthouse', 'big_terrace', 'smart_home');
          if (uType === 'studio') features.push('studio');
          if (level >= bd.floors - 1 && uType !== 'penthouse') features.push('big_terrace');
          if (u === 1) features.push('corner');
          if (level <= 1) features.push('garden');
          if (beds >= 3) features.push('two_sided');
          if (availIdx % 2 === 0) features.push('parking');
          if (availIdx % 3 === 0) features.push('storage');
          if (bd.code === 'S1' || bd.code === 'S2') features.push('sea_view');

          const unit = await DevelopmentUnit.create({
            developmentId: development._id,
            buildingId: building._id,
            floorId: floor._id,
            unitNumber: `${bd.code}${level}0${u}`,
            unitType: uType,
            features,
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

    // --- Demo listings ------------------------------------------------------
    // Units are the apartments of the residence (Inventory). A *listing* is a
    // marketplace ad. The demo shows both relationships:
    //   a) listings ATTACHED TO UNITS: the unit's card/drawer use the listing;
    //   b) one STANDALONE listing linked straight from a region on the picture.
    // Demo listings are recognisable by their "[Demo]" title and are replaced on
    // every run.
    await Property.deleteMany({ sellerId: owner._id, title: /^\[Demo\] / });
    const ownerName = (owner as unknown as { name?: string }).name || 'Demo owner';
    const ownerEmail = (owner as unknown as { email?: string }).email || 'demo@example.com';
    const demoListing = (over: Record<string, unknown>) =>
      Property.create({
        sellerId: owner._id,
        createdByName: ownerName,
        createdByEmail: ownerEmail,
        createdAsRole: 'private_seller',
        listingType: 'sale',
        address: 'Bulevar Jane Sandanski',
        city: 'Skopje',
        country: 'North Macedonia',
        lat: 41.9981,
        lng: 21.4254,
        yearBuilt: 2027,
        propertyType: 'apartment',
        status: 'active',
        livingRooms: 1,
        ...over,
      });

    let attachedCount = 0;
    for (const target of attachableUnits.slice(0, 3)) {
      const unitDoc = await DevelopmentUnit.findById(target.id);
      if (!unitDoc) continue;
      const listing = await demoListing({
        title: `[Demo] Apartment ${unitDoc.unitNumber} (listing attached to a unit)`,
        description:
          'Demo listing attached to an apartment (unit) of East Gate Living. The unit keeps its inventory data; buyers can also open this listing from the apartment drawer.',
        price: unitDoc.price ?? 150000,
        beds: unitDoc.beds ?? 2,
        baths: unitDoc.baths ?? 1,
        sqft: unitDoc.totalArea ?? 70,
        netArea: unitDoc.netArea,
        floorNumber: target.level,
        totalFloors: firstBuilding.floors,
        imageUrl: `https://picsum.photos/seed/eastgate-listing-${unitDoc.unitNumber}/1200/800`,
        developmentId: development._id,
        buildingId: unitDoc.buildingId,
        floorId: unitDoc.floorId,
        unitId: unitDoc._id,
      });
      unitDoc.listingIds = [listing._id];
      unitDoc.primaryListingId = listing._id;
      await unitDoc.save();
      attachedCount += 1;
    }
    const standaloneListing = await demoListing({
      title: '[Demo] Penthouse with city view (standalone listing)',
      description:
        'Demo listing that is not an apartment of this residence inventory. It is linked directly from a region on the residence picture (Links to: Listing).',
      price: 389000,
      beds: 3,
      baths: 2,
      sqft: 142,
      netArea: 128,
      floorNumber: 9,
      totalFloors: 9,
      imageUrl: 'https://picsum.photos/seed/eastgate-standalone/1200/800',
    });

    // --- Attach a few of the owner's own listings to units ---------------
    // Demonstrates "place my listing on the facade": the unit gets a primary
    // listing, and the listing points back into the development hierarchy.
    const ownerListings = await Property.find({
      sellerId: owner._id,
      status: { $in: ['active', 'pending'] },
      developmentId: { $exists: false },
      title: { $not: /^\[Demo\] / },
    })
      .select('_id')
      .limit(attachableUnits.length)
      .lean();

    const freeUnits = attachableUnits.slice(3);
    for (let i = 0; i < ownerListings.length && i < freeUnits.length; i += 1) {
      const listing = ownerListings[i];
      const target = freeUnits[i];
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
    // Example of "Links to: Listing": a region straight to a marketplace listing.
    const listingRegion = {
      id: 'h_listing_demo',
      shape: 'rect' as const,
      points: [
        [0.03, 0.04],
        [0.24, 0.2],
      ],
      label: 'Example: standalone listing',
      linkType: 'listing' as const,
      linkId: encodeId(String(standaloneListing._id)),
      z: aerialHotspots.length,
    };
    const aerialAll = [...aerialHotspots, listingRegion];
    await DevelopmentScene.create({
      developmentId: development._id,
      targetType: 'development',
      targetId: development._id,
      viewKey: 'main',
      viewName: 'Aerial',
      viewDirection: 'aerial',
      sortOrder: 0,
      imageUrl: AERIAL_IMG,
      imageWidth: AERIAL_W,
      imageHeight: AERIAL_H,
      draft: { hotspots: aerialAll, version: 1 },
      published: { hotspots: aerialAll, version: 1, publishedAt: new Date() },
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
    // Two camera views of the facade (front + back, mirrored columns) so the
    // explorer's view switcher has something to switch between.
    const backHotspots = facadeHotspots.map((h) => ({
      ...h,
      id: `${h.id}_back`,
      points: h.points.map(([x, y]) => [round2(1 - x), y]),
    }));
    const facadeViews = [
      { viewKey: 'main', viewName: 'Front', viewDirection: 'front', sortOrder: 0, imageUrl: FACADE_IMG, hotspots: facadeHotspots },
      { viewKey: 'back', viewName: 'Back', viewDirection: 'back', sortOrder: 1, imageUrl: FACADE_BACK_IMG, hotspots: backHotspots },
    ];
    for (const v of facadeViews) {
      await DevelopmentScene.create({
        developmentId: development._id,
        targetType: 'building',
        targetId: firstBuilding.id,
        viewKey: v.viewKey,
        viewName: v.viewName,
        viewDirection: v.viewDirection,
        sortOrder: v.sortOrder,
        imageUrl: v.imageUrl,
        imageWidth: FACADE_W,
        imageHeight: FACADE_H,
        draft: { hotspots: v.hotspots, version: 1 },
        published: { hotspots: v.hotspots, version: 1, publishedAt: new Date() },
        version: 1,
      });
    }

    // 3) Park Residence: building → floor → apartment. Its facade has one band
    //    per floor (Links to: Floor); Floor 1 has a floor-plan picture with one
    //    region per apartment (Links to: Unit).
    const park = buildingIdsForAerial[2];
    const parkFloors = await DevelopmentFloor.find({ buildingId: park.id }).sort({ level: 1 }).lean();
    const bandH = 0.8 / Math.max(1, parkFloors.length);
    const floorBands = parkFloors.map((f, i) => {
      const y1 = round2(0.92 - i * bandH);
      const y0 = round2(y1 - bandH + 0.008);
      return {
        id: `h_f_${i}`,
        shape: 'rect' as const,
        points: [
          [0.12, y0],
          [0.88, y1],
        ],
        label: f.label,
        linkType: 'floor' as const,
        linkId: encodeId(String(f._id)),
        z: i,
      };
    });
    await DevelopmentScene.create({
      developmentId: development._id,
      targetType: 'building',
      targetId: park.id,
      viewKey: 'main',
      viewName: 'Front',
      viewDirection: 'front',
      sortOrder: 0,
      imageUrl: 'https://picsum.photos/seed/eastgate-park/1200/900',
      imageWidth: FACADE_W,
      imageHeight: FACADE_H,
      draft: { hotspots: floorBands, version: 1 },
      published: { hotspots: floorBands, version: 1, publishedAt: new Date() },
      version: 1,
    });
    if (parkFloors[0]) {
      const floorUnits = await DevelopmentUnit.find({ floorId: parkFloors[0]._id }).sort({ unitNumber: 1 }).lean();
      const w = 0.84 / Math.max(1, floorUnits.length);
      const planRegions = floorUnits.map((u, i) => ({
        id: `h_p_${i}`,
        shape: 'rect' as const,
        points: [
          [round2(0.08 + i * w + 0.01), 0.18],
          [round2(0.08 + (i + 1) * w - 0.01), 0.82],
        ],
        linkType: 'unit' as const,
        linkId: encodeId(String(u._id)),
        z: i,
      }));
      await DevelopmentScene.create({
        developmentId: development._id,
        targetType: 'floor',
        targetId: parkFloors[0]._id,
        viewKey: 'main',
        viewName: 'Floor plan',
        viewDirection: 'aerial',
        sortOrder: 0,
        imageUrl: 'https://picsum.photos/seed/eastgate-park-plan/1200/800',
        imageWidth: 1200,
        imageHeight: 800,
        draft: { hotspots: planRegions, version: 1 },
        published: { hotspots: planRegions, version: 1, publishedAt: new Date() },
        version: 1,
      });
    }

    await Development.updateOne(
      { _id: development._id },
      { $set: { stats: { buildings: buildingDefs.length, units: unitCount, available: availableCount } } }
    );

    const base = process.env.PUBLIC_WEB_URL || 'http://localhost:3000';
    log.info('✅ Demo development seeded:');
    log.info(`   Buildings: ${buildingDefs.length} · Units: ${unitCount} · Available: ${availableCount}`);
    log.info(`   Demo listings attached to units: ${attachedCount} · standalone listing region on the residence picture: 1`);
    log.info('   Examples: residence picture → Building regions; Seaside Tower 1 → Unit regions (2 views);');
    log.info('             Park Residence → Floor regions → Floor 1 plan → Unit regions; Seaside Tower 2 → no picture (floor-by-floor list).');
    log.info(`   Scenes: site aerial (${aerialHotspots.length} buildings) + ${buildingDefs[0].name} facade, 2 views (${facadeHotspots.length} units)`);
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

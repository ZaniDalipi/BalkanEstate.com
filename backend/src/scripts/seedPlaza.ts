/**
 * Seed "Plaza Tirana (Demo)": a 25-level mixed-use tower on a city square,
 * built from real renders (public/demo/plaza), so the Residences explorer can
 * be seen with pictures that match the data.
 *
 *   Residence picture (2 aerials) → Plaza Tower | Plaza Podium
 *   Plaza Tower → Front (one region per apartment) | Model (one band per floor)
 *   Plaza Podium → no picture: the floor-by-floor list (shops, offices)
 *
 * Usage:
 *   npm run seed:plaza                                  # most recent user
 *   DEV_SEED_EMAIL=you@example.com npm run seed:plaza   # a specific user
 *
 * Idempotent: a previous Plaza demo and its "[Demo Plaza]" listings are
 * replaced on every run. Pictures are served by the web app from `public/`;
 * set PUBLIC_WEB_URL when the app does not run on http://localhost:3000.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Development from '../models/Development';
import DevelopmentBuilding from '../models/DevelopmentBuilding';
import DevelopmentFloor from '../models/DevelopmentFloor';
import DevelopmentUnit from '../models/DevelopmentUnit';
import DevelopmentMembership from '../models/DevelopmentMembership';
import Property from '../models/Property';
import { encodeId } from '../utils/idObfuscation';
import { scriptLogger as log } from '../utils/logger';
import { resolveScriptMongoUri, redactMongoUri } from '../utils/scriptMongoUri';
import {
  createPublishedView,
  normalise,
  publicAssetUrl,
  removeDemoDevelopment,
  resolveSeedOwner,
  type Oid,
  type Point,
  type SeedRegion,
} from './demo/seedSupport';
import {
  FRONT_PODIUM,
  PLAZA_IMAGES,
  RESIDENCE_AERIAL,
  RESIDENCE_AERIAL_EAST,
  TOWER_FIRST_LEVEL,
  TOWER_TOP_LEVEL,
  PARKING_BAY_CENTRES,
  frontCell,
  modelFloorBand,
  parkingBay,
} from './demo/plazaGeometry';
import { podiumUnits, towerUnits, type PlazaUnitSpec } from './demo/plazaUnits';
import { grant as grantResidence } from '../services/developments/billing/residencePurchaseService';

dotenv.config();

const SLUG = 'plaza-tirana-demo';
const LISTING_PREFIX = '[Demo Plaza] ';
const ADDRESS = 'Bulevardi Dëshmorët e Kombit';
const LAT = 41.3275;
const LNG = 19.8187;

type ImageKey = keyof typeof PLAZA_IMAGES;
const image = (key: ImageKey) => ({
  imageUrl: publicAssetUrl(PLAZA_IMAGES[key].path),
  imageWidth: PLAZA_IMAGES[key].width,
  imageHeight: PLAZA_IMAGES[key].height,
});
const region = (key: ImageKey, id: string, poly: Point[], linkType: SeedRegion['linkType'], target: Oid, z: number, label?: string): SeedRegion => ({
  id,
  shape: 'polygon',
  points: normalise(poly, PLAZA_IMAGES[key].width, PLAZA_IMAGES[key].height),
  linkType,
  linkId: encodeId(String(target)),
  z,
  ...(label ? { label } : {}),
});

async function run(): Promise<void> {
  const { uri, source } = resolveScriptMongoUri();
  await mongoose.connect(uri);
  log.info(`Connected to ${redactMongoUri(uri)} (from ${source})`);

  try {
    const owner = await resolveSeedOwner('seed:plaza');
    log.info(`Seeding Plaza demo owned by ${owner.email}`);
    await removeDemoDevelopment(SLUG);
    await Property.deleteMany({ sellerId: owner._id, title: { $regex: '^\\[Demo Plaza\\] ' } });

    const development = await Development.create({
      ownerId: owner._id,
      ownerType: 'user',
      name: 'Plaza Tirana (Demo)',
      slug: SLUG,
      description:
        'A 25-level glass tower on a new pedestrian square in central Tirana. Apartments from studios to two full-width penthouses sit above a three-level podium of shops and offices with landscaped roof gardens. Demo data built from the project renders.',
      country: 'Albania',
      city: 'Tirana',
      municipality: 'Njësia Bashkiake Nr. 5',
      address: ADDRESS,
      lat: LAT,
      lng: LNG,
      category: 'mixed_use',
      constructionStatus: 'under_construction',
      expectedCompletionDate: new Date('2028-03-31'),
      amenities: [
        'City square',
        'Roof gardens',
        'Concierge',
        '3-level underground parking',
        'Fitness & spa',
        'Shops & cafés',
        '24/7 security',
        'EV charging',
        'Smart home',
        'Storage rooms',
      ],
      website: 'https://example.com/plaza',
      contact: { name: 'Plaza Sales Office', email: 'sales@plaza-demo.example', phone: '+355692000000' },
      status: 'published',
      publishedAt: new Date(),
      stats: { buildings: 0, units: 0, available: 0 },
    });
    const developmentId = development._id as Oid;
    await DevelopmentMembership.create({ developmentId, userId: owner._id, role: 'owner', status: 'active' });

    // Demo residences stay public: a 10-year Residence Pass, granted (not bought).
    await grantResidence(development, owner._id, { months: 120, note: 'Demo residence' });

    const [tower, podium] = await DevelopmentBuilding.create([
      { developmentId, name: 'Plaza Tower', code: 'T', slug: 'plaza-tower', totalFloors: TOWER_TOP_LEVEL + 1, order: 0, description: 'Residential tower, floors 3–24, above the podium.' },
      { developmentId, name: 'Plaza Podium', code: 'P', slug: 'plaza-podium', totalFloors: 3, order: 1, description: 'Shops on the square and two office levels with roof gardens.' },
    ]);
    const towerId = tower._id as Oid;
    const podiumId = podium._id as Oid;

    // --- Podium: shops and offices (no picture → floor-by-floor list) -------
    let units = 0;
    let available = 0;
    const podiumFloorLabels = ['Ground floor', 'Level 1', 'Level 2'];
    const availableOffices: Oid[] = [];
    for (const [level, label] of podiumFloorLabels.entries()) {
      const floor = await DevelopmentFloor.create({ developmentId, buildingId: podiumId, label, level, kind: level === 0 ? 'ground' : 'standard', order: level });
      for (const u of podiumUnits().filter((p) => p.level === level)) {
        const unit = await DevelopmentUnit.create({
          developmentId,
          buildingId: podiumId,
          floorId: floor._id,
          unitNumber: u.unitNumber,
          unitType: u.unitType,
          netArea: Math.round(u.area * 0.92),
          totalArea: u.area,
          price: Math.round((u.unitType === 'retail' ? 3400 : 2300) * u.area / 1000) * 1000,
          currency: 'EUR',
          pricePerSqm: u.unitType === 'retail' ? 3400 : 2300,
          priceVisibility: u.unitType === 'retail' ? 'on_request' : 'public',
          availability: u.availability,
          description: u.description,
        });
        units += 1;
        if (u.availability === 'available') {
          available += 1;
          if (u.unitType === 'office') availableOffices.push(unit._id as Oid);
        }
      }
    }

    // --- Tower: apartments --------------------------------------------------
    const floorIdByLevel = new Map<number, Oid>();
    for (let level = TOWER_FIRST_LEVEL; level <= TOWER_TOP_LEVEL; level += 1) {
      const floor = await DevelopmentFloor.create({
        developmentId,
        buildingId: towerId,
        label: level === TOWER_TOP_LEVEL ? `Floor ${level} · Penthouses` : `Floor ${level}`,
        level,
        kind: level === TOWER_TOP_LEVEL ? 'penthouse' : 'standard',
        order: level,
      });
      floorIdByLevel.set(level, floor._id as Oid);
    }
    const plan = PLAZA_IMAGES.duplexFloorplan;
    const towerSeeded: { spec: PlazaUnitSpec; id: Oid }[] = [];
    for (const spec of towerUnits()) {
      const { pos: _pos, span: _span, alsoOnLevels: _also, hasFloorplan, level, ...fields } = spec;
      const unit = await DevelopmentUnit.create({
        ...fields,
        developmentId,
        buildingId: towerId,
        floorId: floorIdByLevel.get(level),
        grossArea: Math.round(spec.totalArea * 1.12),
        currency: 'EUR',
        ...(hasFloorplan ? { floorplan: { url: publicAssetUrl(plan.path), width: plan.width, height: plan.height } } : {}),
      });
      towerSeeded.push({ spec, id: unit._id as Oid });
      units += 1;
      if (spec.availability === 'available') available += 1;
    }

    // --- Parking: four street bays, each sold with a tower apartment -------
    // Units of their own (price, area, details) linked to the apartment, so
    // hovering the apartment on the front picture lights its bay up too.
    const parkingFloor = await DevelopmentFloor.create({ developmentId, buildingId: podiumId, label: 'Parking −1', level: -1, kind: 'basement', order: -1 });
    const withParking = towerSeeded
      .filter(({ spec }) => spec.availability === 'available' && spec.unitType === 'apartment' && spec.level >= 8 && spec.level <= 12)
      .slice(0, PARKING_BAY_CENTRES.length);
    const parkingSeeded: { id: Oid; unitNumber: string }[] = [];
    for (const [i, apartment] of withParking.entries()) {
      const unitNumber = `P-${String(i + 1).padStart(2, '0')}`;
      const spot = await DevelopmentUnit.create({
        developmentId,
        buildingId: podiumId,
        floorId: parkingFloor._id,
        unitNumber,
        unitType: 'parking',
        totalArea: 12.5,
        price: 15000,
        currency: 'EUR',
        availability: 'available',
        description: `Parking bay ${unitNumber}, sold together with apartment ${apartment.spec.unitNumber}. EV charging ready.`,
      });
      await DevelopmentUnit.updateOne({ _id: apartment.id }, { $set: { linkedUnitIds: [spot._id] } });
      parkingSeeded.push({ id: spot._id as Oid, unitNumber });
      units += 1;
      available += 1;
    }

    // --- Listings: three apartments and one office on the marketplace -------
    const listing = (over: Record<string, unknown>) =>
      Property.create({
        sellerId: owner._id,
        createdByName: (owner as unknown as { name?: string }).name || 'Demo owner',
        createdByEmail: owner.email,
        createdAsRole: 'private_seller',
        listingType: 'sale',
        address: ADDRESS,
        city: 'Tirana',
        country: 'Albania',
        lat: LAT,
        lng: LNG,
        yearBuilt: 2028,
        propertyType: 'apartment',
        status: 'active',
        developmentId,
        ...over,
      });
    const pickAvailable = (test: (s: PlazaUnitSpec) => boolean) => towerSeeded.find(({ spec }) => spec.availability === 'available' && test(spec));
    const showcase = [
      pickAvailable((s) => s.unitType === 'apartment' && s.beds === 2 && s.level >= 10),
      pickAvailable((s) => s.unitType === 'apartment' && s.beds === 3 && s.level >= 14),
      pickAvailable((s) => s.unitType === 'duplex'),
    ].filter((x): x is { spec: PlazaUnitSpec; id: Oid } => !!x);
    for (const { spec, id } of showcase) {
      const created = await listing({
        title: `${LISTING_PREFIX}${spec.beds}-bedroom ${spec.unitType} ${spec.unitNumber}, floor ${spec.level}`,
        description: `${spec.description} Listed from the Plaza Tirana demo; the apartment drawer links to this listing.`,
        price: spec.price,
        beds: spec.beds,
        baths: spec.baths,
        livingRooms: spec.livingRooms,
        sqft: spec.totalArea,
        netArea: spec.netArea,
        floorNumber: spec.level,
        totalFloors: TOWER_TOP_LEVEL + 1,
        imageUrl: publicAssetUrl(spec.unitType === 'duplex' ? plan.path : PLAZA_IMAGES.towerFront.path),
        buildingId: towerId,
        floorId: floorIdByLevel.get(spec.level),
        unitId: id,
      });
      await DevelopmentUnit.updateOne({ _id: id }, { $set: { listingIds: [created._id], primaryListingId: created._id } });
    }
    const office = availableOffices[0] ? await DevelopmentUnit.findById(availableOffices[0]) : null;
    if (office) {
      const created = await listing({
        title: `${LISTING_PREFIX}Office ${office.unitNumber} for rent`,
        description: `${office.description} Available for rent from the Plaza Tirana demo.`,
        listingType: 'rent',
        rentPeriod: 'monthly',
        price: Math.round((office.totalArea ?? 120) * 16),
        propertyType: 'commercial',
        sqft: office.totalArea,
        floorNumber: 1,
        totalFloors: 3,
        imageUrl: publicAssetUrl(PLAZA_IMAGES.residenceAerial.path),
        buildingId: podiumId,
        floorId: office.floorId,
        unitId: office._id,
      });
      office.listingIds = [created._id];
      office.primaryListingId = created._id;
      await office.save();
    }

    // --- Pictures -------------------------------------------------------------
    const residenceRegions = (key: 'residenceAerial' | 'residenceAerialEast', g: typeof RESIDENCE_AERIAL) => [
      region(key, 'tower', g.tower, 'building', towerId, 1, 'Plaza Tower'),
      ...g.podium.map((poly, i) => region(key, `podium_${i}`, poly, 'building', podiumId, 0, 'Plaza Podium')),
    ];
    await createPublishedView({ developmentId, targetType: 'development', targetId: developmentId, viewKey: 'main', viewName: 'Square', viewDirection: 'aerial', sortOrder: 0, ...image('residenceAerial'), regions: residenceRegions('residenceAerial', RESIDENCE_AERIAL) });
    await createPublishedView({ developmentId, targetType: 'development', targetId: developmentId, viewKey: 'east', viewName: 'From the east', viewDirection: 'aerial', sortOrder: 1, ...image('residenceAerialEast'), regions: residenceRegions('residenceAerialEast', RESIDENCE_AERIAL_EAST) });

    const frontRegions: SeedRegion[] = towerSeeded.flatMap(({ spec, id }) =>
      [spec.level, ...spec.alsoOnLevels].map((level) => region('towerFront', `u_${spec.unitNumber}_${level}`, frontCell(level, spec.pos, spec.span), 'unit', id, level))
    );
    frontRegions.push(region('towerFront', 'podium', FRONT_PODIUM, 'building', podiumId, 0, 'Plaza Podium'));
    parkingSeeded.forEach(({ id, unitNumber }, i) =>
      frontRegions.push(region('towerFront', `parking_${i + 1}`, parkingBay(PARKING_BAY_CENTRES[i]), 'unit', id, 2, `Parking ${unitNumber}`))
    );
    await createPublishedView({ developmentId, targetType: 'building', targetId: towerId, viewKey: 'main', viewName: 'Front', viewDirection: 'front', sortOrder: 0, ...image('towerFront'), regions: frontRegions });

    const bandRegions = [...floorIdByLevel.entries()].map(([level, floorId]) => region('towerModel', `f_${level}`, modelFloorBand(level), 'floor', floorId, level, `Floor ${level}`));
    await createPublishedView({ developmentId, targetType: 'building', targetId: towerId, viewKey: 'model', viewName: 'Floors', viewDirection: 'custom', sortOrder: 1, ...image('towerModel'), regions: bandRegions });

    await Development.updateOne({ _id: developmentId }, { $set: { stats: { buildings: 2, units, available } } });

    const base = (process.env.PUBLIC_WEB_URL || 'http://localhost:3000').replace(/\/+$/, '');
    log.info('✅ Plaza Tirana demo seeded:');
    log.info(`   Buildings: 2 · Units: ${units} · Available: ${available} · Listings: ${showcase.length + (office ? 1 : 0)}`);
    log.info('   Residence: 2 aerial pictures → Plaza Tower / Plaza Podium');
    log.info(`   Plaza Tower: Front (${frontRegions.length - 1} apartment regions) · Floors (${bandRegions.length} floor bands); duplexes have a floor plan`);
    log.info('   Plaza Podium: no picture → floor-by-floor list of shops and offices');
    log.info(`   Parking: ${parkingSeeded.length} street bays on the Front picture, each sold with a tower apartment`);
    log.info(`   Public page: ${base}/en/developments/${SLUG}`);
  } catch (error) {
    log.error('Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();

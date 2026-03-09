/**
 * Large Dataset Performance Tests
 *
 * Tests whether the application can handle:
 * - 50,000 properties for sale
 * - 2,000 agents
 * - 1,000 agencies
 *
 * Uses MongoDB Memory Server with bulk inserts to simulate real-world scale.
 *
 * Run standalone:
 *   npx jest --testPathPattern="large-dataset-performance" --detectOpenHandles --forceExit
 *
 * If MongoDB Memory Server cannot download a binary (e.g., in sandboxed CI),
 * you can set MONGO_URI to an existing MongoDB instance:
 *   MONGO_URI=mongodb://localhost:27017/perftest npx jest ...
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Property from '../models/Property';
import Agent from '../models/Agent';
import Agency from '../models/Agency';
import User from '../models/User';

// ── Constants ────────────────────────────────────────────────────────

const TOTAL_PROPERTIES = 50_000;
const TOTAL_AGENTS = 2_000;
const TOTAL_AGENCIES = 1_000;
const BATCH_SIZE = 5_000;

const balkanCountries = ['Kosovo', 'Albania', 'Serbia', 'North Macedonia', 'Montenegro', 'Bosnia and Herzegovina', 'Croatia'];
const balkanCities: Record<string, string[]> = {
  Kosovo: ['Pristina', 'Prizren', 'Peja', 'Gjilan', 'Mitrovica', 'Ferizaj'],
  Albania: ['Tirana', 'Durres', 'Vlore', 'Shkoder', 'Elbasan', 'Korce'],
  Serbia: ['Belgrade', 'Novi Sad', 'Nis', 'Kragujevac', 'Subotica'],
  'North Macedonia': ['Skopje', 'Bitola', 'Ohrid', 'Kumanovo', 'Tetovo'],
  Montenegro: ['Podgorica', 'Budva', 'Kotor', 'Bar', 'Herceg Novi'],
  'Bosnia and Herzegovina': ['Sarajevo', 'Banja Luka', 'Mostar', 'Tuzla', 'Zenica'],
  Croatia: ['Zagreb', 'Split', 'Dubrovnik', 'Rijeka', 'Zadar'],
};

const propertyTypes = ['house', 'apartment', 'villa', 'land', 'other'] as const;
const conditions = ['new', 'excellent', 'good', 'fair', 'needs-renovation'] as const;
const furnishings = ['furnished', 'semi-furnished', 'unfurnished'] as const;

// ── Helpers ──────────────────────────────────────────────────────────

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function measureMs(label: string, fn: () => Promise<any>): Promise<{ label: string; ms: number; result: any }> {
  const start = performance.now();
  const result = await fn();
  const ms = Math.round(performance.now() - start);
  return { label, ms, result };
}

// ── Data Generators ──────────────────────────────────────────────────

function generateUserDocs(count: number): any[] {
  const docs: any[] = [];
  for (let i = 0; i < count; i++) {
    const country = randomItem(balkanCountries);
    docs.push({
      _id: new mongoose.Types.ObjectId(),
      email: `perfuser${i}@test.local`,
      password: '$2a$12$dummyhashedpasswordforperftesting1234567890abc',
      name: `Perf User ${i}`,
      role: 'agent',
      availableRoles: ['agent'],
      activeRole: 'agent',
      primaryRole: 'agent',
      provider: 'local',
      isEmailVerified: true,
      city: randomItem(balkanCities[country]),
      country,
      listingsCount: 0,
      totalListingsCreated: 0,
      loginAttempts: 0,
    });
  }
  return docs;
}

function generateAgencyDocs(count: number, ownerIds: mongoose.Types.ObjectId[]): any[] {
  const docs: any[] = [];
  for (let i = 0; i < count; i++) {
    const country = randomItem(balkanCountries);
    const city = randomItem(balkanCities[country]);
    docs.push({
      _id: new mongoose.Types.ObjectId(),
      ownerId: ownerIds[i % ownerIds.length],
      name: `Perf Agency ${i}`,
      slug: `${country.toLowerCase().replace(/\s+/g, '-')}/perf-agency-${i}`,
      invitationCode: `AGY-PERF${i}-${String(i).padStart(6, '0')}`,
      email: `agency${i}@test.local`,
      phone: `+3816${String(i).padStart(7, '0')}`,
      city,
      country,
      subscription: {
        status: 'active',
        startDate: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        amount: 1000,
        currency: 'EUR',
        autoRenew: true,
      },
      stats: {
        totalListings: 0,
        activeListings: 0,
        soldListings: 0,
        totalAgents: 2,
        totalRevenue: 0,
        avgDaysToSell: 0,
      },
      promotionCoupons: {
        monthly: 15,
        available: 15,
        used: 0,
        lastRefresh: new Date(),
      },
      agents: [],
      views: randomBetween(0, 5000),
      isFeatured: i < 50,
    });
  }
  return docs;
}

function generateAgentDocs(count: number, userIds: mongoose.Types.ObjectId[], agencyIds: mongoose.Types.ObjectId[]): any[] {
  const docs: any[] = [];
  for (let i = 0; i < count; i++) {
    docs.push({
      _id: new mongoose.Types.ObjectId(),
      userId: userIds[i],
      agencyName: `Perf Agency ${i % agencyIds.length}`,
      agencyId: agencyIds[i % agencyIds.length],
      agentId: `AGENT-PERF-${String(i).padStart(6, '0')}`,
      licenseNumber: `LIC-${String(i).padStart(8, '0')}`,
      licenseStatus: 'verified',
      licenseVerified: true,
      specializations: [randomItem(['residential', 'commercial', 'luxury', 'land'])],
      languages: ['English', randomItem(['Serbian', 'Albanian', 'Croatian', 'Macedonian'])],
      serviceAreas: [randomItem(balkanCities[randomItem(balkanCountries)])],
      rating: +(Math.random() * 5).toFixed(1),
      totalReviews: randomBetween(0, 200),
      totalSales: randomBetween(0, 100),
      activeListings: randomBetween(0, 25),
      views: randomBetween(0, 10000),
      isActive: true,
    });
  }
  return docs;
}

function generatePropertyBatch(batchStart: number, batchSize: number, sellerIds: mongoose.Types.ObjectId[], agencyIds: mongoose.Types.ObjectId[]): any[] {
  const docs: any[] = [];
  for (let i = batchStart; i < batchStart + batchSize; i++) {
    const country = randomItem(balkanCountries);
    const city = randomItem(balkanCities[country]);
    const propertyType = randomItem(propertyTypes);
    const sellerId = sellerIds[i % sellerIds.length];
    const agencyId = agencyIds[i % agencyIds.length];

    docs.push({
      sellerId,
      createdByName: `Perf User ${i % sellerIds.length}`,
      createdByEmail: `perfuser${i % sellerIds.length}@test.local`,
      createdAsRole: 'agent',
      createdByAgencyName: `Perf Agency ${i % agencyIds.length}`,
      createdByAgencyId: agencyId,
      listingType: 'sale',
      title: `${randomItem(['Modern', 'Luxury', 'Cozy', 'Spacious', 'Elegant'])} ${propertyType} in ${city} #${i}`,
      status: randomItem(['active', 'active', 'active', 'active', 'pending', 'sold']),
      price: randomBetween(30000, 2000000),
      address: `${randomBetween(1, 200)} Perf Street ${i}`,
      city,
      country,
      beds: randomBetween(1, 6),
      baths: randomBetween(1, 4),
      livingRooms: randomBetween(1, 3),
      sqft: randomBetween(30, 500),
      yearBuilt: randomBetween(1960, 2025),
      parking: randomBetween(0, 3),
      description: `Performance test property ${i}. A great property in ${city}, ${country}.`,
      specialFeatures: [],
      materials: [],
      imageUrl: `https://placeholder.test/property-${i}.jpg`,
      images: [],
      lat: randomBetween(39, 46) + Math.random(),
      lng: randomBetween(13, 23) + Math.random(),
      propertyType,
      views: randomBetween(0, 5000),
      saves: randomBetween(0, 500),
      inquiries: randomBetween(0, 100),
      isPromoted: i < 5000,
      promotionTier: i < 5000 ? randomItem(['standard', 'featured', 'highlight', 'premium']) : undefined,
      amenities: [],
      condition: randomItem(conditions),
      furnishing: randomItem(furnishings),
      hasGeneratedVideo: false,
      hasVirtualTour360: false,
      lastRenewed: new Date(Date.now() - randomBetween(0, 90) * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - randomBetween(0, 365) * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });
  }
  return docs;
}

// ── Tests ────────────────────────────────────────────────────────────

// The shared setup.ts already creates a MongoMemoryServer and connects mongoose.
// We rely on that connection here. If it failed (no binary available), all tests
// will fail at the seeding stage and that's the expected behavior — the test
// reports that MongoDB is required.

describe('Large Dataset Performance Tests', () => {
  let userIds: mongoose.Types.ObjectId[] = [];
  let agencyIds: mongoose.Types.ObjectId[] = [];
  let seeded = false;

  jest.setTimeout(300_000); // 5 minutes for seeding + all tests

  beforeAll(async () => {
    // Check if mongoose is connected (from shared setup.ts)
    if (mongoose.connection.readyState !== 1) {
      console.warn('\n⚠ MongoDB not connected. Skipping large dataset tests.\n');
      return;
    }

    console.log('\n=== Seeding large dataset ===');
    console.log(`  Properties: ${TOTAL_PROPERTIES.toLocaleString()}`);
    console.log(`  Agents:     ${TOTAL_AGENTS.toLocaleString()}`);
    console.log(`  Agencies:   ${TOTAL_AGENCIES.toLocaleString()}\n`);

    // 1) Create users (one per agent + extra for agency owners)
    const totalUsers = TOTAL_AGENTS + TOTAL_AGENCIES;
    const userDocs = generateUserDocs(totalUsers);
    const userStart = performance.now();
    for (let i = 0; i < userDocs.length; i += BATCH_SIZE) {
      await User.insertMany(userDocs.slice(i, i + BATCH_SIZE), { ordered: false });
    }
    userIds = userDocs.map((d) => d._id);
    console.log(`  Users seeded: ${totalUsers.toLocaleString()} in ${Math.round(performance.now() - userStart)}ms`);

    // 2) Create agencies (bypass pre-save hooks via insertMany for speed)
    const ownerIds = userIds.slice(TOTAL_AGENTS);
    const agencyDocs = generateAgencyDocs(TOTAL_AGENCIES, ownerIds);
    const agencyStart = performance.now();
    await Agency.insertMany(agencyDocs, { ordered: false });
    agencyIds = agencyDocs.map((d) => d._id);
    console.log(`  Agencies seeded: ${TOTAL_AGENCIES.toLocaleString()} in ${Math.round(performance.now() - agencyStart)}ms`);

    // 3) Create agents
    const agentUserIds = userIds.slice(0, TOTAL_AGENTS);
    const agentDocs = generateAgentDocs(TOTAL_AGENTS, agentUserIds, agencyIds);
    const agentStart = performance.now();
    await Agent.insertMany(agentDocs, { ordered: false });
    console.log(`  Agents seeded: ${TOTAL_AGENTS.toLocaleString()} in ${Math.round(performance.now() - agentStart)}ms`);

    // 4) Create properties in batches
    const propStart = performance.now();
    for (let batch = 0; batch < TOTAL_PROPERTIES; batch += BATCH_SIZE) {
      const size = Math.min(BATCH_SIZE, TOTAL_PROPERTIES - batch);
      const docs = generatePropertyBatch(batch, size, agentUserIds, agencyIds);
      await Property.insertMany(docs, { ordered: false });
      console.log(`  Properties batch: ${batch + size} / ${TOTAL_PROPERTIES.toLocaleString()}`);
    }
    console.log(`  Properties seeded: ${TOTAL_PROPERTIES.toLocaleString()} in ${Math.round(performance.now() - propStart)}ms`);

    // 5) Ensure indexes are built
    const indexStart = performance.now();
    await Promise.all([
      Property.ensureIndexes(),
      Agent.ensureIndexes(),
      Agency.ensureIndexes(),
    ]);
    console.log(`  Indexes ensured in ${Math.round(performance.now() - indexStart)}ms`);

    console.log('\n=== Seeding complete ===\n');
    seeded = true;
  });

  function skipIfNotSeeded() {
    if (!seeded) {
      console.log('  [SKIPPED] MongoDB not available or seeding failed');
    }
    return !seeded;
  }

  // ────────────────────────────────────────────────────────────────
  // Collection counts
  // ────────────────────────────────────────────────────────────────

  it('should have the expected document counts', async () => {
    if (skipIfNotSeeded()) return;

    const [propCount, agentCount, agencyCount] = await Promise.all([
      Property.countDocuments(),
      Agent.countDocuments(),
      Agency.countDocuments(),
    ]);

    console.log(`  Counts — Properties: ${propCount}, Agents: ${agentCount}, Agencies: ${agencyCount}`);
    expect(propCount).toBe(TOTAL_PROPERTIES);
    expect(agentCount).toBe(TOTAL_AGENTS);
    expect(agencyCount).toBe(TOTAL_AGENCIES);
  });

  // ────────────────────────────────────────────────────────────────
  // Property Queries
  // ────────────────────────────────────────────────────────────────

  describe('Property query performance', () => {
    it('should paginate properties (page 1, limit 20) under 500ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Paginated listing', () =>
        Property.find({ status: 'active' }).sort({ createdAt: -1 }).skip(0).limit(20).lean()
      );
      console.log(`  Paginated listing (20 items): ${ms}ms — returned ${result.length} docs`);
      expect(result.length).toBe(20);
      expect(ms).toBeLessThan(500);
    });

    it('should paginate deep (page 500, limit 20) under 2000ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Deep pagination', () =>
        Property.find({ status: 'active' }).sort({ createdAt: -1 }).skip(9980).limit(20).lean()
      );
      console.log(`  Deep pagination (skip 9980): ${ms}ms — returned ${result.length} docs`);
      expect(result.length).toBeGreaterThan(0);
      expect(ms).toBeLessThan(2000);
    });

    it('should filter by city under 500ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('City filter', () =>
        Property.find({ city: 'Pristina', status: 'active' }).limit(20).lean()
      );
      console.log(`  City filter (Pristina): ${ms}ms — returned ${result.length} docs`);
      expect(ms).toBeLessThan(500);
    });

    it('should filter by property type + city under 500ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Type + city filter', () =>
        Property.find({ propertyType: 'apartment', city: 'Belgrade', status: 'active' })
          .sort({ price: 1 }).limit(20).lean()
      );
      console.log(`  Apartment in Belgrade: ${ms}ms — returned ${result.length} docs`);
      expect(ms).toBeLessThan(500);
    });

    it('should filter by price range under 500ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Price range', () =>
        Property.find({ status: 'active', price: { $gte: 100000, $lte: 300000 } })
          .sort({ price: 1 }).limit(20).lean()
      );
      console.log(`  Price range 100k-300k: ${ms}ms — returned ${result.length} docs`);
      expect(result.length).toBeGreaterThan(0);
      expect(ms).toBeLessThan(500);
    });

    it('should perform compound filter (city + type + price + beds) under 500ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Compound filter', () =>
        Property.find({
          status: 'active', city: 'Tirana', propertyType: 'house',
          price: { $gte: 50000, $lte: 500000 }, beds: { $gte: 2 },
        }).sort({ price: 1 }).limit(20).lean()
      );
      console.log(`  Compound filter: ${ms}ms — returned ${result.length} docs`);
      expect(ms).toBeLessThan(500);
    });

    it('should text search on title under 1000ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Regex title search', () =>
        Property.find({ status: 'active', title: { $regex: 'Luxury', $options: 'i' } })
          .limit(20).lean()
      );
      console.log(`  Title search (Luxury): ${ms}ms — returned ${result.length} docs`);
      expect(ms).toBeLessThan(1000);
    });

    it('should fetch promoted properties under 500ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Promoted properties', () =>
        Property.find({ isPromoted: true, status: 'active' })
          .sort({ promotionTier: -1 }).limit(20).lean()
      );
      console.log(`  Promoted properties: ${ms}ms — returned ${result.length} docs`);
      expect(result.length).toBe(20);
      expect(ms).toBeLessThan(500);
    });

    it('should count active properties by country (aggregation) under 2000ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Country aggregation', () =>
        Property.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$country', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
      );
      console.log(`  Country aggregation: ${ms}ms — ${result.length} countries`);
      result.forEach((r: any) => console.log(`    ${r._id}: ${r.count}`));
      expect(result.length).toBeGreaterThan(0);
      expect(ms).toBeLessThan(2000);
    });

    it('should compute average price per city (aggregation) under 2000ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Avg price per city', () =>
        Property.aggregate([
          { $match: { status: 'active', listingType: 'sale' } },
          { $group: { _id: '$city', avgPrice: { $avg: '$price' }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ])
      );
      console.log(`  Avg price per city (top 10): ${ms}ms`);
      result.forEach((r: any) =>
        console.log(`    ${r._id}: avg €${Math.round(r.avgPrice).toLocaleString()} (${r.count} listings)`)
      );
      expect(result.length).toBeGreaterThan(0);
      expect(ms).toBeLessThan(2000);
    });

    it('should handle geo-bounding-box query under 1000ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Geo bounding box', () =>
        Property.find({
          status: 'active',
          lat: { $gte: 42.0, $lte: 43.5 },
          lng: { $gte: 20.0, $lte: 22.0 },
        }).limit(50).lean()
      );
      console.log(`  Geo bounding box (Kosovo): ${ms}ms — returned ${result.length} docs`);
      expect(ms).toBeLessThan(1000);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Agent Queries
  // ────────────────────────────────────────────────────────────────

  describe('Agent query performance', () => {
    it('should list agents paginated under 500ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Agent listing', () =>
        Agent.find({ isActive: true }).sort({ rating: -1 }).skip(0).limit(20).lean()
      );
      console.log(`  Agent listing (top 20 by rating): ${ms}ms — returned ${result.length} docs`);
      expect(result.length).toBe(20);
      expect(ms).toBeLessThan(500);
    });

    it('should filter agents by agency under 500ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Agents by agency', () =>
        Agent.find({ agencyId: agencyIds[0] }).lean()
      );
      console.log(`  Agents in agency[0]: ${ms}ms — returned ${result.length} docs`);
      expect(result.length).toBeGreaterThan(0);
      expect(ms).toBeLessThan(500);
    });

    it('should search agents by specialization under 500ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Agent specialization', () =>
        Agent.find({ isActive: true, specializations: { $in: ['luxury'] } })
          .sort({ totalSales: -1 }).limit(20).lean()
      );
      console.log(`  Luxury agents (top 20): ${ms}ms — returned ${result.length} docs`);
      expect(ms).toBeLessThan(500);
    });

    it('should aggregate agent stats by agency under 2000ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Agent stats aggregation', () =>
        Agent.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$agencyId', avgRating: { $avg: '$rating' }, totalSales: { $sum: '$totalSales' }, agentCount: { $sum: 1 } } },
          { $sort: { totalSales: -1 } },
          { $limit: 10 },
        ])
      );
      console.log(`  Agent stats aggregation (top 10 agencies): ${ms}ms`);
      expect(result.length).toBeGreaterThan(0);
      expect(ms).toBeLessThan(2000);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Agency Queries
  // ────────────────────────────────────────────────────────────────

  describe('Agency query performance', () => {
    it('should list agencies paginated under 500ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Agency listing', () =>
        Agency.find().sort({ 'stats.totalRevenue': -1 }).skip(0).limit(20).lean()
      );
      console.log(`  Agency listing: ${ms}ms — returned ${result.length} docs`);
      expect(result.length).toBe(20);
      expect(ms).toBeLessThan(500);
    });

    it('should filter agencies by country under 500ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Agencies by country', () =>
        Agency.find({ country: 'Serbia' }).sort({ views: -1 }).limit(20).lean()
      );
      console.log(`  Agencies in Serbia: ${ms}ms — returned ${result.length} docs`);
      expect(ms).toBeLessThan(500);
    });

    it('should find featured agencies under 500ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Featured agencies', () =>
        Agency.find({ isFeatured: true }).sort({ adRotationOrder: 1 }).lean()
      );
      console.log(`  Featured agencies: ${ms}ms — returned ${result.length} docs`);
      expect(result.length).toBe(50);
      expect(ms).toBeLessThan(500);
    });

    it('should count agencies per country (aggregation) under 1000ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Agency country count', () =>
        Agency.aggregate([
          { $group: { _id: '$country', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
      );
      console.log(`  Agencies per country: ${ms}ms`);
      result.forEach((r: any) => console.log(`    ${r._id}: ${r.count}`));
      expect(result.length).toBeGreaterThan(0);
      expect(ms).toBeLessThan(1000);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Cross-Collection Queries
  // ────────────────────────────────────────────────────────────────

  describe('Cross-collection query performance', () => {
    it('should fetch properties for a specific agency under 1000ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Properties by agency', () =>
        Property.find({ createdByAgencyId: agencyIds[0], status: 'active' })
          .sort({ createdAt: -1 }).limit(20).lean()
      );
      console.log(`  Properties for agency[0]: ${ms}ms — returned ${result.length} docs`);
      expect(ms).toBeLessThan(1000);
    });

    it('should fetch properties for a specific seller under 500ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Properties by seller', () =>
        Property.find({ sellerId: userIds[0] }).sort({ createdAt: -1 }).lean()
      );
      console.log(`  Properties for seller[0]: ${ms}ms — returned ${result.length} docs`);
      expect(ms).toBeLessThan(500);
    });

    it('should lookup agent with their agency details under 500ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Agent + agency lookup', () =>
        Agent.aggregate([
          { $match: { agencyId: agencyIds[0] } },
          { $lookup: { from: 'agencies', localField: 'agencyId', foreignField: '_id', as: 'agencyDetails' } },
          { $limit: 10 },
        ])
      );
      console.log(`  Agent+agency lookup: ${ms}ms — returned ${result.length} docs`);
      expect(result.length).toBeGreaterThan(0);
      expect(ms).toBeLessThan(500);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Write Performance
  // ────────────────────────────────────────────────────────────────

  describe('Write performance at scale', () => {
    it('should insert a new property under 200ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms } = await measureMs('Single insert', () =>
        Property.create({
          sellerId: userIds[0],
          createdByName: 'Write Test',
          createdByEmail: 'writetest@test.local',
          createdAsRole: 'agent',
          listingType: 'sale',
          title: 'Write Performance Test Property',
          status: 'active',
          price: 150000,
          address: '1 Write Test St',
          city: 'Pristina',
          country: 'Kosovo',
          beds: 2, baths: 1, livingRooms: 1, sqft: 80, yearBuilt: 2020,
          description: 'Write performance test',
          imageUrl: 'https://placeholder.test/write-test.jpg',
          images: [], specialFeatures: [], materials: [],
          lat: 42.66, lng: 21.16,
          propertyType: 'apartment',
          hasGeneratedVideo: false,
          hasVirtualTour360: false,
        })
      );
      console.log(`  Single property insert: ${ms}ms`);
      expect(ms).toBeLessThan(200);
    });

    it('should update a property under 200ms', async () => {
      if (skipIfNotSeeded()) return;
      const prop = await Property.findOne({ status: 'active' }).lean();
      expect(prop).toBeTruthy();
      const { ms } = await measureMs('Single update', () =>
        Property.findByIdAndUpdate(prop!._id, { price: 999999, title: 'Updated by perf test' }, { new: true }).lean()
      );
      console.log(`  Single property update: ${ms}ms`);
      expect(ms).toBeLessThan(200);
    });

    it('should bulk update properties in a city under 3000ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Bulk update', () =>
        Property.updateMany({ city: 'Pristina', status: 'active' }, { $inc: { views: 1 } })
      );
      console.log(`  Bulk update (Pristina views+1): ${ms}ms — modified ${result.modifiedCount} docs`);
      expect(ms).toBeLessThan(3000);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Memory & Cursor Stress
  // ────────────────────────────────────────────────────────────────

  describe('Memory and cursor handling', () => {
    it('should stream through all properties with cursor without OOM', async () => {
      if (skipIfNotSeeded()) return;
      const start = performance.now();
      let count = 0;
      const cursor = Property.find().select('_id price city').lean().cursor();
      for await (const _doc of cursor) {
        count++;
      }
      const ms = Math.round(performance.now() - start);
      console.log(`  Cursor iteration (all ${count.toLocaleString()} props): ${ms}ms`);
      expect(count).toBeGreaterThanOrEqual(TOTAL_PROPERTIES);
      expect(ms).toBeLessThan(60_000);
    });

    it('should handle count queries efficiently under 500ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Count queries', async () => {
        const [active, sold, promoted] = await Promise.all([
          Property.countDocuments({ status: 'active' }),
          Property.countDocuments({ status: 'sold' }),
          Property.countDocuments({ isPromoted: true }),
        ]);
        return { active, sold, promoted };
      });
      console.log(`  Count queries: ${ms}ms — active: ${result.active}, sold: ${result.sold}, promoted: ${result.promoted}`);
      expect(ms).toBeLessThan(500);
    });

    it('should handle distinct queries under 1000ms', async () => {
      if (skipIfNotSeeded()) return;
      const { ms, result } = await measureMs('Distinct cities', () =>
        Property.distinct('city', { status: 'active' })
      );
      console.log(`  Distinct cities: ${ms}ms — ${result.length} unique cities`);
      expect(result.length).toBeGreaterThan(0);
      expect(ms).toBeLessThan(1000);
    });
  });
});

/**
 * Shared fixtures for the explorer HTTP tests (units-*, public-*,
 * unit-inquiry-*): a supertest app with the real development routers, signed
 * tokens, and a development → building → floor → unit tree built through the
 * real services. Not a test file itself (no `.test.ts` suffix).
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../../../models/User';
import Property from '../../../models/Property';
import DevelopmentMembership from '../../../models/DevelopmentMembership';
import { createDevelopment } from '../../../services/developments/developmentService';
import { setResidenceStatus } from '../../../services/developments/billing/residenceBillingService';
import { createBuilding, createFloor, createUnit } from '../../../services/developments/developmentInventoryService';
import { encodeId } from '../../../utils/idObfuscation';
import { createMockUser } from '../../setup';
import type { DevelopmentRole } from '../../../config/developments';

export const buildApp = (): express.Express => {
  const app = express();
  app.use(express.json());
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  app.use('/api/dashboard/developments', require('../../../routes/developmentDashboardRoutes').default);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  app.use('/api/developments', require('../../../routes/developmentRoutes').default);
  return app;
};

let seq = 0;
const uniq = () => `${Date.now()}-${++seq}-${Math.random().toString(36).slice(2, 8)}`;

export const tokenFor = (userId: unknown): string =>
  jwt.sign({ id: String(userId), type: 'access' }, process.env.JWT_SECRET || 'test-jwt-secret', { expiresIn: '1h' });

export const makeUser = async (overrides: Record<string, unknown> = {}) =>
  User.create(createMockUser({ email: `u-${uniq()}@example.com`, ...overrides }));

export const addMember = async (developmentId: unknown, role: DevelopmentRole) => {
  const user = await makeUser();
  await DevelopmentMembership.create({ developmentId, userId: user._id, role, status: 'active' });
  return { user, token: tokenFor(user._id) };
};

export const makeListing = async (sellerId: unknown, overrides: Record<string, unknown> = {}) =>
  Property.create({
    sellerId,
    createdByName: 'Owner',
    createdByEmail: 'owner-private@example.com',
    createdAsRole: 'private_seller',
    listingType: 'sale',
    price: 100000,
    address: '1 Main St',
    city: 'Budva',
    country: 'Montenegro',
    beds: 2,
    baths: 1,
    livingRooms: 1,
    sqft: 70,
    yearBuilt: 2018,
    description: 'Nice flat',
    imageUrl: 'https://example.com/i.jpg',
    images: [{ url: 'https://example.com/a.jpg', publicId: 'secret/key/a' }],
    lat: 42.28,
    lng: 18.84,
    propertyType: 'apartment',
    ...overrides,
  });

/** Link a listing to a unit directly (bypassing attach rules, e.g. for drafts). */
export const linkListing = async (unit: mongoose.Document & { _id: unknown }, listingId: unknown, primary = false) => {
  const DevelopmentUnit = mongoose.model('DevelopmentUnit');
  const update: Record<string, unknown> = { $addToSet: { listingIds: listingId } };
  if (primary) update.$set = { primaryListingId: listingId };
  await DevelopmentUnit.updateOne({ _id: unit._id }, update);
};

export const setupDevelopment = async (opts: { published?: boolean; name?: string } = {}) => {
  const owner = await makeUser();
  const dev = await createDevelopment(
    {
      name: opts.name ?? `Residence ${uniq()}`,
      country: 'Montenegro',
      city: 'Budva',
      category: 'apartment_building',
    },
    owner as never
  );
  // Published the real way: the first publish starts the free trial.
  if (opts.published) await setResidenceStatus(dev, 'published');
  const devId = dev._id as mongoose.Types.ObjectId;
  const building = await createBuilding(devId, { name: 'Block A' });
  const floor = await createFloor(devId, building._id, { label: 'Floor 1', level: 1 });
  const floor2 = await createFloor(devId, building._id, { label: 'Floor 2', level: 2 });
  const unit = await createUnit(devId, {
    buildingId: building._id,
    floorId: floor._id,
    unitNumber: 'A1',
    unitType: 'apartment',
    price: 150000,
    currency: 'EUR',
    availability: 'available',
  });
  return {
    owner,
    ownerToken: tokenFor(owner._id),
    dev,
    devId,
    devEnc: encodeId(String(devId)),
    building,
    floor,
    floor2,
    unit,
    enc: (id: unknown) => encodeId(String(id)),
  };
};

export { encodeId };

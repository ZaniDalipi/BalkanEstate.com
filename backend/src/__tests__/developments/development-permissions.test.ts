import mongoose from 'mongoose';
import Development from '../../models/Development';
import DevelopmentMembership from '../../models/DevelopmentMembership';
import User from '../../models/User';
import { resolveDevelopmentRole } from '../../middleware/developmentAuth';
import { createMockUser } from '../setup';

/**
 * Phase 2 — resource-scoped role resolution (DB-backed). The pure permission
 * matrix is covered separately in development-permissions-matrix.test.ts so it
 * can run without the in-memory database. Here the focus is the anti-capture
 * rule: owning a listing in a development must grant no development role.
 */

describe('resolveDevelopmentRole', () => {
  const makeDevelopment = async (ownerId: mongoose.Types.ObjectId) =>
    Development.create({
      ownerId,
      ownerType: 'user',
      name: 'Hilltop',
      slug: `hilltop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      country: 'Serbia',
      city: 'Belgrade',
      category: 'apartment_building',
    });

  it('returns owner for the user who owns the development', async () => {
    const owner = await User.create(createMockUser());
    const dev = await makeDevelopment(owner._id as mongoose.Types.ObjectId);
    const role = await resolveDevelopmentRole(dev, owner as any);
    expect(role).toBe('owner');
  });

  it('returns the membership role for a team member', async () => {
    const owner = await User.create(createMockUser());
    const agent = await User.create(createMockUser());
    const dev = await makeDevelopment(owner._id as mongoose.Types.ObjectId);
    await DevelopmentMembership.create({
      developmentId: dev._id,
      userId: agent._id,
      role: 'sales_agent',
      status: 'active',
    });
    const role = await resolveDevelopmentRole(dev, agent as any);
    expect(role).toBe('sales_agent');
  });

  it('ANTI-CAPTURE: an unrelated user with no membership gets no role', async () => {
    const owner = await User.create(createMockUser());
    const stranger = await User.create(createMockUser());
    const dev = await makeDevelopment(owner._id as mongoose.Types.ObjectId);
    const role = await resolveDevelopmentRole(dev, stranger as any);
    expect(role).toBeNull();
  });

  it('ignores a revoked membership', async () => {
    const owner = await User.create(createMockUser());
    const formerAgent = await User.create(createMockUser());
    const dev = await makeDevelopment(owner._id as mongoose.Types.ObjectId);
    await DevelopmentMembership.create({
      developmentId: dev._id,
      userId: formerAgent._id,
      role: 'manager',
      status: 'revoked',
    });
    const role = await resolveDevelopmentRole(dev, formerAgent as any);
    expect(role).toBeNull();
  });

  it('gives platform admins owner-level access', async () => {
    const owner = await User.create(createMockUser());
    const admin = await User.create(
      createMockUser({ role: 'admin', availableRoles: ['buyer', 'admin'] })
    );
    const dev = await makeDevelopment(owner._id as mongoose.Types.ObjectId);
    const role = await resolveDevelopmentRole(dev, admin as any);
    expect(role).toBe('owner');
  });
});

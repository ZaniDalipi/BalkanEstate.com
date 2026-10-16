/**
 * Phase 2 — the development permission matrix (pure functions, no database).
 *
 * This suite touches no collection, so it opts out of the in-memory MongoDB via
 * the documented SKIP_TEST_DB flag (see src/__tests__/setup.ts). That keeps it
 * runnable in environments where the mongod binary cannot be fetched, and makes
 * it the fast guard on the role→permission contract the frontend also relies on.
 */
process.env.SKIP_TEST_DB = 'true';

import {
  roleHasPermission,
  ROLE_PERMISSIONS,
  DEVELOPMENT_PERMISSIONS,
  DEVELOPMENT_ROLES,
} from '../../config/developments';

describe('development permission matrix', () => {
  it('grants an owner every permission', () => {
    for (const permission of DEVELOPMENT_PERMISSIONS) {
      expect(roleHasPermission('owner', permission)).toBe(true);
    }
  });

  it('never lets a viewer mutate anything', () => {
    for (const permission of DEVELOPMENT_PERMISSIONS) {
      expect(roleHasPermission('viewer', permission)).toBe(false);
    }
  });

  it('lets a sales_agent attach listings and change availability but not price or publish', () => {
    expect(roleHasPermission('sales_agent', 'listing.attach')).toBe(true);
    expect(roleHasPermission('sales_agent', 'availability.change')).toBe(true);
    expect(roleHasPermission('sales_agent', 'price.change')).toBe(false);
    expect(roleHasPermission('sales_agent', 'publish')).toBe(false);
  });

  it('lets an editor shape inventory and scenes but not touch listings or pricing', () => {
    expect(roleHasPermission('editor', 'building.manage')).toBe(true);
    expect(roleHasPermission('editor', 'scene.edit')).toBe(true);
    expect(roleHasPermission('editor', 'listing.attach')).toBe(false);
    expect(roleHasPermission('editor', 'price.change')).toBe(false);
    expect(roleHasPermission('editor', 'publish')).toBe(false);
  });

  it('withholds ownership transfer from every non-owner role', () => {
    for (const role of DEVELOPMENT_ROLES) {
      if (role === 'owner') continue;
      expect(ROLE_PERMISSIONS[role]).not.toContain('ownership.transfer');
      expect(roleHasPermission(role, 'ownership.transfer')).toBe(false);
    }
  });

  it('only owner and manager may publish', () => {
    for (const role of DEVELOPMENT_ROLES) {
      const expected = role === 'owner' || role === 'manager';
      expect(roleHasPermission(role, 'publish')).toBe(expected);
    }
  });

  it('every listed role maps to a defined permission set', () => {
    for (const role of DEVELOPMENT_ROLES) {
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
    }
  });
});

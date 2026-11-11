/**
 * Giving and taking admin roles: only super admins, never your own, and never
 * the last super admin.
 */

import mongoose from 'mongoose';
import User, { IUser } from '../models/User';
import { changeUserRole } from '../services/userRoleService';
import { decideAccountDeletion, decideRoleChange, roleFieldsFor } from '../utils/roleChangePolicy';

jest.mock('../services/adminNotificationService', () => ({ notifyAdmins: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { notifyAdmins } = require('../services/adminNotificationService') as { notifyAdmins: jest.Mock };

const base = { actorId: 'a', targetId: 't', superAdminCount: 2 };

describe('decideRoleChange', () => {
  it('lets a super admin make someone admin or super admin', () => {
    expect(decideRoleChange({ ...base, actorRole: 'super_admin', targetRole: 'buyer', newRole: 'admin' })).toEqual({ ok: true, newRole: 'admin' });
    expect(decideRoleChange({ ...base, actorRole: 'super_admin', targetRole: 'admin', newRole: 'super_admin' })).toEqual({ ok: true, newRole: 'super_admin' });
  });

  it('stops a regular admin from giving or taking admin roles', () => {
    for (const [targetRole, newRole] of [['buyer', 'admin'], ['buyer', 'super_admin'], ['admin', 'buyer'], ['super_admin', 'agent']]) {
      expect(decideRoleChange({ ...base, actorRole: 'admin', targetRole, newRole })).toMatchObject({ ok: false, code: 'SUPER_ADMIN_REQUIRED', status: 403 });
    }
  });

  it('lets a regular admin switch ordinary roles', () => {
    expect(decideRoleChange({ ...base, actorRole: 'admin', targetRole: 'buyer', newRole: 'agent' })).toEqual({ ok: true, newRole: 'agent' });
  });

  it('never lets anyone change their own role', () => {
    expect(decideRoleChange({ ...base, targetId: 'a', actorRole: 'super_admin', targetRole: 'super_admin', newRole: 'admin' }))
      .toMatchObject({ ok: false, code: 'OWN_ROLE' });
    expect(decideRoleChange({ ...base, targetId: 'a', actorRole: 'admin', targetRole: 'admin', newRole: 'super_admin' }))
      .toMatchObject({ ok: false, code: 'OWN_ROLE' });
  });

  it('keeps the last super admin', () => {
    expect(decideRoleChange({ ...base, superAdminCount: 1, actorRole: 'super_admin', targetRole: 'super_admin', newRole: 'admin' }))
      .toMatchObject({ ok: false, code: 'LAST_SUPER_ADMIN', status: 409 });
  });

  it('rejects unknown roles and no-op changes', () => {
    expect(decideRoleChange({ ...base, actorRole: 'super_admin', targetRole: 'buyer', newRole: 'owner' })).toMatchObject({ code: 'INVALID_ROLE' });
    expect(decideRoleChange({ ...base, actorRole: 'super_admin', targetRole: 'admin', newRole: 'admin' })).toMatchObject({ code: 'SAME_ROLE' });
  });
});

describe('decideAccountDeletion', () => {
  it('follows the same rules for deleting accounts', () => {
    expect(decideAccountDeletion({ ...base, targetId: 'a', actorRole: 'super_admin', targetRole: 'buyer' })).toMatchObject({ code: 'OWN_ACCOUNT' });
    expect(decideAccountDeletion({ ...base, actorRole: 'admin', targetRole: 'super_admin' })).toMatchObject({ code: 'SUPER_ADMIN_REQUIRED' });
    expect(decideAccountDeletion({ ...base, superAdminCount: 1, actorRole: 'super_admin', targetRole: 'super_admin' })).toMatchObject({ code: 'LAST_SUPER_ADMIN' });
    expect(decideAccountDeletion({ ...base, actorRole: 'admin', targetRole: 'buyer' })).toEqual({ ok: true });
  });
});

describe('roleFieldsFor', () => {
  it('keeps the user’s ordinary roles and swaps the admin role', () => {
    expect(roleFieldsFor('admin', ['agent', 'private_seller'])).toEqual({
      role: 'admin', primaryRole: 'admin', activeRole: 'admin', availableRoles: ['agent', 'private_seller', 'admin'],
    });
    expect(roleFieldsFor('buyer', ['buyer', 'admin', 'super_admin']).availableRoles).toEqual(['buyer']);
  });
});

describe('changeUserRole (database)', () => {
  const makeUser = (email: string, role: string) =>
    User.create({ email, name: email.split('@')[0], password: 'Str0ng!Passw0rd', role });

  beforeEach(() => notifyAdmins.mockClear());

  it('promotes a user, keeps the role fields in step, and alerts the admins', async () => {
    const boss = await makeUser('boss@example.com', 'super_admin');
    const ana = await makeUser('ana@example.com', 'buyer');

    const result = await changeUserRole(boss, String(ana._id), 'admin');

    expect(result.ok).toBe(true);
    const saved = await User.findById(ana._id).lean<IUser>();
    expect(saved).toMatchObject({ role: 'admin', primaryRole: 'admin', activeRole: 'admin' });
    expect(saved?.availableRoles).toEqual(['buyer', 'admin']);
    expect(notifyAdmins).toHaveBeenCalledWith(expect.objectContaining({ kind: 'role_changed', from: 'buyer', to: 'admin' }));
  });

  it('refuses a regular admin and changes nothing', async () => {
    const admin = await makeUser('admin@example.com', 'admin');
    const ana = await makeUser('ana2@example.com', 'buyer');

    const result = await changeUserRole(admin, String(ana._id), 'super_admin');

    expect(result).toMatchObject({ ok: false, code: 'SUPER_ADMIN_REQUIRED' });
    expect((await User.findById(ana._id).lean<IUser>())?.role).toBe('buyer');
    expect(notifyAdmins).not.toHaveBeenCalled();
  });

  it('answers 404 for a user that does not exist', async () => {
    const boss = await makeUser('boss2@example.com', 'super_admin');
    expect(await changeUserRole(boss, String(new mongoose.Types.ObjectId()), 'admin')).toMatchObject({ ok: false, status: 404 });
  });
});

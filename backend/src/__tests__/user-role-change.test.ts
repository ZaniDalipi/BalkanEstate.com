/**
 * Giving and taking admin roles: only super admins, never your own, and never
 * the last super admin.
 */

import mongoose from 'mongoose';
import User, { IUser } from '../models/User';
import { changeUserRole, claimFirstSuperAdmin, requestClaimCode, requestRoleGrantCode, superAdminStatus } from '../services/userRoleService';
import { decideAccountDeletion, decideRoleChange, decideSuperAdminClaim, roleFieldsFor } from '../utils/roleChangePolicy';

jest.mock('../services/adminNotificationService', () => ({ notifyAdmins: jest.fn() }));
// A mailbox: granting admin roles needs the code emailed to the acting admin.
const mailbox = makeMailbox();
function makeMailbox() {
  const sent: Array<{ to: string; subject: string }> = [];
  return { sent, codeFor: (to: string) => sent.filter((m) => m.to === to).pop()?.subject.slice(0, 6) };
}
jest.mock('../services/emailService', () => ({
  __esModule: true,
  default: {
    isConfigured: true,
    sendEmailDirect: jest.fn(async (m: { to: string; subject: string }) => { mailbox.sent.push(m); }),
  },
}));

/** Ask for the emailed code and return what to send with the role change. */
async function emailedCode(request: Promise<{ ok: boolean } & Record<string, unknown>>, to: string) {
  const sent = await request;
  if (!sent.ok) throw new Error(`no code: ${JSON.stringify(sent)}`);
  return { challengeId: sent.challengeId, emailCode: mailbox.codeFor(to) };
}
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

    // Without the emailed code it is refused…
    expect(await changeUserRole(boss, String(ana._id), 'admin')).toMatchObject({ ok: false, status: 428, code: 'EMAIL_CODE_REQUIRED' });

    // …with it, it goes through, and the code can't be used twice.
    const confirmation = await emailedCode(requestRoleGrantCode(boss, String(ana._id), 'admin'), 'boss@example.com');
    const result = await changeUserRole(boss, String(ana._id), 'admin', confirmation);

    expect(result.ok).toBe(true);
    const saved = await User.findById(ana._id).lean<IUser>();
    expect(saved).toMatchObject({ role: 'admin', primaryRole: 'admin', activeRole: 'admin' });
    expect(saved?.availableRoles).toEqual(['buyer', 'admin']);
    expect(notifyAdmins).toHaveBeenCalledWith(expect.objectContaining({ kind: 'role_changed', from: 'buyer', to: 'admin' }));

    expect(await changeUserRole(boss, String(ana._id), 'super_admin', confirmation)).toMatchObject({ ok: false, code: 'EMAIL_CODE_INVALID' });
  });

  it('does not accept a code emailed for a different user or role', async () => {
    const boss = await makeUser('boss3@example.com', 'super_admin');
    const ana = await makeUser('ana3@example.com', 'buyer');
    const ben = await makeUser('ben3@example.com', 'buyer');

    const forAnaAdmin = await emailedCode(requestRoleGrantCode(boss, String(ana._id), 'admin'), 'boss3@example.com');
    expect(await changeUserRole(boss, String(ben._id), 'admin', forAnaAdmin)).toMatchObject({ ok: false, code: 'EMAIL_CODE_INVALID' });
    expect(await changeUserRole(boss, String(ana._id), 'super_admin', forAnaAdmin)).toMatchObject({ ok: false, code: 'EMAIL_CODE_INVALID' });
  });

  it('demoting to an ordinary role needs no emailed code', async () => {
    const boss = await makeUser('boss4@example.com', 'super_admin');
    const exAdmin = await makeUser('ex4@example.com', 'admin');
    expect((await changeUserRole(boss, String(exAdmin._id), 'buyer')).ok).toBe(true);
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

describe('decideSuperAdminClaim', () => {
  it('lets an admin claim only while there is no super admin', () => {
    expect(decideSuperAdminClaim({ actorRole: 'admin', superAdminCount: 0 })).toEqual({ ok: true });
    expect(decideSuperAdminClaim({ actorRole: 'admin', superAdminCount: 1 })).toMatchObject({ ok: false, code: 'SUPER_ADMIN_EXISTS' });
    expect(decideSuperAdminClaim({ actorRole: 'buyer', superAdminCount: 0 })).toMatchObject({ ok: false, code: 'ADMIN_REQUIRED' });
  });
});

describe('claimFirstSuperAdmin (database)', () => {
  const makeUser = (email: string, role: string) =>
    User.create({ email, name: email.split('@')[0], password: 'Str0ng!Passw0rd', role });

  beforeEach(async () => {
    notifyAdmins.mockClear();
    await mongoose.connection.collection('admin_bootstrap_locks').deleteMany({});
  });

  it('makes the first admin super admin from the panel, then closes the door', async () => {
    const first = await makeUser('first@example.com', 'admin');
    const second = await makeUser('second@example.com', 'admin');

    expect(await superAdminStatus(first)).toEqual({ superAdminCount: 0, canClaim: true });
    expect(await claimFirstSuperAdmin(first)).toMatchObject({ ok: false, code: 'EMAIL_CODE_REQUIRED' });
    const result = await claimFirstSuperAdmin(first, await emailedCode(requestClaimCode(first), 'first@example.com'));

    expect(result.ok).toBe(true);
    expect((await User.findById(first._id).lean<IUser>())?.role).toBe('super_admin');
    expect(notifyAdmins).toHaveBeenCalledWith(expect.objectContaining({ kind: 'role_changed', to: 'super_admin' }));

    expect(await superAdminStatus(second)).toEqual({ superAdminCount: 1, canClaim: false });
    expect(await requestClaimCode(second)).toMatchObject({ ok: false, code: 'SUPER_ADMIN_EXISTS' });
    expect(await claimFirstSuperAdmin(second)).toMatchObject({ ok: false, code: 'SUPER_ADMIN_EXISTS' });
    expect((await User.findById(second._id).lean<IUser>())?.role).toBe('admin');
  });

  it('lets only one of two admins win when they claim at the same moment', async () => {
    const a = await makeUser('a@example.com', 'admin');
    const b = await makeUser('b@example.com', 'admin');

    const codeA = await emailedCode(requestClaimCode(a), 'a@example.com');
    const codeB = await emailedCode(requestClaimCode(b), 'b@example.com');
    const results = await Promise.all([claimFirstSuperAdmin(a, codeA), claimFirstSuperAdmin(b, codeB)]);

    expect(results.filter((r) => r.ok).length).toBe(1);
    expect(await User.countDocuments({ role: 'super_admin' })).toBe(1);
  });
});

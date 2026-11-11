import mongoose from 'mongoose';
import User, { IUser } from '../models/User';
import { activityLogger } from './activityLogger';
import { notifyAdmins } from './adminNotificationService';
import { EmailChallengeError, createEmailChallenge, verifyEmailChallenge } from './adminEmailChallengeService';
import {
  RoleChangeDecision,
  SuperAdminClaimDecision,
  decideRoleChange,
  decideSuperAdminClaim,
  isAdminRole,
  roleFieldsFor,
} from '../utils/roleChangePolicy';

export type RoleChangeResult =
  | { ok: true; user: IUser; previousRole: string }
  | Extract<RoleChangeDecision, { ok: false }>
  | { ok: false; status: 404; code: 'NOT_FOUND'; message: string }
  | { ok: false; status: 428; code: 'EMAIL_CODE_REQUIRED'; message: string }
  | { ok: false; status: 403; code: EmailChallengeError; message: string };

/**
 * Change a user's role on behalf of an admin, following the rules in
 * roleChangePolicy. Logged in the activity log; changes to admin roles also
 * alert the other admins.
 */
/** The emailed code that confirms making someone admin or super admin. */
export interface EmailConfirmation {
  challengeId?: unknown;
  emailCode?: unknown;
}

const emailSubject = (targetId: string, role: string) => `${targetId}:${role}`;

const EMAIL_CODE_REQUIRED = {
  ok: false as const,
  status: 428 as const,
  code: 'EMAIL_CODE_REQUIRED' as const,
  message: 'Making someone admin or super admin needs the code we email to you. Ask for the code first.',
};

/**
 * Email the acting super admin a code for making this user admin or super
 * admin, after checking they are allowed to.
 */
export async function requestRoleGrantCode(actor: IUser, targetId: string, newRole: unknown) {
  const target = await User.findById(targetId).select('name email role');
  if (!target) return { ok: false as const, status: 404 as const, code: 'NOT_FOUND' as const, message: 'User not found' };
  const superAdminCount = target.role === 'super_admin' ? await User.countDocuments({ role: 'super_admin' }) : 0;
  const decision = decideRoleChange({
    actorId: String(actor._id), actorRole: actor.role, targetId: String(target._id), targetRole: target.role, newRole, superAdminCount,
  });
  if (decision.ok === false) return decision;
  if (!isAdminRole(decision.newRole)) {
    return { ok: false as const, status: 400 as const, code: 'NO_EMAIL_CODE_NEEDED' as const, message: 'Only admin roles need an emailed code.' };
  }
  const roleName = decision.newRole.replace('_', ' ');
  const sent = await createEmailChallenge(
    actor, 'grant_admin_role', emailSubject(String(target._id), decision.newRole), `making ${target.name} (${target.email}) ${roleName}`
  );
  if (sent.ok === false) {
    return { ...sent, status: sent.code === 'EMAIL_CODE_RATE_LIMITED' ? (429 as const) : (503 as const) };
  }
  return sent;
}

export async function changeUserRole(
  actor: IUser,
  targetId: string,
  newRole: unknown,
  confirmation: EmailConfirmation = {}
): Promise<RoleChangeResult> {
  const target = await User.findById(targetId).select('-password');
  if (!target) return { ok: false, status: 404, code: 'NOT_FOUND', message: 'User not found' };

  const superAdminCount = target.role === 'super_admin' ? await User.countDocuments({ role: 'super_admin' }) : 0;
  const decision = decideRoleChange({
    actorId: String(actor._id),
    actorRole: actor.role,
    targetId: String(target._id),
    targetRole: target.role,
    newRole,
    superAdminCount,
  });
  if (decision.ok === false) return decision;

  // Granting admin or super admin also needs the code emailed to the acting admin.
  if (isAdminRole(decision.newRole)) {
    if (!confirmation.challengeId || !confirmation.emailCode) return EMAIL_CODE_REQUIRED;
    const email = await verifyEmailChallenge(
      String(actor._id), confirmation.challengeId, confirmation.emailCode, 'grant_admin_role', emailSubject(String(target._id), decision.newRole)
    );
    if (email.ok === false) return { ok: false, status: 403, code: email.code, message: email.message };
  }

  const previousRole = target.role;
  const fields = roleFieldsFor(decision.newRole, target.availableRoles);
  // The guard on the current role makes two admins changing the same user at
  // once safe: the second change finds the role moved and fails.
  const updated = await User.findOneAndUpdate({ _id: target._id, role: previousRole }, { $set: fields }, { new: true, runValidators: true })
    .select('-password');
  if (!updated) {
    return { ok: false, status: 409, code: 'SAME_ROLE', message: 'The role changed meanwhile; reload and try again.' };
  }

  activityLogger
    .logAdminAction(String(actor._id), actor.email, 'role_changed', String(updated._id), { from: previousRole, to: decision.newRole })
    .catch(() => undefined);

  if (isAdminRole(previousRole) || isAdminRole(decision.newRole)) {
    notifyAdmins({
      kind: 'role_changed',
      userId: String(updated._id),
      name: updated.name,
      email: updated.email,
      from: previousRole,
      to: decision.newRole,
      byName: actor.name || actor.email,
    });
  }

  return { ok: true, user: updated, previousRole };
}

/** Whether the signed-in admin may claim the first super admin role. */
export async function superAdminStatus(actor: IUser) {
  const superAdminCount = await User.countDocuments({ role: 'super_admin' });
  return { superAdminCount, canClaim: decideSuperAdminClaim({ actorRole: actor.role, superAdminCount }).ok };
}

export type SuperAdminClaimResult =
  | { ok: true; user: IUser }
  | Extract<SuperAdminClaimDecision, { ok: false }>
  | { ok: false; status: 428; code: 'EMAIL_CODE_REQUIRED'; message: string }
  | { ok: false; status: 403; code: EmailChallengeError; message: string };

/** One record while a first super admin is being (or has been) claimed. */
const CLAIM_LOCK_ID = 'first_super_admin';
const STALE_LOCK_MS = 60_000;
const claimLocks = () =>
  mongoose.connection.collection<{ _id: string; userId: string; at: Date }>('admin_bootstrap_locks');

const isDuplicateKey = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;

const alreadyHasSuperAdmin = {
  ok: false as const,
  status: 409 as const,
  code: 'SUPER_ADMIN_EXISTS' as const,
  message: 'This site already has a super admin. Ask them to make you super admin.',
};

/**
 * Make the signed-in admin the site's first super admin. Allowed only while
 * there is none. A lock record makes sure two admins claiming at the same
 * moment can't both win; a lock left behind with no super admin (say the
 * account was removed in the database) is cleared after a minute.
 */
/** Email the admin a code for claiming the first super admin role. */
export async function requestClaimCode(actor: IUser) {
  const decision = decideSuperAdminClaim({ actorRole: actor.role, superAdminCount: await User.countDocuments({ role: 'super_admin' }) });
  if (decision.ok === false) return decision;
  const sent = await createEmailChallenge(
    actor, 'grant_admin_role', emailSubject(String(actor._id), 'super_admin'), 'making your own account the first super admin'
  );
  if (sent.ok === false) {
    return { ...sent, status: sent.code === 'EMAIL_CODE_RATE_LIMITED' ? (429 as const) : (503 as const) };
  }
  return sent;
}

export async function claimFirstSuperAdmin(actor: IUser, confirmation: EmailConfirmation = {}): Promise<SuperAdminClaimResult> {
  const decision = decideSuperAdminClaim({
    actorRole: actor.role,
    superAdminCount: await User.countDocuments({ role: 'super_admin' }),
  });
  if (decision.ok === false) return decision;

  if (!confirmation.challengeId || !confirmation.emailCode) return EMAIL_CODE_REQUIRED;
  const email = await verifyEmailChallenge(
    String(actor._id), confirmation.challengeId, confirmation.emailCode, 'grant_admin_role', emailSubject(String(actor._id), 'super_admin')
  );
  if (email.ok === false) return { ok: false, status: 403, code: email.code, message: email.message };

  await claimLocks().deleteOne({ _id: CLAIM_LOCK_ID, at: { $lt: new Date(Date.now() - STALE_LOCK_MS) } });
  try {
    await claimLocks().insertOne({ _id: CLAIM_LOCK_ID, userId: String(actor._id), at: new Date() });
  } catch (error) {
    if (isDuplicateKey(error)) return alreadyHasSuperAdmin;
    throw error;
  }

  const updated = await User.findOneAndUpdate(
    { _id: actor._id, role: 'admin' },
    { $set: roleFieldsFor('super_admin', actor.availableRoles) },
    { new: true, runValidators: true }
  ).select('-password');
  if (!updated) {
    await claimLocks().deleteOne({ _id: CLAIM_LOCK_ID, userId: String(actor._id) });
    return { ok: false, status: 409, code: 'SUPER_ADMIN_EXISTS', message: 'Your role changed meanwhile; reload and try again.' };
  }

  activityLogger
    .logAdminAction(String(actor._id), actor.email, 'super_admin_claimed', String(actor._id), { from: 'admin', to: 'super_admin' })
    .catch(() => undefined);
  notifyAdmins({
    kind: 'role_changed',
    userId: String(updated._id),
    name: updated.name,
    email: updated.email,
    from: 'admin',
    to: 'super_admin',
    byName: `${updated.name || updated.email} (claimed the first super admin role from the admin panel)`,
  });

  return { ok: true, user: updated };
}

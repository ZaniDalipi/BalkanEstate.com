import User, { IUser } from '../models/User';
import { activityLogger } from './activityLogger';
import { notifyAdmins } from './adminNotificationService';
import { RoleChangeDecision, decideRoleChange, isAdminRole, roleFieldsFor } from '../utils/roleChangePolicy';

export type RoleChangeResult =
  | { ok: true; user: IUser; previousRole: string }
  | Extract<RoleChangeDecision, { ok: false }>
  | { ok: false; status: 404; code: 'NOT_FOUND'; message: string };

/**
 * Change a user's role on behalf of an admin, following the rules in
 * roleChangePolicy. Logged in the activity log; changes to admin roles also
 * alert the other admins.
 */
export async function changeUserRole(actor: IUser, targetId: string, newRole: unknown): Promise<RoleChangeResult> {
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

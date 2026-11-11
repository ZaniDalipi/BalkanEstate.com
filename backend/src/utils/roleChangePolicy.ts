/**
 * Who may give or take which role. Pure, so the rules are tested on their own.
 *
 *  - Admin and super admin are given and taken away only by a super admin.
 *  - Ordinary roles (buyer, private seller, agent) can be set by any admin,
 *    on users who are not admins.
 *  - Nobody changes their own role: no self-promotion, no locking yourself out.
 *  - The last super admin can never lose the role.
 */

export const USER_ROLES = ['buyer', 'private_seller', 'agent', 'admin', 'super_admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const ADMIN_ROLES: readonly UserRole[] = ['admin', 'super_admin'];

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);

export const isAdminRole = (role: string | undefined): boolean =>
  !!role && (ADMIN_ROLES as readonly string[]).includes(role);

export interface RoleChangeRequest {
  actorId: string;
  actorRole: string;
  targetId: string;
  targetRole: string;
  newRole: unknown;
  /** How many super admins exist right now (including the target). */
  superAdminCount: number;
}

export type RoleChangeError = 'INVALID_ROLE' | 'SAME_ROLE' | 'OWN_ROLE' | 'SUPER_ADMIN_REQUIRED' | 'LAST_SUPER_ADMIN';

export type RoleChangeDecision =
  | { ok: true; newRole: UserRole }
  | { ok: false; status: 400 | 403 | 409; code: RoleChangeError; message: string };

export function decideRoleChange(req: RoleChangeRequest): RoleChangeDecision {
  if (!isUserRole(req.newRole)) {
    return { ok: false, status: 400, code: 'INVALID_ROLE', message: `Role must be one of: ${USER_ROLES.join(', ')}` };
  }
  const newRole = req.newRole;

  if (newRole === req.targetRole) {
    return { ok: false, status: 400, code: 'SAME_ROLE', message: 'The user already has this role.' };
  }
  if (req.actorId === req.targetId) {
    return { ok: false, status: 403, code: 'OWN_ROLE', message: 'You cannot change your own role. Ask another super admin.' };
  }
  if ((isAdminRole(req.targetRole) || isAdminRole(newRole)) && req.actorRole !== 'super_admin') {
    return {
      ok: false,
      status: 403,
      code: 'SUPER_ADMIN_REQUIRED',
      message: 'Only a super admin can give or remove the admin and super admin roles.',
    };
  }
  if (req.targetRole === 'super_admin' && req.superAdminCount <= 1) {
    return { ok: false, status: 409, code: 'LAST_SUPER_ADMIN', message: 'This is the last super admin; make someone else super admin first.' };
  }
  return { ok: true, newRole };
}

/**
 * The role fields to store for a new role. Admin roles are added to or removed
 * from the roles a user can switch between; their other roles are kept.
 */
export function roleFieldsFor(newRole: UserRole, currentAvailable: readonly string[] | undefined) {
  const kept = (currentAvailable ?? []).filter((r) => isUserRole(r) && !isAdminRole(r));
  const availableRoles = Array.from(new Set<string>([...kept, newRole]));
  return { role: newRole, primaryRole: newRole, activeRole: newRole, availableRoles };
}

export type AccountDeletionDecision =
  | { ok: true }
  | { ok: false; status: 403 | 409; code: 'OWN_ACCOUNT' | 'SUPER_ADMIN_REQUIRED' | 'LAST_SUPER_ADMIN'; message: string };

/** The same rules for removing an account: removing an admin is a super admin's call. */
export function decideAccountDeletion(req: Omit<RoleChangeRequest, 'newRole'>): AccountDeletionDecision {
  if (req.actorId === req.targetId) {
    return { ok: false, status: 403, code: 'OWN_ACCOUNT', message: 'You cannot delete your own account from the admin panel.' };
  }
  if (isAdminRole(req.targetRole) && req.actorRole !== 'super_admin') {
    return { ok: false, status: 403, code: 'SUPER_ADMIN_REQUIRED', message: 'Only a super admin can delete an admin account.' };
  }
  if (req.targetRole === 'super_admin' && req.superAdminCount <= 1) {
    return { ok: false, status: 409, code: 'LAST_SUPER_ADMIN', message: 'This is the last super admin and cannot be deleted.' };
  }
  return { ok: true };
}

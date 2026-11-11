/**
 * Which roles the signed-in admin may pick for a user. Mirrors the server's
 * rules (backend/src/utils/roleChangePolicy.ts); the server still decides.
 */

export const ROLE_ORDER = ['buyer', 'private_seller', 'agent', 'admin', 'super_admin'] as const;
export type RoleValue = (typeof ROLE_ORDER)[number];

const ADMIN_ROLES: readonly string[] = ['admin', 'super_admin'];
export const isAdminRole = (role: string | undefined): boolean => !!role && ADMIN_ROLES.includes(role);

export type RoleLock = 'own' | 'superAdminOnly';

export interface RoleChoices {
  /** Set when the role can't be changed at all here. */
  lock?: RoleLock;
  options: Array<{ value: RoleValue; disabled: boolean }>;
  /** True when admin roles are listed but only a super admin may pick them. */
  adminRolesNeedSuperAdmin: boolean;
}

export function roleChoices(input: { actorId?: string; actorRole?: string; targetId: string; targetRole: string }): RoleChoices {
  const isSuper = input.actorRole === 'super_admin';
  const options = ROLE_ORDER.map((value) => ({ value, disabled: isAdminRole(value) && !isSuper }));

  if (input.actorId && input.actorId === input.targetId) return { lock: 'own', options, adminRolesNeedSuperAdmin: false };
  if (isAdminRole(input.targetRole) && !isSuper) return { lock: 'superAdminOnly', options, adminRolesNeedSuperAdmin: false };
  return { options, adminRolesNeedSuperAdmin: !isSuper };
}

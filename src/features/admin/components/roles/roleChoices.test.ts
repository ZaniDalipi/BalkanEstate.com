import { describe, expect, it } from 'vitest';
import { roleChoices } from './roleChoices';

const enabled = (c: ReturnType<typeof roleChoices>) => c.options.filter((o) => !o.disabled).map((o) => o.value);

describe('roleChoices', () => {
  it('lets a super admin pick any role, admin and super admin included', () => {
    const c = roleChoices({ actorId: 'me', actorRole: 'super_admin', targetId: 'u', targetRole: 'buyer' });
    expect(c.lock).toBeUndefined();
    expect(enabled(c)).toEqual(['buyer', 'private_seller', 'agent', 'admin', 'super_admin']);
  });

  it('shows a regular admin the admin roles but does not let them pick one', () => {
    const c = roleChoices({ actorId: 'me', actorRole: 'admin', targetId: 'u', targetRole: 'buyer' });
    expect(enabled(c)).toEqual(['buyer', 'private_seller', 'agent']);
    expect(c.adminRolesNeedSuperAdmin).toBe(true);
  });

  it('locks an admin’s role for a regular admin', () => {
    expect(roleChoices({ actorId: 'me', actorRole: 'admin', targetId: 'u', targetRole: 'super_admin' }).lock).toBe('superAdminOnly');
  });

  it('locks your own role', () => {
    expect(roleChoices({ actorId: 'me', actorRole: 'super_admin', targetId: 'me', targetRole: 'super_admin' }).lock).toBe('own');
  });
});

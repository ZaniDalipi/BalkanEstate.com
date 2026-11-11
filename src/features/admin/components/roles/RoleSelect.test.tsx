import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoleSelect } from './RoleSelect';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

const me = vi.hoisted(() => ({ current: { id: 'me', role: 'super_admin' } as { id: string; role: string } }));
vi.mock('@/context/AppContext', () => ({ useAppContext: () => ({ state: { currentUser: me.current } }) }));

const option = (name: string) => screen.getByRole('option', { name }) as HTMLOptionElement;

beforeEach(() => { me.current = { id: 'me', role: 'super_admin' }; });

describe('RoleSelect', () => {
  it('lets a super admin make someone super admin', () => {
    const onChange = vi.fn();
    render(<RoleSelect targetId="u1" targetRole="buyer" value="buyer" onChange={onChange} />);

    expect(option('Super admin').disabled).toBe(false);
    fireEvent.change(screen.getByRole('combobox', { name: 'Role' }), { target: { value: 'super_admin' } });
    expect(onChange).toHaveBeenCalledWith('super_admin');
  });

  it('shows a regular admin why the admin roles are greyed out', () => {
    me.current = { id: 'me', role: 'admin' };
    render(<RoleSelect targetId="u1" targetRole="buyer" value="buyer" onChange={vi.fn()} />);

    expect(option('Admin').disabled).toBe(true);
    expect(option('Super admin').disabled).toBe(true);
    expect(option('Agent').disabled).toBe(false);
    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveAccessibleDescription(
      'Only a super admin can make someone admin or super admin.'
    );
  });

  it('locks your own role', () => {
    render(<RoleSelect targetId="me" targetRole="super_admin" value="super_admin" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Role' })).toBeDisabled();
    expect(screen.getByText(/can’t change your own role/)).toBeInTheDocument();
  });
});

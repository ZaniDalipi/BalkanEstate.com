import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TargetActions } from './TargetActions';

vi.mock('react-i18next', async () => (await import('../../public/explorer/__tests__/i18nMock')).default);

const actions = vi.hoisted(() => ({
  rename: vi.fn(async () => undefined),
  remove: vi.fn(async () => ({ success: true })),
  impact: vi.fn(async () => ({ name: '15', floors: 0, units: 2, views: 1, listings: 1 })),
  isBusy: false,
}));
vi.mock('../../../hooks/useStructureActions', () => ({ useStructureActions: () => actions }));
const confirm = vi.hoisted(() => vi.fn(async () => true));
vi.mock('@/src/shared/hooks/useConfirmation', () => ({ useConfirmation: () => ({ confirm }) }));
vi.mock('@/src/shared/hooks/useNotification', () => ({ useNotification: () => ({ success: vi.fn(), error: vi.fn() }) }));

describe('TargetActions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes a floor after a confirmation that lists what goes with it', async () => {
    const onDeleted = vi.fn();
    render(<TargetActions developmentId="d1" kind="floor" id="f15" name="15" onDeleted={onDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: 'Actions for 15' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Delete floor/ }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    const msg = (confirm.mock.calls[0] as unknown as [{ message: string; title: string }])[0];
    expect(msg.title).toContain('15');
    expect(msg.message).toContain('2 apartments');
    expect(msg.message).toContain('1 picture');
    expect(msg.message).toMatch(/stays? on the marketplace/);
    await waitFor(() => expect(actions.remove).toHaveBeenCalledWith({ kind: 'floor', id: 'f15' }));
    expect(onDeleted).toHaveBeenCalled();
  });

  it('does nothing when the confirmation is cancelled', async () => {
    confirm.mockResolvedValueOnce(false);
    render(<TargetActions developmentId="d1" kind="building" id="b1" name="test" />);
    fireEvent.click(screen.getByRole('button', { name: 'Actions for test' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Delete building/ }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(actions.remove).not.toHaveBeenCalled();
  });

  it('renames', async () => {
    render(<TargetActions developmentId="d1" kind="building" id="b1" name="test" />);
    fireEvent.click(screen.getByRole('button', { name: 'Actions for test' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Rename/ }));
    fireEvent.change(screen.getByLabelText('New name'), { target: { value: 'Tower B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(actions.rename).toHaveBeenCalledWith({ kind: 'building', id: 'b1', name: 'Tower B' }));
  });
});

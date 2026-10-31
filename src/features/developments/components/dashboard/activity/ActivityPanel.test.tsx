import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor, userEvent } from '@/src/tests/test-utils';
import { ConfirmationProvider } from '@/src/shared/hooks/useConfirmation';
import { NotificationProvider } from '@/src/shared/hooks/useNotification';
import type { AuditEntry, Development, DevelopmentRole } from '../../../types';

vi.mock('../../../api/developmentsApi', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(Object.keys(actual).map((k) => [k, vi.fn(() => new Promise(() => {}))]));
});

import * as api from '../../../api/developmentsApi';
import { fetchAuditPage } from '../../../hooks/useAuditLog';
import DevelopmentManagePage from '../DevelopmentManagePage';
import { ActivityPanel } from './ActivityPanel';

const entry = (id: string, action: string, createdAt: string, metadata: Record<string, unknown> = {}): AuditEntry => ({
  id,
  action,
  actorId: 'a1',
  actorName: 'Ana',
  targetType: 'unit',
  targetId: 'u1',
  metadata,
  createdAt,
});

describe('ActivityPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders labels, actor and detail, and loads the next page', async () => {
    const first = Array.from({ length: 25 }, (_, i) =>
      entry(`e${i}`, i === 0 ? 'unit.update' : i === 1 ? 'custom.thing' : 'price.change', `2026-10-${String(20 - Math.floor(i / 5)).padStart(2, '0')}T10:00:0${i % 5}Z`, i === 0 ? { changes: { beds: {}, price: {} } } : { from: 1, to: 2 })
    );
    vi.mocked(api.listDevelopmentAudit)
      .mockResolvedValueOnce({ entries: first, total: 26 })
      .mockResolvedValueOnce({ entries: [entry('e25', 'scene.publish', '2026-01-01T00:00:00Z')], total: 26 });
    render(<ActivityPanel developmentId="dev1" />);

    expect(await screen.findByText('activity.actions.unit_update')).toBeInTheDocument();
    expect(screen.getByText('custom.thing')).toBeInTheDocument();
    expect(screen.getAllByText('Ana').length).toBe(25);
    expect(screen.getAllByText('activity.detail.fields').length).toBe(1);
    expect(api.listDevelopmentAudit).toHaveBeenLastCalledWith('dev1', { limit: 25, skip: 0, action: undefined });

    await userEvent.click(screen.getByRole('button', { name: 'activity.loadMore' }));
    expect(await screen.findByText('activity.actions.scene_publish')).toBeInTheDocument();
    expect(api.listDevelopmentAudit).toHaveBeenLastCalledWith('dev1', { limit: 25, skip: 25, action: undefined });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'activity.loadMore' })).not.toBeInTheDocument());
  });

  it('filters by family and shows the empty state', async () => {
    vi.mocked(api.listDevelopmentAudit).mockResolvedValue({ entries: [], total: 0 });
    render(<ActivityPanel developmentId="dev1" />);
    expect(await screen.findByText('activity.empty')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'activity.filters.prices' }));
    await waitFor(() => expect(api.listDevelopmentAudit).toHaveBeenCalledWith('dev1', { limit: 25, skip: 0, action: 'price' }));
    expect(screen.getByRole('button', { name: 'activity.filters.prices' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('fetchAuditPage', () => {
  it('merges several families newest first and advances each cursor by what it kept', async () => {
    vi.mocked(api.listDevelopmentAudit).mockImplementation(async (_id, q) =>
      q?.action === 'building'
        ? { entries: [entry('b1', 'building.update', '2026-10-03T00:00:00Z'), entry('b2', 'building.update', '2026-10-01T00:00:00Z')], total: 2 }
        : { entries: [entry('f1', 'floor.create', '2026-10-02T00:00:00Z'), entry('f2', 'floor.create', '2026-09-01T00:00:00Z')], total: 5 }
    );
    const page = await fetchAuditPage('dev1', ['building', 'floor'], [0, 0], 3);
    expect(page.entries.map((e) => e.id)).toEqual(['b1', 'f1', 'b2']);
    expect(page.total).toBe(7);
    expect(page.next).toEqual([2, 1]);
  });
});

const DEV = { id: 'dev1', name: 'Sunrise', slug: 'sunrise', status: 'draft', city: 'Tirana', country: 'Albania', category: 'residential' } as unknown as Development;
const renderPage = (role: DevelopmentRole) => {
  vi.mocked(api.getMyDevelopment).mockResolvedValue({ development: DEV, role });
  return render(
    <NotificationProvider>
      <ConfirmationProvider>
        <MemoryRouter initialEntries={['/dashboard/developments/dev1']}>
          <Routes>
            <Route path="/dashboard/developments/:id" element={<DevelopmentManagePage />} />
          </Routes>
        </MemoryRouter>
      </ConfirmationProvider>
    </NotificationProvider>
  );
};

describe('DevelopmentManagePage activity tab', () => {
  it('is shown to an owner', async () => {
    renderPage('owner');
    expect(await screen.findByRole('tab', { name: 'manage.tabs.activity' })).toBeInTheDocument();
  });

  it('is hidden from an editor', async () => {
    renderPage('editor');
    expect(await screen.findByRole('tab', { name: 'manage.tabs.overview' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'manage.tabs.activity' })).not.toBeInTheDocument();
  });
});

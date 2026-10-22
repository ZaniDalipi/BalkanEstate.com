import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResidenceExplorer } from './ResidenceExplorer';
import { EMPTY_CRITERIA } from '../../../utils/unitFilters';
import type { ExplorerNav } from '../../../hooks/useExplorerUrlState';
import type { DevelopmentBuilding, PublicSceneView, PublicUnit } from '../../../types';

vi.mock('react-i18next', async () => (await import('./__tests__/i18nMock')).default);
const views = vi.hoisted(() => ({ byTarget: {} as Record<string, PublicSceneView[]> }));
vi.mock('../../../api/developmentsApi', () => ({
  getPublicViews: (_slug: string, type: string, id?: string) =>
    Promise.resolve({ views: views.byTarget[`${type}:${id ?? ''}`] ?? [] }),
}));
vi.mock('@/src/app/router/navigation', () => ({ navigate: vi.fn() }));

const view = (key: string, hotspots: PublicSceneView['hotspots']): PublicSceneView => ({
  viewKey: key, viewName: `View ${key}`, viewDirection: 'front', sortOrder: 0,
  imageUrl: 'https://media.test/a.jpg', imageWidth: 1600, imageHeight: 900, hotspots,
});
const tri = [[0.1, 0.1], [0.4, 0.1], [0.4, 0.4]];
const buildings = [
  { id: 'b1', name: 'B1', order: 0, stats: { units: 2, available: 1 } },
  { id: 'b2', name: 'B2', order: 1, stats: { units: 3, available: 3 } },
] as DevelopmentBuilding[];
const units = [{ id: 'u1', unitNumber: 'A1', unitType: 'apartment', availability: 'available', buildingId: 'b1', floorId: 'f', listingIds: [] }] as unknown as PublicUnit[];

const Harness: React.FC<{ onOpen?: (id: string) => void }> = ({ onOpen = () => undefined }) => {
  const [nav, setNav] = useState<ExplorerNav>({});
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ResidenceExplorer
        slug="res" residenceName="East Gate" buildings={buildings} floors={[]} units={units}
        criteria={EMPTY_CRITERIA} onCriteriaChange={() => undefined} nav={nav} onNavChange={setNav}
        onOpenUnit={onOpen} fallback={<p>cover-hero</p>}
      />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  views.byTarget = {};
});

describe('ResidenceExplorer', () => {
  it('renders the fallback (no empty frame) when nothing is published', async () => {
    render(<Harness />);
    expect(await screen.findByText('cover-hero')).toBeInTheDocument();
    expect(screen.queryByTestId('explorer-canvas')).not.toBeInTheDocument();
  });

  it('opens on the first building when the residence has no views of its own', async () => {
    views.byTarget['building:b1'] = [view('east', [{ id: 'h', shape: 'polygon', points: tri, linkType: 'unit', linkId: 'u1', z: 0 }])];
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);
    fireEvent.click(await screen.findByRole('button', { name: /Apt A1/ }));
    expect(onOpen).toHaveBeenCalledWith('u1');
  });

  it('drills from residence into a building, switches views with arrows and goes back', async () => {
    views.byTarget['development:'] = [view('site', [{ id: 'hb', shape: 'polygon', points: tri, linkType: 'building', linkId: 'b2', z: 0 }])];
    views.byTarget['building:b2'] = [view('front', []), view('back', [])];
    render(<Harness />);
    fireEvent.click(await screen.findByRole('button', { name: 'B2 · 3 available' }));
    expect(await screen.findByText('View front', { selector: 'span' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next view' }));
    expect(await screen.findByText('View back', { selector: 'span' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('region', { name: 'Interactive residence explorer' }), { key: 'ArrowRight' });
    expect(await screen.findByText('View front', { selector: 'span' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'East Gate' })[0]);
    expect(await screen.findByRole('button', { name: 'B2 · 3 available' })).toBeInTheDocument();
  });
});

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import { TourButton } from './drawer/TourButton';
import { UnitFacts } from './RegionCardFacts';
import { BuildingChips } from './BuildingChips';
import { computeBuildingFacts, useRegionCard } from './useRegionCard';
import type { DevelopmentBuilding, Hotspot, PublicUnit } from '../../../types';

vi.mock('react-i18next', async () => (await import('./__tests__/i18nMock')).default);

const unit = (id: string, over: Partial<PublicUnit> = {}): PublicUnit =>
  ({ id, developmentId: 'd', buildingId: 'b1', floorId: 'f1', unitNumber: id.toUpperCase(), unitType: 'apartment', availability: 'available', listingIds: [], ...over }) as PublicUnit;
const TOUR = 'https://my.matterport.com/show/?m=abc';

describe('TourButton', () => {
  it('opens the tour in a new tab, safely', () => {
    render(<TourButton unit={{ virtualTourUrl: TOUR, tourSource: 'unit' }} />);
    const link = screen.getByRole('link', { name: /Open the 360° tour/ });
    expect(link).toHaveAttribute('href', TOUR);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByText('From this apartment’s listing.')).toBeNull();
  });
  it('says when the tour comes from the listing, and shows nothing without a tour', () => {
    const { rerender } = render(<TourButton unit={{ virtualTourUrl: TOUR, tourSource: 'listing' }} />);
    expect(screen.getByText('From this apartment’s listing.')).toBeInTheDocument();
    rerender(<TourButton unit={{}} />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('hover card of an apartment', () => {
  it('shows a 360° badge when it has a tour', () => {
    const { rerender } = render(<UnitFacts unit={unit('a1', { virtualTourUrl: TOUR })} />);
    expect(screen.getAllByText('Has a 360° virtual tour').length).toBeGreaterThan(0);
    rerender(<UnitFacts unit={unit('a1')} />);
    expect(screen.queryByText('Has a 360° virtual tour')).toBeNull();
  });
});

describe('building chips', () => {
  it('say how many homes of a building have a 360° tour', () => {
    const buildings = [
      { id: 'b1', name: 'Object A', order: 0, stats: { units: 10, available: 5, withTour: 3 } },
      { id: 'b2', name: 'Object B', order: 1, stats: { units: 8, available: 2, withTour: 0 } },
    ] as DevelopmentBuilding[];
    render(<BuildingChips buildings={buildings} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Object A/ })).toHaveTextContent('Homes with a 360° tour: 3');
    expect(screen.getByRole('button', { name: /Object B/ })).not.toHaveTextContent('360°');
  });
});

describe('region cards', () => {
  const units = [unit('a1', { virtualTourUrl: TOUR }), unit('a2', { floorId: 'f2', virtualTourUrl: TOUR }), unit('a3', { floorId: 'f2' })];
  const byId = new Map(units.map((u) => [u.id, u]));
  const hs = (linkType: Hotspot['linkType'], linkId: string, extra: Partial<Hotspot> = {}): Hotspot => ({ id: 'h', shape: 'rect', points: [[0, 0], [1, 1]], linkType, linkId, z: 0, ...extra });

  it('count the homes with a tour per building', () => {
    expect(computeBuildingFacts(units).get('b1')).toMatchObject({ units: 3, withTour: 2 });
  });

  it('building, floor and listing cards carry a 360° row when there is a tour', () => {
    const { result } = renderHook(() => useRegionCard(byId, new Map(), computeBuildingFacts(units)));
    const card = result.current;
    expect(card(hs('building', 'b1')).facts).toContainEqual({ label: '360° tour', value: 'Homes: 2' });
    expect(card(hs('floor', 'f2')).facts).toEqual([{ label: '360° tour', value: 'Homes: 1' }]);
    expect(card(hs('floor', 'f9')).facts).toBeUndefined();
    expect(card(hs('listing', 'l1', { listing: { title: 'Flat', hasTour: true } })).facts).toContainEqual({ label: '360° tour', value: 'On the listing' });
    expect(card(hs('listing', 'l1', { listing: { title: 'Flat' } })).facts ?? []).not.toContainEqual(expect.objectContaining({ label: '360° tour' }));
  });
});

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExplorerCanvas } from './ExplorerCanvas';
import type { Hotspot, PublicUnit } from '../../../types';

vi.mock('react-i18next', async () => (await import('./__tests__/i18nMock')).default);

const unit = (over: Partial<PublicUnit>): PublicUnit =>
  ({ id: 'u', developmentId: 'd', buildingId: 'b', floorId: 'f', unitNumber: 'A1', unitType: 'apartment', availability: 'available', listingIds: [], ...over }) as PublicUnit;

const poly = (id: string, linkType: Hotspot['linkType'], linkId: string): Hotspot => ({
  id,
  shape: 'polygon',
  points: [[0.1, 0.1], [0.3, 0.1], [0.3, 0.3]],
  linkType,
  linkId,
  z: 0,
});

const units = [
  unit({ id: 'u1', unitNumber: 'A12', beds: 2, availability: 'available' }),
  unit({ id: 'u2', unitNumber: 'B3', beds: 1, availability: 'sold' }),
];
const view = {
  imageUrl: 'https://media.test/facade.jpg',
  imageWidth: 1600,
  imageHeight: 900,
  viewName: 'East',
  hotspots: [poly('h1', 'unit', 'u1'), poly('h2', 'unit', 'u2'), poly('h3', 'building', 'b9'), poly('h4', 'entrance', 'e1')],
};

const renderCanvas = (props: Partial<React.ComponentProps<typeof ExplorerCanvas>> = {}) => {
  const onActivate = vi.fn();
  render(
    <ExplorerCanvas
      view={view}
      unitsById={new Map(units.map((u) => [u.id, u]))}
      buildingsById={new Map([['b9', { id: 'b9', name: 'B2', stats: { units: 20, available: 14 } } as never]])}
      onActivate={onActivate}
      {...props}
    />
  );
  return onActivate;
};

describe('ExplorerCanvas', () => {
  it('renders focusable polygons with descriptive aria labels', () => {
    renderCanvas();
    const apt = screen.getByRole('button', { name: 'Apt A12 · 2 bedrooms · Available' });
    expect(apt).toHaveAttribute('tabindex', '0');
    expect(apt).toHaveAttribute('data-state', 'available');
    expect(screen.getByRole('button', { name: 'Apt B3 · 1 bedroom · Sold' })).toHaveAttribute('data-state', 'sold');
    expect(screen.getByRole('button', { name: 'B2 · 14 available' })).toBeInTheDocument();
    // Entrances are not actionable.
    expect(document.querySelector('[data-hotspot-id="h4"]')).not.toHaveAttribute('role');
  });

  it('dims units that do not match the filters and draws a pattern on non-solid states', () => {
    renderCanvas({ matchedIds: new Set(['u2']) });
    expect(document.querySelector('[data-hotspot-id="h1"]')).toHaveAttribute('data-dimmed', 'true');
    const sold = document.querySelector('[data-hotspot-id="h2"]')!;
    expect(sold).toHaveAttribute('data-dimmed', 'false');
    expect(sold.querySelector('polygon[fill="url(#be-av-sold)"]')).not.toBeNull();
    expect(document.querySelector('pattern#be-av-sold')).not.toBeNull();
  });

  it('opens with Enter/Space and with a mouse click', () => {
    const onActivate = renderCanvas();
    const apt = screen.getByRole('button', { name: /Apt A12/ });
    fireEvent.keyDown(apt, { key: 'Enter' });
    fireEvent.keyDown(apt, { key: ' ' });
    fireEvent.click(apt);
    expect(onActivate).toHaveBeenCalledTimes(3);
    expect(onActivate.mock.calls[0][0].linkId).toBe('u1');
  });

  it('shows a tooltip with the unit facts on focus', () => {
    renderCanvas();
    fireEvent.focus(screen.getByRole('button', { name: /Apt A12/ }));
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Apt A12');
    expect(tip).toHaveTextContent('Price on request');
  });
});

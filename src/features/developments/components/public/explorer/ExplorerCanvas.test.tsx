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

  it('keeps regions invisible at rest and lights the hovered one up (clean mode)', () => {
    renderCanvas();
    const fillOf = (id: string) => document.querySelector(`[data-hotspot-id="${id}"] polygon`)!.getAttribute('fill');
    expect(fillOf('h1')).toBe('rgba(255,255,255,0.001)');
    fireEvent.focus(screen.getByRole('button', { name: /Apt A12/ }));
    expect(document.querySelector('[data-hotspot-id="h1"]')).toHaveAttribute('data-active', 'true');
    expect(fillOf('h1')).toBe('rgba(20,184,166,0.5)');
  });

  it('tints filter matches, hides non-matches, and patterns non-solid states in availability mode', () => {
    renderCanvas({ matchedIds: new Set(['u2']) });
    expect(document.querySelector('[data-hotspot-id="h1"]')).toHaveAttribute('data-dimmed', 'true');
    const sold = document.querySelector('[data-hotspot-id="h2"]')!;
    expect(sold).toHaveAttribute('data-dimmed', 'false');
    expect(sold.querySelector('polygon')!.getAttribute('fill')).toBe('rgba(239,68,68,0.26)');
  });

  it('availability mode colours every unit and draws the pattern on non-solid states', () => {
    renderCanvas({ mode: 'availability' });
    const sold = document.querySelector('[data-hotspot-id="h2"]')!;
    expect(sold.querySelector('polygon[fill="url(#be-av-sold)"]')).not.toBeNull();
    expect(document.querySelector('pattern#be-av-sold')).not.toBeNull();
  });

  it('labels building regions with a clickable name tag', () => {
    const onActivate = renderCanvas();
    const tag = screen.getByText('B2');
    fireEvent.click(tag);
    expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ linkType: 'building', linkId: 'b9' }));
  });

  it('listing card shows the listing photo, price, m², floor and rooms', () => {
    const listingSpot: Hotspot = {
      ...poly('h5', 'listing', 'l1'),
      label: 'cool apartment',
      listing: { price: 389000, listingType: 'sale', area: 142, beds: 3, baths: 2, floorNumber: 9, totalFloors: 12, propertyType: 'apartment', status: 'active', imageUrl: 'https://media.test/l1.jpg' },
    };
    const onActivate = renderCanvas({ view: { ...view, hotspots: [...view.hotspots, listingSpot] } });
    fireEvent.focus(screen.getByRole('button', { name: /cool apartment/ }));
    const card = screen.getByRole('tooltip');
    expect(card).toHaveTextContent('cool apartment');
    expect(card).toHaveTextContent('For sale');
    expect(card).toHaveTextContent('Area');
    expect(card).toHaveTextContent('142');
    expect(card).toHaveTextContent('9 of 12');
    expect(card).toHaveTextContent('Bathrooms');
    expect(card.querySelector('img')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /View listing/ }));
    expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ linkType: 'listing', linkId: 'l1' }));
  });

  it('building card shows availability and an explore action', () => {
    const onActivate = renderCanvas({
      buildingFacts: new Map([['b9', { units: 20, available: 14, floors: 6, priceFrom: 90000, currency: 'EUR' }]]),
    });
    fireEvent.focus(screen.getByRole('button', { name: /B2/ }));
    const card = screen.getByRole('tooltip');
    expect(card).toHaveTextContent('14 of 20 available');
    expect(card).toHaveTextContent('Floors');
    fireEvent.click(screen.getByRole('button', { name: /Explore building/ }));
    expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ linkId: 'b9' }));
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
    expect(tip).toHaveTextContent('Apartment');
    expect(tip).toHaveTextContent('Price on request');
    expect(screen.getByRole('button', { name: /View apartment/ })).toBeInTheDocument();
  });

  it('hovering an apartment lights up its parking spot, the card says so, and the other way round', () => {
    const bundle = [
      unit({ id: 'a1', unitNumber: 'T503', beds: 2, linkedUnitIds: ['p1'] }),
      unit({ id: 'p1', unitNumber: 'P1-01', unitType: 'parking', soldWithUnitIds: ['a1'] }),
      unit({ id: 'a2', unitNumber: 'T504', beds: 1 }),
    ];
    render(
      <ExplorerCanvas
        view={{ ...view, hotspots: [poly('ha', 'unit', 'a1'), poly('hp', 'unit', 'p1'), poly('hb', 'unit', 'a2')] }}
        unitsById={new Map(bundle.map((u) => [u.id, u]))}
        onActivate={vi.fn()}
      />
    );
    const region = (id: string) => document.querySelector(`[data-hotspot-id="${id}"]`) as Element;
    expect(region('hp')).not.toHaveAttribute('data-linked');

    fireEvent.pointerEnter(region('ha'), { pointerType: 'mouse' });
    expect(region('hp')).toHaveAttribute('data-linked', 'true');
    expect(region('hp').querySelector('polygon')).toHaveAttribute('stroke-dasharray');
    expect(region('hb')).not.toHaveAttribute('data-linked');
    expect(document.body).toHaveTextContent('Comes with Parking P1-01');
    fireEvent.pointerLeave(region('ha'));

    fireEvent.pointerEnter(region('hp'), { pointerType: 'mouse' });
    expect(region('ha')).toHaveAttribute('data-linked', 'true');
    expect(document.body).toHaveTextContent('Sold with Apt T503');
    expect(screen.getByRole('button', { name: 'View details' })).toBeInTheDocument();
  });
});

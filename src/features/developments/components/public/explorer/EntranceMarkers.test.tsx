import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExplorerCanvas } from './ExplorerCanvas';
import { entranceAnchor } from './EntranceMarkers';
import type { DevelopmentEntrance, Hotspot } from '../../../types';

vi.mock('react-i18next', async () => (await import('./__tests__/i18nMock')).default);

const rect = (id: string, linkId: string): Hotspot => ({ id, shape: 'rect', points: [[0.4, 0.6], [0.5, 0.8]], linkType: 'entrance', linkId, z: 0 });
const entrance = (over: Partial<DevelopmentEntrance>): DevelopmentEntrance => ({ id: 'e1', buildingId: 'b', name: 'Entrance A', kind: 'main', accessible: false, order: 0, ...over });

const renderWith = (entrances: DevelopmentEntrance[]) => {
  const onActivate = vi.fn();
  render(
    <ExplorerCanvas
      view={{ imageUrl: 'https://media.test/f.jpg', imageWidth: 1600, imageHeight: 900, viewName: 'Front', hotspots: [rect('h1', 'e1'), rect('h2', 'gone')] }}
      unitsById={new Map()}
      entrancesById={new Map(entrances.map((e) => [e.id, e]))}
      onActivate={onActivate}
    />
  );
  return onActivate;
};

describe('entrances on the picture', () => {
  it('pins the door above the top of its outline', () => {
    expect(entranceAnchor(rect('h', 'e'))).toEqual({ x: 0.45, y: 0.6 });
  });

  it('shows a door pin with its code and step-free mark, and the card tells what it serves', () => {
    const onActivate = renderWith([entrance({ code: 'A', accessible: true, note: 'From the main street', stats: { units: 12, available: 5 } })]);
    const region = screen.getByRole('button', { name: 'Entrance A · 5 homes available' });
    // The pin carries the short code; an unknown entrance (h2) gets no pin and is not clickable.
    const pins = document.querySelectorAll('[data-entrance-marker]');
    expect(pins).toHaveLength(1);
    expect(pins[0]).toHaveTextContent('A');
    expect(document.querySelector('[data-hotspot-id="h2"]')).not.toHaveAttribute('role');

    fireEvent.focus(region);
    const card = screen.getByRole('tooltip');
    expect(card).toHaveTextContent('Main entrance');
    expect(card).toHaveTextContent('5 of 12 available');
    expect(card).toHaveTextContent('Step-free');
    expect(card).toHaveTextContent('From the main street');
    fireEvent.click(screen.getByRole('button', { name: /Show its homes/ }));
    expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ linkType: 'entrance', linkId: 'e1' }));

    fireEvent.click(pins[0]);
    expect(onActivate).toHaveBeenCalledTimes(2);
  });

  it('offers no action for a door that serves no homes (a service entrance)', () => {
    renderWith([entrance({ name: 'Deliveries', kind: 'service', stats: { units: 0, available: 0 } })]);
    fireEvent.focus(screen.getByRole('button', { name: /Deliveries/ }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Service entrance');
    expect(screen.queryByRole('button', { name: /Show its homes/ })).toBeNull();
  });
});

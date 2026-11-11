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
  it('pins the door in the middle of its outline, so it covers no apartment around it', () => {
    const at = entranceAnchor(rect('h', 'e'));
    expect(at?.x).toBeCloseTo(0.45);
    expect(at?.y).toBeCloseTo(0.7);
  });

  it('shows a small door icon with a step-free badge (no label), and the card tells what it serves', () => {
    const onActivate = renderWith([entrance({ code: 'A', accessible: true, note: 'From the main street', stats: { units: 12, available: 5 } })]);
    const region = screen.getByRole('button', { name: 'Entrance A · 5 homes available' });
    // Only an icon in the kind's colour, with the wheelchair badge; an unknown entrance (h2) gets no pin and is not clickable.
    const pins = document.querySelectorAll('[data-entrance-marker]');
    expect(pins).toHaveLength(1);
    expect(pins[0].textContent).toBe('');
    expect(pins[0]).toHaveClass('h-6', 'w-6', 'bg-teal-700');
    // Round on touch screens too: the page-wide 44px button minimum does not stretch it.
    expect((pins[0] as HTMLElement).style.minHeight).toBe('0px');
    expect(pins[0].querySelectorAll('svg')).toHaveLength(2);
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

  it('leaves out the step-free badge when the door has steps', () => {
    renderWith([entrance({ accessible: false })]);
    expect(document.querySelector('[data-entrance-marker]')?.querySelectorAll('svg')).toHaveLength(1);
  });
});


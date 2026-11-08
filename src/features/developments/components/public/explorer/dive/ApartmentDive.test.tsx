import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ExplorerCanvas } from '../ExplorerCanvas';
import type { Hotspot, PublicUnit } from '../../../../types';
import { DIVE } from './diveTimeline';

vi.mock('react-i18next', async () => (await import('../__tests__/i18nMock')).default);
const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('framer-motion', async (load) => ({ ...(await load<typeof import('framer-motion')>()), useReducedMotion: () => motion.reduced }));

const unit = (id: string, unitNumber: string): PublicUnit =>
  ({ id, developmentId: 'd', buildingId: 'b', floorId: 'f', unitNumber, unitType: 'apartment', availability: 'available', listingIds: [], beds: 2 }) as PublicUnit;
const rect = (id: string, linkType: Hotspot['linkType'], linkId: string, x: number): Hotspot => ({
  id,
  shape: 'polygon',
  points: [[x, 0.4], [x + 0.1, 0.4], [x + 0.1, 0.5], [x, 0.5]],
  linkType,
  linkId,
  z: 0,
});
const view = {
  imageUrl: 'https://media.test/facade.jpg',
  imageWidth: 1600,
  imageHeight: 900,
  viewName: 'Front',
  hotspots: [rect('h1', 'unit', 'u1', 0.2), rect('h2', 'unit', 'u2', 0.5), rect('h3', 'building', 'b9', 0.7)],
};
const unitsById = new Map([unit('u1', 'A12'), unit('u2', 'B3')].map((u) => [u.id, u]));
const HOME = 'translate(0px, 0px) scale(1)';

/** The explorer picture on screen at 800 × 450, so the camera has room to fly. */
const mount = (openUnitId: string | null | undefined) => {
  const onActivate = vi.fn();
  const ui = (open: string | null | undefined) => (
    <ExplorerCanvas view={view} unitsById={unitsById} buildingsById={new Map([['b9', { id: 'b9', name: 'B9' } as never]])} onActivate={onActivate} openUnitId={open} />
  );
  const utils = render(ui(openUnitId));
  const root = screen.getByTestId('explorer-canvas');
  const frame = root.firstElementChild as HTMLElement;
  frame.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 450, right: 800, bottom: 450, x: 0, y: 0, toJSON: () => ({}) });
  return {
    onActivate,
    root,
    camera: () => (frame.firstElementChild as HTMLElement).style.transform,
    setOpen: (open: string | null) => utils.rerender(ui(open)),
  };
};
const later = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
/** Click the apartment (pins its card), then the card's "View apartment". */
const viewApartment = (name: RegExp) => {
  fireEvent.click(screen.getByRole('button', { name }));
  fireEvent.click(screen.getByRole('button', { name: /View apartment/ }));
};

beforeEach(() => {
  vi.useFakeTimers();
  motion.reduced = false;
});
afterEach(() => {
  vi.useRealTimers();
});

describe('flying into an apartment', () => {
  it('flies in, turns the building into a model around the apartment, then opens it', () => {
    const { onActivate, root, camera } = mount(null);
    viewApartment(/Apt A12/);

    // Step 1: the page's controls give way to "Back to building" and "Skip"; the camera sets off.
    expect(onActivate).not.toHaveBeenCalled();
    expect(root).toHaveAttribute('data-immersed', 'true');
    expect(screen.getByRole('button', { name: 'Back to building' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Taking you to Apt A12');
    expect(screen.getByTestId('dive-veil')).toHaveAttribute('data-phase', 'flight');
    expect(camera()).toMatch(/scale\(2\.6\)/);

    // Step 2: the white model.
    later(DIVE.GHOST_AT);
    expect(screen.getByTestId('dive-veil')).toHaveAttribute('data-phase', 'ghost');
    expect(onActivate).not.toHaveBeenCalled();

    // Step 3: the apartment opens.
    later(DIVE.OPEN_AT - DIVE.GHOST_AT);
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ id: 'h1', linkId: 'u1' }));
  });

  it('“Skip” opens the apartment straight away', () => {
    const { onActivate } = mount(null);
    viewApartment(/Apt A12/);
    later(300);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onActivate).toHaveBeenCalledTimes(1);
    later(DIVE.OPEN_AT);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('“Back to building” turns around: nothing opens and the camera flies home', () => {
    const { onActivate, root, camera } = mount(null);
    viewApartment(/Apt A12/);
    later(500);
    fireEvent.click(screen.getByRole('button', { name: 'Back to building' }));
    expect(camera()).toBe(HOME);
    // The page's controls wait for the camera to land.
    expect(root).toHaveAttribute('data-immersed', 'true');
    later(DIVE.RETURN_MS);
    expect(root).not.toHaveAttribute('data-immersed');
    later(DIVE.OPEN_AT);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('Esc mid-flight turns around too', () => {
    const { onActivate, camera } = mount(null);
    fireEvent.keyDown(screen.getByRole('button', { name: /Apt A12/ }), { key: 'Enter' });
    later(400);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(camera()).toBe(HOME);
    later(DIVE.OPEN_AT);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('ignores another apartment chosen mid-flight', () => {
    const { onActivate } = mount(null);
    const b3 = screen.getByRole('button', { name: /Apt B3/ });
    fireEvent.keyDown(screen.getByRole('button', { name: /Apt A12/ }), { key: 'Enter' });
    fireEvent.keyDown(b3, { key: 'Enter' });
    later(DIVE.OPEN_AT * 2);
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate.mock.calls[0][0].id).toBe('h1');
  });

  it('keeps the apartment in colour while it is open, and flies back to the building when it closes', () => {
    const { root, camera, setOpen } = mount(null);
    viewApartment(/Apt A12/);
    later(DIVE.OPEN_AT);
    setOpen('u1');
    expect(screen.getByTestId('dive-veil')).toHaveAttribute('data-phase', 'open');
    expect(camera()).toMatch(/scale\(2\.6\)/);

    setOpen(null);
    expect(camera()).toBe(HOME);
    later(DIVE.RETURN_MS);
    expect(root).not.toHaveAttribute('data-immersed');
  });

  it('lights up an apartment opened from elsewhere (the list, a link) without moving the camera', () => {
    const { root, camera } = mount('u2');
    expect(root).toHaveAttribute('data-immersed', 'true');
    expect(camera()).toBe(HOME);
  });

  it('opens buildings at once', () => {
    const { onActivate, root } = mount(null);
    fireEvent.click(screen.getByRole('button', { name: /B9/ }));
    expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ linkType: 'building' }));
    expect(root).not.toHaveAttribute('data-immersed');
  });

  it('opens apartments at once under reduced motion', () => {
    motion.reduced = true;
    const { onActivate, camera } = mount(null);
    viewApartment(/Apt A12/);
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(camera()).toBe(HOME);
  });

  it('opens apartments at once when the explorer does not track the open apartment', () => {
    const { onActivate } = mount(undefined);
    viewApartment(/Apt A12/);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});

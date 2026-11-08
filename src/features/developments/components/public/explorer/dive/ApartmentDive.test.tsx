import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ExplorerCanvas } from '../ExplorerCanvas';
import type { Hotspot, PublicUnit } from '../../../../types';
import { DIVE_MS } from './useApartmentDive';

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

/** The explorer picture on screen at 800 × 450, so the camera has room to glide. */
const mount = (openUnitId: string | null | undefined) => {
  const onActivate = vi.fn();
  const ui = (open: string | null | undefined) => (
    <ExplorerCanvas view={view} unitsById={unitsById} buildingsById={new Map([['b9', { id: 'b9', name: 'B9' } as never]])} onActivate={onActivate} openUnitId={open} />
  );
  const utils = render(ui(openUnitId));
  const frame = screen.getByTestId('explorer-canvas');
  frame.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 450, right: 800, bottom: 450, x: 0, y: 0, toJSON: () => ({}) });
  return { onActivate, frame, setOpen: (open: string | null) => utils.rerender(ui(open)) };
};
const camera = (frame: HTMLElement) => (frame.firstElementChild as HTMLElement).style.transform;
const apartment = (name: RegExp) => screen.getByRole('button', { name });

beforeEach(() => {
  vi.useFakeTimers();
  motion.reduced = false;
});
afterEach(() => {
  vi.useRealTimers();
});

describe('diving into an apartment', () => {
  it('pushes in on the apartment and washes the rest out before opening it', () => {
    const { onActivate, frame } = mount(null);
    fireEvent.click(apartment(/Apt A12/));

    expect(onActivate).not.toHaveBeenCalled();
    expect(frame).toHaveAttribute('data-immersed', 'true');
    expect(screen.getByTestId('dive-veil')).toBeInTheDocument();
    expect(camera(frame)).toMatch(/scale\(2\.5\)/);

    act(() => {
      vi.advanceTimersByTime(DIVE_MS);
    });
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ id: 'h1', linkId: 'u1' }));
  });

  it('ignores a second apartment clicked mid-dive', () => {
    const { onActivate } = mount(null);
    fireEvent.click(apartment(/Apt A12/));
    fireEvent.click(apartment(/Apt B3/));
    act(() => {
      vi.advanceTimersByTime(DIVE_MS * 2);
    });
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate.mock.calls[0][0].id).toBe('h1');
  });

  it('keeps the apartment lit while it is open, then glides back to the building when it closes', () => {
    const { frame, setOpen } = mount(null);
    fireEvent.click(apartment(/Apt A12/));
    act(() => {
      vi.advanceTimersByTime(DIVE_MS);
    });
    setOpen('u1');
    expect(frame).toHaveAttribute('data-immersed', 'true');
    expect(camera(frame)).toMatch(/scale\(2\.5\)/);

    setOpen(null);
    expect(frame).not.toHaveAttribute('data-immersed');
    expect(camera(frame)).toBe('translate(0px, 0px) scale(1)');
  });

  it('lights up an apartment opened from elsewhere (the list, a link) without moving the camera', () => {
    const { frame } = mount('u2');
    expect(frame).toHaveAttribute('data-immersed', 'true');
    expect(camera(frame)).toBe('translate(0px, 0px) scale(1)');
  });

  it('opens buildings at once', () => {
    const { onActivate, frame } = mount(null);
    fireEvent.click(screen.getByRole('button', { name: /B9/ }));
    expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ linkType: 'building' }));
    expect(frame).not.toHaveAttribute('data-immersed');
  });

  it('opens apartments at once under reduced motion', () => {
    motion.reduced = true;
    const { onActivate, frame } = mount(null);
    fireEvent.click(apartment(/Apt A12/));
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(camera(frame)).toBe('translate(0px, 0px) scale(1)');
  });

  it('opens apartments at once when the explorer does not track the open apartment', () => {
    const { onActivate } = mount(undefined);
    fireEvent.click(apartment(/Apt A12/));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});

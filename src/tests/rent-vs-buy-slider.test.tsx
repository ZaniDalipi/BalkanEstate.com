import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RentVsBuyCalculator from '../features/calculators/components/RentVsBuyCalculator';

const TRACK_WIDTH = 300;

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: TRACK_WIDTH, bottom: 48,
    width: TRACK_WIDTH, height: 48, toJSON: () => ({}),
  } as DOMRect);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

describe('RentVsBuyCalculator horizon slider', () => {
  it('exposes the horizon as a slider over the 1–30 year range', () => {
    render(<RentVsBuyCalculator propertyPrice={200000} country="XK" />);
    const track = screen.getByRole('slider');

    expect(track).toHaveAttribute('aria-valuemin', '1');
    expect(track).toHaveAttribute('aria-valuemax', '30');
    expect(track).toHaveAttribute('aria-valuenow', '8');
  });

  it('moves on a press anywhere along the track, not just on the thumb', () => {
    render(<RentVsBuyCalculator propertyPrice={200000} country="XK" />);
    const track = screen.getByRole('slider');

    act(() => { fireEvent.pointerDown(track, { pointerId: 1, clientX: TRACK_WIDTH - 2, button: 0 }); });
    expect(track).toHaveAttribute('aria-valuenow', '30');

    act(() => { fireEvent.pointerMove(track, { pointerId: 1, clientX: 0 }); });
    expect(track).toHaveAttribute('aria-valuenow', '1');
  });

  it('follows a drag without a dead zone', () => {
    render(<RentVsBuyCalculator propertyPrice={200000} country="XK" />);
    const track = screen.getByRole('slider');

    act(() => { fireEvent.pointerDown(track, { pointerId: 1, clientX: 0, button: 0 }); });
    const seen: number[] = [];
    for (const x of [60, 120, 180, 240]) {
      act(() => { fireEvent.pointerMove(track, { pointerId: 1, clientX: x }); });
      seen.push(Number(track.getAttribute('aria-valuenow')));
    }
    act(() => { fireEvent.pointerUp(track, { pointerId: 1, clientX: 240 }); });

    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
    expect(new Set(seen).size).toBe(seen.length);
  });
});

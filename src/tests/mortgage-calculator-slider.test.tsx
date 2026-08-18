import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MortgageCalculator from '../features/calculators/components/MortgageCalculator';

const TRACK_WIDTH = 300;

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: TRACK_WIDTH, bottom: 48,
    width: TRACK_WIDTH, height: 48, toJSON: () => ({}),
  } as DOMRect);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

describe('MortgageCalculator down-payment slider', () => {
  it('moves on a press anywhere along the track', () => {
    render(<MortgageCalculator propertyPrice={100000} country="XK" />);
    const track = screen.getByRole('slider');
    const before = Number(track.getAttribute('aria-valuenow'));

    act(() => { fireEvent.pointerDown(track, { pointerId: 1, clientX: TRACK_WIDTH - 5, button: 0 }); });

    expect(Number(track.getAttribute('aria-valuenow'))).toBe(100);
    expect(Number(track.getAttribute('aria-valuenow'))).not.toBe(before);
  });

  it('follows a drag across the track', () => {
    render(<MortgageCalculator propertyPrice={100000} country="XK" />);
    const track = screen.getByRole('slider');

    act(() => { fireEvent.pointerDown(track, { pointerId: 1, clientX: 0, button: 0 }); });
    const seen: number[] = [];
    for (const x of [40, 80, 120, 160, 200]) {
      act(() => { fireEvent.pointerMove(track, { pointerId: 1, clientX: x }); });
      seen.push(Number(track.getAttribute('aria-valuenow')));
    }
    act(() => { fireEvent.pointerUp(track, { pointerId: 1, clientX: 200 }); });

    // Every move produced a new, strictly increasing value — no dead zone.
    expect(seen).toHaveLength(5);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
    expect(new Set(seen).size).toBe(5);
  });

  it('never renders NaN when the property has no price', () => {
    render(<MortgageCalculator propertyPrice={0} country="XK" />);

    // Toggling to the € mode used to divide by a zero price.
    fireEvent.click(screen.getByRole('button', { name: '€' }));

    expect(document.body.textContent).not.toContain('NaN');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
  });

  it('keeps the € slider on a step fine enough to feel continuous', () => {
    render(<MortgageCalculator propertyPrice={100000} country="XK" />);
    fireEvent.click(screen.getByRole('button', { name: '€' }));
    const track = screen.getByRole('slider');

    // A 5px nudge along a 300px track must change the value: with the old
    // fixed 1000 step on small prices whole gestures could land on one value.
    act(() => { fireEvent.pointerDown(track, { pointerId: 1, clientX: 150, button: 0 }); });
    const mid = Number(track.getAttribute('aria-valuenow'));
    act(() => { fireEvent.pointerMove(track, { pointerId: 1, clientX: 158 }); });
    expect(Number(track.getAttribute('aria-valuenow'))).toBeGreaterThan(mid);
  });
});

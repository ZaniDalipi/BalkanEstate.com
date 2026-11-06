import React, { useState } from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DualRange } from './DualRange';

const Harness: React.FC = () => {
  const [[lo, hi], set] = useState<[number, number]>([1, 7]);
  return <DualRange min={1} max={7} low={lo} high={hi} onChange={(a, b) => set([a, b])} minLabel="Floors min" maxLabel="Floors max" />;
};

beforeAll(() => {
  // jsdom has no layout: give the track a 600px box starting at x=0.
  Element.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, width: 600, height: 44, right: 600, bottom: 44, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
});

describe('DualRange', () => {
  it('drags the nearest thumb with a pointer (touch-friendly track)', () => {
    render(<Harness />);
    const min = screen.getByRole('slider', { name: 'Floors min' });
    const track = min.parentElement as HTMLElement;

    fireEvent.pointerDown(track, { clientX: 200, pointerId: 1, button: 0 });
    expect(min).toHaveAttribute('aria-valuenow', '3');

    fireEvent.pointerMove(track, { clientX: 300, pointerId: 1 });
    expect(min).toHaveAttribute('aria-valuenow', '4');
    fireEvent.pointerUp(track, { pointerId: 1 });

    fireEvent.pointerMove(track, { clientX: 0, pointerId: 1 });
    expect(min).toHaveAttribute('aria-valuenow', '4');

    fireEvent.pointerDown(track, { clientX: 500, pointerId: 2, button: 0 });
    expect(screen.getByRole('slider', { name: 'Floors max' })).toHaveAttribute('aria-valuenow', '6');
  });

  it('moves a thumb with the keyboard', () => {
    render(<Harness />);
    const max = screen.getByRole('slider', { name: 'Floors max' });
    fireEvent.keyDown(max, { key: 'ArrowLeft' });
    expect(max).toHaveAttribute('aria-valuenow', '6');
    fireEvent.keyDown(max, { key: 'Home' });
    expect(max).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('slider', { name: 'Floors min' })).toHaveAttribute('aria-valuemax', '1');
  });
});

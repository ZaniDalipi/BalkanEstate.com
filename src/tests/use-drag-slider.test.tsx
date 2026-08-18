import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useDragSlider } from '../hooks/useDragSlider';

const TRACK_WIDTH = 300;
const THUMB = 28;

/** Minimal host for the hook: a fixed-width track that reports a real rect. */
const Harness: React.FC<{
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  initial?: number;
}> = ({ onChange, min = 0, max = 100, step = 1, initial = 0 }) => {
  const [value, setValue] = React.useState(initial);
  const { percent, offset, isDragging, trackProps } = useDragSlider({
    value,
    min,
    max,
    step,
    onChange: (v) => { setValue(v); onChange(v); },
    thumbSize: THUMB,
    'aria-label': 'test slider',
  });
  return (
    <div>
      <div {...trackProps} data-testid="track" />
      <output data-testid="percent">{percent}</output>
      <output data-testid="offset">{offset}</output>
      <output data-testid="dragging">{String(isDragging)}</output>
    </div>
  );
};

/**
 * jsdom gives every element a 0×0 rect and has no rAF that advances on its own,
 * so both are stubbed: the track gets a real width, and rAF runs synchronously
 * so a pointermove commits within the same act().
 */
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: TRACK_WIDTH, bottom: 40,
    width: TRACK_WIDTH, height: 40, toJSON: () => ({}),
  } as DOMRect);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

/** Value expected for a press at `clientX`, mirroring the thumb-inset geometry. */
const expectedAt = (clientX: number) =>
  Math.round(Math.min(1, Math.max(0, (clientX - THUMB / 2) / (TRACK_WIDTH - THUMB))) * 100);

describe('useDragSlider', () => {
  it('exposes the slider role with its value range', () => {
    render(<Harness onChange={() => {}} initial={20} />);
    const track = screen.getByRole('slider', { name: 'test slider' });
    expect(track).toHaveAttribute('aria-valuemin', '0');
    expect(track).toHaveAttribute('aria-valuemax', '100');
    expect(track).toHaveAttribute('aria-valuenow', '20');
    expect(track).toHaveAttribute('tabindex', '0');
  });

  it('jumps to the pressed position instead of needing the thumb grabbed', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const track = screen.getByTestId('track');

    act(() => { fireEvent.pointerDown(track, { pointerId: 1, clientX: 150, button: 0 }); });

    expect(onChange).toHaveBeenCalledWith(expectedAt(150));
    expect(screen.getByTestId('dragging')).toHaveTextContent('true');
  });

  it('tracks every move of a drag and stops on pointer up', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const track = screen.getByTestId('track');

    act(() => { fireEvent.pointerDown(track, { pointerId: 1, clientX: 20, button: 0 }); });
    act(() => { fireEvent.pointerMove(track, { pointerId: 1, clientX: 100 }); });
    act(() => { fireEvent.pointerMove(track, { pointerId: 1, clientX: 200 }); });

    expect(onChange).toHaveBeenLastCalledWith(expectedAt(200));

    act(() => { fireEvent.pointerUp(track, { pointerId: 1, clientX: 200 }); });
    expect(screen.getByTestId('dragging')).toHaveTextContent('false');

    // Moves after release are ignored.
    onChange.mockClear();
    act(() => { fireEvent.pointerMove(track, { pointerId: 1, clientX: 50 }); });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clamps to the range at both ends', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const track = screen.getByTestId('track');

    act(() => { fireEvent.pointerDown(track, { pointerId: 1, clientX: -200, button: 0 }); });
    expect(onChange).toHaveBeenLastCalledWith(0);

    act(() => { fireEvent.pointerMove(track, { pointerId: 1, clientX: 9999 }); });
    expect(onChange).toHaveBeenLastCalledWith(100);
  });

  it('snaps to the step grid', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} step={25} />);
    const track = screen.getByTestId('track');

    act(() => { fireEvent.pointerDown(track, { pointerId: 1, clientX: 160, button: 0 }); });

    const value = onChange.mock.calls.at(-1)?.[0];
    expect(value % 25).toBe(0);
  });

  it('supports keyboard control', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} initial={50} />);
    const track = screen.getByTestId('track');

    fireEvent.keyDown(track, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith(51);

    fireEvent.keyDown(track, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith(0);

    fireEvent.keyDown(track, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith(100);
  });

  it('reports 0% instead of NaN when the range is degenerate', () => {
    render(<Harness onChange={() => {}} min={0} max={0} />);
    expect(screen.getByTestId('percent')).toHaveTextContent('0');
    expect(screen.getByTestId('offset')).not.toHaveTextContent('NaN');
  });

  it('places the thumb centre inside the track at both extremes', () => {
    // At 0% the centre sits half a thumb in, so the thumb never overhangs.
    const low = render(<Harness onChange={() => {}} initial={0} />);
    expect(low.getByTestId('offset')).toHaveTextContent(`calc(0% + ${THUMB / 2}px)`);
    low.unmount();

    const high = render(<Harness onChange={() => {}} initial={100} />);
    expect(high.getByTestId('offset')).toHaveTextContent(`calc(100% - ${THUMB / 2}px)`);
  });
});

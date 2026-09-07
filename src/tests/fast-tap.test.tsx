/**
 * The back button used to need a second press on a phone. These cover the
 * three ways an ordinary `onClick` loses a tap on a small, edge-of-screen
 * control, plus the guarantee that nothing ever fires twice.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useFastTap } from '@/shared/interaction/useFastTap';

function Back({ onBack }: { onBack: () => void }) {
  const props = useFastTap(onBack);
  return (
    <button {...props} type="button">
      Back
    </button>
  );
}

function pointer(
  el: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  x: number,
  y: number,
) {
  el.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      button: type === 'pointerdown' ? 0 : -1,
      isPrimary: true,
      pointerId: 1,
      clientX: x,
      clientY: y,
    }),
  );
}

function click(el: Element) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

/** jsdom lays nothing out, so the button needs a plausible box. */
function stubRect(el: Element) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 40, top: 40, left: 0, right: 90, bottom: 88, width: 90, height: 48,
    toJSON: () => ({}),
  } as DOMRect);
}

describe('useFastTap', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('fires on the finger lifting, without waiting for a click', () => {
    const onBack = vi.fn();
    render(<Back onBack={onBack} />);
    const btn = screen.getByRole('button');
    stubRect(btn);

    pointer(btn, 'pointerdown', 20, 60);
    pointer(btn, 'pointerup', 20, 60);

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('does not fire twice when the browser also delivers the click', () => {
    const onBack = vi.fn();
    render(<Back onBack={onBack} />);
    const btn = screen.getByRole('button');
    stubRect(btn);

    pointer(btn, 'pointerdown', 20, 60);
    pointer(btn, 'pointerup', 20, 60);
    click(btn);

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('still fires for a keyboard activation, which sends only a click', () => {
    const onBack = vi.fn();
    render(<Back onBack={onBack} />);
    const btn = screen.getByRole('button');
    stubRect(btn);

    click(btn);

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('forgives a release a little outside the button', () => {
    // A 48px target and a thumb: the release regularly lands a few px off the
    // edge, where the browser refuses to synthesise a click at all.
    const onBack = vi.fn();
    render(<Back onBack={onBack} />);
    const btn = screen.getByRole('button');
    stubRect(btn);

    pointer(btn, 'pointerdown', 20, 60);
    pointer(btn, 'pointerup', 20, 96); // 8px below the bottom edge

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('ignores a release far away from the button', () => {
    const onBack = vi.fn();
    render(<Back onBack={onBack} />);
    const btn = screen.getByRole('button');
    stubRect(btn);

    pointer(btn, 'pointerdown', 20, 60);
    pointer(btn, 'pointerup', 300, 400);

    expect(onBack).not.toHaveBeenCalled();
  });

  it('does not fire when the press turns into a scroll or a drag', () => {
    const onBack = vi.fn();
    render(<Back onBack={onBack} />);
    const btn = screen.getByRole('button');
    stubRect(btn);

    pointer(btn, 'pointerdown', 20, 60);
    pointer(btn, 'pointermove', 20, 140);
    pointer(btn, 'pointerup', 20, 140);

    expect(onBack).not.toHaveBeenCalled();
  });

  it('drops the press when the gesture is cancelled', () => {
    const onBack = vi.fn();
    render(<Back onBack={onBack} />);
    const btn = screen.getByRole('button');
    stubRect(btn);

    pointer(btn, 'pointerdown', 20, 60);
    pointer(btn, 'pointercancel', 20, 60);
    pointer(btn, 'pointerup', 20, 60);

    expect(onBack).not.toHaveBeenCalled();
  });

  it('calls the latest handler even though the props are stable', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Back onBack={first} />);
    const btn = screen.getByRole('button');
    stubRect(btn);

    rerender(<Back onBack={second} />);
    pointer(btn, 'pointerdown', 20, 60);
    pointer(btn, 'pointerup', 20, 60);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

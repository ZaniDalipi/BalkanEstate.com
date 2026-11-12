import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DrawAreaTip from './DrawAreaTip';

describe('DrawAreaTip', () => {
  it('explains the drag while drawing, without taking input', () => {
    render(<DrawAreaTip isDrawing onCancel={() => {}} />);
    const tip = screen.getByTestId('draw-area-tip');
    expect(tip.className).toContain('pointer-events-none');
    // i18n is mocked to return keys: the tip carries the title, the how-to, the one-drag note and the cancel hint.
    expect(tip.textContent).toContain('search:map.drawTip.title');
    expect(tip.textContent).toMatch(/search:map\.drawTip\.(mouse|touch)/);
    expect(tip.textContent).toContain('search:map.drawTip.oneDrag');
    expect(tip.textContent).toContain('search:map.drawTip.cancel');
  });

  it('is not shown when drawing is off', () => {
    render(<DrawAreaTip isDrawing={false} onCancel={() => {}} />);
    expect(screen.queryByTestId('draw-area-tip')).toBeNull();
  });

  it('stops drawing on Esc', () => {
    const onCancel = vi.fn();
    render(<DrawAreaTip isDrawing onCancel={onCancel} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

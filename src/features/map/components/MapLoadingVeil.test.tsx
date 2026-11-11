import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import MapLoadingVeil from './MapLoadingVeil';

describe('MapLoadingVeil', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('covers the map while it is not ready, without blocking input', () => {
    const { container } = render(<MapLoadingVeil covered busy={false} />);
    const veil = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(veil).toBeTruthy();
    expect(veil.className).toContain('pointer-events-none');
  });

  it('does not flash the pill for a load that ends quickly', () => {
    const { rerender } = render(<MapLoadingVeil covered={false} busy />);
    act(() => { vi.advanceTimersByTime(80); });
    rerender(<MapLoadingVeil covered={false} busy={false} />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the pill for a load that takes a while', () => {
    render(<MapLoadingVeil covered={false} busy />);
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByRole('status')).toBeTruthy();
  });
});

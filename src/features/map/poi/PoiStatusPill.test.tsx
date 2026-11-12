import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PoiStatusPill from './PoiStatusPill';

describe('PoiStatusPill', () => {
  it('says to zoom in, as a status', () => {
    render(<PoiStatusPill status="zoom-in" />);
    expect(screen.getByRole('status').textContent).toContain('search:map.poiStatus.zoomIn');
  });
  it('reports a failure as an alert', () => {
    render(<PoiStatusPill status="error" />);
    expect(screen.getByRole('alert').textContent).toContain('search:map.poiStatus.error');
  });
  it('shows nothing when off or ready', () => {
    const { container, rerender } = render(<PoiStatusPill status="off" />);
    expect(container.firstChild).toBeNull();
    rerender(<PoiStatusPill status="ready" />);
    expect(container.firstChild).toBeNull();
  });
});

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MapBusyOverlay from './MapBusyOverlay';

describe('MapBusyOverlay', () => {
  it('says the map is loading while busy', () => {
    render(<MapBusyOverlay busy />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('renders nothing once the pins are there', () => {
    const { container } = render(<MapBusyOverlay busy={false} />);
    expect(container.firstChild).toBeNull();
  });
});

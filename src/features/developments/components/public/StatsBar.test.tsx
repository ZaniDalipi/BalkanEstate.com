import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsBar } from './StatsBar';

describe('StatsBar', () => {
  it('shows the whole starting price, with the "+" kept on its line, never cut off', () => {
    render(<StatsBar buildings={4} summary={{ total: 118, available: 60, priceMin: 72000, priceMax: 310000, currency: 'EUR' }} />);
    const price = screen.getByText((text) => text.startsWith('72.000') && text.endsWith('⁠+'));
    // On a narrow phone the tile wraps the price instead of showing "72.00…".
    expect(price.className).not.toMatch(/\btruncate\b/);
    expect(price.className).toMatch(/break-words/);
  });

  it('shows a single price without the "+" when every home costs the same', () => {
    render(<StatsBar buildings={1} summary={{ total: 2, available: 2, priceMin: 90000, priceMax: 90000, currency: 'EUR' }} />);
    expect(screen.getByText((text) => text.startsWith('90.000') && !text.includes('+'))).toBeInTheDocument();
  });
});

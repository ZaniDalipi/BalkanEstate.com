import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PropertyRow from '@/src/features/analytics/components/cards/PropertyRow';
import { calculateTrend, formatDuration } from '@/src/features/analytics/utils/helpers';

const property = {
  propertyId: 'abc123',
  title: 'Corner Residence Shitet apartament 2+1',
  status: 'sold',
  isPromoted: true,
  price: 190000,
  city: 'Tirana',
  country: 'Albania',
  imageUrl: 'https://res.cloudinary.com/dh8tbq8wy/image/upload/v1/properties/a.jpg',
  periodViews: 82,
  periodUniqueViews: 60,
  totalViews: 196,
  avgDuration: 75,
  saves: 4,
  inquiries: 2,
  previousPeriodViews: 41,
  dailyViews: [1, 3, 2, 5, 8],
};

describe('analytics PropertyRow', () => {
  it('is a link to the property page and navigates in-app on a plain click', () => {
    const onClick = vi.fn();
    render(<PropertyRow property={property} rank={1} maxViews={82} href="/en/property/abc123" onClick={onClick} />);

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/en/property/abc123');

    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);

    // A modified click is left to the browser (open in new tab).
    fireEvent.click(link, { metaKey: true });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows the photo, location, status, views trend and sparkline', () => {
    const { container } = render(<PropertyRow property={property} rank={1} maxViews={82} />);

    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toContain('res.cloudinary.com');
    expect(screen.getByText('Tirana, Albania')).toBeTruthy();
    expect(screen.getByText('analytics:properties.sold')).toBeTruthy();
    expect(screen.getByText('82')).toBeTruthy();
    expect(screen.getByText(/\+100/)).toBeTruthy();
    expect(container.querySelector('svg polyline')).toBeTruthy();
  });

  it('falls back to a placeholder without a photo and hides premium-only stats', () => {
    const { container } = render(
      <PropertyRow
        property={{ propertyId: 'x', title: 'Plain', periodViews: 0, totalViews: 3 }}
        rank={7}
        maxViews={10}
      />
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('7')).toBeTruthy();
    expect(container.querySelector('svg polyline')).toBeNull();
  });
});

describe('analytics helpers', () => {
  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(125)).toBe('2m 05s');
  });

  it('computes the trend against the previous period', () => {
    expect(calculateTrend(82, 41)).toBe(100);
    expect(calculateTrend(5, 10)).toBe(-50);
    expect(calculateTrend(5, 0)).toBeNull();
  });
});

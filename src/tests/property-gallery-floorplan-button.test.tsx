/**
 * The gallery's top-left badges offer the floor plan next to the 3D map, but
 * only when the page passes a handler (it does so when the listing has one).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { PropertyGallery } from '@/src/components/property/PropertyGallery';
import type { Property } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, second?: string | { defaultValue?: string }) => {
      if (typeof second === 'string') return second;
      if (second && typeof second === 'object' && second.defaultValue) return second.defaultValue;
      return key;
    },
  }),
}));

vi.mock('@/src/features/promo/components/Slot', () => ({ default: () => null }));

const property = {
  id: 'p1',
  imageUrl: 'https://media.test/listing/p0/original.jpg',
  images: [],
  propertyType: 'apartment',
  listingType: 'sale',
  city: 'Tirana',
  country: 'Albania',
  price: 215000,
  lat: 41.3,
  lng: 19.8,
} as unknown as Property;

const renderGallery = (props: { onViewFloorPlan?: () => void; onOpenViewer?: () => void }) =>
  render(
    <PropertyGallery
      property={property}
      onOpenEditor={() => {}}
      onOpenViewer={props.onOpenViewer ?? (() => {})}
      onView3DMap={() => {}}
      onViewFloorPlan={props.onViewFloorPlan}
    />
  );

beforeEach(() => cleanup());

describe('PropertyGallery floor plan button', () => {
  it('sits beside the 3D map button and opens the floor plan', () => {
    const onViewFloorPlan = vi.fn();
    const onOpenViewer = vi.fn();
    renderGallery({ onViewFloorPlan, onOpenViewer });
    expect(screen.getByRole('button', { name: '3D Location Map' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Floor Plan' }));
    expect(onViewFloorPlan).toHaveBeenCalledTimes(1);
    // The click must not fall through to the photo and open the fullscreen viewer.
    expect(onOpenViewer).not.toHaveBeenCalled();
  });

  it('is absent when the listing has no floor plan', () => {
    renderGallery({});
    expect(screen.getByRole('button', { name: '3D Location Map' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Floor Plan' })).toBeNull();
  });
});

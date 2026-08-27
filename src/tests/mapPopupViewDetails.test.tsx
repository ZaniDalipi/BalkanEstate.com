/**
 * The map popup's "View details" CTA on touch devices.
 *
 * The button sits inside a Google Maps overlay pane, where a plain `click` is
 * the first thing to go missing on a phone: Maps' gesture handling, or the
 * overlay being re-laid-out between touchstart and touchend, swallows it and
 * the tap does nothing — the exact symptom reported for the Luxury Villas map.
 * So the CTA also acts on pointerup for touch, and these tests pin down both
 * halves of that: a tap opens the listing, a drag across the card (the user
 * panning the map) does not.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GoogleMapPropertyPopup from '@/src/features/map/components/GoogleMapPropertyPopup';
import type { Property } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const villa = {
  id: 'villa-1',
  title: 'Cliffside Villa',
  address: 'Rruga e Detit 1',
  city: 'Vlore',
  country: 'Albania',
  price: 700000,
  beds: 2,
  baths: 3,
  sqft: 0,
  propertyType: 'luxury-villa',
  listingType: 'rent',
  lat: 40.46,
  lng: 19.49,
  images: [],
} as unknown as Property;

const renderPopup = () => {
  const onViewDetails = vi.fn();
  render(
    <GoogleMapPropertyPopup
      property={villa}
      onClose={() => {}}
      onViewDetails={onViewDetails}
    />,
  );
  return { onViewDetails, cta: screen.getByRole('button', { name: /View/ }) };
};

describe('the "View details" CTA', () => {
  it('opens the listing on a touch tap, without waiting for a click', () => {
    const { onViewDetails, cta } = renderPopup();

    fireEvent.pointerDown(cta, { pointerType: 'touch', clientX: 100, clientY: 200 });
    fireEvent.pointerUp(cta, { pointerType: 'touch', clientX: 102, clientY: 201 });

    expect(onViewDetails).toHaveBeenCalledTimes(1);
  });

  it('opens the listing only once when the tap does produce a click too', () => {
    const { onViewDetails, cta } = renderPopup();

    fireEvent.pointerDown(cta, { pointerType: 'touch', clientX: 100, clientY: 200 });
    fireEvent.pointerUp(cta, { pointerType: 'touch', clientX: 100, clientY: 200 });
    fireEvent.click(cta);

    expect(onViewDetails).toHaveBeenCalledTimes(1);
  });

  it('ignores a drag that starts on the button — that is a map pan', () => {
    const { onViewDetails, cta } = renderPopup();

    fireEvent.pointerDown(cta, { pointerType: 'touch', clientX: 100, clientY: 200 });
    fireEvent.pointerUp(cta, { pointerType: 'touch', clientX: 160, clientY: 260 });

    expect(onViewDetails).not.toHaveBeenCalled();
  });

  it('still opens the listing on a desktop mouse click', () => {
    const { onViewDetails, cta } = renderPopup();

    fireEvent.pointerDown(cta, { pointerType: 'mouse', clientX: 100, clientY: 200 });
    fireEvent.pointerUp(cta, { pointerType: 'mouse', clientX: 100, clientY: 200 });
    expect(onViewDetails).not.toHaveBeenCalled();

    fireEvent.click(cta);
    expect(onViewDetails).toHaveBeenCalledTimes(1);
  });
});

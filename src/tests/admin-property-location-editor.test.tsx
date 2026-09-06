/**
 * Admin property location editor.
 *
 * The pin and the two coordinate fields describe one position, so the fields
 * have to follow the map: an admin who drags the marker after typing must be
 * left with the coordinates of the pin they can see, not the ones they typed.
 */
import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AdminPropertyLocationEditor, { type AdminPropertyLocation } from '../features/admin/components/AdminPropertyLocationEditor';

/**
 * Leaflet needs a real layout box and tile requests, neither of which jsdom
 * has. This stand-in keeps what the editor depends on: the centre it opens the
 * map at, and the callbacks the pin writes back through.
 */
vi.mock('@/src/features/seller/components/MapLocationPicker', () => ({
  default: ({ lat, lng, onLocationChange, onAddressChange }: {
    lat: number; lng: number;
    onLocationChange: (lat: number, lng: number) => void;
    onAddressChange?: (address: string) => void;
  }) => (
    <div data-testid="map-picker" data-centre={`${lat.toFixed(4)},${lng.toFixed(4)}`}>
      <button type="button" onClick={() => onLocationChange(40.9123456789, 21.0987654321)}>drop pin</button>
      <button type="button" onClick={() => onAddressChange?.('Крани, Општина Ресен')}>report address</button>
    </div>
  ),
}));

// The suite does not boot i18n; returning the fallback gives the English copy
// the component ships, and the bare key where it passes none.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const Harness: React.FC<{ initial?: Partial<AdminPropertyLocation> }> = ({ initial }) => {
  const [location, setLocation] = useState<AdminPropertyLocation>({
    lat: 41.9981,
    lng: 21.4254,
    address: 'Skopje',
    ...initial,
  });

  return (
    <div>
      <AdminPropertyLocationEditor
        country="North Macedonia"
        city="Skopje"
        location={location}
        onChange={(patch) => setLocation((prev) => ({ ...prev, ...patch }))}
      />
      <output data-testid="form-state">{`${location.lat},${location.lng},${location.address}`}</output>
    </div>
  );
};

const latField = (): HTMLInputElement => document.getElementById('admin-property-lat') as HTMLInputElement;
const lngField = (): HTMLInputElement => document.getElementById('admin-property-lng') as HTMLInputElement;

const openMap = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Edit on map' }));
  return screen.findByTestId('map-picker');
};

describe('AdminPropertyLocationEditor', () => {
  it('overrides typed coordinates as soon as the pin moves', async () => {
    render(<Harness />);
    await openMap();

    fireEvent.change(latField(), { target: { value: '9' } });
    fireEvent.change(lngField(), { target: { value: '1' } });
    expect(latField().value).toBe('9');
    expect(screen.getByTestId('form-state')).toHaveTextContent('9,1,Skopje');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'drop pin' }));
    });

    expect(latField().value).toBe('40.912346');
    expect(lngField().value).toBe('21.098765');
    expect(screen.getByTestId('form-state').textContent).toContain('40.9123456789,21.0987654321');
  });

  it('keeps the pin when the map reports the address for it', async () => {
    render(<Harness />);
    await openMap();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'drop pin' }));
      fireEvent.click(screen.getByRole('button', { name: 'report address' }));
    });

    expect(latField().value).toBe('40.912346');
    expect(screen.getByTestId('form-state').textContent).toBe('40.9123456789,21.0987654321,Крани, Општина Ресен');
  });

  it('leaves a half-typed coordinate alone until the map moves', () => {
    render(<Harness />);

    fireEvent.change(latField(), { target: { value: '' } });
    expect(latField().value).toBe('');
    // Nothing committable was typed, so the pin has not moved.
    expect(screen.getByTestId('form-state')).toHaveTextContent('41.9981,21.4254,Skopje');

    fireEvent.change(latField(), { target: { value: '42.5' } });
    expect(screen.getByTestId('form-state')).toHaveTextContent('42.5,21.4254,Skopje');
  });

  it('opens the map on the city centre when the listing has no pin', async () => {
    render(<Harness initial={{ lat: 0, lng: 0 }} />);
    const picker = await openMap();

    expect(picker.getAttribute('data-centre')).not.toBe('0.0000,0.0000');
    expect(screen.getByText('No pin set — this listing will not appear on the map.')).toBeInTheDocument();
  });
});

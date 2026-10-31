import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '@/src/tests/test-utils';

vi.mock('@/src/features/seller/components/MapLocationPicker', () => ({
  default: ({ lat, onLocationChange }: { lat: number; onLocationChange: (lat: number, lng: number) => void }) => (
    <button type="button" data-lat={lat} onClick={() => onLocationChange(42.4635001, 21.4694002)}>
      map pin
    </button>
  ),
}));

import { LocationFields } from './LocationFields';
import type { LocationValue } from './useLocationFields';

const Harness: React.FC<{ onValue: (v: LocationValue) => void }> = ({ onValue }) => {
  const [value, setValue] = useState<LocationValue>({ country: '', city: '', municipality: '', address: '', lat: '', lng: '' });
  return (
    <LocationFields
      value={value}
      onChange={(patch) => {
        const next = { ...value, ...patch };
        setValue(next);
        onValue(next);
      }}
    />
  );
};

describe('LocationFields (create form)', () => {
  it('shows the map pin once a city is chosen and stores the pin with 6 decimals', async () => {
    const onValue = vi.fn();
    const user = userEvent.setup();
    render(<Harness onValue={onValue} />);
    expect(screen.getByText('details.pinNeedsCity')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/wizard.country/), 'Kosovo');
    await user.selectOptions(screen.getByLabelText(/wizard.city/), 'Gjilan');
    await user.click(await screen.findByRole('button', { name: 'map pin' }));

    expect(onValue).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'Gjilan', lat: '42.463500', lng: '21.469400' }));
    expect(screen.queryByLabelText('details.lat')).not.toBeInTheDocument();
  });
});

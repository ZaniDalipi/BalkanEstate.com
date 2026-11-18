import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PropertyTypePicker from '@/src/features/search/components/filters/PropertyTypePicker';
import type { PropertyTypeSelection } from '@/shared/types/property.types';

const Harness: React.FC<{ onValue: (value: PropertyTypeSelection) => void }> = ({ onValue }) => {
  const [value, setValue] = useState<PropertyTypeSelection>('any');
  return (
    <PropertyTypePicker
      value={value}
      onChange={(next) => { setValue(next); onValue(next); }}
    />
  );
};

describe('PropertyTypePicker', () => {
  it('lets the user choose several types, and Any clears them', () => {
    let last: PropertyTypeSelection = 'any';
    render(<Harness onValue={(value) => { last = value; }} />);
    // The test setup's translator returns keys, so tiles are named by their key.
    const tile = (key: string) => screen.getByRole('button', { name: `search:propertyTypes.${key}` });
    const pressed = (key: string) => tile(key).getAttribute('aria-pressed');

    expect(pressed('any')).toBe('true');

    fireEvent.click(tile('villa'));
    fireEvent.click(tile('apartment'));
    expect(last).toBe('apartment,villa');
    expect(pressed('villa')).toBe('true');
    expect(pressed('apartment')).toBe('true');
    expect(pressed('any')).toBe('false');

    fireEvent.click(tile('villa'));
    expect(last).toBe('apartment');

    fireEvent.click(tile('any'));
    expect(last).toBe('any');
    expect(pressed('apartment')).toBe('false');
  });
});

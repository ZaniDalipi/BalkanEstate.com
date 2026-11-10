import { describe, it, expect, vi } from 'vitest';
import React, { useState } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import PropertySectionNav from './PropertySectionNav';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);
vi.mock('@/src/shared/illustrations', () => ({ SoftIcon: () => null }));

let showZone: (v: boolean) => void = () => undefined;

/** The page's sections in their order, with zone dynamics arriving later (after its data). */
const Page: React.FC = () => {
  const [zone, setZone] = useState(false);
  showZone = setZone;
  return (
    <>
      <PropertySectionNav variant="bar" />
      <div data-section="details" />
      <div data-section="neighborhood">
        <section data-section="air-quality" />
        <section data-section="noise" />
        <section data-section="traffic" />
      </div>
      <div data-section="area-prices">{zone && <section data-section="zone-dynamics" />}</div>
    </>
  );
};

const labels = () => screen.getAllByRole('button').map((b) => b.textContent);

describe('PropertySectionNav', () => {
  it('lists air quality, noise and traffic right after the neighbourhood', () => {
    render(<Page />);
    expect(labels()).toEqual(['Overview', 'Details', 'Neighborhood', 'Air Quality', 'Noise', 'Traffic', 'Area Prices']);
  });

  it('adds zone dynamics after area prices once that section appears', async () => {
    render(<Page />);
    expect(screen.queryByRole('button', { name: 'Zone Dynamics' })).not.toBeInTheDocument();
    act(() => showZone(true));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Zone Dynamics' })).toBeInTheDocument());
    expect(labels().slice(-2)).toEqual(['Area Prices', 'Zone Dynamics']);
  });
});

import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Development } from '../../../types';
import { ResidenceIntro } from './ResidenceIntro';
import { ResidenceNav } from './ResidenceNav';

vi.mock('react-i18next', async () => (await import('../explorer/__tests__/i18nMock')).default);

const development = { id: 'd', name: 'Aria Residences', slug: 'aria', city: 'Skopje', country: 'North Macedonia', builder: { name: 'Aria Build' } } as Development;

describe('ResidenceIntro', () => {
  it('names the residence in the headline, with where it is, what is free and from what price', () => {
    render(<ResidenceIntro development={development} summary={{ total: 21, available: 15, priceMin: 147000, priceMax: 260000, currency: 'EUR' }} />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Find your home in Aria Residences');
    expect(h1.querySelector('span')).toHaveTextContent('Aria Residences');
    expect(screen.getByText('Skopje · North Macedonia')).toBeInTheDocument();
    expect(screen.getByText(/15 of 21 available/)).toHaveTextContent(/From .*147/);
    expect(screen.getByText('Hover the building and choose an apartment')).toBeInTheDocument();
  });

  it('names the company behind it, which opens its page', () => {
    const onViewBuilder = vi.fn();
    render(<ResidenceIntro development={development} onViewBuilder={onViewBuilder} />);
    fireEvent.click(screen.getByRole('button', { name: /Built by\s*Aria Build/ }));
    expect(onViewBuilder).toHaveBeenCalled();
  });

  it('leaves out the numbers until the homes are known', () => {
    render(<ResidenceIntro development={development} />);
    expect(screen.queryByText(/available/)).not.toBeInTheDocument();
  });
});

describe('ResidenceNav', () => {
  it('goes back to all residences, jumps to its sections, and “View apartments” jumps to the homes', () => {
    const onBack = vi.fn();
    const onSection = vi.fn();
    render(
      <ResidenceNav
        development={development}
        sections={[{ id: 'overview', label: 'Overview' }, { id: 'location', label: 'Location' }]}
        onSection={onSection}
        onBack={onBack}
        tone="picture"
      />
    );
    const bar = screen.getByRole('navigation', { name: 'Residence' });
    expect(bar).toHaveTextContent('Aria Residences');
    fireEvent.click(screen.getByRole('button', { name: 'All residences' }));
    expect(onBack).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Location' }));
    expect(onSection).toHaveBeenLastCalledWith('location');
    fireEvent.click(screen.getByRole('button', { name: 'View apartments' }));
    expect(onSection).toHaveBeenLastCalledWith('units');
  });
});

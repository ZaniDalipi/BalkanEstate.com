import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CircleSpinner } from './CircleSpinner';
import { LogoLoader } from './LogoLoader';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

describe('CircleSpinner', () => {
  it('is announced as a loading status', () => {
    render(<CircleSpinner />);
    expect(screen.getByRole('status', { name: 'Loading...' })).toBeInTheDocument();
  });

  it('accepts its own label', () => {
    render(<CircleSpinner label="Loading listings" />);
    expect(screen.getByRole('status', { name: 'Loading listings' })).toBeInTheDocument();
  });

  it('matches the 40px boot spinner at the default size', () => {
    render(<CircleSpinner />);
    const el = screen.getByRole('status');
    expect(el).toHaveClass('be-circle-spinner');
    expect(el.style.width).toBe('40px');
    expect(el.style.animationDelay).toMatch(/^-?\d+(\.\d+)?s$/);
  });
});

describe('LogoLoader', () => {
  it('renders the circular spinner, with the wordmark only when asked', () => {
    const { rerender } = render(<LogoLoader showText={false} />);
    expect(screen.getByRole('status')).toHaveClass('be-circle-spinner');
    expect(screen.queryByText('BALKANESTATE')).not.toBeInTheDocument();
    rerender(<LogoLoader showText />);
    expect(screen.getByText('BALKANESTATE')).toBeInTheDocument();
  });
});

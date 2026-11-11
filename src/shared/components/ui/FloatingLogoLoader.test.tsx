import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DESKTOP_POINTER_QUERY } from '@/src/hooks/useMediaQuery';
import { LogoLoader } from './LogoLoader';
import { FloatingLogoLoader, OFFICIAL_LOGO_SRC } from './FloatingLogoLoader';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

const realMatchMedia = window.matchMedia;

/** Pretend to be a desktop (mouse, wide screen) or a phone. */
function setDevice(desktop: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: desktop && query === DESKTOP_POINTER_QUERY,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = realMatchMedia;
});

describe('LogoLoader', () => {
  it('floats the official logo on desktop', () => {
    setDevice(true);
    const { container } = render(<LogoLoader size="md" showText={false} />);
    expect(screen.getByRole('status', { name: 'Loading...' })).toHaveClass('be-logo-loader');
    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe(OFFICIAL_LOGO_SRC);
    expect(images[0]).toHaveClass('be-logo-loader__buildings');
  });

  it('shows the circle on phones and tablets', () => {
    setDevice(false);
    const { container } = render(<LogoLoader size="md" showText={false} />);
    expect(screen.getByRole('status')).toHaveClass('be-circle-spinner');
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('FloatingLogoLoader', () => {
  it('adds the wordmark layer, which stays still while the buildings float', () => {
    const { container } = render(<FloatingLogoLoader size="lg" showText />);
    const word = container.querySelector('.be-logo-loader__word');
    expect(word?.getAttribute('src')).toBe(OFFICIAL_LOGO_SRC);
    expect(screen.getByRole('status')).toHaveStyle({ width: '160px', height: '160px' });
  });

  it('crops to the buildings when there is no wordmark', () => {
    render(<FloatingLogoLoader size="md" />);
    expect(screen.getByRole('status')).toHaveStyle({ width: '120px', height: `${120 * 0.62}px` });
  });
});

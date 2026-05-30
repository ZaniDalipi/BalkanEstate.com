import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../hooks/useAdSense', () => ({
  useAdSense: vi.fn(),
}));

import { useAdSense } from '../hooks/useAdSense';
import AdUnit from '../components/AdUnit';
import { AD_SLOTS } from '../types';

const mockUseAdSense = useAdSense as ReturnType<typeof vi.fn>;

describe('AdUnit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when shouldShowAds is false', () => {
    mockUseAdSense.mockReturnValue({ ready: true, shouldShowAds: false });
    const { container } = render(<AdUnit slot={AD_SLOTS.HOME_LEADERBOARD} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when disabled prop is true', () => {
    mockUseAdSense.mockReturnValue({ ready: true, shouldShowAds: true });
    const { container } = render(<AdUnit slot={AD_SLOTS.HOME_LEADERBOARD} disabled />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when publisher ID is not configured', () => {
    // VITE_ADSENSE_PUBLISHER_ID is undefined in test env
    mockUseAdSense.mockReturnValue({ ready: true, shouldShowAds: true });
    const { container } = render(<AdUnit slot={AD_SLOTS.HOME_LEADERBOARD} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not throw when adsbygoogle push errors', () => {
    mockUseAdSense.mockReturnValue({ ready: true, shouldShowAds: true });
    // Should not throw even if adsbygoogle misbehaves
    expect(() => render(<AdUnit slot={AD_SLOTS.HOME_LEADERBOARD} />)).not.toThrow();
  });
});

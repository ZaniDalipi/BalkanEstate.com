/**
 * Network (AdSense) fill tests.
 *
 * Covers the three rules that keep unsold-inventory fill from misbehaving:
 * it needs marketing consent before anything is requested from Google, it may
 * not stretch past the slot it was given, and a slot AdSense cannot fill hands
 * the space back rather than sitting there empty.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';

const consent = { essential: true, analytics: false, marketing: false, functional: false };

vi.mock('@/shared/utils/cookieConsent', () => ({
  useCookieConsent: () => consent,
}));

vi.stubEnv('VITE_ADSENSE_CLIENT', 'ca-pub-0000000000000000');
vi.stubEnv('VITE_ADSENSE_SLOT_LEADERBOARD', '1111111111');

const loadNetworkAd = async () => (await import('@/features/ads/components/NetworkAd')).default;

describe('NetworkAd consent gate', () => {
  beforeEach(() => {
    consent.marketing = false;
    document.querySelectorAll('script[data-adsense]').forEach(s => s.remove());
  });

  it('requests nothing from AdSense until marketing consent is given', async () => {
    const NetworkAd = await loadNetworkAd();

    const { container } = render(<NetworkAd format="leaderboard" />);

    expect(container).toBeEmptyDOMElement();
    expect(document.querySelector('script[data-adsense]')).toBeNull();
  });

  it('renders the unit once marketing consent is given', async () => {
    consent.marketing = true;
    const NetworkAd = await loadNetworkAd();

    render(<NetworkAd format="leaderboard" />);

    expect(document.querySelector('ins.adsbygoogle')).toBeTruthy();
  });
});

describe('NetworkAd sizing', () => {
  beforeEach(() => {
    consent.marketing = true;
  });

  it('does not let the unit stretch past the slot it was given', async () => {
    const NetworkAd = await loadNetworkAd();

    render(<NetworkAd format="leaderboard" />);

    const ins = document.querySelector('ins.adsbygoogle') as HTMLElement;
    // This is the flag that lets AdSense ignore the reserved box and size the
    // unit to the screen instead.
    expect(ins.getAttribute('data-full-width-responsive')).toBe('false');
  });

  it('picks the sidebar slot id for tall formats', async () => {
    vi.stubEnv('VITE_ADSENSE_SLOT_SIDEBAR', '2222222222');
    vi.resetModules();
    const NetworkAd = await loadNetworkAd();

    render(<NetworkAd format="halfpage" />);

    const ins = document.querySelector('ins.adsbygoogle') as HTMLElement;
    expect(ins.getAttribute('data-ad-slot')).toBe('2222222222');
  });
});

describe('NetworkAd unfilled handling', () => {
  beforeEach(() => {
    consent.marketing = true;
  });

  it('reports back when AdSense has no ad for the slot', async () => {
    const NetworkAd = await loadNetworkAd();
    const onUnfilled = vi.fn();

    render(<NetworkAd format="leaderboard" onUnfilled={onUnfilled} />);
    const ins = document.querySelector('ins.adsbygoogle') as HTMLElement;

    await act(async () => {
      ins.setAttribute('data-ad-status', 'unfilled');
      await Promise.resolve();
    });

    expect(onUnfilled).toHaveBeenCalled();
  });

  it('stays quiet while the slot is filled', async () => {
    const NetworkAd = await loadNetworkAd();
    const onUnfilled = vi.fn();

    render(<NetworkAd format="leaderboard" onUnfilled={onUnfilled} />);
    const ins = document.querySelector('ins.adsbygoogle') as HTMLElement;

    await act(async () => {
      ins.setAttribute('data-ad-status', 'filled');
      await Promise.resolve();
    });

    expect(onUnfilled).not.toHaveBeenCalled();
  });
});

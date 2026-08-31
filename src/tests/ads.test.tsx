/**
 * Ad slot tests.
 *
 * These cover the three ways the banners went wrong on the live site: two bars
 * drawn over each other at the bottom of the screen, units sized to whatever
 * their container happened to be rather than to a real ad size, and slots left
 * holding space open when there was no ad to put in them.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

// The consent gate and the tag loader are the two things a test must not go
// through for real: one reads localStorage, the other injects a live script.
vi.mock('@/shared/utils/cookieConsent', () => ({
  useCookieConsent: () => ({ essential: true, analytics: true, marketing: true, functional: true }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? 'Advertisement' }),
}));

const requestAd = vi.fn(() => true);
vi.mock('@/features/ads/useAdSense', () => ({
  useAdSense: () => ({ canServeAds: true, isReady: true }),
  requestAd: (el: HTMLElement) => requestAd(el),
}));

vi.stubEnv('VITE_ADSENSE_CLIENT', 'ca-pub-0000000000000000');
vi.stubEnv('VITE_ADSENSE_SLOT_HOME_BILLBOARD', '1111111111');
vi.stubEnv('VITE_ADSENSE_SLOT_ANCHOR', '2222222222');

/** Force the measured width of every slot wrapper for one test. */
const withContainerWidth = (width: number) => {
  const spy = vi
    .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
    .mockReturnValue(width);
  return () => spy.mockRestore();
};

describe('AdSlot sizing', () => {
  let restoreWidth: (() => void) | null = null;

  beforeEach(() => {
    requestAd.mockClear();
  });

  afterEach(() => {
    restoreWidth?.();
    restoreWidth = null;
  });

  it('picks the largest standard unit that fits, not the container width', async () => {
    restoreWidth = withContainerWidth(800);
    const { default: AdSlot } = await import('@/features/ads/components/AdSlot');

    render(<AdSlot placement="homeBillboard" />);

    const ins = document.querySelector('ins.adsbygoogle') as HTMLElement;
    expect(ins).toBeTruthy();
    // 800px fits a 728x90 leaderboard but not a 970px billboard.
    expect(ins.style.width).toBe('728px');
    expect(ins.style.height).toBe('90px');
  });

  it('steps down to a mobile banner on a phone-width container', async () => {
    restoreWidth = withContainerWidth(360);
    const { default: AdSlot } = await import('@/features/ads/components/AdSlot');

    render(<AdSlot placement="homeBillboard" />);

    const ins = document.querySelector('ins.adsbygoogle') as HTMLElement;
    expect(ins.style.width).toBe('320px');
    expect(ins.style.height).toBe('100px');
  });

  it('never lets a unit run wider than its container', async () => {
    restoreWidth = withContainerWidth(500);
    const { default: AdSlot } = await import('@/features/ads/components/AdSlot');

    render(<AdSlot placement="homeBillboard" />);

    const ins = document.querySelector('ins.adsbygoogle') as HTMLElement;
    expect(parseInt(ins.style.width, 10)).toBeLessThanOrEqual(500);
    // The flag that would let AdSense stretch it anyway must stay off.
    expect(ins.getAttribute('data-full-width-responsive')).toBe('false');
  });

  it('draws nothing when the space is too narrow for the smallest unit', async () => {
    restoreWidth = withContainerWidth(120);
    const { default: AdSlot } = await import('@/features/ads/components/AdSlot');

    render(<AdSlot placement="homeBillboard" />);

    expect(document.querySelector('ins.adsbygoogle')).toBeNull();
  });

  it('renders nothing at all for a placement with no slot id configured', async () => {
    restoreWidth = withContainerWidth(1000);
    const { default: AdSlot } = await import('@/features/ads/components/AdSlot');

    const { container } = render(<AdSlot placement="blogArticle" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('reserves the height of the unit it is about to draw', async () => {
    restoreWidth = withContainerWidth(1000);
    const { default: AdSlot } = await import('@/features/ads/components/AdSlot');

    const { container } = render(<AdSlot placement="homeBillboard" />);

    // 970x250 billboard + the caption line above it.
    const wrapper = container.firstElementChild as HTMLElement;
    expect(parseInt(wrapper.style.minHeight, 10)).toBeGreaterThanOrEqual(250);
  });

  it('collapses when AdSense reports the slot unfilled', async () => {
    restoreWidth = withContainerWidth(1000);
    const { default: AdSlot } = await import('@/features/ads/components/AdSlot');

    const { container } = render(<AdSlot placement="homeBillboard" />);
    const ins = document.querySelector('ins.adsbygoogle') as HTMLElement;

    await act(async () => {
      ins.setAttribute('data-ad-status', 'unfilled');
      // jsdom delivers mutation records on a microtask.
      await Promise.resolve();
    });

    expect(container).toBeEmptyDOMElement();
  });
});

describe('AnchorAd', () => {
  let restoreWidth: (() => void) | null = null;

  afterEach(() => {
    restoreWidth?.();
    restoreWidth = null;
    document.documentElement.style.removeProperty('--anchor-ad-height');
  });

  it('renders only one bar even when two are mounted', async () => {
    restoreWidth = withContainerWidth(800);
    const { default: AnchorAd } = await import('@/features/ads/components/AnchorAd');

    render(
      <>
        <AnchorAd />
        <AnchorAd />
      </>,
    );

    expect(screen.getAllByRole('complementary')).toHaveLength(1);
  });

  it('sits above whatever already owns the bottom edge', async () => {
    restoreWidth = withContainerWidth(800);
    const { default: AnchorAd } = await import('@/features/ads/components/AnchorAd');

    render(<AnchorAd bottomOffset="3.5rem" />);

    const bar = screen.getByRole('complementary');
    expect(bar.style.bottom).toContain('3.5rem');
  });

  it('does not render on a view that has opted out', async () => {
    restoreWidth = withContainerWidth(800);
    const { default: AnchorAd } = await import('@/features/ads/components/AnchorAd');

    render(<AnchorAd enabled={false} />);

    expect(screen.queryByRole('complementary')).toBeNull();
  });
});

describe('ad-free views', () => {
  it('keeps ads off private and transactional pages', async () => {
    const { isAdFreeView } = await import('@/features/ads/adsConfig');

    expect(isAdFreeView('admin')).toBe(true);
    expect(isAdFreeView('inbox')).toBe(true);
    expect(isAdFreeView('createAgencyPayment')).toBe(true);
    expect(isAdFreeView('home')).toBe(false);
    expect(isAdFreeView('blog')).toBe(false);
  });
});

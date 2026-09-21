/**
 * The gallery plays tours from four social platforms, and two of them needed
 * help to work outside a desktop browser.
 *
 * Instagram's embed iframe never autoplays — its page waits for a tap — so a
 * reel opened as a still frame. Where the reel resolves to a playable file the
 * gallery now plays it itself, and falls back to the embed when it does not.
 *
 * Facebook's plugin lays itself out from the `width` in its URL rather than the
 * iframe it lands in, so with no size it overflowed a phone and floated in white
 * space on a desktop; and `autoplay` without `mute` is refused by every browser.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent } from '@testing-library/react';
import { render } from './test-utils';
import { PropertyGallery } from '@/src/components/property/PropertyGallery';
import type { Property } from '@/types';

const mockReel = vi.fn(() => ({ videoUrl: null as string | null }));

vi.mock('@/src/features/videos/hooks/useInstagramReel', () => ({
  useInstagramReelVideo: (...args: unknown[]) => mockReel(...(args as [])),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, second?: string | { defaultValue?: string }) => {
      if (typeof second === 'string') return second;
      if (second && typeof second === 'object' && second.defaultValue) return second.defaultValue;
      return key;
    },
  }),
}));

vi.mock('@/src/features/promo/components/Slot', () => ({ default: () => null }));

const baseProperty = {
  id: 'p1',
  imageUrl: 'https://res.cloudinary.com/dh8tbq8wy/image/upload/v1700000000/listing/p0.jpg',
  images: [{ url: 'https://res.cloudinary.com/dh8tbq8wy/image/upload/v1700000000/listing/p1.jpg', tag: 'other' }],
  propertyType: 'apartment',
  listingType: 'sale',
  city: 'Vlore',
  country: 'Albania',
  price: 215000,
  lat: 40.4,
  lng: 19.5,
} as unknown as Property;

const renderGallery = (tourUrl: string) =>
  render(
    <PropertyGallery
      property={{ ...baseProperty, tourUrl } as Property}
      onOpenEditor={() => {}}
      onOpenViewer={() => {}}
      activeCategory="all"
      currentImageIndex={0}
      onCategoryChange={() => {}}
      onImageIndexChange={() => {}}
    />
  );

/** jsdom lays nothing out, so the frame is given a size to be measured from. */
const giveFrameASize = (width: number, height: number) => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
};

const tourIframe = () => document.querySelector<HTMLIFrameElement>('iframe[title="Property Video Tour"]');
const tourVideo = () => document.querySelector<HTMLVideoElement>('video');

beforeEach(() => {
  cleanup();
  mockReel.mockReturnValue({ videoUrl: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('an Instagram reel tour', () => {
  const reelUrl = 'https://www.instagram.com/reel/Dc_lH3uM8lj/';
  const cdnFile = 'https://scontent-vie1-1.cdninstagram.com/v/t50/reel.mp4';

  it('plays the resolved file itself, muted so it is allowed to autoplay', () => {
    mockReel.mockReturnValue({ videoUrl: cdnFile });
    renderGallery(reelUrl);

    const video = tourVideo();
    expect(video).not.toBeNull();
    expect(video!.getAttribute('src')).toBe(cdnFile);
    expect(video!.autoplay).toBe(true);
    expect(video!.muted).toBe(true);
    expect(video!.loop).toBe(true);
    // Without playsInline iOS takes the video fullscreen instead of playing in place.
    expect(video!.getAttribute('playsinline')).not.toBeNull();
    // The embed is what we were trying to get away from.
    expect(tourIframe()).toBeNull();
  });

  it('keeps Instagram’s embed when the reel does not resolve', () => {
    renderGallery(reelUrl);
    expect(tourVideo()).toBeNull();
    expect(tourIframe()?.src).toContain('instagram.com/reel/Dc_lH3uM8lj/embed/');
  });

  it('falls back to the embed when the CDN refuses to play the file', () => {
    mockReel.mockReturnValue({ videoUrl: cdnFile });
    renderGallery(reelUrl);

    // A signed CDN URL can expire between resolving it and playing it.
    fireEvent.error(tourVideo()!);

    expect(tourVideo()).toBeNull();
    expect(tourIframe()?.src).toContain('instagram.com/reel/Dc_lH3uM8lj/embed/');
  });
});

describe('a Facebook video tour', () => {
  const watchUrl = 'https://www.facebook.com/watch/?v=1234567890';

  it.each([
    ['a phone', 360, 640],
    ['a tablet', 760, 428],
    ['a desktop', 1200, 675],
  ])('hands the plugin the frame it was given on %s', (_device, width, height) => {
    giveFrameASize(width, height);
    renderGallery(watchUrl);

    const src = tourIframe()!.src;
    const params = new URL(src).searchParams;
    // Rounded up to the hook's step, never below the frame.
    expect(Number(params.get('width'))).toBeGreaterThanOrEqual(width);
    expect(Number(params.get('height'))).toBeGreaterThanOrEqual(height);
    expect(Number(params.get('width'))).toBeLessThan(width + 40);
  });

  it('mutes the video so the browser lets it autoplay', () => {
    giveFrameASize(390, 220);
    renderGallery(watchUrl);

    const params = new URL(tourIframe()!.src).searchParams;
    expect(params.get('autoplay')).toBe('true');
    expect(params.get('mute')).toBe('1');
    expect(params.get('href')).toBe(watchUrl);
  });

  it('waits for the frame to be measured rather than loading at the wrong size', () => {
    // jsdom reports a zero box by default, standing in for the first paint.
    renderGallery(watchUrl);
    expect(tourIframe()).toBeNull();
  });

  it.each([
    ['https://www.facebook.com/share/v/1AbC2dEf3G/', 'a share link'],
    ['https://fb.watch/xY9zAbC-1d/', 'a short link'],
    ['https://www.facebook.com/video.php?v=987654321', 'a legacy link'],
    ['https://www.facebook.com/somepage/videos/55512345/', 'a page video'],
  ])('recognises %s (%s)', (url) => {
    giveFrameASize(390, 220);
    renderGallery(url);
    expect(tourIframe()?.src).toContain('facebook.com/plugins/video.php');
  });

  it('gives a Facebook reel the portrait frame and everything else 16:9', () => {
    giveFrameASize(390, 693);
    renderGallery('https://www.facebook.com/reel/1234567890');
    const frame = document.querySelector<HTMLElement>('[class*="aspect-["]');
    expect(frame?.className).toContain('aspect-[9/16]');

    cleanup();
    renderGallery(watchUrl);
    expect(document.querySelector<HTMLElement>('[class*="aspect-["]')?.className).toContain('aspect-[16/9]');
  });
});

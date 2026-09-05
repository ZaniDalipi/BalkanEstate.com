/**
 * The gallery's whole "instant photo" claim rests on one invariant: a warmed
 * photo must be a cache hit when it is displayed. That only holds if the
 * preloader issues *byte-identical requests* to the rendered <img> — same
 * candidate list, same sizes, same CORS mode.
 *
 * These tests pin that invariant, because it broke silently before: the
 * preloader asked for w_1200 no-cors while the <img> asked for w_1920 with
 * crossOrigin, so every "preloaded" photo was downloaded twice and users
 * watched a blurred placeholder for seconds.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getGallerySources,
  warmImage,
  warmGallery,
  GALLERY_WIDTHS,
  GALLERY_SIZES,
  VIEWER_SIZES,
} from '@/config/galleryImages';

// Must match VITE_CDN_HOST in vitest.config.ts: only photos on our own pull
// zone get a srcSet, a placeholder, or CORS — everything else is proxied.
const HOSTED = 'https://test-zone.b-cdn.net/balkan-estate/listing/photo.webp';

/** Captures what each `new Image()` preloader was actually asked to fetch. */
interface Requested {
  src: string;
  srcset: string;
  sizes: string;
  crossOrigin: string | null;
  fetchPriority?: string;
}

/**
 * Requests are recorded when they *start* and completed only on demand, so a
 * test can distinguish "how many are in flight at once" from "how many ran in
 * total". Auto-completing would drain the queue instantly and hide the cap.
 */
let requests: Requested[] = [];
let pending: Array<() => void> = [];
let OriginalImage: typeof Image;

beforeEach(() => {
  requests = [];
  pending = [];
  OriginalImage = globalThis.Image;

  class FakeImage {
    src = '';
    srcset = '';
    sizes = '';
    crossOrigin: string | null = null;
    fetchPriority?: string;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    constructor() {
      // Record on the next tick, once every attribute has been assigned —
      // mirroring the browser's single "update the image data" pass.
      queueMicrotask(() => {
        if (!this.src) return;
        requests.push({
          src: this.src,
          srcset: this.srcset,
          sizes: this.sizes,
          crossOrigin: this.crossOrigin,
          fetchPriority: this.fetchPriority,
        });
        pending.push(() => this.onload?.());
      });
    }
  }

  globalThis.Image = FakeImage as unknown as typeof Image;
});

afterEach(async () => {
  // Release any queue slots the test left held, so the module's concurrency
  // counter does not leak into the next test.
  await drain();
  globalThis.Image = OriginalImage;
  vi.restoreAllMocks();
});

/** Lets queued microtasks run without completing any request. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Completes every started request, releasing queue slots, until nothing new starts. */
const drain = async () => {
  for (let pass = 0; pass < 20; pass += 1) {
    await flush();
    if (pending.length === 0) return;
    const batch = pending;
    pending = [];
    batch.forEach((done) => done());
  }
};

/**
 * The warm cache is module-global and deliberately survives navigation, so each
 * test needs its own URLs rather than a reset hook.
 */
let uid = 0;
const uniqueUrls = (count: number): string[] => {
  uid += 1;
  return Array.from({ length: count }, (_, i) => HOSTED.replace('photo', `t${uid}-${i}`));
};

describe('getGallerySources', () => {
  it('offers every candidate width so the browser can match the device DPR', () => {
    const { srcSet } = getGallerySources(HOSTED);
    GALLERY_WIDTHS.forEach((w) => expect(srcSet).toContain(`width=${w}`));
  });

  it('requests CORS for our own CDN, matching the rendered <img>', () => {
    expect(getGallerySources(HOSTED).crossOrigin).toBe('anonymous');
  });

  it('routes external URLs through the proxy with no srcSet', () => {
    const sources = getGallerySources('https://example.com/house.jpg');
    expect(sources.src).toBe(`/api/image-proxy?url=${encodeURIComponent('https://example.com/house.jpg')}`);
    expect(sources.srcSet).toBe('');
    expect(sources.crossOrigin).toBeUndefined();
  });

  it('produces a blurred placeholder for the first paint', () => {
    expect(getGallerySources(HOSTED).placeholder).toContain('blur=');
  });

  it('tolerates a missing URL', () => {
    expect(getGallerySources(undefined).src).toBe('');
  });
});

/** Recovers the photo's index from the URL its request was built from. */
const indexOf = (req: Requested): number => Number(/-(\d+)\./.exec(req.srcset)?.[1]);

describe('warmImage', () => {
  it('replays every attribute the browser uses to pick a candidate', async () => {
    const [url] = uniqueUrls(1);
    warmImage(getGallerySources(url), 'high');
    await flush();

    expect(requests).toHaveLength(1);
    const [req] = requests;
    // Without all three of these the warm lands in a different cache entry
    // than the <img>, and the photo is silently downloaded twice.
    expect(req.srcset).toBe(getGallerySources(url).srcSet);
    expect(req.sizes).toBe(GALLERY_SIZES);
    expect(req.crossOrigin).toBe('anonymous');
    expect(req.fetchPriority).toBe('high');
  });

  it('warms a URL only once across repeated visits', async () => {
    const [url] = uniqueUrls(1);
    warmImage(getGallerySources(url), 'high');
    warmImage(getGallerySources(url), 'high');
    await drain();
    expect(requests).toHaveLength(1);
  });

  it('treats a different sizes attribute as a distinct request', async () => {
    const [url] = uniqueUrls(1);
    warmImage(getGallerySources(url), 'high');
    warmImage(getGallerySources(url, { sizes: VIEWER_SIZES }), 'high');
    await drain();
    expect(requests.map((r) => r.sizes)).toEqual([GALLERY_SIZES, VIEWER_SIZES]);
  });
});

describe('warmGallery', () => {
  it('warms the whole listing, not just the neighbours', async () => {
    const urls = uniqueUrls(8);
    warmGallery(urls, { activeIndex: 0 });
    await drain();
    expect(requests).toHaveLength(urls.length);
  });

  it('gives the visible photo and its neighbours the high-priority lane', async () => {
    const urls = uniqueUrls(8);
    warmGallery(urls, { activeIndex: 3 });
    await flush();

    const highPriority = requests.filter((r) => r.fetchPriority === 'high');
    // The active photo plus two either way — the slides that stay mounted.
    expect(highPriority.map(indexOf).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('measures distance the way the carousel wraps, so the last photo is adjacent to the first', async () => {
    const urls = uniqueUrls(8);
    warmGallery(urls, { activeIndex: 0 });
    await flush();

    const highPriority = requests.filter((r) => r.fetchPriority === 'high').map(indexOf);
    // Stepping back from photo 0 lands on 7 then 6, so those warm eagerly too.
    expect(highPriority.sort()).toEqual([0, 1, 2, 6, 7]);
  });

  it('caps how many background warms run at once so they cannot starve the visible photo', async () => {
    const urls = uniqueUrls(20);
    warmGallery(urls, { activeIndex: 0 });
    // No drain: nothing completes, so this counts what is genuinely in flight.
    await flush();

    expect(requests.filter((r) => r.fetchPriority === 'low')).toHaveLength(3);

    // Once the in-flight ones finish, the rest follow — the cap throttles, it
    // does not drop work.
    await drain();
    expect(requests).toHaveLength(urls.length);
  });

  it('ignores an empty gallery', async () => {
    warmGallery([undefined, ''], {});
    await drain();
    expect(requests).toHaveLength(0);
  });
});

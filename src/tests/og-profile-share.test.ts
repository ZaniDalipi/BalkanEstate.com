/**
 * Agent / agency link-preview tests
 *
 * Covers the OG HTML the Cloudflare Pages Functions serve to social media
 * crawlers for /agents/:slug and /agencies/:country/:name — in particular that
 * the shared card carries the profile picture rather than the generic site image.
 */

import { describe, it, expect } from 'vitest';
import {
  buildAgentOgHtml,
  buildAgencyOgHtml,
  resolveOgImage,
  isUsableSlug,
  DEFAULT_IMAGE,
  type AgentData,
  type AgencyData,
} from '@/functions/_og-utils';

// Must match VITE_CDN_HOST in vitest.config.ts — the OG helper only claims
// card dimensions for images it can actually render to 1200x630, which means
// images on our own pull zone.
const CDN = 'https://test-zone.b-cdn.net';

const agent = (overrides: Partial<AgentData> = {}): AgentData => ({
  agentId: 'ERIKSON-REAL-ESTATE',
  agencyName: 'Erikson Real Estate',
  yearsOfExperience: 8,
  activeListings: 12,
  rating: 4.6,
  totalReviews: 23,
  userId: {
    name: 'Erik Sonn',
    avatarUrl: `${CDN}/avatars/erik.jpg`,
    city: 'Tirana',
    country: 'Albania',
  },
  ...overrides,
});

const agency = (overrides: Partial<AgencyData> = {}): AgencyData => ({
  name: 'Erikson Real Estate',
  slug: 'albania/erikson-real-estate',
  city: 'Tirana',
  country: 'Albania',
  totalAgents: 7,
  totalProperties: 41,
  logo: `${CDN}/logos/erikson.png`,
  ...overrides,
});

/** Read the content of a meta tag out of the generated HTML. */
const meta = (html: string, key: string): string | null => {
  // OG-namespaced tags use property=, Twitter tags use name=
  const attr = key.startsWith('twitter:') ? 'name' : 'property';
  const match = html.match(
    new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`),
  );
  if (!match) return null;

  // Meta content is HTML-escaped, and every CDN URL now carries a query string,
  // so `&` really does arrive as `&amp;`. Decode to compare logical values —
  // asserting on the escaped form would be testing the escaper, not the URL.
  return match[1].replace(/&amp;/g, '&');
};

/**
 * The share-card query string, in the order `optimizeImageUrl` writes it.
 *
 * `aspect_ratio` rather than a pad: Bunny Optimizer has no pad-with-background
 * mode, and a card that comes back smaller than the dimensions we advertise is
 * what makes Facebook and LinkedIn mislay it.
 */
const OG_CARD = 'aspect_ratio=1200%3A630&width=1200&quality=75&format=jpeg';

describe('isUsableSlug', () => {
  it('accepts real agent ids and two-segment agency slugs', () => {
    expect(isUsableSlug('ERIKSON-REAL-ESTATE')).toBe(true);
    expect(isUsableSlug('albania/erikson-real-estate')).toBe(true);
  });

  it('rejects traversal segments, empty segments and control characters', () => {
    expect(isUsableSlug('../../etc/passwd')).toBe(false);
    expect(isUsableSlug('albania//x')).toBe(false);
    expect(isUsableSlug('erik\nson')).toBe(false);
  });

  it('rejects absurdly long input before it reaches the API', () => {
    expect(isUsableSlug('a'.repeat(129))).toBe(false);
  });
});

describe('resolveOgImage', () => {
  it('skips DiceBear data URIs, which crawlers cannot fetch', () => {
    const image = resolveOgImage('data:image/svg+xml;base64,abc', `${CDN}/logo.png`);
    expect(image.url).toContain('logo.png');
  });

  it('makes a site-relative path absolute', () => {
    expect(resolveOgImage('/uploads/erik.jpg').url).toBe(
      'https://balkanestateai.com/uploads/erik.jpg',
    );
  });

  it('falls back to the default site image when nothing is usable', () => {
    expect(resolveOgImage(undefined, '')).toEqual({ url: DEFAULT_IMAGE, sized: true });
  });
});

describe('buildAgentOgHtml', () => {
  it('uses the agent avatar as the share image', () => {
    const html = buildAgentOgHtml(agent(), 'ERIKSON-REAL-ESTATE');

    expect(meta(html, 'og:image')).toBe(
      `${CDN}/avatars/erik.jpg?${OG_CARD}`,
    );
    expect(meta(html, 'og:image:width')).toBe('1200');
    expect(meta(html, 'og:image:height')).toBe('630');
    expect(meta(html, 'twitter:card')).toBe('summary_large_image');
  });

  it('falls back to the agency logo when the agent has no photo', () => {
    const html = buildAgentOgHtml(
      agent({
        userId: { name: 'Erik Sonn' },
        agencyId: { name: 'Erikson', logo: `${CDN}/logos/erikson.png` },
      }),
      'ERIKSON-REAL-ESTATE',
    );

    expect(meta(html, 'og:image')).toContain('logos/erikson.png');
  });

  // The shared helper clamps Google avatars to 512px — well above Facebook's
  // 200px minimum, and the only size Google reliably serves.
  it('sizes a Google OAuth avatar but does not claim card dimensions for it', () => {
    const html = buildAgentOgHtml(
      agent({ userId: { name: 'Erik Sonn', avatarUrl: 'https://lh3.googleusercontent.com/a/x' } }),
      'ERIKSON-REAL-ESTATE',
    );

    expect(meta(html, 'og:image')).toBe('https://lh3.googleusercontent.com/a/x=s512');
    expect(meta(html, 'og:image:width')).toBeNull();
    expect(meta(html, 'twitter:card')).toBe('summary');
  });

  it('replaces a crop already on the avatar URL instead of stacking on it', () => {
    const html = buildAgentOgHtml(
      agent({
        userId: {
          name: 'Erik Sonn',
          avatarUrl: `${CDN}/avatars/erik.jpg?aspect_ratio=1%3A1&width=96`,
        },
      }),
      'ERIKSON-REAL-ESTATE',
    );

    // The 96px square crop must not survive into the 1200x630 card.
    expect(meta(html, 'og:image')).toBe(`${CDN}/avatars/erik.jpg?${OG_CARD}`);
  });

  it('builds a profile card with name, location and facts', () => {
    const html = buildAgentOgHtml(agent(), 'ERIKSON-REAL-ESTATE');

    expect(meta(html, 'og:type')).toBe('profile');
    expect(meta(html, 'og:title')).toBe(
      'Erik Sonn – Real Estate Agent in Tirana, Albania | BalkanEstateAI',
    );
    expect(meta(html, 'og:description')).toContain('8 years of experience');
    expect(meta(html, 'og:description')).toContain('12 active listings');
    expect(meta(html, 'og:description')).toContain('4.6★ (23 reviews)');
    expect(meta(html, 'profile:username')).toBe('ERIKSON-REAL-ESTATE');
  });

  it('points the canonical URL at the language-prefixed profile page', () => {
    const html = buildAgentOgHtml(agent(), 'ERIKSON-REAL-ESTATE', 'sq');

    expect(meta(html, 'og:url')).toBe(
      'https://balkanestateai.com/sq/agents/ERIKSON-REAL-ESTATE',
    );
  });

  it('escapes names that contain HTML characters', () => {
    const html = buildAgentOgHtml(agent({ userId: { name: 'Erik "Ted" <Sonn>' } }), 'x');

    expect(html).not.toContain('<Sonn>');
    expect(meta(html, 'og:title')).toContain('Erik &quot;Ted&quot; &lt;Sonn&gt;');
  });
});

describe('buildAgencyOgHtml', () => {
  it('prefers the logo over the cover photo — it is the agency\'s profile picture', () => {
    const html = buildAgencyOgHtml(
      agency({ coverImage: `${CDN}/covers/tirana.jpg` }),
      'albania/erikson-real-estate',
    );

    expect(meta(html, 'og:image')).toContain('logos/erikson.png');
  });

  it('uses the cover photo when there is no logo', () => {
    const html = buildAgencyOgHtml(
      agency({ logo: undefined, coverImage: `${CDN}/covers/tirana.jpg` }),
      'albania/erikson-real-estate',
    );

    expect(meta(html, 'og:image')).toContain('covers/tirana.jpg');
  });

  it('builds the card title, facts and canonical URL', () => {
    const html = buildAgencyOgHtml(agency(), 'albania/erikson-real-estate');

    expect(meta(html, 'og:title')).toBe(
      'Erikson Real Estate – Real Estate Agency in Tirana, Albania | BalkanEstateAI',
    );
    expect(meta(html, 'og:description')).toContain('7 agents');
    expect(meta(html, 'og:description')).toContain('41 listings');
    expect(meta(html, 'og:url')).toBe(
      'https://balkanestateai.com/en/agencies/albania/erikson-real-estate',
    );
  });

  it('keeps the two-segment slug as a path, not an encoded slash', () => {
    const html = buildAgencyOgHtml(agency(), 'albania/erikson-real-estate', 'sq');

    expect(meta(html, 'og:url')).not.toContain('%2F');
    expect(meta(html, 'og:url')).toContain('/sq/agencies/albania/erikson-real-estate');
  });

  it('falls back to the default site image when the agency has no branding', () => {
    const html = buildAgencyOgHtml(agency({ logo: undefined }), 'albania/erikson-real-estate');

    expect(meta(html, 'og:image')).toBe(DEFAULT_IMAGE);
  });
});

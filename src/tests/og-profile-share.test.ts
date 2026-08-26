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
  withOgCardTransform,
  resolveOgImage,
  OG_CARD_TRANSFORM,
  DEFAULT_IMAGE,
  type AgentData,
  type AgencyData,
} from '@/functions/_og-utils';

const CLOUDINARY = 'https://res.cloudinary.com/balkanestate/image/upload';

const agent = (overrides: Partial<AgentData> = {}): AgentData => ({
  agentId: 'ERIKSON-REAL-ESTATE',
  agencyName: 'Erikson Real Estate',
  yearsOfExperience: 8,
  activeListings: 12,
  rating: 4.6,
  totalReviews: 23,
  userId: {
    name: 'Erik Sonn',
    avatarUrl: `${CLOUDINARY}/v1699999999/avatars/erik.jpg`,
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
  logo: `${CLOUDINARY}/v1699999999/logos/erikson.png`,
  ...overrides,
});

/** Read the content of a meta tag out of the generated HTML. */
const meta = (html: string, key: string): string | null => {
  // OG-namespaced tags use property=, Twitter tags use name=
  const attr = key.startsWith('twitter:') ? 'name' : 'property';
  const match = html.match(
    new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`),
  );
  return match ? match[1] : null;
};

describe('withOgCardTransform', () => {
  it('inserts the share-card transformation into a plain Cloudinary URL', () => {
    expect(withOgCardTransform(`${CLOUDINARY}/v123/avatars/erik.jpg`)).toBe(
      `${CLOUDINARY}/${OG_CARD_TRANSFORM}/v123/avatars/erik.jpg`,
    );
  });

  it('applies last, after a transformation the URL already carries', () => {
    expect(withOgCardTransform(`${CLOUDINARY}/c_fill,w_200/v123/erik.jpg`)).toBe(
      `${CLOUDINARY}/c_fill,w_200/${OG_CARD_TRANSFORM}/v123/erik.jpg`,
    );
  });

  it('leaves a URL that already has the transformation alone', () => {
    const url = `${CLOUDINARY}/${OG_CARD_TRANSFORM}/v123/erik.jpg`;
    expect(withOgCardTransform(url)).toBe(url);
  });

  it('does not mistake an underscored filename for a transformation', () => {
    expect(withOgCardTransform(`${CLOUDINARY}/my_photo.jpg`)).toBe(
      `${CLOUDINARY}/${OG_CARD_TRANSFORM}/my_photo.jpg`,
    );
  });

  it('returns null for non-Cloudinary URLs', () => {
    expect(withOgCardTransform('https://example.com/avatar.jpg')).toBeNull();
  });
});

describe('resolveOgImage', () => {
  it('skips DiceBear data URIs, which crawlers cannot fetch', () => {
    const image = resolveOgImage('data:image/svg+xml;base64,abc', `${CLOUDINARY}/v1/logo.png`);
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
      `${CLOUDINARY}/${OG_CARD_TRANSFORM}/v1699999999/avatars/erik.jpg`,
    );
    expect(meta(html, 'og:image:width')).toBe('1200');
    expect(meta(html, 'og:image:height')).toBe('630');
    expect(meta(html, 'twitter:card')).toBe('summary_large_image');
  });

  it('falls back to the agency logo when the agent has no photo', () => {
    const html = buildAgentOgHtml(
      agent({
        userId: { name: 'Erik Sonn' },
        agencyId: { name: 'Erikson', logo: `${CLOUDINARY}/v1/logos/erikson.png` },
      }),
      'ERIKSON-REAL-ESTATE',
    );

    expect(meta(html, 'og:image')).toContain('logos/erikson.png');
  });

  it('omits dimensions for an image whose size we do not control', () => {
    const html = buildAgentOgHtml(
      agent({ userId: { name: 'Erik Sonn', avatarUrl: 'https://lh3.googleusercontent.com/a/x' } }),
      'ERIKSON-REAL-ESTATE',
    );

    expect(meta(html, 'og:image')).toBe('https://lh3.googleusercontent.com/a/x');
    expect(meta(html, 'og:image:width')).toBeNull();
    expect(meta(html, 'twitter:card')).toBe('summary');
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
      agency({ coverImage: `${CLOUDINARY}/v1/covers/tirana.jpg` }),
      'albania/erikson-real-estate',
    );

    expect(meta(html, 'og:image')).toContain('logos/erikson.png');
  });

  it('uses the cover photo when there is no logo', () => {
    const html = buildAgencyOgHtml(
      agency({ logo: undefined, coverImage: `${CLOUDINARY}/v1/covers/tirana.jpg` }),
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

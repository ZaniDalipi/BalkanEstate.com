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

/** Our media CDN origin in tests (vitest.config.ts → VITE_MEDIA_CDN_URL). */
const CDN = 'https://media.test';
const AVATAR = `${CDN}/users/erik-sonn_1/avatar/a1_w640/original.jpg`;
const LOGO = `${CDN}/agencies/erikson_1/logo/l1_w640/original.jpg`;
const COVER = `${CDN}/agencies/erikson_1/cover/c1/original.jpg`;

const agent = (overrides: Partial<AgentData> = {}): AgentData => ({
  agentId: 'ERIKSON-REAL-ESTATE',
  agencyName: 'Erikson Real Estate',
  yearsOfExperience: 8,
  activeListings: 12,
  rating: 4.6,
  totalReviews: 23,
  userId: {
    name: 'Erik Sonn',
    avatarUrl: AVATAR,
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
  logo: LOGO,
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

// The registered share-card preset (f_jpg,q_auto,w_1200,h_630,c_pad,b_white).

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
    const image = resolveOgImage('data:image/svg+xml;base64,abc', LOGO);
    expect(image.url).toBe(LOGO);
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

    // The JPEG master: its size varies, so no card dimensions are claimed.
    expect(meta(html, 'og:image')).toBe(AVATAR);
    expect(meta(html, 'og:image:width')).toBeNull();
    expect(meta(html, 'twitter:card')).toBe('summary');
  });

  it('falls back to the agency logo when the agent has no photo', () => {
    const html = buildAgentOgHtml(
      agent({
        userId: { name: 'Erik Sonn' },
        agencyId: { name: 'Erikson', logo: LOGO },
      }),
      'ERIKSON-REAL-ESTATE',
    );

    expect(meta(html, 'og:image')).toBe(LOGO);
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

  it('shares the full-size master even when the stored URL is a small size', () => {
    const html = buildAgentOgHtml(
      agent({ userId: { name: 'Erik Sonn', avatarUrl: AVATAR.replace('original.jpg', 'w160.webp') } }),
      'ERIKSON-REAL-ESTATE',
    );

    // A 160px WebP must not become the share image — crawlers want the JPEG.
    expect(meta(html, 'og:image')).toBe(AVATAR);
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
      agency({ coverImage: COVER }),
      'albania/erikson-real-estate',
    );

    expect(meta(html, 'og:image')).toBe(LOGO);
  });

  it('uses the cover photo when there is no logo', () => {
    const html = buildAgencyOgHtml(
      agency({ logo: undefined, coverImage: COVER }),
      'albania/erikson-real-estate',
    );

    expect(meta(html, 'og:image')).toBe(COVER);
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

describe('R2 photos in share cards', () => {
  const MEDIA = 'https://media.example.com';
  const key = 'users/64a1b2c3d4e5f6a7b8c9d0e1/listings/6650aa11bb22cc33dd44ee55/photos/0abc123';

  it('advertises the JPEG master once the Pages env names the media origin', async () => {
    const og = await import('@/functions/_og-utils');
    og.configureOgMedia({ MEDIA_CDN_URL: `${MEDIA}/` });

    expect(og.resolveOgImage(`${MEDIA}/${key}/original.jpg`)).toEqual({ url: `${MEDIA}/${key}/original.jpg`, sized: false });
    expect(og.resolveOgImage(`${MEDIA}/${key}/w640.webp`).url).toBe(`${MEDIA}/${key}/original.jpg`);
    expect(og.getPropertyImage({ _id: 'p', images: [{ url: `${MEDIA}/${key}/w320.webp` }] } as any)).toBe(`${MEDIA}/${key}/original.jpg`);
    expect(og.getArticleImage({ coverImageUrl: `${MEDIA}/news/0xyz/w1280.webp` })).toBe(`${MEDIA}/news/0xyz/original.jpg`);
  });

  it('leaves other hosts and lookalike paths alone', async () => {
    const og = await import('@/functions/_og-utils');
    og.configureOgMedia({ MEDIA_CDN_URL: MEDIA });
    expect(og.mediaOgCardUrl(`https://elsewhere.example.com/${key}/original.jpg`)).toBeNull();
    expect(og.mediaOgCardUrl(`${MEDIA}/${key}/notes.txt`)).toBeNull();
    expect(og.getArticleImage({ coverImageUrl: 'https://images.example.com/a.jpg' })).toBe('https://images.example.com/a.jpg');
  });
});

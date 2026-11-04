/**
 * Business link previews: what Facebook, WhatsApp, LinkedIn… get for a
 * /business-directory/:slug link — the business's own share card (cover +
 * logo) as og:image instead of the generic site banner.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildBusinessOgHtml, businessCardUrl, businessCategory, handleBusinessOgRequest, type BusinessData } from '@/functions/_og-business';

const SEGMENT = 'regina-group-construction-construction-in-vlore-albania_KN2IJzIvwAD6-RhL';

const listing: BusinessData = {
  id: 'KN2IJzIvwAD6-RhL',
  name: 'Regina <Group> Construction',
  category: 'construction',
  description: 'Regina Construction është një lider në industrinë e ndërtimit.',
  services: ['Residential construction', 'Renovation'],
  city: 'Vlore',
  country: 'Albania',
  logoUrl: 'https://media.test/business/logo.jpg',
  bannerUrl: 'https://media.test/business/cover.jpg',
  updatedAt: '2026-11-04T10:00:00.000Z',
};

const meta = (html: string, key: string): string | null => {
  const attr = key.startsWith('twitter:') ? 'name' : 'property';
  return html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1] ?? null;
};

const context = (ua: string, url = `https://balkanestateai.com/en/business-directory/${SEGMENT}`) => ({
  request: new Request(url, { headers: { 'user-agent': ua } }),
  env: { ASSETS: { fetch: vi.fn(async () => new Response('<spa/>', { status: 200 })) } },
});

afterEach(() => vi.unstubAllGlobals());

describe('business link preview', () => {
  it('uses the business’s own share card, sized for the feeds', () => {
    const html = buildBusinessOgHtml(listing, SEGMENT, 'en');
    expect(meta(html, 'og:image')).toBe(`https://api.balkanestateai.com/api/og/business/KN2IJzIvwAD6-RhL/image.jpg?v=${Date.parse(listing.updatedAt!).toString(36)}.g2`);
    expect(meta(html, 'og:image:width')).toBe('1200');
    expect(meta(html, 'og:image:height')).toBe('630');
    expect(meta(html, 'og:title')).toBe('Regina &lt;Group&gt; Construction – Construction in Vlore, Albania | BalkanEstateAI');
    expect(meta(html, 'og:description')).toContain('Residential construction, Renovation');
  });

  it('changes the card URL when the listing is edited, so feeds refetch it', () => {
    const edited = businessCardUrl({ ...listing, updatedAt: '2026-11-05T09:00:00.000Z' }, SEGMENT);
    expect(edited).not.toBe(businessCardUrl(listing, SEGMENT));
  });

  it('finds the id in the slug even when the listing has none (and the id contains "-" or "_")', () => {
    expect(businessCardUrl({ name: 'x' }, 'acme_6_M28TTqCJUl1TrM')).toContain('/og/business/6_M28TTqCJUl1TrM/image.jpg');
  });

  it('names the trade as people read it', () => {
    expect(businessCategory({ category: 'real_estate_law' })).toBe('Real estate law');
    expect(businessCategory({ category: 'other', customCategory: 'Solar panels' })).toBe('Solar panels');
  });

  it('serves crawlers the preview and people the app', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ listing }), { status: 200 })));
    const bot = await handleBusinessOgRequest(context('facebookexternalhit/1.1') as never, SEGMENT, 'en');
    expect(meta(await bot.text(), 'og:image')).toContain('/og/business/KN2IJzIvwAD6-RhL/image.jpg');

    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const person = await handleBusinessOgRequest(context('Mozilla/5.0 (iPhone)') as never, SEGMENT, 'en');
    expect(await person.text()).toBe('<spa/>');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('asks the API for the listing by its id, as a preview (no view counted)', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ listing }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    await handleBusinessOgRequest(context('WhatsApp/2.23') as never, SEGMENT, 'en');
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.balkanestateai.com/api/business-listings/KN2IJzIvwAD6-RhL');
    expect((init.headers as Record<string, string>)['x-be-prerender']).toBe('1');
  });

  it('leaves the directory tabs and odd paths to the app, and answers a removed listing with 404', async () => {
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 404 }));
    vi.stubGlobal('fetch', fetchSpy);
    for (const tab of ['businesses', 'individuals', 'mine', '../admin']) {
      expect(await (await handleBusinessOgRequest(context('Twitterbot/1.0') as never, tab, 'en')).text()).toBe('<spa/>');
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    const gone = await handleBusinessOgRequest(context('LinkedInBot/1.0') as never, SEGMENT, 'en');
    expect(gone.status).toBe(404);
  });
});

/**
 * Residence link previews (Cloudflare Pages Function for /:lang/developments/:slug):
 * crawlers get the residence title, summary and the share card the API draws;
 * people get the app.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildResidenceOgHtml, handleResidenceOgRequest, residenceCardUrl, type ResidenceData } from '@/functions/_og-residence';

const data: ResidenceData = {
  development: { name: 'Plaza <Tirana>', slug: 'plaza-tirana', city: 'Tirana', country: 'Albania', description: 'A glass tower on a new square.' },
  buildings: [
    { name: 'Plaza Tower', stats: { units: 90, available: 36 } },
    { name: 'Plaza Podium', stats: { units: 8, available: 8 } },
  ],
};

const meta = (html: string, key: string): string | null => {
  const attr = key.startsWith('twitter:') ? 'name' : 'property';
  return html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1] ?? null;
};

const context = (ua: string, url = 'https://balkanestate.com/sq/developments/plaza-tirana') => ({
  request: new Request(url, { headers: { 'user-agent': ua } }),
  env: { ASSETS: { fetch: vi.fn(async () => new Response('<spa/>', { status: 200 })) } },
});

afterEach(() => vi.unstubAllGlobals());

describe('residence link preview', () => {
  it('shows the residence card, title and availability', () => {
    const html = buildResidenceOgHtml(data, 'plaza-tirana', 'sq');
    expect(meta(html, 'og:image')).toMatch(/\/api\/og\/residence\/plaza-tirana\/image\.jpg\?lang=sq&amp;v=\d+$/);
    expect(meta(html, 'og:image:width')).toBe('1200');
    expect(meta(html, 'og:image:height')).toBe('630');
    expect(meta(html, 'og:title')).toContain('Plaza &lt;Tirana&gt; – New homes in Tirana, Albania');
    expect(meta(html, 'og:description')).toContain('2 buildings · 44 of 98 homes available');
    expect(html).toContain('Plaza Tower – 36 of 90 available');
    expect(html).not.toContain('<Tirana>');
  });

  it('the card URL changes once an hour, so feeds refresh availability', () => {
    const at = Date.UTC(2026, 9, 26, 10, 5);
    expect(residenceCardUrl('x', 'en', at)).toBe(residenceCardUrl('x', 'en', at + 50 * 60_000));
    expect(residenceCardUrl('x', 'en', at)).not.toBe(residenceCardUrl('x', 'en', at + 60 * 60_000));
  });

  it('people get the app untouched, without an API call', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const ctx = context('Mozilla/5.0 (iPhone) Safari/604.1');
    const res = await handleResidenceOgRequest(ctx, 'plaza-tirana', 'sq');
    expect(await res.text()).toBe('<spa/>');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('crawlers get the preview; a residence that is gone is a 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(data), { status: 200 })));
    const ok = await handleResidenceOgRequest(context('facebookexternalhit/1.1'), 'plaza-tirana', 'sq');
    expect(ok.status).toBe(200);
    expect(meta(await ok.text(), 'og:image')).toContain('/og/residence/plaza-tirana/image.jpg');

    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));
    const gone = await handleResidenceOgRequest(context('WhatsApp/2.23'), 'plaza-tirana', 'sq');
    expect(gone.status).toBe(404);
  });

  it('an odd slug never reaches the API', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await handleResidenceOgRequest(context('Twitterbot/1.0'), '../admin', 'en');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

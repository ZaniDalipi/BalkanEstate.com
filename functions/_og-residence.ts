/**
 * Link previews for a public residence page (/developments/:slug and
 * /:lang/developments/:slug). Crawlers get the residence's title, a one-line
 * availability summary, its description, and the share card the API draws:
 * the residence picture with every building outlined and labelled
 * (GET /api/og/residence/:slug/image.jpg, always 1200×630).
 */
import {
  API_BASE,
  FALLBACK_SHELL,
  SITE_NAME,
  breadcrumb,
  configureOgMedia,
  escapeHtml,
  fetchApi,
  isCrawler,
  isUsableSlug,
  notFoundPage,
  paragraphs,
  passThrough,
  respond,
  siteLinks,
  type PagesContext,
  type RenderedPage,
} from './_og-utils';
import { ROBOTS_INDEX, buildHead, pageUrl, plainText, renderPage, truncate } from '../scripts/lib/page-shell.mjs';

export interface ResidenceData {
  development?: { name?: string; slug?: string; city?: string; country?: string; description?: string };
  buildings?: Array<{ name?: string; stats?: { units?: number; available?: number } }>;
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;

/** The share card's URL; the hour in `v` lets feeds pick up new availability. */
export function residenceCardUrl(slug: string, lang: string, now = Date.now()): string {
  return `${API_BASE}/og/residence/${encodeURIComponent(slug)}/image.jpg?lang=${encodeURIComponent(lang)}&v=${Math.floor(now / 3_600_000)}`;
}

export function buildResidencePage(data: ResidenceData, slug: string, lang = 'en'): RenderedPage {
  const dev = data.development ?? {};
  const name = dev.name?.trim() || 'New residence';
  const place = [dev.city, dev.country].filter(Boolean).join(', ');
  const path = `/developments/${encodeURIComponent(slug)}`;
  const buildings = data.buildings ?? [];
  const total = buildings.reduce((n, b) => n + (b.stats?.units ?? 0), 0);
  const available = buildings.reduce((n, b) => n + (b.stats?.available ?? 0), 0);

  const heading = place ? `${name} – New homes in ${place}` : `${name} – New homes`;
  const facts = [
    buildings.length ? `${buildings.length} building${buildings.length > 1 ? 's' : ''}` : '',
    total ? `${available} of ${total} homes available` : '',
  ].filter(Boolean).join(' · ');
  const about = plainText(dev.description);
  const description = truncate([facts, about].filter(Boolean).join(' — '), 300) || `Explore ${name} on ${SITE_NAME}.`;
  const crumbs = breadcrumb(lang, [{ name: 'Residences', path: '/developments' }, { name }]);

  const body = `<main id="prerendered-content">
      ${crumbs.html}
      <article>
        <h1>${escapeHtml(heading)}</h1>
        ${facts ? `<p>${escapeHtml(facts)}</p>` : ''}
        ${buildings.length ? `<ul>${buildings.map((b) => `<li>${escapeHtml(b.name ?? '')}${b.stats?.units ? ` – ${b.stats.available ?? 0} of ${b.stats.units} available` : ''}</li>`).join('')}</ul>` : ''}
        ${about ? `<section><h2>About ${escapeHtml(name)}</h2>${paragraphs(dev.description)}</section>` : ''}
      </article>
      ${siteLinks(lang)}
    </main>`;

  return {
    lang,
    head: buildHead({
      lang,
      path,
      title: `${heading} | ${SITE_NAME}`,
      description,
      robots: ROBOTS_INDEX,
      image: residenceCardUrl(slug, lang),
      imageSized: true,
      imageAlt: `${name}: the residence with its buildings marked`,
      ogType: 'website',
      jsonLd: [
        crumbs.jsonLd,
        {
          '@context': 'https://schema.org',
          '@type': 'ApartmentComplex',
          name,
          url: pageUrl(lang, path),
          ...(about ? { description: truncate(about, 500) } : {}),
          ...(place ? { address: { '@type': 'PostalAddress', addressLocality: dev.city, addressCountry: dev.country } } : {}),
        },
      ],
    }),
    body,
  };
}

export function buildResidenceOgHtml(data: ResidenceData, slug: string, lang = 'en'): string {
  return renderPage(FALLBACK_SHELL, buildResidencePage(data, slug, lang));
}

export async function handleResidenceOgRequest(context: PagesContext, slug: string, lang = 'en'): Promise<Response> {
  configureOgMedia(context.env);
  if (!isCrawler(context.request.headers.get('user-agent') || '')) return passThrough(context);
  if (!isUsableSlug(slug) || !SLUG.test(slug)) return passThrough(context);

  const result = await fetchApi<ResidenceData>(`${API_BASE}/developments/${encodeURIComponent(slug)}`);
  if (result.status === 'not-found') {
    return respond(context, notFoundPage(lang, 'Residence', '/developments', 'All residences'));
  }
  if (result.status === 'error' || !result.data.development?.name) return passThrough(context);
  return respond(context, buildResidencePage(result.data, slug, lang));
}

/**
 * Link previews for a business profile (/business-directory/:slug and
 * /:lang/business-directory/:slug). Crawlers (Facebook, WhatsApp, LinkedIn,
 * X, Telegram…) don't run JavaScript, so without this they show the generic
 * site banner. They get the business's name, trade and place, its description,
 * and its own share card as og:image — the card the API draws from the
 * business's cover photo and logo (GET /api/og/business/:id/image.jpg, always
 * 1200×630). People get the app, untouched.
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
import { ROBOTS_INDEX, ROBOTS_NOINDEX, buildHead, pageUrl, plainText, renderPage, truncate } from '../scripts/lib/page-shell.mjs';
import { businessIdFromSlug } from '../utils/slug';

export interface BusinessData {
  id?: string;
  name?: string;
  listingType?: string;
  category?: string;
  customCategory?: string;
  description?: string;
  services?: string[];
  address?: string;
  city?: string;
  country?: string;
  contactPhone?: string;
  website?: string;
  logoUrl?: string;
  bannerUrl?: string;
  updatedAt?: string;
}

/** Bump when the card's look changes, so feeds that cache by URL fetch the new one. */
export const CARD_DESIGN = 'g2';

/** The directory's own tabs share the URL shape; they are not businesses. */
const DIRECTORY_TABS = new Set(['businesses', 'individuals', 'mine']);

/** "real_estate_law" → "Real estate law"; the owner's words for "other". */
export const businessCategory = (b: BusinessData): string =>
  b.category === 'other' && b.customCategory?.trim()
    ? b.customCategory.trim()
    : (b.category ? b.category.charAt(0).toUpperCase() + b.category.slice(1) : 'Business').replace(/_/g, ' ');

/**
 * The share card's URL. `v` changes when the listing is edited (a new logo or
 * cover) or the card's design does, so feeds that cache by URL pick up the new card.
 */
export function businessCardUrl(b: BusinessData, segment: string): string {
  const key = b.id || businessIdFromSlug(segment);
  const version = b.updatedAt ? Date.parse(b.updatedAt).toString(36) : '0';
  return `${API_BASE}/og/business/${encodeURIComponent(key)}/image.jpg?v=${version}.${CARD_DESIGN}`;
}

export function buildBusinessPage(b: BusinessData, segment: string, lang = 'en'): RenderedPage {
  const name = b.name?.trim() || 'Business';
  const category = businessCategory(b);
  const place = [b.city, b.country].filter(Boolean).join(', ');
  const path = `/business-directory/${encodeURIComponent(segment)}`;

  const heading = place ? `${name} – ${category} in ${place}` : `${name} – ${category}`;
  const services = (b.services || []).filter(Boolean).slice(0, 5).join(', ');
  const about = plainText(b.description);
  const description = truncate([services, about].filter(Boolean).join(' — '), 300)
    || `${name}: ${category}${place ? ` in ${place}` : ''} on ${SITE_NAME}.`;
  const crumbs = breadcrumb(lang, [{ name: 'Business directory', path: '/business-directory' }, { name }]);

  const body = `<main id="prerendered-content">
      ${crumbs.html}
      <article>
        <h1>${escapeHtml(heading)}</h1>
        ${services ? `<p>Services: ${escapeHtml(services)}</p>` : ''}
        ${about ? `<section><h2>About ${escapeHtml(name)}</h2>${paragraphs(b.description)}</section>` : ''}
        ${b.address ? `<p>Address: ${escapeHtml(b.address)}</p>` : ''}
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
      robots: about || services ? ROBOTS_INDEX : ROBOTS_NOINDEX,
      image: businessCardUrl(b, segment),
      imageSized: true,
      imageAlt: `${name} – ${category}`,
      ogType: 'website',
      jsonLd: [
        crumbs.jsonLd,
        {
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name,
          url: pageUrl(lang, path),
          ...(about ? { description: truncate(about, 500) } : {}),
          ...(b.logoUrl ? { logo: b.logoUrl } : {}),
          ...(b.contactPhone ? { telephone: b.contactPhone } : {}),
          ...(place || b.address
            ? { address: { '@type': 'PostalAddress', streetAddress: b.address, addressLocality: b.city, addressCountry: b.country } }
            : {}),
        },
      ],
    }),
    body,
  };
}

export function buildBusinessOgHtml(b: BusinessData, segment: string, lang = 'en'): string {
  return renderPage(FALLBACK_SHELL, buildBusinessPage(b, segment, lang));
}

export async function handleBusinessOgRequest(context: PagesContext, segment: string, lang = 'en'): Promise<Response> {
  configureOgMedia(context.env);
  if (!isCrawler(context.request.headers.get('user-agent') || '')) return passThrough(context);
  if (!segment || DIRECTORY_TABS.has(segment) || !isUsableSlug(segment) || segment.includes('/')) return passThrough(context);

  const id = businessIdFromSlug(segment);
  const result = await fetchApi<{ listing?: BusinessData }>(`${API_BASE}/business-listings/${encodeURIComponent(id)}`);
  if (result.status === 'not-found') {
    return respond(context, notFoundPage(lang, 'Business', '/business-directory', 'Business directory'));
  }
  if (result.status === 'error' || !result.data.listing?.name) return passThrough(context);
  return respond(context, buildBusinessPage(result.data.listing, segment, lang));
}

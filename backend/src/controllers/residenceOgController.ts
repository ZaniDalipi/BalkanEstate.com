/**
 * Shared residence links.
 *
 *   GET /api/og/residence/:slug/image.jpg?lang=  the 1200×630 share card
 *   GET /api/og/residence/:slug?lang=            the link to share: link-preview
 *                                                bots get the residence's Open
 *                                                Graph tags, people are sent on
 *                                                to the residence page
 *
 * /api/* always reaches Express (nginx proxies it), so this link works in every
 * deployment; on Cloudflare Pages the residence page URL itself serves the same
 * preview (functions/developments).
 */
import { Request, Response } from 'express';
import { BOT_UA_PATTERNS, OG_BASE_URL, OG_CACHE_MAX_AGE_SECONDS } from '../config/ogConstants';
import { NotFoundError } from '../services/developments/developmentListingService';
import {
  residenceShareFacts,
  residenceShareImage,
  shareSummary,
} from '../services/developments/share/residenceShareImage';
import { shareLang } from '../services/developments/share/shareCardText';
import { clip, escapeXml as escapeHtml } from '../services/developments/share/shareCardLayout';
import { apiLogger } from '../utils/logger';

const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;
const apiBase = () => (process.env.BACKEND_URL || 'https://api.balkanestateai.com').replace(/\/+$/, '');
const pageUrl = (lang: string, slug: string) => `${OG_BASE_URL}/${lang}/developments/${slug}`;
const isBot = (ua: string) => BOT_UA_PATTERNS.some((p) => ua.toLowerCase().includes(p));

/** The card image's absolute URL; the hour in `v` makes feeds refetch at most hourly. */
export const residenceShareImageUrl = (slug: string, lang: string): string =>
  `${apiBase()}/api/og/residence/${slug}/image.jpg?lang=${lang}&v=${Math.floor(Date.now() / 3_600_000)}`;

export const residenceShareImageHandler = async (req: Request, res: Response): Promise<void> => {
  const slug = String(req.params.slug || '').toLowerCase();
  if (!SLUG.test(slug)) {
    res.status(404).end();
    return;
  }
  try {
    const { body, etag } = await residenceShareImage(slug, shareLang(req.query.lang));
    if (req.get('if-none-match') === etag) {
      res.status(304).end();
      return;
    }
    res
      .set('Content-Type', 'image/jpeg')
      .set('Cache-Control', 'public, max-age=3600, s-maxage=3600')
      .set('ETag', etag)
      .send(body);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).end();
      return;
    }
    apiLogger.error(`Residence share card failed for ${slug}:`, error);
    res.status(500).end();
  }
};

export const residenceShareHandler = async (req: Request, res: Response): Promise<void> => {
  const slug = String(req.params.slug || '').toLowerCase();
  const lang = shareLang(req.query.lang);
  if (!SLUG.test(slug)) {
    res.redirect(302, `${OG_BASE_URL}/${lang}/developments`);
    return;
  }
  if (!isBot(req.get('user-agent') ?? '')) {
    res.redirect(302, pageUrl(lang, slug));
    return;
  }
  try {
    const facts = await residenceShareFacts(slug);
    const title = [facts.name, facts.place].filter(Boolean).join(' · ');
    const description = [shareSummary(facts, lang), clip(facts.description, 220)].filter(Boolean).join(' — ');
    const url = pageUrl(lang, slug);
    const image = residenceShareImageUrl(slug, lang);
    res
      .set('Content-Type', 'text/html; charset=utf-8')
      .set('Cache-Control', `public, max-age=${OG_CACHE_MAX_AGE_SECONDS}`)
      .send(`<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)} | BalkanEstate</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="BalkanEstate" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(`${facts.name}: buildings marked on the residence picture`)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <link rel="canonical" href="${escapeHtml(url)}" />
</head>
<body><p><a href="${escapeHtml(url)}">${escapeHtml(title)}</a></p></body>
</html>`);
  } catch (error) {
    if (!(error instanceof NotFoundError)) apiLogger.error(`Residence share page failed for ${slug}:`, error);
    res.redirect(302, `${OG_BASE_URL}/${lang}/developments`);
  }
};

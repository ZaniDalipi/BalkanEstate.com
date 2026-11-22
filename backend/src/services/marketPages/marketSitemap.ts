/**
 * Sitemap entries for the market landing pages: only the pages with enough of
 * our own listings to be indexed, each in every language with its hreflang
 * alternates (the pages are translated, so each language URL is its own page).
 */
import { SUPPORTED_LANG_CODES } from '../../config/ogConstants';
import { xmlEscape } from '../../utils/xml';
import { marketPagePath, type MarketDeal } from './marketPlaces';
import { isIndexable } from './marketStats';

/** hreflang value of a URL language: "me" is the site's prefix for Montenegrin, the valid tag is sr-ME. */
export const hreflangOf = (lang: string): string => (lang === 'me' ? 'sr-ME' : lang);

interface TreeLike {
  country: { slug: string };
  indexableCount: number;
  cities: ReadonlyArray<{ slug: string; indexableCount: number }>;
}

/** Language-less paths of the pages search engines should index. */
export const indexableMarketPaths = (deal: MarketDeal, trees: readonly TreeLike[]): string[] => {
  const pages: string[] = [];
  for (const tree of trees) {
    if (!isIndexable(tree.indexableCount)) continue;
    pages.push(marketPagePath(deal, tree.country.slug));
    for (const city of tree.cities) {
      if (isIndexable(city.indexableCount)) pages.push(marketPagePath(deal, tree.country.slug, city.slug));
    }
  }
  // The overview is worth indexing once at least one country page is.
  return pages.length > 0 ? [marketPagePath(deal), ...pages] : [];
};

/** `<url>` entries: every language of every path, each listing all its alternates. */
export const marketSitemapEntries = (paths: readonly string[], baseUrl: string, lastmod: string): string =>
  paths
    .flatMap((path) => {
      const alternates = [
        ...SUPPORTED_LANG_CODES.map(
          (lang) => `    <xhtml:link rel="alternate" hreflang="${hreflangOf(lang)}" href="${xmlEscape(`${baseUrl}/${lang}${path}`)}"/>`,
        ),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(`${baseUrl}/en${path}`)}"/>`,
      ].join('\n');
      return SUPPORTED_LANG_CODES.map(
        (lang) => `  <url>
    <loc>${xmlEscape(`${baseUrl}/${lang}${path}`)}</loc>
${alternates}
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`,
      );
    })
    .join('');

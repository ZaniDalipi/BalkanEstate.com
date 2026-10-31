import { resolveUrl } from '../pagination/nextPageLink';

/** Where JSON APIs commonly put the URL of the next page. */
const NEXT_LINK_PATHS: string[][] = [
  ['next'], ['next_page_url'], ['nextPageUrl'], ['next_url'], ['nextUrl'], ['links', 'next'],
  ['_links', 'next', 'href'], ['links', 'next', 'href'], ['meta', 'next'], ['pagination', 'next'],
  ['paging', 'next'], ['meta', 'pagination', 'links', 'next'],
];

const at = (data: unknown, path: string[]): unknown =>
  path.reduce<unknown>((node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined), data);

/**
 * URL of the next page as announced in a JSON API response
 * (`next`, `links.next`, `next_page_url`, HAL `_links.next.href`…), or
 * undefined. Relative links are resolved against the current URL.
 */
export const nextLinkInPayload = (data: unknown, currentUrl: string): string | undefined => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
  for (const path of NEXT_LINK_PATHS) {
    const v = at(data, path);
    if (typeof v === 'string' && v.trim() && /^(https?:\/\/|\/|\?)/i.test(v.trim())) {
      const abs = resolveUrl(currentUrl, v.trim());
      if (abs !== currentUrl) return abs;
    }
  }
  return undefined;
};

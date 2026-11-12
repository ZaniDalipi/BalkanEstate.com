import type { ListingAdapterType } from '../../models/ListingSource';

/**
 * What each kind of feed needs in its settings (`adapterConfig`), checked
 * when a feed is saved and again before it runs — so a feed with no address
 * is refused with a reason naming the field, instead of failing at sync time
 * with "endpoint, itemsPath and idPath required".
 *
 * Only what can't be guessed is required (where to fetch from). Paths that
 * can be worked out get defaults: the listings list is located in the
 * response, and the id comes from the usual id fields.
 */

export type ConfigProblemCode =
  | 'notAnObject'
  | 'missingEndpoint'
  | 'invalidUrl'
  | 'missingFeedUrl'
  | 'missingSource'
  | 'invalidInlineJson'
  | 'missingIndexUrl'
  | 'missingSelectors'
  | 'missingListingUrls';

export interface ConfigProblem {
  /** The setting at fault, e.g. "adapterConfig.endpoint". */
  field: string;
  code: ConfigProblemCode;
  message: string;
}

export type ConfigCheck =
  | { ok: true; config: Record<string, unknown> }
  | { ok: false; problems: ConfigProblem[] };

const MESSAGES: Record<ConfigProblemCode, string> = {
  notAnObject: 'Feed settings must be a JSON object, like { "endpoint": "https://…" }.',
  missingEndpoint: 'This feed has no web address to fetch listings from. Edit the feed and add it.',
  invalidUrl: "This isn't a web address — it should start with https://",
  missingFeedUrl: 'Add the address of the RSS or Atom feed.',
  missingSource: 'This feed has neither pasted listings nor an API address. Paste your JSON again or add the address.',
  invalidInlineJson: "The pasted listings aren't valid JSON any more. Paste them again.",
  missingIndexUrl: 'Add the address of the page that lists your properties.',
  missingSelectors: "This feed doesn't know how to find listings on the page. Set it up again from the website's address.",
  missingListingUrls: "This feed has no listing pages to read. Set it up again from the website's address.",
};

const problem = (setting: string, code: ConfigProblemCode): ConfigProblem => ({
  field: `adapterConfig.${setting}`, code, message: MESSAGES[code],
});

const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

const isWebUrl = (v: string): boolean => {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

/** Required web address: missing and malformed are different problems. */
const requireUrl = (config: Record<string, unknown>, key: string, missing: ConfigProblemCode): ConfigProblem[] => {
  const v = text(config[key]);
  if (!v) return [problem(key, missing)];
  return isWebUrl(v) ? [] : [problem(key, 'invalidUrl')];
};

/** Older saved settings and other spellings, brought to what the adapters read. */
export const normalizeAdapterConfig = (type: ListingAdapterType, raw: Record<string, unknown>): Record<string, unknown> => {
  const config: Record<string, unknown> = { ...raw };
  if (type === 'customApi' || type === 'jsonFeed' || type === 'xmlFeed') {
    if (!text(config.endpoint) && text(config.url)) config.endpoint = text(config.url);
    if (!text(config.idPath)) config.idPath = '$.id';
  }
  if (type === 'customApi' && !config.query && config.params && typeof config.params === 'object') {
    config.query = config.params;
  }
  if (type === 'rss' && !config.feedUrls && text(config.feedUrl)) config.feedUrls = [text(config.feedUrl)];
  return config;
};

const checkByType = (type: ListingAdapterType, config: Record<string, unknown>): ConfigProblem[] => {
  switch (type) {
    case 'customApi':
    case 'xmlFeed':
      return requireUrl(config, 'endpoint', 'missingEndpoint');
    case 'jsonFeed': {
      if (text(config.endpoint)) return requireUrl(config, 'endpoint', 'missingEndpoint');
      const inline = text(config.inlineJson);
      if (!inline) return [problem('endpoint', 'missingSource')];
      try {
        JSON.parse(inline);
        return [];
      } catch {
        return [problem('inlineJson', 'invalidInlineJson')];
      }
    }
    case 'rss': {
      const urls = (Array.isArray(config.feedUrls) ? config.feedUrls : []).map(text).filter((u): u is string => !!u);
      if (!urls.length) return [problem('feedUrls', 'missingFeedUrl')];
      return urls.every(isWebUrl) ? [] : [problem('feedUrls', 'invalidUrl')];
    }
    case 'htmlScrape': {
      const problems = requireUrl(config, 'indexUrl', 'missingIndexUrl');
      const sel = config.selectors as Record<string, unknown> | undefined;
      if (!sel || !text(sel.listingItem) || !text(sel.link)) problems.push(problem('selectors', 'missingSelectors'));
      return problems;
    }
    case 'jsonLd': {
      const hasUrls = Array.isArray(config.listingUrls) && config.listingUrls.some((u) => text(u));
      const hasIndex = text(config.indexUrl) && text(config.linkSelector);
      if (text(config.sitemapOf)) return requireUrl(config, 'sitemapOf', 'missingListingUrls');
      return hasUrls || hasIndex ? [] : [problem('listingUrls', 'missingListingUrls')];
    }
    default:
      return [];
  }
};

/** The settings brought up to date, or every problem that stops the feed from running. */
export const checkAdapterConfig = (type: ListingAdapterType, raw: unknown): ConfigCheck => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, problems: [{ field: 'adapterConfig', code: 'notAnObject', message: MESSAGES.notAnObject }] };
  }
  const config = normalizeAdapterConfig(type, raw as Record<string, unknown>);
  const problems = checkByType(type, config);
  return problems.length ? { ok: false, problems } : { ok: true, config };
};

/** A feed whose settings can't work; `code` is the first problem's, for the UI to translate. */
export class FeedConfigError extends Error {
  readonly code: ConfigProblemCode;
  constructor(readonly problems: ConfigProblem[]) {
    super(problems[0]?.message ?? 'The feed settings are incomplete.');
    this.name = 'FeedConfigError';
    this.code = problems[0]?.code ?? 'notAnObject';
  }
}

/** Settings ready for an adapter, or a FeedConfigError saying what to fix. */
export const usableAdapterConfig = (type: ListingAdapterType, raw: unknown): Record<string, unknown> => {
  const check = checkAdapterConfig(type, raw);
  if (check.ok === false) throw new FeedConfigError(check.problems);
  return check.config;
};

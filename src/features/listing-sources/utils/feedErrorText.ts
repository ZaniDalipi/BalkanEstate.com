/** Feed-settings problems the server names by code (backend adapterConfig.ts). */
export const FEED_CONFIG_ERROR_CODES = [
  'notAnObject', 'missingEndpoint', 'invalidUrl', 'missingFeedUrl', 'missingSource',
  'invalidInlineJson', 'missingIndexUrl', 'missingSelectors', 'missingListingUrls',
] as const;

export type FeedConfigErrorCode = (typeof FEED_CONFIG_ERROR_CODES)[number];

type Translate = (key: string, options?: Record<string, unknown>) => string;

const isConfigCode = (code: unknown): code is FeedConfigErrorCode =>
  typeof code === 'string' && (FEED_CONFIG_ERROR_CODES as readonly string[]).includes(code);

/**
 * What to tell the user about a feed failure: a known problem (e.g. the
 * feed has no address) in their language with what to do, otherwise the
 * server's own message.
 */
export const feedErrorText = (t: Translate, error: { message?: string; code?: unknown }): string =>
  isConfigCode(error.code)
    ? t(`listingFeeds:configError.${error.code}`, { defaultValue: error.message })
    : error.message ?? '';

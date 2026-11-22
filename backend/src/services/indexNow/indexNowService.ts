/**
 * Announce changed listings to IndexNow (Bing, and through it Copilot and
 * other AI search; Yandex, Seznam, Naver, Yep). Fire-and-forget: a failure is
 * logged and never reaches the person who edited the listing.
 */
import Property from '../../models/Property';
import { INDEXNOW_ENDPOINT, INDEXNOW_KEY, isIndexNowEnabled } from '../../config/indexNow';
import { encodeId, resolveId } from '../../utils/idObfuscation';
import { createLogger } from '../../utils/logger';
import { createIndexNowQueue, type IndexNowQueue } from './indexNowQueue';
import { listingUrls, urlsForChangedListing } from './indexNowUrls';

const logger = createLogger('IndexNow');

const SITE_URL = (process.env.FRONTEND_URL || 'https://balkanestateai.com').replace(/\/+$/, '');

/** Changes inside this window go out together. */
const BATCH_DELAY_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

/** The request body the protocol asks for. */
export const indexNowPayload = (urls: string[], siteUrl = SITE_URL) => ({
  host: new URL(siteUrl).host,
  key: INDEXNOW_KEY,
  keyLocation: `${siteUrl}/${INDEXNOW_KEY}.txt`,
  urlList: urls,
});

/** POST the URLs; 200 and 202 mean accepted, anything else is an error for the caller to log. */
export async function submitToIndexNow(urls: string[], fetchImpl: typeof fetch = fetch): Promise<void> {
  const response = await fetchImpl(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(indexNowPayload(urls)),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`IndexNow answered ${response.status} for ${urls.length} URLs`);
  }
  logger.info(`Submitted ${urls.length} URLs`);
}

const queue: IndexNowQueue = createIndexNowQueue({
  submit: (urls) => submitToIndexNow(urls),
  delayMs: BATCH_DELAY_MS,
  onError: (error) => logger.warn('Submission failed:', error instanceof Error ? error.message : error),
});

/**
 * A listing was created, edited, sold, rented, renewed or deleted: queue its
 * page in every language and the country and city pages it appears on.
 * Imported listings are skipped — their pages are noindex. Never throws.
 */
export async function notifyListingChanged(id: string, options: { deleted?: boolean } = {}): Promise<void> {
  if (!isIndexNowEnabled()) return;
  try {
    const rawId = resolveId(id);
    if (!rawId) return;
    const encodedId = encodeId(rawId);
    if (options.deleted) {
      queue.add(listingUrls(encodedId, SITE_URL));
      return;
    }
    const listing = await Property.findById(rawId).select('listingType country city source').lean();
    if (!listing) {
      queue.add(listingUrls(encodedId, SITE_URL));
      return;
    }
    if (listing.source) return;
    queue.add(urlsForChangedListing({ encodedId, listingType: listing.listingType, country: listing.country, city: listing.city }, SITE_URL));
  } catch (error) {
    logger.warn('Could not queue a changed listing:', error instanceof Error ? error.message : error);
  }
}

/** Submit anything still queued (graceful shutdown). */
export const flushIndexNow = (): Promise<void> => queue.flush();

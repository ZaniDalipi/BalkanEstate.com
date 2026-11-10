/**
 * Asks Overpass (OpenStreetMap) a question, hedged across mirrors: the first
 * server is asked at once, and while none has answered a further mirror joins
 * every HEDGE_DELAY_MS. The first good answer wins and the rest are cancelled.
 * Public Overpass servers queue requests at busy times, so a single server
 * could leave a property page waiting for half a minute.
 *
 * OVERPASS_URL (comma-separated) replaces the default mirrors, e.g. with a
 * paid or self-hosted instance.
 */

import axios from 'axios';
import { apiLogger } from '../../utils/logger';
import { describeHttpError } from '../../utils/describeHttpError';

export const DEFAULT_OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
] as const;

/**
 * How long one mirror may take. Public servers measured 17–19 s even for a
 * one-node query at busy times, so this is generous: the lookup runs in the
 * background (surroundingsService) and no page waits for it.
 * The query's own [timeout:] stays below it.
 */
export const MIRROR_TIMEOUT_MS = 45_000;

/** Wait this long for an answer before asking the next mirror too. */
export const HEDGE_DELAY_MS = 6_000;

export class OverpassUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OverpassUnavailableError';
  }
}

export const overpassUrls = (): string[] => {
  const configured = (process.env.OVERPASS_URL ?? '')
    .split(',')
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//.test(u));
  return configured.length > 0 ? configured : [...DEFAULT_OVERPASS_URLS];
};

/** One mirror's answer: its elements, or why it gave none. */
const askMirror = async (url: string, query: string, signal: AbortSignal): Promise<unknown[]> => {
  const { data } = await axios.post(url, new URLSearchParams({ data: query }).toString(), {
    timeout: MIRROR_TIMEOUT_MS,
    signal,
    // Answers are ~0.1–2 MB; refuse anything far larger, and never follow redirects.
    maxContentLength: 25 * 1024 * 1024,
    maxRedirects: 0,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'BalkanEstate Surroundings/1.0',
      Accept: 'application/json',
    },
  });
  const body = data as { elements?: unknown; remark?: unknown } | null;
  // Overpass answers 200 with a "remark" when the query ran out of time or memory.
  if (typeof body?.remark === 'string' && /error|timed out|out of memory/i.test(body.remark)) {
    throw new OverpassUnavailableError(`Overpass: ${body.remark}`);
  }
  if (!body || !Array.isArray(body.elements)) {
    throw new OverpassUnavailableError('Overpass answer has no elements');
  }
  return body.elements;
};

/** Elements from the first mirror that answers well; rejects when all fail. */
export const queryOverpass = (query: string, urls: string[] = overpassUrls()): Promise<unknown[]> =>
  new Promise((resolve, reject) => {
    if (urls.length === 0) {
      reject(new OverpassUnavailableError('No Overpass server configured'));
      return;
    }
    const controllers: AbortController[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let next = 0;
    let failed = 0;
    let done = false;

    const finish = () => {
      done = true;
      timers.forEach(clearTimeout);
      controllers.forEach((c) => c.abort());
    };

    const startNext = () => {
      if (done || next >= urls.length) return;
      const url = urls[next++];
      const controller = new AbortController();
      controllers.push(controller);
      // Ask the next mirror too if this one is slow to answer.
      timers.push(setTimeout(startNext, HEDGE_DELAY_MS));

      askMirror(url, query, controller.signal).then(
        (elements) => {
          if (done) return;
          finish();
          resolve(elements);
        },
        (err: unknown) => {
          if (done) return;
          failed += 1;
          apiLogger.warn(`Overpass mirror failed: ${url}: ${describeHttpError(err)}`);
          if (failed >= urls.length) {
            finish();
            reject(err instanceof OverpassUnavailableError ? err : new OverpassUnavailableError('Map data provider unavailable'));
            return;
          }
          // A quick failure should not wait out the hedge delay.
          startNext();
        }
      );
    };

    startNext();
  });

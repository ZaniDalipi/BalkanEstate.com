import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import robotsParser from 'robots-parser';
import { cronLogger } from '../../utils/logger';

// Realistic browser User-Agent — many Balkan portals (njuskalo.hr, halooglasi.com,
// imot.bg) block obvious bot UAs with 403/Cloudflare challenges. Identifying as a
// recent Chrome on macOS gives us reliable access for the public listings the user
// already has the right to view.
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Bot UA used only for robots.txt fetches so site owners can target us if they want. */
const ROBOTS_USER_AGENT = 'BalkanEstateBot/1.0 (+https://balkanestate.com/bot)';

const DEFAULT_REQUEST_DELAY_MS = 1500;
const DEFAULT_TIMEOUT_MS = 20000;

interface RobotsCacheEntry {
  parser: ReturnType<typeof robotsParser>;
  fetchedAt: number;
}

const robotsCache = new Map<string, RobotsCacheEntry>();
const ROBOTS_TTL_MS = 24 * 60 * 60 * 1000;

const lastRequestAt = new Map<string, number>();

const hostOf = (url: string): string => {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return '';
  }
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const fetchRobots = async (url: string, userAgent: string): Promise<ReturnType<typeof robotsParser> | null> => {
  const host = hostOf(url);
  if (!host) return null;
  const cached = robotsCache.get(host);
  if (cached && Date.now() - cached.fetchedAt < ROBOTS_TTL_MS) return cached.parser;

  const robotsUrl = `${new URL(url).protocol}//${host}/robots.txt`;
  try {
    const { data } = await axios.get<string>(robotsUrl, {
      timeout: 8000,
      headers: { 'User-Agent': userAgent },
      responseType: 'text',
      validateStatus: (s) => s < 500,
    });
    const parser = robotsParser(robotsUrl, typeof data === 'string' ? data : '');
    robotsCache.set(host, { parser, fetchedAt: Date.now() });
    return parser;
  } catch (err) {
    // If robots.txt fetch fails, fail-open (treat as allowed) and cache an empty parser to avoid retry storms.
    const parser = robotsParser(robotsUrl, '');
    robotsCache.set(host, { parser, fetchedAt: Date.now() });
    return parser;
  }
};

export interface RequestOptions {
  userAgent?: string;
  requestDelayMs?: number;
  respectRobotsTxt?: boolean;
  timeout?: number;
  headers?: Record<string, string>;
  responseType?: AxiosRequestConfig['responseType'];
}

/**
 * HTTP GET with robots.txt enforcement, polite delay, and a stable User-Agent.
 * All adapters route through this helper.
 */
export const httpGet = async <T = unknown>(url: string, options: RequestOptions = {}): Promise<AxiosResponse<T>> => {
  const userAgent = options.userAgent || DEFAULT_USER_AGENT;
  const respectRobots = options.respectRobotsTxt !== false;
  const delay = options.requestDelayMs ?? DEFAULT_REQUEST_DELAY_MS;

  if (respectRobots) {
    // We always check robots.txt against our bot UA so site owners that want to
    // block us specifically can do so via "User-Agent: BalkanEstateBot".
    const parser = await fetchRobots(url, ROBOTS_USER_AGENT);
    if (parser && !parser.isAllowed(url, ROBOTS_USER_AGENT)) {
      throw new Error(`robots.txt disallows ${url}`);
    }
  }

  const host = hostOf(url);
  if (host) {
    const last = lastRequestAt.get(host) ?? 0;
    const wait = last + delay - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt.set(host, Date.now());
  }

  // Build a realistic browser-like header set so anti-bot middleware (Cloudflare,
  // Imperva) doesn't refuse the request. Caller-supplied headers always win.
  const referer = (() => {
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.host}/`;
    } catch { return undefined; }
  })();
  const browserHeaders: Record<string, string> = {
    'User-Agent': userAgent,
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,hr;q=0.8,sr;q=0.7,bs;q=0.7,sl;q=0.6,bg;q=0.6,mk;q=0.6',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    ...(referer ? { Referer: referer } : {}),
  };

  try {
    return await axios.get<T>(url, {
      timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
      headers: { ...browserHeaders, ...(options.headers ?? {}) },
      responseType: options.responseType,
      maxRedirects: 5,
      decompress: true,
      validateStatus: (s) => s >= 200 && s < 400,
    });
  } catch (err) {
    // Wrap with a more diagnostic message so the user can tell why it failed.
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 403) {
        throw new Error(
          `${url} returned 403 — the site is blocking automated access (Cloudflare or anti-bot). ` +
            'Try the agency RSS feed, JSON API, or paste a JSON sample instead.'
        );
      }
      if (status === 404) {
        throw new Error(`${url} returned 404 — the page does not exist. Double-check the URL.`);
      }
      if (status === 429) {
        throw new Error(
          `${url} returned 429 — rate-limited. Increase requestDelayMs in the source config.`
        );
      }
      if (status && status >= 500) {
        throw new Error(`${url} returned ${status} — the site is temporarily unavailable.`);
      }
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        throw new Error(`${url} timed out after ${options.timeout ?? DEFAULT_TIMEOUT_MS}ms.`);
      }
      if (err.code === 'ENOTFOUND') {
        throw new Error(`Could not resolve ${url} — check the domain spelling.`);
      }
    }
    throw err;
  }
};

export const logAdapter = (msg: string, ctx?: Record<string, unknown>) => {
  cronLogger.info(`[adapter] ${msg}${ctx ? ' ' + JSON.stringify(ctx) : ''}`);
};

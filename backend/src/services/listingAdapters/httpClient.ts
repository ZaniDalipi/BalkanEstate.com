import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import robotsParser from 'robots-parser';
import { cronLogger } from '../../utils/logger';

const DEFAULT_USER_AGENT = 'BalkanEstateBot/1.0 (+https://balkanestate.com/bot)';
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
    const parser = await fetchRobots(url, userAgent);
    if (parser && !parser.isAllowed(url, userAgent)) {
      throw new Error(`robots.txt disallows ${url} for ${userAgent}`);
    }
  }

  const host = hostOf(url);
  if (host) {
    const last = lastRequestAt.get(host) ?? 0;
    const wait = last + delay - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt.set(host, Date.now());
  }

  return axios.get<T>(url, {
    timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
    headers: { 'User-Agent': userAgent, ...(options.headers ?? {}) },
    responseType: options.responseType,
    maxRedirects: 5,
    validateStatus: (s) => s >= 200 && s < 400,
  });
};

export const logAdapter = (msg: string, ctx?: Record<string, unknown>) => {
  cronLogger.info(`[adapter] ${msg}${ctx ? ' ' + JSON.stringify(ctx) : ''}`);
};

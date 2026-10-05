import http from 'http';
import https from 'https';
import type net from 'net';
import type { Readable } from 'stream';
import axios from 'axios';
import { resolvePublicUrl, SsrfError } from '../../utils/ssrfGuard';
import { selectFirst } from './fieldMapper';
import { FeedDocumentError, type FeedMapping, type XmlNode } from './feedTypes';
import { XmlRecordReader, DEFAULT_XML_LIMITS, type XmlReaderLimits } from './xmlRecordReader';

/**
 * Download and read an agency feed without trusting anything about it.
 *
 *  - Every hop (first request, each redirect, each next page) goes through
 *    `resolvePublicUrl`: http(s) only, ports 80/443, no userinfo, and every
 *    resolved address must be public. The socket is pinned to the vetted
 *    address so a second DNS answer cannot rebind it, and `proxy: false`
 *    stops an HTTP(S)_PROXY env var from resolving the name itself.
 *  - Redirects are followed manually (max 3). Credentials are only ever sent
 *    to the origin the agency configured, never to a redirect target or page
 *    on another origin, and never over plain http.
 *  - The body is streamed into the bounded XML reader; size, duration and
 *    record counts are capped, so a hostile or broken feed fails fast.
 *  - Completeness is reported, not assumed: a missing next page, a page cap,
 *    or a declared total that does not match the records received all mark
 *    the snapshot incomplete, which later disables deactivation.
 */

export class FeedFetchError extends Error {
  constructor(public readonly code: string, message: string, public readonly retryable: boolean) {
    super(message);
    this.name = 'FeedFetchError';
  }
}

export interface FeedCredentials {
  type: 'none' | 'basic' | 'header';
  username?: string;
  /** Plaintext secret; only ever held in memory for the duration of a fetch. */
  secret?: string;
  headerName?: string;
}

export interface FetchLimits extends XmlReaderLimits {
  timeoutMs: number;
  maxRedirects: number;
  maxPages: number;
}

export const DEFAULT_FETCH_LIMITS: FetchLimits = {
  ...DEFAULT_XML_LIMITS,
  timeoutMs: 120_000,
  maxRedirects: 3,
  maxPages: 50,
};

export interface TransportRequest {
  url: URL;
  lookup: net.LookupFunction;
  headers: Record<string, string>;
  signal: AbortSignal;
  timeoutMs: number;
}

export interface TransportResponse {
  status: number;
  headers: Record<string, string | undefined>;
  body: Readable;
}

export type HttpTransport = (request: TransportRequest) => Promise<TransportResponse>;
export type DnsResolver = (host: string) => Promise<Array<{ address: string; family: number }>>;

const USER_AGENT = 'BalkanEstateAI-FeedImporter/1.0 (+https://balkanestateai.com/agency-feeds)';

const axiosTransport: HttpTransport = async ({ url, lookup, headers, signal, timeoutMs }) => {
  const agentOptions = { lookup, keepAlive: false };
  const response = await axios.get<Readable>(url.toString(), {
    responseType: 'stream',
    timeout: timeoutMs,
    maxRedirects: 0,
    proxy: false,
    decompress: true,
    httpAgent: new http.Agent(agentOptions),
    httpsAgent: new https.Agent(agentOptions),
    headers,
    signal,
    validateStatus: () => true,
  });
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(response.headers ?? {})) {
    flat[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v === undefined || v === null ? undefined : String(v);
  }
  return { status: response.status, headers: flat, body: response.data };
};

export interface FetchFeedOptions {
  mapping: FeedMapping;
  credentials?: FeedCredentials;
  limits?: Partial<FetchLimits>;
  transport?: HttpTransport;
  resolver?: DnsResolver;
}

export interface FetchedFeed {
  records: XmlNode[];
  header: XmlNode;
  pages: number;
  bytes: number;
  declaredTotal?: number;
  complete: boolean;
  incompleteReason?: string;
}

const authHeaders = (creds: FeedCredentials | undefined, url: URL, origin: string): Record<string, string> => {
  if (!creds || creds.type === 'none' || !creds.secret) return {};
  if (url.origin !== origin || url.protocol !== 'https:') return {};
  if (creds.type === 'basic') {
    const token = Buffer.from(`${creds.username ?? ''}:${creds.secret}`, 'utf8').toString('base64');
    return { Authorization: `Basic ${token}` };
  }
  return { [creds.headerName || 'Authorization']: creds.secret };
};

const BLOCKED_CONTENT_TYPES = ['text/html', 'application/json', 'image/', 'video/', 'audio/'];

const describeStatus = (status: number): FeedFetchError => {
  if (status === 401 || status === 403) {
    return new FeedFetchError('auth_failed', `The feed server refused access (HTTP ${status}). Check the feed credentials.`, false);
  }
  if (status === 404 || status === 410) return new FeedFetchError('not_found', `The feed URL returned HTTP ${status}.`, false);
  if (status === 429) return new FeedFetchError('rate_limited', 'The feed server is rate-limiting requests (HTTP 429).', true);
  if (status >= 500) return new FeedFetchError('server_error', `The feed server failed (HTTP ${status}).`, true);
  return new FeedFetchError('http_error', `The feed URL returned HTTP ${status}.`, false);
};

/** Fetch one page, following redirects, streaming the body into a reader. */
const fetchPage = async (
  startUrl: string,
  origin: string,
  reader: XmlRecordReader,
  opts: Required<Pick<FetchFeedOptions, 'transport'>> & FetchFeedOptions,
  limits: FetchLimits,
  deadline: number
): Promise<void> => {
  let current = startUrl;
  for (let hop = 0; hop <= limits.maxRedirects; hop++) {
    let vetted;
    try {
      vetted = await resolvePublicUrl(current, opts.resolver);
    } catch (err) {
      if (err instanceof SsrfError) throw new FeedFetchError('unsafe_url', `Refused to fetch ${new URL(current).host || 'URL'}: ${err.message}`, false);
      throw err;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new FeedFetchError('timeout', 'Downloading the feed took too long.', true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    try {
      let response: TransportResponse;
      try {
        response = await opts.transport({
          url: vetted.url,
          lookup: vetted.lookup,
          signal: controller.signal,
          timeoutMs: Math.min(remaining, 30_000),
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/xml, text/xml;q=0.9, */*;q=0.5',
            ...authHeaders(opts.credentials, vetted.url, origin),
          },
        });
      } catch (err) {
        if (controller.signal.aborted) throw new FeedFetchError('timeout', 'Downloading the feed took too long.', true);
        const code = (err as { code?: string }).code;
        if (code === 'ENOTFOUND') throw new FeedFetchError('dns_failed', 'The feed host could not be resolved.', true);
        throw new FeedFetchError('network_error', `Could not connect to the feed server${code ? ` (${code})` : ''}.`, true);
      }

      if (response.status >= 300 && response.status < 400) {
        response.body.destroy();
        const location = response.headers.location;
        if (!location) throw new FeedFetchError('bad_redirect', 'The feed server redirected without a location.', false);
        current = new URL(location, vetted.url).toString();
        continue;
      }
      if (response.status < 200 || response.status >= 300) {
        response.body.destroy();
        throw describeStatus(response.status);
      }
      const contentType = (response.headers['content-type'] ?? '').toLowerCase();
      if (BLOCKED_CONTENT_TYPES.some((t) => contentType.startsWith(t))) {
        response.body.destroy();
        throw new FeedFetchError(
          'not_xml',
          `The feed URL returned ${contentType.split(';')[0]}, not XML. Check that the URL points at the feed itself.`,
          false
        );
      }
      const declaredLength = Number(response.headers['content-length']);
      if (Number.isFinite(declaredLength) && declaredLength > limits.maxBytes) {
        response.body.destroy();
        throw new FeedFetchError('too_large', `The feed is larger than the ${Math.round(limits.maxBytes / 1048576)} MB limit.`, false);
      }

      try {
        for await (const chunk of response.body) {
          reader.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
        }
      } catch (err) {
        response.body.destroy();
        if (err instanceof FeedDocumentError) {
          throw new FeedFetchError(err.code, err.message, false);
        }
        if (controller.signal.aborted) throw new FeedFetchError('timeout', 'Downloading the feed took too long.', true);
        throw new FeedFetchError('connection_lost', 'The connection dropped while downloading the feed.', true);
      }
      return;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new FeedFetchError('too_many_redirects', 'The feed URL redirected too many times.', false);
};

export const fetchFeed = async (feedUrl: string, options: FetchFeedOptions): Promise<FetchedFeed> => {
  const limits: FetchLimits = { ...DEFAULT_FETCH_LIMITS, ...(options.limits ?? {}) };
  const opts = { ...options, transport: options.transport ?? axiosTransport };
  let origin: string;
  try {
    origin = new URL(feedUrl).origin;
  } catch {
    throw new FeedFetchError('unsafe_url', 'The feed URL is not a valid URL.', false);
  }
  if (options.credentials && options.credentials.type !== 'none' && !feedUrl.toLowerCase().startsWith('https://')) {
    throw new FeedFetchError('insecure_credentials', 'Feeds that need credentials must use https.', false);
  }

  const deadline = Date.now() + limits.timeoutMs;
  const records: XmlNode[] = [];
  const visited = new Set<string>();
  let header: XmlNode | undefined;
  let bytes = 0;
  let pages = 0;
  let declaredTotal: number | undefined;
  let nextUrl: string | undefined = feedUrl;
  let incompleteReason: string | undefined;

  while (nextUrl) {
    if (pages >= limits.maxPages) {
      incompleteReason = `Pagination stopped after ${limits.maxPages} pages`;
      break;
    }
    if (visited.has(nextUrl)) {
      incompleteReason = 'The feed pagination loops back to a page already read';
      break;
    }
    visited.add(nextUrl);

    const reader = new XmlRecordReader(options.mapping.recordElement, {
      ...limits,
      maxBytes: limits.maxBytes - bytes,
      maxRecords: limits.maxRecords - records.length,
    });
    await fetchPage(nextUrl, origin, reader, opts, limits, deadline);
    let page;
    try {
      page = reader.end();
    } catch (err) {
      if (err instanceof FeedDocumentError) throw new FeedFetchError(err.code, err.message, err.code === 'truncated');
      throw err;
    }
    pages += 1;
    bytes += page.bytes;
    records.push(...page.records);
    if (!header) {
      header = page.header;
      const totalPath = options.mapping.feed?.totalCount;
      const rawTotal = totalPath ? selectFirst(page.header, totalPath) : undefined;
      if (rawTotal !== undefined) {
        const n = Number(rawTotal);
        if (Number.isInteger(n) && n >= 0) declaredTotal = n;
      }
    }

    const nextPath = options.mapping.feed?.nextPage;
    const rawNext = nextPath ? selectFirst(page.header, nextPath) : undefined;
    nextUrl = undefined;
    if (rawNext) {
      try {
        nextUrl = new URL(rawNext, feedUrl).toString();
      } catch {
        incompleteReason = 'The feed points to a next page with an invalid URL';
      }
    }
  }

  if (!incompleteReason && declaredTotal !== undefined && declaredTotal !== records.length) {
    incompleteReason = `The feed declares ${declaredTotal} listings but ${records.length} were received`;
  }

  return {
    records,
    header: header as XmlNode,
    pages,
    bytes,
    declaredTotal,
    complete: !incompleteReason,
    incompleteReason,
  };
};

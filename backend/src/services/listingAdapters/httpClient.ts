import axios from 'axios';
import { mediaLogger as scraperLogger } from '../../utils/logger';

const DEFAULT_TIMEOUT_MS = 10_000;

export interface HttpGetOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface HttpGetResult<T> {
  data: T;
  status: number;
}

/**
 * Fetch a remote URL and return { data, status }.
 * Generic — defaults to string for HTML responses.
 */
export const httpGet = async <T = string>(
  url: string,
  options: HttpGetOptions = {}
): Promise<HttpGetResult<T>> => {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers = {} } = options;
  try {
    scraperLogger.info(`🌐 httpGet: ${url}`);
    const response = await axios.get<T>(url, {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'BalkanEstateBot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...headers,
      },
      responseType: typeof ('' as unknown as T) === 'string' ? 'text' : 'json',
    });
    scraperLogger.info(`✅ httpGet: ${response.status} ${url}`);
    return { data: response.data, status: response.status };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    scraperLogger.error(`❌ httpGet error for ${url}:`, msg);
    throw new Error(`httpGet failed for ${url}: ${msg}`);
  }
};

/**
 * Fetch a remote URL and return the response body as a plain HTML string.
 * Throws if the response status is not 2xx.
 */
export const fetchHtml = async (url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<string> => {
  const result = await httpGet<string>(url, { timeoutMs });
  return result.data;
};

/**
 * Fetch a remote URL and return the response body parsed as JSON of type T.
 * Throws if the response status is not 2xx or JSON parsing fails.
 */
export const fetchJson = async <T>(url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> => {
  try {
    scraperLogger.info(`🌐 fetchJson: ${url}`);
    const response = await axios.get<T>(url, {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'BalkanEstateBot/1.0',
        'Accept': 'application/json',
      },
    });
    scraperLogger.info(`✅ fetchJson: ${response.status} ${url}`);
    return response.data;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    scraperLogger.error(`❌ fetchJson error for ${url}:`, msg);
    throw new Error(`fetchJson failed for ${url}: ${msg}`);
  }
};

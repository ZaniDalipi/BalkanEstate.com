import axios from 'axios';
import { mediaLogger as scraperLogger } from '../../utils/logger';

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Fetch a remote URL and return the response body as an HTML string.
 * Throws if the response status is not 2xx.
 */
export const fetchHtml = async (url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<string> => {
  try {
    scraperLogger.info(`🌐 fetchHtml: ${url}`);
    const response = await axios.get<string>(url, {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'BalkanEstateBot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      responseType: 'text',
    });
    scraperLogger.info(`✅ fetchHtml: ${response.status} ${url}`);
    return response.data;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    scraperLogger.error(`❌ fetchHtml error for ${url}:`, msg);
    throw new Error(`fetchHtml failed for ${url}: ${msg}`);
  }
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

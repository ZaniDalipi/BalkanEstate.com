import axios from 'axios';

/**
 * A log-safe summary of a failed outbound request: status, error code and
 * message only. Logging the axios error itself would write its config into
 * the logs — URLs, query strings and headers, including API keys.
 */
export const describeHttpError = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    return [status ? `HTTP ${status}` : null, err.code, err.message].filter(Boolean).join(' · ');
  }
  return err instanceof Error ? err.message : String(err);
};

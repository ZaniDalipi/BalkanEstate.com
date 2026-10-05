import { decryptField, encryptField } from '../../utils/fieldEncryption';
import type { IAgencyFeed, IAgencyFeedCredentials } from '../../models/AgencyFeed';
import type { FeedCredentials } from './feedFetcher';

/**
 * Feed credentials at rest are AES-256-GCM encrypted with FIELD_ENCRYPTION_KEY
 * (the same key and helper used for other sensitive fields). The plaintext is
 * decrypted only inside the worker, for the duration of a fetch, and is never
 * logged, returned by the API or written to a run record.
 */

export interface CredentialsInput {
  type: 'none' | 'basic' | 'header';
  username?: string;
  headerName?: string;
  /** Omit to keep the stored secret unchanged. */
  secret?: string;
}

const HEADER_NAME = /^[A-Za-z0-9-]{1,100}$/;
const FORBIDDEN_HEADERS = new Set(['host', 'cookie', 'content-length', 'transfer-encoding', 'connection']);

export const validateCredentialsInput = (input: CredentialsInput): string | undefined => {
  if (!['none', 'basic', 'header'].includes(input.type)) return 'Unknown credential type';
  if (input.type === 'basic' && (!input.username || input.username.length > 200)) return 'A username is required';
  if (input.type === 'header') {
    if (!input.headerName || !HEADER_NAME.test(input.headerName)) return 'Header name may contain only letters, digits and dashes';
    if (FORBIDDEN_HEADERS.has(input.headerName.toLowerCase())) return 'That header cannot be used for authentication';
  }
  if (input.secret !== undefined && (input.secret.length === 0 || input.secret.length > 2000)) {
    return 'Secret must be 1–2000 characters';
  }
  return undefined;
};

/** Merge an update into stored credentials, encrypting a new secret. */
export const buildStoredCredentials = (
  input: CredentialsInput,
  existing?: IAgencyFeedCredentials
): IAgencyFeedCredentials => {
  if (input.type === 'none') return { type: 'none' };
  const keepSecret = input.secret === undefined && existing?.type === input.type ? existing.secretEncrypted : undefined;
  return {
    type: input.type,
    username: input.type === 'basic' ? input.username : undefined,
    headerName: input.type === 'header' ? input.headerName : undefined,
    secretEncrypted: input.secret !== undefined ? encryptField(input.secret) : keepSecret,
  };
};

export const decryptCredentials = (feed: Pick<IAgencyFeed, 'credentials'>): FeedCredentials => {
  const stored = feed.credentials;
  if (!stored || stored.type === 'none' || !stored.secretEncrypted) return { type: 'none' };
  return {
    type: stored.type,
    username: stored.username,
    headerName: stored.headerName,
    secret: decryptField(stored.secretEncrypted),
  };
};

/** What the dashboard may see: whether a secret exists, never the secret. */
export const redactCredentials = (stored: IAgencyFeedCredentials | undefined) => ({
  type: stored?.type ?? 'none',
  username: stored?.type === 'basic' ? stored.username : undefined,
  headerName: stored?.type === 'header' ? stored.headerName : undefined,
  hasSecret: Boolean(stored?.secretEncrypted),
});

/** Remove any userinfo or token-like query values before a URL is logged or shown in history. */
export const redactUrl = (raw: string | undefined): string => {
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.username = '';
    url.password = '';
    for (const key of Array.from(url.searchParams.keys())) {
      if (/(token|key|secret|pass|auth|sig|signature|apikey|api_key)/i.test(key)) url.searchParams.set(key, '***');
    }
    return url.toString();
  } catch {
    return '[invalid url]';
  }
};

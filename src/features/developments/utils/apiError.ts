/**
 * Server refusals, read the same way everywhere. The server sends a stable
 * `code`, the form `field` it belongs to and the values its text needs
 * (`details: { field, params }`); its English `message` is for logs only and
 * is never shown. httpClient puts the whole response body in `err.details`, so
 * the field sits at `err.details.details.field`.
 */

export type StatusTextKey = 'badRequest' | 'forbidden' | 'notFound' | 'conflict' | 'tooLarge' | 'tooMany' | 'server' | 'offline';

export type ApiErrorParams = Record<string, string | number>;

export interface ApiErrorInfo {
  status?: number;
  code?: string;
  field?: string;
  params: ApiErrorParams;
  /** The request never got an answer (fetch failed, or the browser is offline). */
  network?: boolean;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);

const cleanParams = (raw: unknown): ApiErrorParams => {
  if (!isObj(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).filter((e): e is [string, string | number] => typeof e[1] === 'string' || (typeof e[1] === 'number' && Number.isFinite(e[1])))
  );
};

export function readApiError(err: unknown): ApiErrorInfo {
  if (!isObj(err) && !(err instanceof Error)) return { params: {} };
  const e = err as Obj;
  // No answer at all: fetch() rejects with a TypeError, or the browser says it is offline.
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const network = typeof e.statusCode !== 'number' && (err instanceof TypeError || offline);
  const body = isObj(e.details) ? e.details : {};
  // { details: { field, params } } inside the body; older callers may hand the body's details directly.
  const meta = isObj(body.details) ? body.details : body;
  const code = typeof e.code === 'string' && e.code ? e.code : typeof body.code === 'string' && body.code ? body.code : undefined;
  return {
    status: typeof e.statusCode === 'number' ? e.statusCode : undefined,
    code,
    field: typeof meta.field === 'string' && meta.field ? meta.field : undefined,
    params: cleanParams(meta.params),
    ...(network ? { network } : {}),
  };
}

/** Which status text applies: by the response status; no status means no connection or a failure on this side. */
export function statusTextKey(status: number | undefined, network = false): StatusTextKey {
  if (network) return 'offline';
  if (status === undefined || status === 0) return 'server';
  if (status === 403 || status === 401) return 'forbidden';
  if (status === 404 || status === 410) return 'notFound';
  if (status === 409) return 'conflict';
  if (status === 413) return 'tooLarge';
  if (status === 429) return 'tooMany';
  if (status >= 500) return 'server';
  return 'badRequest';
}

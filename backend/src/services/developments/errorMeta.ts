/**
 * What a refusal tells the client besides its (English, log-only) message: a
 * stable `code` the client translates, the form `field` it belongs to, and the
 * values the translated text needs. sendServiceError puts `code` and
 * `details: { field, params }` in the response body.
 */
export type ErrorParams = Record<string, string | number>;

export interface ErrorMeta {
  code?: string;
  field?: string;
  params?: ErrorParams;
}

export interface ErrorDetails {
  field?: string;
  params?: ErrorParams;
}

/** Copy `meta` onto an error instance (used by the service error classes). */
export function applyErrorMeta(error: { code?: string; details?: ErrorDetails }, meta?: ErrorMeta): void {
  if (!meta) return;
  if (meta.code) error.code = meta.code;
  if (meta.field || meta.params) error.details = { ...(meta.field ? { field: meta.field } : {}), ...(meta.params ? { params: meta.params } : {}) };
}

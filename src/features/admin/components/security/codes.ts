/** Typed one-time codes (authenticator app or email). Pure. */

/** Digits only, at most 6: pasted "123 456" or "123-456" becomes "123456". */
export const normalizeCode = (raw: string): string => raw.replace(/\D/g, '').slice(0, 6);

export const isCompleteCode = (code: string): boolean => /^\d{6}$/.test(code);

/** The server's reason code on a refused request, if any. */
export function apiErrorCode(err: unknown): string | undefined {
  const details = (err as { details?: { error?: unknown } } | null)?.details;
  return typeof details?.error === 'string' ? details.error : undefined;
}

export const apiErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;

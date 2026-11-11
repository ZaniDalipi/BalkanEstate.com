/**
 * Risky admin requests (deletes, roles, settings, subscriptions and payments)
 * are refused with 403 until they carry a code from the admin's authenticator
 * app. The HTTP client asks the registered handler (the admin panel's code
 * prompt) for a code and repeats the request with it, so no screen has to
 * handle this itself.
 */

export const ADMIN_CODE_HEADER = 'X-Admin-Code';

export type StepUpReason = 'STEP_UP_REQUIRED' | 'STEP_UP_INVALID' | 'STEP_UP_SETUP_REQUIRED';
export interface StepUpRequest {
  reason: StepUpReason;
  message: string;
}
/** Resolves with the typed code, or null when the admin cancels. */
export type StepUpHandler = (request: StepUpRequest) => Promise<string | null>;

const PROMPTABLE: ReadonlySet<string> = new Set(['STEP_UP_REQUIRED', 'STEP_UP_INVALID', 'STEP_UP_SETUP_REQUIRED']);
export const MAX_STEP_UP_TRIES = 3;

let handler: StepUpHandler | null = null;

/** The admin panel registers its prompt here; returns a function that removes it. */
export function setStepUpHandler(next: StepUpHandler | null): () => void {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}

/**
 * For a refused request: the code to retry with, or null to give up (no
 * prompt registered, not a step-up refusal, too many tries, or cancelled).
 */
export async function codeForRetry(status: number, body: unknown, tries: number): Promise<string | null> {
  if (status !== 403 || !handler || tries >= MAX_STEP_UP_TRIES) return null;
  const { error, message } = (body ?? {}) as { error?: unknown; message?: unknown };
  if (typeof error !== 'string' || !PROMPTABLE.has(error)) return null;
  return handler({ reason: error as StepUpReason, message: typeof message === 'string' ? message : '' });
}

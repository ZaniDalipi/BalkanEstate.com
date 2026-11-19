/**
 * Abuse rules for public inquiries, judged against what the same sender sent
 * recently. Pure: the caller loads the history, this decides.
 *
 * The per-IP limiter on the route alone can't stop someone who scripts the
 * endpoint: it is per IP, and the same email can be reused from many IPs.
 * These rules count by sender email AND by (hashed) IP in the database, so
 * they hold across servers and restarts:
 *
 * - the same email asking about the same listing (or the same agent) twice in
 *   a day is a duplicate;
 * - one email, or one IP, may only send so many inquiries per hour and day;
 * - one email may use at most two different phone numbers in a week. A real
 *   buyer has one number (two if they fix a typo); a different made-up number
 *   on every message is what a scripted sender looks like.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const SENDER_LIMITS = {
  duplicateWindowMs: DAY,
  perEmail: { hour: 8, day: 20 },
  perIp: { hour: 10, day: 25 },
  phonesPerEmail: 2,
  phoneWindowMs: 7 * DAY,
} as const;

/** How far back the caller must load history for these rules. */
export const HISTORY_WINDOW_MS = SENDER_LIMITS.phoneWindowMs;

export interface PastInquiry {
  createdAt: Date;
  buyerEmail: string;
  buyerPhone?: string | null;
  propertyId?: string | null;
  recipientId?: string | null;
  senderIpHash?: string | null;
}

export interface InquiryAttempt {
  buyerEmail: string;
  buyerPhone?: string;
  propertyId?: string;
  recipientId?: string;
  senderIpHash: string;
  /** How many inquiries this one request creates (area search fans out). */
  count?: number;
}

export type SenderRejectCode = 'duplicate_inquiry' | 'sender_limit' | 'phone_mismatch';

export type SenderVerdict = { ok: true } | { ok: false; code: SenderRejectCode; message: string };

const within = (p: PastInquiry, now: number, windowMs: number) => now - p.createdAt.getTime() < windowMs;

const isDuplicate = (attempt: InquiryAttempt, sameEmail: PastInquiry[], now: number): boolean =>
  sameEmail.some((p) => {
    if (!within(p, now, SENDER_LIMITS.duplicateWindowMs)) return false;
    if (attempt.propertyId) return p.propertyId === attempt.propertyId;
    return !p.propertyId && !!attempt.recipientId && p.recipientId === attempt.recipientId;
  });

const overLimit = (past: PastInquiry[], limits: { hour: number; day: number }, count: number, now: number): boolean =>
  past.filter((p) => within(p, now, HOUR)).length + count > limits.hour ||
  past.filter((p) => within(p, now, DAY)).length + count > limits.day;

const tooManyPhones = (attempt: InquiryAttempt, sameEmail: PastInquiry[], now: number): boolean => {
  if (!attempt.buyerPhone) return false;
  const phones = new Set<string>([attempt.buyerPhone]);
  for (const p of sameEmail) {
    if (p.buyerPhone && within(p, now, SENDER_LIMITS.phoneWindowMs)) phones.add(p.buyerPhone);
  }
  return phones.size > SENDER_LIMITS.phonesPerEmail;
};

export const evaluateSender = (attempt: InquiryAttempt, history: PastInquiry[], now: number = Date.now()): SenderVerdict => {
  const count = attempt.count ?? 1;
  const sameEmail = history.filter((p) => p.buyerEmail === attempt.buyerEmail);
  const sameIp = history.filter((p) => p.senderIpHash === attempt.senderIpHash);

  if (isDuplicate(attempt, sameEmail, now)) {
    return { ok: false, code: 'duplicate_inquiry', message: 'You already sent this inquiry. The agent will reply to you by email.' };
  }
  if (tooManyPhones(attempt, sameEmail, now)) {
    return { ok: false, code: 'phone_mismatch', message: 'Please use the same phone number as in your earlier inquiries.' };
  }
  if (overLimit(sameEmail, SENDER_LIMITS.perEmail, count, now) || overLimit(sameIp, SENDER_LIMITS.perIp, count, now)) {
    return { ok: false, code: 'sender_limit', message: 'Too many inquiries sent. Please try again later.' };
  }
  return { ok: true };
};

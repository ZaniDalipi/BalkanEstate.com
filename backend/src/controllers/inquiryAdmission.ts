/**
 * The checks every public buyer inquiry passes before it is saved and emailed:
 * honeypot, field validation, then the sender-history rules. Each step sends
 * the HTTP answer itself when it refuses, so controllers just stop on `ok: false`.
 *
 * Refusals carry a machine-readable `code` (and `field` when one field is at
 * fault) so the form can show a translated reason next to that field.
 */
import type { Request, Response } from 'express';
import { apiLogger } from '../utils/logger';
import { isHoneypotFilled, parseBuyerContact, type BuyerContact } from '../services/inquiries/inquiryInput';
import { checkInquirySender, hashSenderIp } from '../services/inquiries/inquiryGuard';
import type { InquiryAttempt, SenderRejectCode } from '../services/inquiries/senderLimits';

export type ContactAdmission =
  | { ok: true; contact: BuyerContact; senderIpHash: string }
  | { ok: false };

const REJECT_STATUS: Record<SenderRejectCode, number> = {
  duplicate_inquiry: 409,
  sender_limit: 429,
  phone_mismatch: 400,
};

const SUCCESS_MESSAGE = 'Your inquiry has been sent successfully';

/** Honeypot and field checks. Bots that fill the hidden field get a silent fake success. */
export const readBuyerContact = (req: Request, res: Response): ContactAdmission => {
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
  const senderIpHash = hashSenderIp(req);

  if (isHoneypotFilled(body)) {
    apiLogger.warn(`[inquiry] Honeypot filled, dropped silently (ip ${senderIpHash})`);
    res.json({ message: SUCCESS_MESSAGE });
    return { ok: false };
  }

  const parsed = parseBuyerContact(body);
  if (parsed.ok === false) {
    const [first] = parsed.errors;
    res.status(400).json({ message: first.message, code: first.code, field: first.field, errors: parsed.errors });
    return { ok: false };
  }
  return { ok: true, contact: parsed.value, senderIpHash };
};

/** Sender-history rules (duplicates, per-sender caps, rotating phone numbers). */
export const admitSender = async (res: Response, attempt: InquiryAttempt): Promise<boolean> => {
  const verdict = await checkInquirySender(attempt);
  if (verdict.ok) return true;

  apiLogger.warn(`[inquiry] Refused (${verdict.code}) for ${attempt.buyerEmail} (ip ${attempt.senderIpHash})`);
  res.status(REJECT_STATUS[verdict.code]).json({
    message: verdict.message,
    code: verdict.code,
    ...(verdict.code === 'phone_mismatch' ? { field: 'buyerPhone' } : {}),
  });
  return false;
};

/**
 * Checks a public inquiry against what the same sender (email or IP) sent
 * recently, before it is saved or emailed to an agent. The rules themselves
 * live in senderLimits.ts; this loads the history and hashes the IP.
 *
 * The IP is stored only as a keyed hash: enough to tell that two inquiries
 * came from the same place, without keeping visitors' addresses.
 */
import crypto from 'crypto';
import type { Request } from 'express';
import Inquiry from '../../models/Inquiry';
import {
  evaluateSender,
  HISTORY_WINDOW_MS,
  type InquiryAttempt,
  type PastInquiry,
  type SenderVerdict,
} from './senderLimits';

const HISTORY_LIMIT = 300;

/** Keyed hash of the visitor's IP (req.ip honours the app's trust-proxy setting). */
export const hashSenderIp = (req: Request): string => {
  const secret = process.env.FINGERPRINT_SECRET || process.env.JWT_SECRET || 'inquiry-ip';
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  return crypto.createHmac('sha256', secret).update(`inquiry:${ip}`).digest('hex').slice(0, 32);
};

const idOrNull = (v: unknown): string | null => (v ? String(v) : null);

const loadHistory = async (buyerEmail: string, senderIpHash: string, now: number): Promise<PastInquiry[]> => {
  const docs = await Inquiry.find({
    createdAt: { $gte: new Date(now - HISTORY_WINDOW_MS) },
    $or: [{ buyerEmail }, { senderIpHash }],
  })
    .select('createdAt buyerEmail buyerPhone propertyId recipientId +senderIpHash')
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT)
    .lean();

  return docs.map((d) => ({
    createdAt: d.createdAt,
    buyerEmail: d.buyerEmail,
    buyerPhone: d.buyerPhone ?? null,
    propertyId: idOrNull(d.propertyId),
    recipientId: idOrNull(d.recipientId),
    senderIpHash: d.senderIpHash ?? null,
  }));
};

/** Decide whether this sender may send the inquiry now. */
export const checkInquirySender = async (attempt: InquiryAttempt): Promise<SenderVerdict> => {
  const now = Date.now();
  const history = await loadHistory(attempt.buyerEmail, attempt.senderIpHash, now);
  return evaluateSender(attempt, history, now);
};

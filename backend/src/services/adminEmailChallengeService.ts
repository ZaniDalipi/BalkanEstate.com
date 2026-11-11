import crypto from 'crypto';
import mongoose from 'mongoose';
import AdminEmailChallenge, { AdminEmailChallengePurpose } from '../models/AdminEmailChallenge';
import type { IUser } from '../models/User';
import emailService from './emailService';
import { adminLogger } from '../utils/logger';

/**
 * One-time codes emailed to an admin to confirm a sensitive step. Each code
 * is tied to one exact action (purpose + subject), lasts 10 minutes, allows
 * 5 tries and works once.
 */

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_OPEN_PER_WINDOW = 5;
const WINDOW_MS = 15 * 60 * 1000;

const hashSecret = (): string => process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || '';
export const hashEmailCode = (challengeId: string, code: string): string =>
  crypto.createHmac('sha256', hashSecret()).update(`${challengeId}:${code}`).digest('hex');

const maskEmail = (email: string): string => {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(1, name.length - 2))}@${domain}`;
};

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export type EmailChallengeError =
  | 'EMAIL_NOT_CONFIGURED'
  | 'EMAIL_CODE_RATE_LIMITED'
  | 'EMAIL_CODE_INVALID'
  | 'EMAIL_CODE_EXPIRED'
  | 'EMAIL_CODE_TOO_MANY_ATTEMPTS';

export type CreateChallengeResult =
  | { ok: true; challengeId: string; sentTo: string; expiresAt: Date }
  | { ok: false; code: EmailChallengeError; message: string };

/** Email a fresh code to the admin for one action, described in plain words in the email. */
export async function createEmailChallenge(
  user: IUser,
  purpose: AdminEmailChallengePurpose,
  subject: string,
  actionText: string
): Promise<CreateChallengeResult> {
  if (!emailService.isConfigured && process.env.NODE_ENV === 'production') {
    return { ok: false, code: 'EMAIL_NOT_CONFIGURED', message: 'Email sending is not set up on the server, so the confirmation code cannot be sent.' };
  }
  const recent = await AdminEmailChallenge.countDocuments({ userId: user._id, createdAt: { $gt: new Date(Date.now() - WINDOW_MS) } });
  if (recent >= MAX_OPEN_PER_WINDOW) {
    return { ok: false, code: 'EMAIL_CODE_RATE_LIMITED', message: 'Too many codes requested. Wait 15 minutes and try again.' };
  }

  const id = new mongoose.Types.ObjectId();
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await AdminEmailChallenge.create({ _id: id, userId: user._id, purpose, subject, codeHash: hashEmailCode(String(id), code), expiresAt });

  if (!emailService.isConfigured) {
    // Development without an email provider: the code is only in the server log.
    adminLogger.warn(`📧 [DEV] Admin confirmation code for ${user.email} (${actionText}): ${code}`);
  } else {
    const text = `Your BalkanEstate confirmation code is ${code}.\n\nIt confirms: ${actionText}\nIt expires in 10 minutes and works once.\n\nIf you did not ask for this, do not share the code, and change your password.`;
    await emailService.sendEmailDirect({
      to: user.email,
      subject: `${code} is your BalkanEstate admin confirmation code`,
      text,
      html: `<p>Your BalkanEstate confirmation code is</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p><p>It confirms: <strong>${escapeHtml(actionText)}</strong><br>It expires in 10 minutes and works once.</p><p style="color:#6b7280">If you did not ask for this, do not share the code, and change your password.</p>`,
      category: 'alerts',
    });
  }
  return { ok: true, challengeId: String(id), sentTo: maskEmail(user.email), expiresAt };
}

/** Check a code for exactly this admin and action; on success it can't be used again. */
export async function verifyEmailChallenge(
  userId: string,
  challengeId: unknown,
  code: unknown,
  purpose: AdminEmailChallengePurpose,
  subject: string
): Promise<{ ok: true } | { ok: false; code: EmailChallengeError; message: string }> {
  const invalid = { ok: false as const, code: 'EMAIL_CODE_INVALID' as const, message: 'The emailed code is not right.' };
  if (typeof challengeId !== 'string' || !mongoose.Types.ObjectId.isValid(challengeId)) return invalid;
  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) return invalid;

  const challenge = await AdminEmailChallenge.findOneAndUpdate(
    { _id: challengeId, userId, purpose, subject, usedAt: { $exists: false } },
    { $inc: { attempts: 1 } },
    { new: true }
  );
  if (!challenge) return invalid;
  if (challenge.expiresAt.getTime() < Date.now()) {
    return { ok: false, code: 'EMAIL_CODE_EXPIRED', message: 'The emailed code has expired. Ask for a new one.' };
  }
  if (challenge.attempts > MAX_ATTEMPTS) {
    return { ok: false, code: 'EMAIL_CODE_TOO_MANY_ATTEMPTS', message: 'Too many wrong codes. Ask for a new one.' };
  }

  const expected = Buffer.from(challenge.codeHash, 'hex');
  const typed = Buffer.from(hashEmailCode(challengeId, code.trim()), 'hex');
  if (expected.length !== typed.length || !crypto.timingSafeEqual(expected, typed)) return invalid;

  const used = await AdminEmailChallenge.updateOne({ _id: challengeId, usedAt: { $exists: false } }, { $set: { usedAt: new Date() } });
  return used.modifiedCount === 1 ? { ok: true } : invalid;
}

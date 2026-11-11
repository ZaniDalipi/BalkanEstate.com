import User, { IUser } from '../models/User';
import { decryptField, encryptField } from '../utils/fieldEncryption';
import { generateTotpSecret, matchTotpStep, totpUri } from '../utils/totp';
import { createEmailChallenge, verifyEmailChallenge } from './adminEmailChallengeService';
import { activityLogger } from './activityLogger';

/**
 * The admin's authenticator app, used to confirm risky admin actions.
 * Setting it up (or replacing it) needs a code emailed to the admin plus a
 * first code from the app. Each app code works once; 5 wrong codes lock it
 * for 15 minutes.
 */

const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;
const ISSUER = 'BalkanEstate Admin';

export type StepUpError = 'STEP_UP_SETUP_REQUIRED' | 'STEP_UP_REQUIRED' | 'STEP_UP_INVALID' | 'STEP_UP_LOCKED';
export type StepUpResult = { ok: true } | { ok: false; code: StepUpError; message: string };

const MESSAGES: Record<StepUpError, string> = {
  STEP_UP_SETUP_REQUIRED: 'Set up your authenticator app first (Admin › Security) to confirm this action.',
  STEP_UP_REQUIRED: 'Enter the 6-digit code from your authenticator app to confirm this action.',
  STEP_UP_INVALID: 'That authenticator code is not right, or was already used. Wait for the next code and try again.',
  STEP_UP_LOCKED: 'Too many wrong authenticator codes. Try again in 15 minutes.',
};
const fail = (code: StepUpError): StepUpResult => ({ ok: false, code, message: MESSAGES[code] });

const withSecrets = (userId: unknown) =>
  User.findById(userId).select('+adminTotp.secretEnc +adminTotp.pendingSecretEnc +adminTotp.lastUsedStep +adminTotp.failedAttempts +adminTotp.lockedUntil email name role');

export async function authenticatorStatus(userId: unknown): Promise<{ enabled: boolean; enabledAt?: Date }> {
  const user = await withSecrets(userId);
  return { enabled: !!user?.adminTotp?.secretEnc, enabledAt: user?.adminTotp?.enabledAt };
}

/** Check an authenticator code for this admin. Each code works once. */
export async function verifyStepUpCode(userId: unknown, code: unknown, now = Date.now()): Promise<StepUpResult> {
  const user = await withSecrets(userId);
  const totp = user?.adminTotp;
  if (!user || !totp?.secretEnc) return fail('STEP_UP_SETUP_REQUIRED');
  if (totp.lockedUntil && totp.lockedUntil.getTime() > now) return fail('STEP_UP_LOCKED');
  if (typeof code !== 'string' || code.trim() === '') return fail('STEP_UP_REQUIRED');

  const step = matchTotpStep(decryptField(totp.secretEnc), code, now);
  if (step === null) {
    const failed = (totp.failedAttempts ?? 0) + 1;
    await User.updateOne(
      { _id: user._id },
      failed >= MAX_FAILED
        ? { $set: { 'adminTotp.failedAttempts': 0, 'adminTotp.lockedUntil': new Date(now + LOCK_MS) } }
        : { $set: { 'adminTotp.failedAttempts': failed } }
    );
    return fail(failed >= MAX_FAILED ? 'STEP_UP_LOCKED' : 'STEP_UP_INVALID');
  }

  // Single use, also when two requests carry the same code at once.
  const claimed = await User.updateOne(
    { _id: user._id, $or: [{ 'adminTotp.lastUsedStep': { $exists: false } }, { 'adminTotp.lastUsedStep': { $lt: step } }] },
    { $set: { 'adminTotp.lastUsedStep': step, 'adminTotp.failedAttempts': 0 }, $unset: { 'adminTotp.lockedUntil': 1 } }
  );
  return claimed.modifiedCount === 1 ? { ok: true } : fail('STEP_UP_INVALID');
}

/**
 * Start setting up (or replacing) the authenticator: a new secret for the app
 * and a code emailed to the admin. Replacing an existing one also needs a
 * current authenticator code (checked by the caller).
 */
export async function startAuthenticatorSetup(admin: IUser) {
  const secret = generateTotpSecret();
  await User.updateOne({ _id: admin._id }, { $set: { 'adminTotp.pendingSecretEnc': encryptField(secret) } });
  const challenge = await createEmailChallenge(admin, 'enable_authenticator', String(admin._id), 'turning on the authenticator app for your admin account');
  if (challenge.ok === false) return challenge;
  return {
    ok: true as const,
    secret,
    otpauthUri: totpUri(secret, admin.email, ISSUER),
    challengeId: challenge.challengeId,
    sentTo: challenge.sentTo,
  };
}

export type ConfirmSetupResult = { ok: true } | { ok: false; code: string; message: string };

/** Finish setup with the emailed code and the first code from the app. */
export async function confirmAuthenticatorSetup(
  admin: IUser,
  input: { challengeId: unknown; emailCode: unknown; appCode: unknown },
  now = Date.now()
): Promise<ConfirmSetupResult> {
  const user = await withSecrets(admin._id);
  const pending = user?.adminTotp?.pendingSecretEnc;
  if (!user || !pending) return { ok: false, code: 'SETUP_NOT_STARTED', message: 'Start the setup again.' };

  const step = typeof input.appCode === 'string' ? matchTotpStep(decryptField(pending), input.appCode, now) : null;
  if (step === null) return { ok: false, code: 'STEP_UP_INVALID', message: 'The code from the app is not right. Check the phone’s time and try the next code.' };

  const email = await verifyEmailChallenge(String(admin._id), input.challengeId, input.emailCode, 'enable_authenticator', String(admin._id));
  if (email.ok === false) return email;

  await User.updateOne(
    { _id: admin._id },
    {
      $set: { 'adminTotp.secretEnc': pending, 'adminTotp.enabledAt': new Date(now), 'adminTotp.lastUsedStep': step, 'adminTotp.failedAttempts': 0 },
      $unset: { 'adminTotp.pendingSecretEnc': 1, 'adminTotp.lockedUntil': 1 },
    }
  );
  activityLogger.logAdminAction(String(admin._id), admin.email, 'authenticator_enabled').catch(() => undefined);
  return { ok: true };
}

/** A super admin removes another admin's authenticator (lost phone); they set it up again. */
export async function resetAuthenticator(actor: IUser, targetId: string): Promise<{ ok: true } | { ok: false; status: 403 | 404; message: string }> {
  if (actor.role !== 'super_admin') return { ok: false, status: 403, message: 'Only a super admin can reset someone’s authenticator.' };
  if (String(actor._id) === targetId) return { ok: false, status: 403, message: 'To replace your own authenticator, set it up again from Admin › Security.' };
  const result = await User.updateOne({ _id: targetId }, { $unset: { adminTotp: 1 } });
  if (result.matchedCount === 0) return { ok: false, status: 404, message: 'User not found' };
  activityLogger.logAdminAction(String(actor._id), actor.email, 'authenticator_reset', targetId).catch(() => undefined);
  return { ok: true };
}

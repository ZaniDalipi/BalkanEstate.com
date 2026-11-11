/**
 * Confirming risky admin actions with an authenticator app: the code maths,
 * which requests need it, setup (emailed code + first app code), single use,
 * lockout, and the HTTP gate.
 */

import express from 'express';
import request from 'supertest';
import User, { IUser } from '../models/User';
import { base32Decode, base32Encode, matchTotpStep, totpCodeForStep, totpStep, totpUri } from '../utils/totp';
import { adminStepUpRequired } from '../utils/adminStepUpRules';
import {
  authenticatorStatus,
  confirmAuthenticatorSetup,
  resetAuthenticator,
  startAuthenticatorSetup,
  verifyStepUpCode,
} from '../services/adminAuthenticatorService';
import { adminStepUpGate } from '../middleware/adminStepUp';

const mailbox: Array<{ to: string; subject: string }> = [];
jest.mock('../services/emailService', () => ({
  __esModule: true,
  default: { isConfigured: true, sendEmailDirect: jest.fn(async (m: { to: string; subject: string }) => { mailbox.push(m); }) },
}));
const emailedCodeFor = (to: string) => mailbox.filter((m) => m.to === to).pop()?.subject.slice(0, 6);

describe('TOTP (RFC 6238 test values)', () => {
  // RFC 6238 appendix B, SHA-1 secret "12345678901234567890"; the 6-digit codes are the last 6 of the 8-digit values.
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('at %i s the code is %s', (seconds, code) => {
    expect(totpCodeForStep(secret, totpStep(seconds * 1000))).toBe(code);
  });

  it('round-trips base32 and accepts one step of clock drift, no more', () => {
    expect(base32Decode(base32Encode(Buffer.from('hello world'))).toString()).toBe('hello world');
    const now = 1_700_000_000_000;
    const step = totpStep(now);
    expect(matchTotpStep(secret, totpCodeForStep(secret, step - 1), now)).toBe(step - 1);
    expect(matchTotpStep(secret, totpCodeForStep(secret, step - 2), now)).toBeNull();
    expect(matchTotpStep(secret, 'abcdef', now)).toBeNull();
  });

  it('builds the link authenticator apps read', () => {
    expect(totpUri('ABC', 'me@x.com', 'BalkanEstate Admin')).toBe(
      'otpauth://totp/BalkanEstate%20Admin%3Ame%40x.com?secret=ABC&issuer=BalkanEstate+Admin&algorithm=SHA1&digits=6&period=30'
    );
  });
});

describe('adminStepUpRequired', () => {
  it.each([
    ['DELETE', '/properties/1'],
    ['DELETE', '/listing-sources/abc'],
    ['PUT', '/users/1/role'],
    ['POST', '/super-admin/claim'],
    ['PATCH', '/system-settings'],
    ['POST', '/system-settings/reset'],
    ['PATCH', '/site-settings'],
    ['PUT', '/alert-settings'],
    ['PATCH', '/email-configs/welcome'],
    ['POST', '/subscriptions/activate'],
    ['PATCH', '/subscriptions/listing-limit/1'],
    ['POST', '/agencies/1/subscription/activate'],
    ['PATCH', '/agencies/1/listing-limit'],
    ['PATCH', '/users/1/listing-counter'],
    ['POST', '/discount-codes/generate'],
    ['POST', '/residences/codes'],
    ['POST', '/residences/1/grant'],
  ])('asks for a code on %s %s', (method, path) => {
    expect(adminStepUpRequired(method, path)).toBe(true);
  });

  it.each([
    ['GET', '/users'],
    ['GET', '/archived-listings'],
    ['PATCH', '/users/1'], // checked in the controller, only when the role changes
    ['POST', '/users/1/role/email-code'],
    ['POST', '/alert-settings/test'],
    ['POST', '/security/authenticator/setup'],
    ['PATCH', '/inquiries/1'],
  ])('lets %s %s through', (method, path) => {
    expect(adminStepUpRequired(method, path)).toBe(false);
  });
});

describe('authenticator (database)', () => {
  const makeAdmin = (email: string, role = 'admin') => User.create({ email, name: email.split('@')[0], password: 'Str0ng!Passw0rd', role });

  /** Set up the authenticator for an admin; returns the app secret. */
  async function setUp(admin: IUser, now: number): Promise<string> {
    const started = await startAuthenticatorSetup(admin);
    if (!started.ok) throw new Error(started.message);
    const result = await confirmAuthenticatorSetup(
      admin,
      { challengeId: started.challengeId, emailCode: emailedCodeFor(admin.email), appCode: totpCodeForStep(started.secret, totpStep(now)) },
      now
    );
    expect(result).toEqual({ ok: true });
    return started.secret;
  }

  it('turns on only with both the emailed code and a code from the app', async () => {
    const admin = await makeAdmin('setup@x.com');
    const started = await startAuthenticatorSetup(admin);
    if (!started.ok) throw new Error('setup failed');
    const now = Date.now();

    expect(await confirmAuthenticatorSetup(admin, { challengeId: started.challengeId, emailCode: '000000', appCode: totpCodeForStep(started.secret, totpStep(now)) }, now))
      .toMatchObject({ ok: false, code: 'EMAIL_CODE_INVALID' });
    expect(await confirmAuthenticatorSetup(admin, { challengeId: started.challengeId, emailCode: emailedCodeFor('setup@x.com'), appCode: '123456' }, now))
      .toMatchObject({ ok: false, code: 'STEP_UP_INVALID' });
    expect((await authenticatorStatus(admin._id)).enabled).toBe(false);

    expect(await confirmAuthenticatorSetup(admin, { challengeId: started.challengeId, emailCode: emailedCodeFor('setup@x.com'), appCode: totpCodeForStep(started.secret, totpStep(now)) }, now))
      .toEqual({ ok: true });
    expect((await authenticatorStatus(admin._id)).enabled).toBe(true);
  });

  it('accepts each code once', async () => {
    const admin = await makeAdmin('once@x.com');
    const t0 = 1_800_000_000_000;
    const secret = await setUp(admin, t0);
    const next = t0 + 30_000;
    const code = totpCodeForStep(secret, totpStep(next));

    expect(await verifyStepUpCode(admin._id, code, next)).toEqual({ ok: true });
    expect(await verifyStepUpCode(admin._id, code, next)).toMatchObject({ ok: false, code: 'STEP_UP_INVALID' });
  });

  it('locks for 15 minutes after 5 wrong codes', async () => {
    const admin = await makeAdmin('lock@x.com');
    const t0 = 1_800_000_000_000;
    const secret = await setUp(admin, t0);
    for (let i = 0; i < 4; i++) expect(await verifyStepUpCode(admin._id, '000000', t0)).toMatchObject({ code: 'STEP_UP_INVALID' });
    expect(await verifyStepUpCode(admin._id, '000000', t0)).toMatchObject({ code: 'STEP_UP_LOCKED' });

    const good = t0 + 60_000;
    expect(await verifyStepUpCode(admin._id, totpCodeForStep(secret, totpStep(good)), good)).toMatchObject({ code: 'STEP_UP_LOCKED' });
    const later = t0 + 16 * 60_000;
    expect(await verifyStepUpCode(admin._id, totpCodeForStep(secret, totpStep(later)), later)).toEqual({ ok: true });
  });

  it('asks to set it up first when there is none', async () => {
    const admin = await makeAdmin('none@x.com');
    expect(await verifyStepUpCode(admin._id, '123456')).toMatchObject({ ok: false, code: 'STEP_UP_SETUP_REQUIRED' });
  });

  it('lets a super admin reset someone else’s authenticator, not their own', async () => {
    const boss = await makeAdmin('boss@x.com', 'super_admin');
    const admin = await makeAdmin('lost@x.com');
    await setUp(admin, Date.now());

    expect(await resetAuthenticator(admin, String(boss._id))).toMatchObject({ ok: false, status: 403 });
    expect(await resetAuthenticator(boss, String(boss._id))).toMatchObject({ ok: false, status: 403 });
    expect(await resetAuthenticator(boss, String(admin._id))).toEqual({ ok: true });
    expect((await authenticatorStatus(admin._id)).enabled).toBe(false);
  });

  it('the HTTP gate stops a delete without a code and lets it through with one', async () => {
    const admin = await makeAdmin('http@x.com');
    const secret = await setUp(admin, Date.now() - 60_000);

    const app = express();
    app.use((req, _res, next) => { req.user = admin; next(); });
    app.use(adminStepUpGate);
    app.delete('/things/:id', (_req, res) => { res.json({ deleted: true }); });
    app.get('/things', (_req, res) => { res.json([]); });

    expect((await request(app).get('/things')).status).toBe(200);

    const missing = await request(app).delete('/things/1');
    expect(missing.status).toBe(403);
    expect(missing.body.error).toBe('STEP_UP_REQUIRED');

    const ok = await request(app).delete('/things/1').set('X-Admin-Code', totpCodeForStep(secret, totpStep(Date.now())));
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ deleted: true });
  });
});

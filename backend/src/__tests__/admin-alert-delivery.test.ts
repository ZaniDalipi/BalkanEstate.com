/**
 * The admin panel's alert settings steer real delivery: the email list, the
 * "New user" / "New property" switches, and the test email.
 */

import SystemSettings from '../models/SystemSettings';
import User from '../models/User';

const email = { sendEmail: jest.fn().mockResolvedValue(undefined), sendEmailDirect: jest.fn().mockResolvedValue(undefined), isConfigured: true };
jest.mock('../services/emailService', () => ({
  __esModule: true,
  default: email,
  sendEmail: (...args: unknown[]) => email.sendEmail(...args),
}));
const push = jest.fn().mockResolvedValue({});
jest.mock('../services/engagementService', () => ({ createNotificationWithPush: (...args: unknown[]) => push(...args) }));

// eslint-disable-next-line import/first
import { adminAlertSettings, notifyAdmins, sendTestAdminAlert } from '../services/adminNotificationService';

const flush = () => new Promise((r) => setTimeout(r, 50));
const newUser = { kind: 'user_registered' as const, userId: 'u', name: 'Ana', email: 'ana@x.com', role: 'buyer', provider: 'email' };

beforeEach(async () => {
  email.sendEmail.mockClear();
  email.sendEmailDirect.mockClear();
  email.isConfigured = true;
  push.mockClear();
  delete process.env.ADMIN_NOTIFICATION_EMAILS;
  delete process.env.ADMIN_REPORT_EMAILS;
  await User.create({ email: 'boss@x.com', name: 'Boss', password: 'Str0ng!Passw0rd', role: 'super_admin' });
});

it('emails the list set in the panel instead of the admin accounts', async () => {
  await SystemSettings.create({ adminNotificationEmails: ['alerts@x.com', 'me@x.com'] });

  notifyAdmins(newUser);
  await flush();

  expect(email.sendEmail.mock.calls.map(([c]) => c.to).sort()).toEqual(['alerts@x.com', 'me@x.com']);
  expect(push).toHaveBeenCalledTimes(1); // the one admin account still gets the in-app/push alert
  expect((await adminAlertSettings()).source).toBe('panel');
});

it('falls back to the admin accounts when the panel list is empty', async () => {
  notifyAdmins(newUser);
  await flush();
  expect(email.sendEmail.mock.calls.map(([c]) => c.to)).toEqual(['boss@x.com']);
});

it('sends nothing for new users when the "New user" switch is off', async () => {
  await SystemSettings.create({ notifyNewUser: false });
  notifyAdmins(newUser);
  await flush();
  expect(email.sendEmail).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
});

it('test email reaches the current recipients', async () => {
  await SystemSettings.create({ adminNotificationEmails: ['alerts@x.com'] });
  expect(await sendTestAdminAlert('Boss')).toEqual({ ok: true, sent: ['alerts@x.com'], failed: [], source: 'panel' });
  expect(email.sendEmailDirect.mock.calls[0][0].subject).toMatch(/^\[Test\]/);
});

it('test email says so when the server cannot send email at all', async () => {
  email.isConfigured = false;
  expect(await sendTestAdminAlert('Boss')).toEqual({ ok: false, reason: 'NO_EMAIL_PROVIDER' });
  expect(email.sendEmailDirect).not.toHaveBeenCalled();
});

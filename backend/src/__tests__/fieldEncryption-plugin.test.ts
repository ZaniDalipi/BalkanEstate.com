/**
 * Field Encryption Plugin — regression tests
 *
 * Guards against the login 500 caused by the decrypt-on-read hook marking
 * encrypted fields (phone/address) as "modified". When that happened, every
 * user.save() in the login flow (reset attempts, append login history, persist
 * refresh token) re-encrypted the PII, so any encryption hiccup turned a valid
 * login into an Internal Server Error.
 */

import mongoose from 'mongoose';
import User from '../models/User';

describe('encryptionPlugin', () => {
  const makeUser = () =>
    User.create({
      email: `enc-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      password: 'S3cur€Pass!x9Kw',
      name: 'Encryption Test',
      phone: '+38344123456',
      role: 'buyer',
    });

  it('decrypts phone on read without marking it modified', async () => {
    const created = await makeUser();

    const user = await User.findById(created._id);
    expect(user).not.toBeNull();

    // Value is readable in plaintext...
    expect(user!.phone).toBe('+38344123456');
    // ...but reading it must NOT dirty the path, otherwise the next save
    // needlessly re-encrypts it.
    expect(user!.isModified('phone')).toBe(false);
  });

  it('keeps the phone encrypted at rest and intact after an unrelated save', async () => {
    const created = await makeUser();

    const user = await User.findById(created._id);
    // Simulate what login does: append a login-history entry and save.
    user!.loginHistory = user!.loginHistory || [];
    user!.loginHistory.push({ timestamp: new Date(), success: true } as any);

    await expect(user!.save()).resolves.toBeDefined();

    // Phone is still readable...
    const reread = await User.findById(created._id);
    expect(reread!.phone).toBe('+38344123456');

    // ...and still stored encrypted (raw value differs from plaintext).
    const raw = await mongoose.connection
      .collection('users')
      .findOne({ _id: created._id });
    expect(raw!.phone).not.toBe('+38344123456');
    expect(String(raw!.phone).split(':').length).toBe(3); // iv:tag:ciphertext
  });

  it('does not 500 an unrelated save when field encryption is misconfigured', async () => {
    const created = await makeUser();

    const user = await User.findById(created._id);

    // Break the encryption key AFTER the read. Because the read no longer
    // marks phone as modified, saving an unrelated change must still succeed —
    // this is exactly the login path (append history / persist token).
    const savedKey = process.env.FIELD_ENCRYPTION_KEY;
    const savedFallback = process.env.ENCRYPTION_KEY;
    process.env.FIELD_ENCRYPTION_KEY = 'too-short';
    process.env.ENCRYPTION_KEY = 'too-short';
    try {
      user!.loginHistory = user!.loginHistory || [];
      user!.loginHistory.push({ timestamp: new Date(), success: true } as any);
      await expect(user!.save()).resolves.toBeDefined();
    } finally {
      process.env.FIELD_ENCRYPTION_KEY = savedKey;
      process.env.ENCRYPTION_KEY = savedFallback;
    }
  });
});

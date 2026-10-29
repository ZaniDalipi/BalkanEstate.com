/**
 * Sandbox env: the committed template holds no real secrets, every app secret
 * is generated per machine, and a leftover .env can't leak keys through.
 */
process.env.SKIP_TEST_DB = 'true';

import fs from 'fs';
import path from 'path';
import {
  GENERATE_MARKER,
  fillSandboxTemplate,
  keysLeakingFromBaseEnv,
  parseEnvKeys,
} from '../utils/sandboxEnv';

const template = fs.readFileSync(path.resolve(__dirname, '../../.env.sandbox.example'), 'utf8');

describe('parseEnvKeys', () => {
  it('reads assigned keys and skips comments and blanks', () => {
    expect(parseEnvKeys('# A=1\n\nB=2\n  C=\nnot a line')).toEqual(['B', 'C']);
  });
});

describe('fillSandboxTemplate', () => {
  it('replaces only __GENERATE__ values, each with its own value', () => {
    const result = fillSandboxTemplate(`A=${GENERATE_MARKER}\nB=keep\nC=${GENERATE_MARKER}`, (key) => `v-${key}`);
    expect(result).toEqual({ ok: true, content: 'A=v-A\nB=keep\nC=v-C', generatedKeys: ['A', 'C'] });
  });

  it('fails instead of leaving a marker in the file', () => {
    const result = fillSandboxTemplate(`A=${GENERATE_MARKER}`, () => undefined);
    expect(result.ok).toBe(false);
  });
});

describe('keysLeakingFromBaseEnv', () => {
  it('lists base keys the sandbox file does not set', () => {
    expect(keysLeakingFromBaseEnv('JWT_SECRET=x\nCUSTOM=y', 'JWT_SECRET=z')).toEqual(['CUSTOM']);
  });

  it('treats an empty sandbox value as covering the key', () => {
    expect(keysLeakingFromBaseEnv('STRIPE_SECRET_KEY=sk_live_x', 'STRIPE_SECRET_KEY=')).toEqual([]);
  });
});

describe('.env.sandbox.example', () => {
  const keys = parseEnvKeys(template);
  const valueOf = (key: string) => new RegExp(`^${key}=(.*)$`, 'm').exec(template)?.[1];

  it('lists every secret the backend reads', () => {
    const secrets = [
      'MONGODB_URI', 'MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY',
      'FIELD_ENCRYPTION_KEY', 'PASSWORD_PEPPER', 'FINGERPRINT_SECRET', 'SEARCH_HASH_SALT',
      'AUDIT_SECRET', 'VAPID_PRIVATE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
      'PAYSERA_SIGN_PASSWORD', 'RESEND_API_KEY', 'SMTP_PASS', 'R2_SECRET_ACCESS_KEY',
      'CLOUDINARY_API_SECRET', 'GEMINI_API_KEY', 'GOOGLE_AI_API_KEY', 'GOOGLE_CLIENT_SECRET',
      'APP_STORE_PRIVATE_KEY', 'GOOGLE_PLAY_PRIVATE_KEY', 'OWM_API_KEY', 'FIRMS_MAP_KEY',
      'UNSPLASH_ACCESS_KEY', 'SENTRY_DSN',
    ];
    expect(secrets.filter((key) => !keys.includes(key))).toEqual([]);
  });

  it('holds only empty values or markers for secrets, never a real-looking key', () => {
    const secretLike = keys.filter((key) => /SECRET|PASS|KEY|TOKEN|PEPPER|SALT|DSN|URI|URL$/.test(key));
    const filled = secretLike.filter((key) => {
      const value = valueOf(key) ?? '';
      return value !== '' && value !== GENERATE_MARKER && !value.startsWith('http://localhost');
    });
    expect(filled).toEqual([]);
  });

  it('fills every marker, including the keys the server requires', () => {
    const result = fillSandboxTemplate(template, () => 'x'.repeat(96));
    expect(result.ok).toBe(true);
    if (result.ok === false) return;
    expect(result.content).not.toMatch(new RegExp(`=${GENERATE_MARKER}$`, 'm'));
    expect(result.generatedKeys).toEqual(expect.arrayContaining(['JWT_SECRET', 'ENCRYPTION_KEY', 'PASSWORD_PEPPER']));
  });
});

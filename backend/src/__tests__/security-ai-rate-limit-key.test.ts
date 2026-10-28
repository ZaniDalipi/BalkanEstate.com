/**
 * Security Tests: AI rate-limit key
 * The AI limiter runs before `protect`, so anonymous requests must be keyed by
 * client IP — never one shared constant bucket that a single client can drain.
 */

import { Request } from 'express';
import { aiRateLimitKey } from '../middleware/security';

const req = (overrides: Record<string, unknown>): Request => overrides as unknown as Request;

describe('aiRateLimitKey', () => {
  it('keys an authenticated request by user id', () => {
    expect(aiRateLimitKey(req({ user: { id: 'u1' }, ip: '1.2.3.4' }))).toBe('ai_user_u1');
  });

  it('accepts a Mongoose-style _id', () => {
    expect(aiRateLimitKey(req({ user: { _id: 'u2' }, ip: '1.2.3.4' }))).toBe('ai_user_u2');
  });

  it('gives different anonymous clients different buckets', () => {
    const a = aiRateLimitKey(req({ ip: '1.2.3.4' }));
    const b = aiRateLimitKey(req({ ip: '5.6.7.8' }));
    expect(a).not.toBe(b);
    expect(a).toContain('1.2.3.4');
  });

  it('groups an IPv6 client by its /56 prefix so rotating addresses share a bucket', () => {
    const a = aiRateLimitKey(req({ ip: '2001:db8:abcd:1200::1' }));
    const b = aiRateLimitKey(req({ ip: '2001:db8:abcd:1200::2' }));
    expect(a).toBe(b);
  });
});

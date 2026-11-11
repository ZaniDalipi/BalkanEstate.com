import { describe, expect, it } from 'vitest';
import { shouldRetryRefusedHandshake, socketActionForToken } from './socketTokenActions';

describe('socketActionForToken', () => {
  it('connects an idle or refused socket once a token is here', () => {
    expect(socketActionForToken({ active: false, handshakeUserId: null }, 'u1')).toBe('connect');
    expect(socketActionForToken({ active: false, handshakeUserId: 'u1' }, 'u1')).toBe('connect');
  });

  it('leaves the socket alone while it is connected or retrying as the same user', () => {
    expect(socketActionForToken({ active: true, handshakeUserId: 'u1' }, 'u1')).toBe('none');
    expect(socketActionForToken({ active: true, handshakeUserId: null }, 'u1')).toBe('none');
  });

  it("starts over when another account's token arrives", () => {
    expect(socketActionForToken({ active: true, handshakeUserId: 'u1' }, 'u2')).toBe('reconnect');
  });

  it('disconnects on sign-out, and only an active socket', () => {
    expect(socketActionForToken({ active: true, handshakeUserId: 'u1' }, null)).toBe('disconnect');
    expect(socketActionForToken({ active: false, handshakeUserId: null }, null)).toBe('none');
  });
});

describe('shouldRetryRefusedHandshake', () => {
  it('retries with a token the server has not refused yet', () => {
    expect(shouldRetryRefusedHandshake('old', 'rotated')).toBe(true);
    expect(shouldRetryRefusedHandshake(null, 'token')).toBe(true);
  });

  it('does not resend the refused token, nor connect without one', () => {
    expect(shouldRetryRefusedHandshake('old', 'old')).toBe(false);
    expect(shouldRetryRefusedHandshake('old', null)).toBe(false);
  });
});

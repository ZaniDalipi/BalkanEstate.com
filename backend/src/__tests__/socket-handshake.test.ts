process.env.SKIP_TEST_DB = 'true';

import { isSecureHandshake } from '../sockets/socketHandshake';

describe('isSecureHandshake', () => {
  it('trusts a TLS connection to the server itself', () => {
    expect(isSecureHandshake({ secure: true, headers: {} })).toBe(true);
  });

  it('trusts the scheme the proxy reports, read like Express reads req.protocol', () => {
    expect(isSecureHandshake({ secure: false, headers: { 'x-forwarded-proto': 'https' } })).toBe(true);
    expect(isSecureHandshake({ secure: false, headers: { 'x-forwarded-proto': 'HTTPS' } })).toBe(true);
    expect(isSecureHandshake({ secure: false, headers: { 'x-forwarded-proto': 'https, http' } })).toBe(true);
  });

  it('refuses plain HTTP, with or without a proxy', () => {
    expect(isSecureHandshake({ secure: false, headers: {} })).toBe(false);
    expect(isSecureHandshake({ secure: false, headers: { 'x-forwarded-proto': 'http' } })).toBe(false);
    expect(isSecureHandshake({ secure: false, headers: { 'x-forwarded-proto': 'http, https' } })).toBe(false);
  });
});

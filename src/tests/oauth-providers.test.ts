import { describe, it, expect } from 'vitest';
import { readOAuthProviders } from '@/services/apiService';

describe('readOAuthProviders', () => {
  it('reads the providers the server switched on', () => {
    expect(readOAuthProviders({ providers: { google: true, apple: false } })).toEqual({ google: true, apple: false });
  });

  it('treats a missing or malformed reply as no providers, instead of crashing the sign-in window', () => {
    expect(readOAuthProviders({})).toEqual({ google: false, apple: false });
    expect(readOAuthProviders(null)).toEqual({ google: false, apple: false });
    expect(readOAuthProviders({ providers: { google: 'yes' } })).toEqual({ google: false, apple: false });
  });
});

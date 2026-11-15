import { describe, it, expect } from 'vitest';
import { listingTypeFromQuery } from './listingTypeFromQuery';
import { paths } from '@/src/app/router/paths';

describe('listingTypeFromQuery', () => {
  it('accepts the two listing types', () => {
    expect(listingTypeFromQuery('individual')).toBe('individual');
    expect(listingTypeFromQuery('business')).toBe('business');
  });
  it('ignores anything else', () => {
    expect(listingTypeFromQuery(null)).toBeUndefined();
    expect(listingTypeFromQuery('Individual')).toBeUndefined();
    expect(listingTypeFromQuery('admin')).toBeUndefined();
  });
  it('round-trips through the create-form link', () => {
    expect(paths.businessListingNew()).toBe('/business-directory/new');
    const url = new URL(paths.businessListingNew('individual'), 'https://x.test');
    expect(url.pathname).toBe('/business-directory/new');
    expect(listingTypeFromQuery(url.searchParams.get('type'))).toBe('individual');
  });
});

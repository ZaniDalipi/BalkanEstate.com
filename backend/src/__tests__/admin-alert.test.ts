import { buildAdminAlert, parseAdminEmails } from '../utils/adminAlert';

describe('buildAdminAlert', () => {
  it('describes a new user and links to the users page', () => {
    const alert = buildAdminAlert(
      { kind: 'user_registered', userId: 'u1', name: 'Ana', email: 'ana@example.com', role: 'agent', provider: 'google' },
      'https://site.test/'
    );
    expect(alert.subject).toBe('New user: Ana (ana@example.com)');
    expect(alert.actionUrl).toBe('/admin/users');
    expect(alert.html).toContain('https://site.test/admin/users');
    expect(alert.text).toContain('Signed up with: google');
  });

  it('describes a new listing with price and place, and links to it', () => {
    const alert = buildAdminAlert(
      {
        kind: 'listing_created', propertyId: 'p1', title: 'Flat', price: 95000, city: 'Tirana',
        country: 'Albania', status: 'active', listingType: 'sale', sellerName: 'Ben',
      },
      'https://site.test'
    );
    expect(alert.subject).toBe('New listing: Flat (Tirana, Albania)');
    expect(alert.message).toBe('Flat · €95,000 · Tirana, Albania');
    expect(alert.actionUrl).toBe('/property/p1');
  });

  it('escapes user text in the email and keeps the subject on one line', () => {
    const alert = buildAdminAlert(
      { kind: 'user_registered', userId: 'u1', name: '<script>x</script>\r\nBcc: evil@x.com', email: 'a@b.co', role: 'buyer', provider: 'email' },
      'https://site.test'
    );
    expect(alert.html).not.toContain('<script>');
    expect(alert.html).toContain('&lt;script&gt;');
    expect(alert.subject).not.toMatch(/[\r\n]/);
  });

  it('says "Price on request" for a listing without a price', () => {
    const alert = buildAdminAlert(
      { kind: 'listing_created', propertyId: 'p', price: 0, status: 'draft', listingType: 'rent' },
      'https://site.test'
    );
    expect(alert.message).toBe('Untitled listing · Price on request');
  });
});

describe('role change alert', () => {
  it('says who changed whose role, from what to what', () => {
    const alert = buildAdminAlert(
      { kind: 'role_changed', userId: 'u1', name: 'Ana', email: 'ana@example.com', from: 'buyer', to: 'super_admin', byName: 'Zana' },
      'https://site.test'
    );
    expect(alert.subject).toBe('Role changed: Ana is now super admin');
    expect(alert.message).toBe('Ana: buyer → super admin (by Zana)');
    expect(alert.actionUrl).toBe('/admin/users');
  });
});

describe('parseAdminEmails', () => {
  it('splits, lower-cases, de-duplicates and drops invalid entries', () => {
    expect(parseAdminEmails(' A@x.com, a@x.com,not-an-email, b@y.org ,')).toEqual(['a@x.com', 'b@y.org']);
  });

  it('is empty when nothing is set', () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
  });
});

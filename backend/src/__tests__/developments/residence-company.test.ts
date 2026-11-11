process.env.SKIP_TEST_DB = 'true';

import { agencyAsBuilder } from '../../services/developments/residenceCompany';

describe('agencyAsBuilder', () => {
  it('shows the publishing agency as the company, from its public page fields', () => {
    expect(
      agencyAsBuilder({
        name: ' Vardar Homes ',
        slug: 'north-macedonia/vardar-homes',
        description: 'We sell and build in Skopje.',
        logo: 'https://media.test/a/logo.webp',
        coverImage: 'https://media.test/a/cover.webp',
        email: 'hello@vardar.example.com',
        phone: '+389 2 555 1234',
        address: 'Ul. Makedonija 3',
        zipCode: '1000',
        city: 'Skopje',
        country: 'North Macedonia',
        website: 'https://vardar.example.com',
        instagramUrl: 'https://instagram.com/vardar',
        facebookUrl: '',
      })
    ).toEqual({
      name: 'Vardar Homes',
      source: 'agency',
      agencySlug: 'north-macedonia/vardar-homes',
      about: 'We sell and build in Skopje.',
      address: 'Ul. Makedonija 3, 1000 Skopje, North Macedonia',
      phone: '+389 2 555 1234',
      email: 'hello@vardar.example.com',
      website: 'https://vardar.example.com/',
      logo: { url: 'https://media.test/a/logo.webp' },
      banner: { url: 'https://media.test/a/cover.webp' },
      socials: { instagram: 'https://instagram.com/vardar' },
    });
  });

  it('drops what is unsafe or malformed, and never anything private', () => {
    const out = agencyAsBuilder({
      name: 'Vardar Homes',
      website: 'javascript:alert(1)',
      logo: 'data:image/svg+xml,<svg onload=alert(1)>',
      email: 'not-an-email',
      linkedinUrl: 'ftp://linkedin.com/x',
      registrationNumber: 'PIB-123',
      invitationCode: 'AGY-SECRET',
      ownerId: 'u1',
    } as never);
    expect(out).toEqual({ name: 'Vardar Homes', source: 'agency' });
  });

  it('is nothing without an agency or a usable name', () => {
    expect(agencyAsBuilder(null)).toBeUndefined();
    expect(agencyAsBuilder({ name: '   ' })).toBeUndefined();
    expect(agencyAsBuilder({ name: 'x'.repeat(121) })).toBeUndefined();
  });
});

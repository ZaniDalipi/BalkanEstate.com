import type { LanyardMember } from '@/src/components/ui/team-lanyard-rail';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';

/** How many professionals hang on the rail; more turns it into a crowd. */
export const MAX_LANYARDS = 8;
const BIO_MAX = 140;

export interface LanyardMapping {
  /** Translated category name, printed as the role. */
  roleOf: (listing: BusinessListing) => string;
  /** Sized portrait URL for a listing (logo, else the owner's avatar). */
  imageOf: (listing: BusinessListing) => string;
  /** Link to the listing's own page. */
  profileHrefOf: (listing: BusinessListing) => string;
  labels: { profile: string; email: string; call: string; verified: string };
}

export function shortBio(text: string | undefined, max = BIO_MAX): string | undefined {
  const clean = text?.replace(/\s+/g, ' ').trim();
  if (!clean) return undefined;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Individual listings → badges for the lanyard rail (profile link first, then email, then phone). */
export function toLanyardMembers(listings: BusinessListing[], map: LanyardMapping): LanyardMember[] {
  return listings
    .filter((l) => l.listingType === 'individual')
    .slice(0, MAX_LANYARDS)
    .map((l, i) => {
      const links = [{ label: map.labels.profile, href: map.profileHrefOf(l) }];
      if (l.contactEmail) links.push({ label: map.labels.email, href: `mailto:${l.contactEmail}` });
      if (l.contactPhone) links.push({ label: map.labels.call, href: `tel:${l.contactPhone.replace(/[^\d+]/g, '')}` });
      const tags = [...(l.isVerified ? [map.labels.verified] : []), ...(l.services ?? [])].slice(0, 3);
      return {
        id: l.id,
        name: l.name,
        role: map.roleOf(l),
        team: [l.city, l.country].filter(Boolean).join(', ') || undefined,
        image: map.imageOf(l),
        bio: shortBio(l.description),
        tags,
        links,
        tone: ((i % 5) + 1) as LanyardMember['tone'],
      };
    });
}

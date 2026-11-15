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
  /** Phrases for the facts that fill a badge's back when the owner wrote little. */
  facts: {
    locatedIn: (role: string, place: string) => string;
    serves: (areas: string) => string;
    speaks: (languages: string) => string;
    established: (year: number) => string;
    memberSince: (year: number) => string;
  };
}

const list = (items: string[] | undefined, max: number) => (items ?? []).map((x) => x.trim()).filter(Boolean).slice(0, max).join(', ');

/**
 * Without a description, the back still says something true: what and
 * where, the areas served, the languages spoken and the year founded.
 */
export function factsBio(l: BusinessListing, role: string, facts: LanyardMapping['facts']): string {
  const place = [l.city, l.country].filter(Boolean).join(', ');
  const parts = [place ? facts.locatedIn(role, place) : role];
  const areas = list(l.serviceAreas?.filter((a) => a !== l.city), 2);
  if (areas) parts.push(facts.serves(areas));
  const languages = list(l.languages, 3);
  if (languages) parts.push(facts.speaks(languages));
  if (l.yearEstablished) parts.push(facts.established(l.yearEstablished));
  return parts.join(' ');
}

/** Up to three short chips: Verified, services, then price, founding year, a language, member since. */
export function badgeTags(l: BusinessListing, map: LanyardMapping): string[] {
  const joined = Number.parseInt(l.createdAt?.slice(0, 4) ?? '', 10);
  const chips = [
    ...(l.isVerified ? [map.labels.verified] : []),
    ...(l.services ?? []),
    ...(l.priceRange ? [l.priceRange] : []),
    ...(l.yearEstablished ? [map.facts.established(l.yearEstablished)] : []),
    ...(l.languages?.length ? [l.languages[0]] : []),
    ...(Number.isFinite(joined) ? [map.facts.memberSince(joined)] : []),
  ].map((c) => c.trim()).filter(Boolean);
  return Array.from(new Set(chips)).slice(0, 3);
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
      const role = map.roleOf(l);
      return {
        id: l.id,
        name: l.name,
        role,
        team: [l.city, l.country].filter(Boolean).join(', ') || undefined,
        image: map.imageOf(l),
        bio: shortBio(l.description) ?? shortBio(factsBio(l, role, map.facts)),
        tags: badgeTags(l, map),
        links,
        tone: ((i % 5) + 1) as LanyardMember['tone'],
      };
    });
}

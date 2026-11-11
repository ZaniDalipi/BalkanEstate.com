/**
 * The company shown behind a residence when its owner has not named a
 * builder: the agency that published it, from the public fields of its own
 * agency page (never its registration number, team, billing or storage keys).
 * Residences owned by a person have no such fallback.
 */
import Agency from '../../models/Agency';
import type { IDevelopment } from '../../models/Development';
import { BUILDER_LIMITS as L } from './builderProfile';
import { businessAsBuilder } from './builderBusiness';

/** Only what the agency's public page already shows. */
const PUBLIC_AGENCY_FIELDS = 'name slug description logo coverImage email phone address zipCode city country website facebookUrl instagramUrl linkedinUrl';

export interface AgencyLike {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  logo?: unknown;
  coverImage?: unknown;
  email?: unknown;
  phone?: unknown;
  address?: unknown;
  zipCode?: unknown;
  city?: unknown;
  country?: unknown;
  website?: unknown;
  facebookUrl?: unknown;
  instagramUrl?: unknown;
  linkedinUrl?: unknown;
}

const str = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s && s.length <= max ? s : undefined;
};
const httpUrl = (v: unknown, max: number): string | undefined => {
  const s = str(v, max);
  if (!s) return undefined;
  try {
    const url = new URL(s);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The agency as the residence's company, in the builder's public shape; undefined without a usable name. */
export function agencyAsBuilder(agency: AgencyLike | null | undefined): Record<string, unknown> | undefined {
  const name = str(agency?.name, L.name);
  if (!agency || !name) return undefined;
  const email = str(agency.email, L.email);
  const place = [str(agency.zipCode, 20), str(agency.city, 80)].filter(Boolean).join(' ');
  const address = [str(agency.address, L.address), place, str(agency.country, 80)].filter(Boolean).join(', ');
  const socials = {
    facebook: httpUrl(agency.facebookUrl, L.social),
    instagram: httpUrl(agency.instagramUrl, L.social),
    linkedin: httpUrl(agency.linkedinUrl, L.social),
  };
  const logo = httpUrl(agency.logo, 2000);
  const banner = httpUrl(agency.coverImage, 2000);
  const slug = str(agency.slug, 200);
  const out: Record<string, unknown> = {
    name,
    source: 'agency',
    ...(slug ? { agencySlug: slug } : {}),
    ...(str(agency.description, L.about) ? { about: str(agency.description, L.about) } : {}),
    ...(address && address.length <= L.address ? { address } : {}),
    ...(str(agency.phone, L.phone) ? { phone: str(agency.phone, L.phone) } : {}),
    ...(email && EMAIL.test(email) ? { email } : {}),
    ...(httpUrl(agency.website, L.website) ? { website: httpUrl(agency.website, L.website) } : {}),
    ...(logo ? { logo: { url: logo } } : {}),
    ...(banner ? { banner: { url: banner } } : {}),
  };
  const links = Object.fromEntries(Object.entries(socials).filter(([, v]) => !!v));
  if (Object.keys(links).length) out.socials = links;
  return out;
}

/** The agency that published the residence (agency-owned residences only), with its public fields. */
export const loadOwnerAgency = async (development: Pick<IDevelopment, 'ownerType' | 'agencyId'>): Promise<AgencyLike | null> =>
  development.ownerType === 'agency' && development.agencyId
    ? ((await Agency.findById(development.agencyId).select(PUBLIC_AGENCY_FIELDS).lean()) as AgencyLike | null)
    : null;

/**
 * The company buyers see behind a residence, most specific first: its linked
 * Business Directory company (with what the owner typed filling the gaps),
 * else the builder the owner typed, else the agency that published it.
 */
export function resolveCompany(
  typed: Record<string, unknown> | undefined,
  business: Parameters<typeof businessAsBuilder>[0],
  agency: AgencyLike | null | undefined
): Record<string, unknown> | undefined {
  return businessAsBuilder(business, typed ?? {}) ?? (typed?.name ? typed : undefined) ?? agencyAsBuilder(agency);
}

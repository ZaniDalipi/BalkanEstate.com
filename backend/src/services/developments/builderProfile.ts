/**
 * The builder (the company building the residence), as the owner enters it.
 * Every value is checked here, on the server, even though the form checks it
 * too; each refusal names its field (`builder.<field>`) and carries a code the
 * client translates. The logo and banner are not set here (see builderMedia).
 */
import { BUILDER_SOCIAL_NETWORKS, type BuilderSocialNetwork, type IDevelopmentBuilder } from '../../models/Development';
import { ValidationError } from './developmentService';

export const BUILDER_LIMITS = {
  name: 120,
  tagline: 160,
  about: 3000,
  licenseNumber: 60,
  website: 300,
  email: 254,
  phone: 40,
  address: 200,
  social: 300,
  maxProjects: 10000,
  minFoundedYear: 1800,
} as const;

/** The site a social link must point to, per network. */
const SOCIAL_HOSTS: Record<BuilderSocialNetwork, string[]> = {
  facebook: ['facebook.com', 'fb.com'],
  instagram: ['instagram.com'],
  linkedin: ['linkedin.com'],
  youtube: ['youtube.com', 'youtu.be'],
};

/** Each network's brand name, shown in the error message as is. */
const SOCIAL_LABELS: Record<BuilderSocialNetwork, string> = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube' };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARS = /^\+?[\d\s().-]+$/;

const fail = (message: string, code: string, field: string, params?: Record<string, string | number>): never => {
  throw new ValidationError(message, { code, field: `builder.${field}`, params });
};

const text = (raw: Record<string, unknown>, field: string, max: number): string | undefined => {
  const v = raw[field];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') return fail(`builder.${field} must be text`, 'FIELD_INVALID', field);
  const s = v.trim();
  if (s.length > max) fail(`builder.${field} is too long`, 'FIELD_TOO_LONG', field, { max });
  return s || undefined;
};

const wholeNumber = (raw: Record<string, unknown>, field: string, min: number, max: number): number | undefined => {
  const v = raw[field];
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'string' ? Number(v.trim()) : v;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) {
    return fail(`builder.${field} must be a whole number from ${min} to ${max}`, 'FIELD_RANGE', field, { min, max });
  }
  return n;
};

/** A plain http(s) address on a real site; `hosts` limits it to one network. */
const webAddress = (value: string, field: string, hosts?: string[], network?: string): string => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail(`builder.${field} must be a full web address`, 'URL_INVALID', field);
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password || !url.hostname.includes('.')) {
    return fail(`builder.${field} must be an http(s) address`, 'URL_INVALID', field);
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (hosts && !hosts.some((h) => host === h || host.endsWith(`.${h}`))) {
    return fail(`builder.${field} must be a ${network} link`, 'SOCIAL_HOST', field, { network: network ?? '' });
  }
  return value;
};

/** A phone number: digits with an optional leading +, spaces, dots, dashes or brackets; 6–15 digits. */
export const phoneProblem = (value: string): boolean => {
  if (!PHONE_CHARS.test(value)) return true;
  const digits = value.replace(/\D/g, '').length;
  return digits < 6 || digits > 15;
};

/**
 * The builder's text fields from a request body, validated and trimmed.
 * `null` (or an object with nothing filled in) removes them. A name is needed
 * as soon as anything else is filled in, since buyers see the company by name.
 */
export function normalizeBuilderText(value: unknown, now = new Date()): Omit<IDevelopmentBuilder, 'logo' | 'banner'> | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return fail('builder must be an object', 'FIELD_INVALID', 'name');
  const raw = value as Record<string, unknown>;
  const L = BUILDER_LIMITS;

  const out: Omit<IDevelopmentBuilder, 'logo' | 'banner'> = {
    name: text(raw, 'name', L.name),
    tagline: text(raw, 'tagline', L.tagline),
    about: text(raw, 'about', L.about),
    licenseNumber: text(raw, 'licenseNumber', L.licenseNumber),
    address: text(raw, 'address', L.address),
    foundedYear: wholeNumber(raw, 'foundedYear', L.minFoundedYear, now.getFullYear()),
    completedProjects: wholeNumber(raw, 'completedProjects', 0, L.maxProjects),
  };

  const website = text(raw, 'website', L.website);
  if (website) out.website = webAddress(website, 'website');
  const email = text(raw, 'email', L.email);
  if (email) {
    if (!EMAIL.test(email)) fail('builder.email is not a valid email address', 'EMAIL_INVALID', 'email');
    out.email = email;
  }
  const phone = text(raw, 'phone', L.phone);
  if (phone) {
    if (phoneProblem(phone)) fail('builder.phone is not a valid phone number', 'PHONE_INVALID', 'phone');
    out.phone = phone;
  }

  const socialsRaw = raw.socials;
  if (socialsRaw !== undefined && socialsRaw !== null) {
    if (typeof socialsRaw !== 'object' || Array.isArray(socialsRaw)) fail('builder.socials must be an object', 'FIELD_INVALID', 'socials');
    const socials: Partial<Record<BuilderSocialNetwork, string>> = {};
    for (const network of BUILDER_SOCIAL_NETWORKS) {
      const link = text(socialsRaw as Record<string, unknown>, network, L.social);
      if (link) socials[network] = webAddress(link, `socials.${network}`, SOCIAL_HOSTS[network], SOCIAL_LABELS[network]);
    }
    if (Object.keys(socials).length) out.socials = socials;
  }

  const filled = Object.entries(out).filter(([, v]) => v !== undefined);
  if (filled.length === 0) return null;
  if (!out.name) fail('builder.name is required', 'FIELD_REQUIRED', 'name');
  return Object.fromEntries(filled) as Omit<IDevelopmentBuilder, 'logo' | 'banner'>;
}

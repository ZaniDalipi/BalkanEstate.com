/**
 * The builder form: its state as text, the checks (the same rules and the same
 * error codes as the server, services/developments/builderProfile), and the
 * payload it sends. Errors are `{ code, params }`, translated with the shared
 * `apiErrors.<code>` texts, so a refusal reads the same from either side.
 */
import { BUILDER_SOCIAL_LABELS, BUILDER_SOCIAL_NETWORKS, type BuilderPayload, type BuilderSocialNetwork, type DevelopmentBuilder } from '../types';
import { isWebUrl, stripScheme, toWebUrl } from '../utils/webAddress';

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

type TextField = 'name' | 'tagline' | 'about' | 'licenseNumber' | 'website' | 'email' | 'phone' | 'address' | 'foundedYear' | 'completedProjects';
export type BuilderForm = Record<TextField, string> & { socials: Record<BuilderSocialNetwork, string> };
/** Form field keys: the text fields and `socials.<network>`. */
export type BuilderField = TextField | `socials.${BuilderSocialNetwork}`;
export interface BuilderFieldError {
  code: string;
  params?: Record<string, string | number>;
}
export type BuilderErrors = Partial<Record<BuilderField, BuilderFieldError>>;

const SOCIAL_HOSTS: Record<BuilderSocialNetwork, string[]> = {
  facebook: ['facebook.com', 'fb.com'],
  instagram: ['instagram.com'],
  linkedin: ['linkedin.com'],
  youtube: ['youtube.com', 'youtu.be'],
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARS = /^\+?[\d\s().-]+$/;

const str = (v: string | number | undefined): string => (v === undefined || v === null ? '' : String(v));

export const builderToForm = (b?: DevelopmentBuilder): BuilderForm => ({
  name: str(b?.name),
  tagline: str(b?.tagline),
  about: str(b?.about),
  licenseNumber: str(b?.licenseNumber),
  // Web addresses are typed without https:// (the field shows it; it is added on save).
  website: stripScheme(str(b?.website)),
  email: str(b?.email),
  phone: str(b?.phone),
  address: str(b?.address),
  foundedYear: str(b?.foundedYear),
  completedProjects: str(b?.completedProjects),
  socials: Object.fromEntries(BUILDER_SOCIAL_NETWORKS.map((n) => [n, stripScheme(str(b?.socials?.[n]))])) as Record<BuilderSocialNetwork, string>,
});

/** A typed address (https:// added) on a real site, optionally on one network's site; else the error. */
const webProblem = (typed: string, network?: BuilderSocialNetwork): BuilderFieldError | null => {
  const href = toWebUrl(typed);
  if (!isWebUrl(href)) return { code: 'URL_INVALID' };
  const url = new URL(href);
  if (network) {
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!SOCIAL_HOSTS[network].some((h) => host === h || host.endsWith(`.${h}`))) return { code: 'SOCIAL_HOST', params: { network: BUILDER_SOCIAL_LABELS[network] } };
  }
  return null;
};

export const isValidPhone = (value: string): boolean => {
  if (!PHONE_CHARS.test(value)) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= 6 && digits <= 15;
};

const isEmpty = (f: BuilderForm): boolean =>
  (Object.keys(f) as (keyof BuilderForm)[]).every((k) => (k === 'socials' ? Object.values(f.socials).every((v) => !v.trim()) : !(f[k] as string).trim()));

export function validateBuilderForm(f: BuilderForm, now = new Date()): BuilderErrors {
  const errors: BuilderErrors = {};
  if (isEmpty(f)) return errors;
  const L = BUILDER_LIMITS;
  const tooLong: [TextField, number][] = [['name', L.name], ['tagline', L.tagline], ['about', L.about], ['licenseNumber', L.licenseNumber], ['address', L.address], ['website', L.website], ['email', L.email], ['phone', L.phone]];
  // The saved length counts the https:// added to an address.
  const savedLength = (k: TextField) => (k === 'website' ? toWebUrl(f[k]).length : f[k].trim().length);
  for (const [k, max] of tooLong) if (savedLength(k) > max) errors[k] = { code: 'FIELD_TOO_LONG', params: { max } };
  if (!f.name.trim()) errors.name = { code: 'FIELD_REQUIRED' };

  const whole = (k: 'foundedYear' | 'completedProjects', min: number, max: number) => {
    const raw = f[k].trim();
    if (!raw) return;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) errors[k] = { code: 'FIELD_RANGE', params: { min, max } };
  };
  whole('foundedYear', L.minFoundedYear, now.getFullYear());
  whole('completedProjects', 0, L.maxProjects);

  const website = f.website.trim();
  if (website && !errors.website) errors.website = webProblem(website) ?? undefined;
  const email = f.email.trim();
  if (email && !errors.email && !EMAIL.test(email)) errors.email = { code: 'EMAIL_INVALID' };
  const phone = f.phone.trim();
  if (phone && !errors.phone && !isValidPhone(phone)) errors.phone = { code: 'PHONE_INVALID' };
  for (const n of BUILDER_SOCIAL_NETWORKS) {
    const link = f.socials[n].trim();
    if (!link) continue;
    if (toWebUrl(link).length > L.social) errors[`socials.${n}`] = { code: 'FIELD_TOO_LONG', params: { max: L.social } };
    else {
      const problem = webProblem(link, n);
      if (problem) errors[`socials.${n}`] = problem;
    }
  }
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as BuilderErrors;
}

/** What to send: trimmed text, numbers as numbers; `null` when the form is empty (removes the builder). */
export function builderPayload(f: BuilderForm): BuilderPayload | null {
  if (isEmpty(f)) return null;
  const t = (v: string) => v.trim() || undefined;
  const n = (v: string) => (v.trim() ? Number(v.trim()) : undefined);
  const socials = Object.fromEntries(BUILDER_SOCIAL_NETWORKS.map((k) => [k, toWebUrl(f.socials[k])]).filter(([, v]) => v));
  const out: BuilderPayload = {
    name: f.name.trim(),
    tagline: t(f.tagline),
    about: t(f.about),
    licenseNumber: t(f.licenseNumber),
    website: t(toWebUrl(f.website)),
    email: t(f.email),
    phone: t(f.phone),
    address: t(f.address),
    foundedYear: n(f.foundedYear),
    completedProjects: n(f.completedProjects),
    ...(Object.keys(socials).length ? { socials } : {}),
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined)) as BuilderPayload;
}

/** A server field (`builder.website`, `builder.socials.facebook`) as a form field, if it is one. */
export function formFieldOf(serverField: string | undefined): BuilderField | undefined {
  if (!serverField?.startsWith('builder.')) return undefined;
  const f = serverField.slice('builder.'.length);
  const known: string[] = ['name', 'tagline', 'about', 'licenseNumber', 'website', 'email', 'phone', 'address', 'foundedYear', 'completedProjects', ...BUILDER_SOCIAL_NETWORKS.map((n) => `socials.${n}`)];
  return known.includes(f) ? (f as BuilderField) : undefined;
}

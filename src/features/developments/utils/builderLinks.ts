/**
 * Links on the public builder card. The server only stores checked values;
 * these still refuse anything that is not plain http(s) / a phone / an email,
 * so a bad value can never become a `javascript:` link on the page.
 */
export const safeWebHref = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

/** `tel:` link with only the digits and a leading +. */
export const telHref = (phone: string | undefined): string | undefined => {
  if (!phone) return undefined;
  const digits = phone.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  return digits.replace(/\D/g, '').length >= 6 ? `tel:${digits}` : undefined;
};

export const mailHref = (email: string | undefined): string | undefined =>
  email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : undefined;

/** The site's name without "www." for a compact label ("balkanbuild.mk"). */
export const siteLabel = (value: string | undefined): string | undefined => {
  const href = safeWebHref(value);
  return href ? new URL(href).hostname.replace(/^www\./, '') : undefined;
};

/** Years since founding, or undefined (future or missing year). */
export const yearsActive = (foundedYear: number | undefined, now = new Date()): number | undefined =>
  typeof foundedYear === 'number' && foundedYear <= now.getFullYear() ? now.getFullYear() - foundedYear : undefined;

/** Addresses longer than this are not a plain office address: no map link. */
const MAX_ADDRESS = 300;

/**
 * A map search for the builder's office (opens in the visitor's map app or
 * Google Maps). Only the public address goes into the link, encoded.
 */
export const mapsSearchHref = (address: string | undefined): string | undefined => {
  const text = address?.replace(/\s+/g, ' ').trim();
  if (!text || text.length > MAX_ADDRESS) return undefined;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
};

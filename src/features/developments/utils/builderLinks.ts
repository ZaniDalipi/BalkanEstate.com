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

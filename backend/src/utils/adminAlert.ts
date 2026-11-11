/**
 * The message admins get when something happens on the site (a new user, a
 * new listing). Pure: builds the texts and links, sends nothing. The same
 * alert goes out as an email and as an in-app/push notification.
 */

export type AdminAlertEvent =
  | {
      kind: 'user_registered';
      userId: string;
      name: string;
      email: string;
      role: string;
      /** How they signed up: email, google, apple, facebook. */
      provider: string;
    }
  | {
      kind: 'listing_created';
      propertyId: string;
      title?: string;
      price: number;
      city?: string;
      country?: string;
      status: string;
      listingType: string;
      sellerName?: string;
      sellerEmail?: string;
    }
  | {
      kind: 'role_changed';
      userId: string;
      name: string;
      email: string;
      from: string;
      to: string;
      /** The admin who made the change. */
      byName: string;
    };

export interface AdminAlert {
  subject: string;
  title: string;
  message: string;
  /** Same-site path the in-app notification opens. */
  actionUrl: string;
  html: string;
  text: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/** One line, no control characters: safe for subjects and notification titles. */
const oneLine = (value: string | undefined, max = 120): string =>
  (value ?? '').replace(/[\r\n\t\u0000-\u001f]+/g, ' ').trim().slice(0, max);

const formatPrice = (price: number): string =>
  Number.isFinite(price) && price > 0 ? `€${Math.round(price).toLocaleString('en-US')}` : 'Price on request';

function render(heading: string, rows: Array<[string, string]>, link: string, linkLabel: string): string {
  const body = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;white-space:nowrap">${escapeHtml(label)}</td>` +
        `<td style="padding:6px 0;color:#111827">${escapeHtml(value)}</td></tr>`
    )
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:24px">
    <h2 style="margin:0 0 16px;color:#111827">${escapeHtml(heading)}</h2>
    <table style="border-collapse:collapse;font-size:14px">${body}</table>
    <p style="margin:24px 0 0"><a href="${escapeHtml(link)}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${escapeHtml(linkLabel)}</a></p>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px">Admin notification from BalkanEstate.</p>
  </div>
</body></html>`;
}

const textOf = (heading: string, rows: Array<[string, string]>, link: string): string =>
  [heading, '', ...rows.map(([l, v]) => `${l}: ${v}`), '', link].join('\n');

export function buildAdminAlert(event: AdminAlertEvent, siteUrl: string): AdminAlert {
  const base = siteUrl.replace(/\/+$/, '');

  if (event.kind === 'user_registered') {
    const name = oneLine(event.name) || 'Unnamed user';
    const email = oneLine(event.email);
    const rows: Array<[string, string]> = [
      ['Name', name],
      ['Email', email],
      ['Role', oneLine(event.role)],
      ['Signed up with', oneLine(event.provider)],
    ];
    const actionUrl = '/admin/users';
    const heading = 'New user registered';
    return {
      subject: `New user: ${name} (${email})`,
      title: heading,
      message: `${name} · ${email} · ${oneLine(event.role)}`,
      actionUrl,
      html: render(heading, rows, `${base}${actionUrl}`, 'Open users'),
      text: textOf(heading, rows, `${base}${actionUrl}`),
    };
  }

  if (event.kind === 'role_changed') {
    const name = oneLine(event.name) || 'Unnamed user';
    const email = oneLine(event.email);
    const roleName = (role: string) => oneLine(role).replace('_', ' ');
    const rows: Array<[string, string]> = [
      ['User', `${name} (${email})`],
      ['Role', `${roleName(event.from)} → ${roleName(event.to)}`],
      ['Changed by', oneLine(event.byName)],
    ];
    const actionUrl = '/admin/users';
    const heading = 'Admin role changed';
    return {
      subject: `Role changed: ${name} is now ${roleName(event.to)}`,
      title: heading,
      message: `${name}: ${roleName(event.from)} → ${roleName(event.to)} (by ${oneLine(event.byName)})`,
      actionUrl,
      html: render(heading, rows, `${base}${actionUrl}`, 'Open users'),
      text: textOf(heading, rows, `${base}${actionUrl}`),
    };
  }

  const title = oneLine(event.title) || 'Untitled listing';
  const place = [oneLine(event.city), oneLine(event.country)].filter(Boolean).join(', ');
  const price = formatPrice(event.price);
  const rows: Array<[string, string]> = [
    ['Title', title],
    ['Price', price],
    ['Location', place || '—'],
    ['Type', `${oneLine(event.listingType)} · ${oneLine(event.status)}`],
    ['Seller', [oneLine(event.sellerName), oneLine(event.sellerEmail)].filter(Boolean).join(' · ') || '—'],
  ];
  const actionUrl = `/property/${encodeURIComponent(event.propertyId)}`;
  const heading = 'New listing added';
  return {
    subject: `New listing: ${title}${place ? ` (${place})` : ''}`,
    title: heading,
    message: `${title} · ${price}${place ? ` · ${place}` : ''}`,
    actionUrl,
    html: render(heading, rows, `${base}${actionUrl}`, 'View listing'),
    text: textOf(heading, rows, `${base}${actionUrl}`),
  };
}

/** Admin email addresses from a comma-separated setting; invalid entries are dropped. */
export function parseAdminEmails(value: string | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  for (const part of value.split(',')) {
    const email = part.trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) seen.add(email);
  }
  return [...seen];
}

export const MAX_ADMIN_ALERT_EMAILS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Check a list of alert addresses typed in the admin panel. */
export function validateAdminEmailList(
  input: unknown
): { ok: true; emails: string[] } | { ok: false; error: string; invalid: string[] } {
  if (!Array.isArray(input) || input.some((e) => typeof e !== 'string')) {
    return { ok: false, error: 'emails must be a list of email addresses', invalid: [] };
  }
  const cleaned = (input as string[]).map((e) => e.trim().toLowerCase()).filter(Boolean);
  const invalid = cleaned.filter((e) => e.length > 254 || !EMAIL_RE.test(e));
  if (invalid.length > 0) return { ok: false, error: 'Some addresses are not valid emails', invalid };
  const emails = [...new Set(cleaned)];
  if (emails.length > MAX_ADMIN_ALERT_EMAILS) {
    return { ok: false, error: `At most ${MAX_ADMIN_ALERT_EMAILS} addresses`, invalid: [] };
  }
  return { ok: true, emails };
}

export type AlertRecipientSource = 'panel' | 'env' | 'admins' | 'none';

/**
 * Where the alert emails go: the list set in the admin panel, else the server
 * setting (ADMIN_NOTIFICATION_EMAILS / ADMIN_REPORT_EMAILS), else every admin
 * account.
 */
export function resolveAlertRecipients(sources: {
  panel: readonly string[] | undefined;
  env: string | undefined;
  adminAccountEmails: readonly string[];
}): { recipients: string[]; source: AlertRecipientSource } {
  const panel = parseAdminEmails((sources.panel ?? []).join(','));
  if (panel.length > 0) return { recipients: panel, source: 'panel' };
  const env = parseAdminEmails(sources.env);
  if (env.length > 0) return { recipients: env, source: 'env' };
  const admins = parseAdminEmails(sources.adminAccountEmails.join(','));
  return admins.length > 0 ? { recipients: admins, source: 'admins' } : { recipients: [], source: 'none' };
}

/** New-user and new-listing alerts follow their switches; role changes always go out. */
export function isAlertEnabled(
  kind: AdminAlertEvent['kind'],
  switches: { notifyNewUser?: boolean; notifyNewProperty?: boolean }
): boolean {
  if (kind === 'user_registered') return switches.notifyNewUser !== false;
  if (kind === 'listing_created') return switches.notifyNewProperty !== false;
  return true;
}

import { toIntlLocale } from './intlLocale';

/**
 * Notifications are stored with English title/message. Those that carry
 * `data.textKey` (+ `data.textParams`) are shown in the reader's language
 * from `developments:notices.<key>.title|message`; the stored English is the
 * fallback, so older notifications and unknown keys still read fine.
 */
export const NOTICE_TEXT: Record<string, { title: string; message: string }> = {
  trialEndsSoon: { title: '{{name}}: free trial ends soon', message: 'Days left before {{name}} goes offline: {{days}}. Buy a Residence Pass to keep it public.' },
  trialEnded: { title: '{{name}} is offline', message: 'The free trial of {{name}} has ended. Buy a Residence Pass to put it back online.' },
  agencyGrace: { title: '{{name}}: renew your agency plan', message: 'Your agency subscription has ended. {{name}} stays public until {{date}}; renew to keep it online.' },
  agencyOffline: { title: '{{name}} is offline', message: 'Your agency subscription has ended, so {{name}} is offline. Renew to put it back online.' },
  unitAvailable: { title: 'New home available at {{residence}}', message: 'Unit {{unit}} is now available.' },
};

type Translate = (key: string, options: Record<string, unknown>) => string;

interface StoredNotification {
  title: string;
  message: string;
  data?: { textKey?: unknown; textParams?: unknown; [key: string]: unknown } | null;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** String/number params only; an ISO day becomes a date in the reader's language. */
function params(raw: unknown, lang: string): Record<string, string | number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'string') {
      out[k] = ISO_DAY.test(v) ? new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${v}T00:00:00Z`)) : v;
    }
  }
  return out;
}

export function notificationText(n: StoredNotification, t: Translate, lang: string): { title: string; message: string } {
  const key = typeof n.data?.textKey === 'string' ? n.data.textKey : '';
  if (!NOTICE_TEXT[key]) return { title: n.title, message: n.message };
  const values = params(n.data?.textParams, lang);
  return {
    title: t(`developments:notices.${key}.title`, { ...values, defaultValue: n.title }),
    message: t(`developments:notices.${key}.message`, { ...values, defaultValue: n.message }),
  };
}

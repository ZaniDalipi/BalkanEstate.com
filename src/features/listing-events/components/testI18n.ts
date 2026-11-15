import { vi } from 'vitest';

/** react-i18next mock returning the English defaults with {{values}} filled in. */
export const englishDefaults = () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) => {
      const o = (typeof opts === 'string' ? { defaultValue: opts } : (opts ?? {})) as Record<string, unknown>;
      const text = typeof o.defaultValue === 'string' ? o.defaultValue : key;
      return text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(o[k] ?? ''));
    },
    i18n: { language: 'en' },
  }),
});

export const noop = vi.fn();

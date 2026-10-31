import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { NOTICE_TEXT, notificationText } from './notificationText';

const fake = (key: string, o: Record<string, unknown>) => `${key}|${Object.entries(o).filter(([k]) => k !== 'defaultValue').map(([k, v]) => `${k}=${v}`).join(',')}`;

describe('notificationText', () => {
  it('translates a notification that carries a text key, with its values', () => {
    const n = { title: 'New home available at Aurora', message: 'Unit A3 is now available.', data: { textKey: 'unitAvailable', textParams: { residence: 'Aurora', unit: 'A3' } } };
    expect(notificationText(n, fake, 'sq')).toEqual({
      title: 'developments:notices.unitAvailable.title|residence=Aurora,unit=A3',
      message: 'developments:notices.unitAvailable.message|residence=Aurora,unit=A3',
    });
  });

  it('shows a date in the reader’s language', () => {
    const n = { title: 't', message: 'm', data: { textKey: 'agencyGrace', textParams: { name: 'Aurora', date: '2026-11-12', days: 0 } } };
    expect(notificationText(n, fake, 'en').message).toContain('date=Nov 12, 2026');
  });

  it('keeps the stored text for old notifications and unknown keys', () => {
    expect(notificationText({ title: 'Old', message: 'text' }, fake, 'sr')).toEqual({ title: 'Old', message: 'text' });
    expect(notificationText({ title: 'Old', message: 'text', data: { textKey: 'somethingElse' } }, fake, 'sr')).toEqual({ title: 'Old', message: 'text' });
  });

  it('has every notice in all 10 languages, with the same placeholders', () => {
    const root = resolve(__dirname, '../../..');
    const ph = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();
    for (const lang of ['en', 'sq', 'bs', 'hr', 'me', 'sr', 'mk', 'bg', 'el', 'ro']) {
      const notices = JSON.parse(readFileSync(join(root, 'src/i18n/locales', lang, 'developments.json'), 'utf8')).notices;
      for (const [key, en] of Object.entries(NOTICE_TEXT)) {
        expect(ph(notices[key].title), `${lang} ${key} title`).toEqual(ph(en.title));
        expect(ph(notices[key].message), `${lang} ${key} message`).toEqual(ph(en.message));
      }
    }
  });
});

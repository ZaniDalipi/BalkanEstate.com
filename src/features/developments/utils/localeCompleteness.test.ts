import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../../../..');
const LANGS = ['sq', 'bs', 'hr', 'me', 'sr', 'mk', 'bg', 'el', 'ro'];
type Tree = { [key: string]: string | Tree };

const flat = (tree: Tree, prefix = ''): [string, string][] =>
  Object.entries(tree).flatMap(([k, v]) => (typeof v === 'string' ? [[`${prefix}${k}`, v] as [string, string]] : flat(v, `${prefix}${k}.`)));
const load = (lang: string) => Object.fromEntries(flat(JSON.parse(readFileSync(join(ROOT, 'src/i18n/locales', lang, 'developments.json'), 'utf8'))));
const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();

/** Words that are the same in these languages (loanwords, abbreviations, units). */
const SAME_AS_ENGLISH = new Set(['Apt', 'Draft', 'Duplex', 'Email', 'Max', 'Min', 'Park', 'Parking', 'Penthouse', 'Plan', 'Public', 'Status', 'Studio', 'Total', 'minimum', '{{price}}/m²', '{{width}} × {{height}} px']);

describe('developments locale files', () => {
  const english = load('en');
  for (const lang of LANGS) {
    describe(lang, () => {
      const texts = load(lang);

      it('has every key of English, with the same placeholders', () => {
        const missing = Object.keys(english).filter((k) => !(k in texts));
        const broken = Object.keys(english).filter((k) => k in texts && placeholders(texts[k]).join() !== placeholders(english[k]).join());
        expect({ missing, broken }).toEqual({ missing: [], broken: [] });
      });

      it('has no English text left behind', () => {
        const copied = Object.keys(english).filter((k) => texts[k] === english[k] && /[A-Za-z]{3,}/.test(english[k].replace(/\{\{\w+\}\}/g, '')) && !SAME_AS_ENGLISH.has(english[k]));
        expect(copied).toEqual([]);
      });
    });
  }

  it('Serbian is written in Cyrillic in this namespace', () => {
    const latin = Object.entries(load('sr')).filter(([, v]) => !/[Ѐ-ӿ]/.test(v) && /[A-Za-zČĆŠŽĐčćšžđ]{4,}/.test(v.replace(/\{\{\w+\}\}|https?|JPG|PNG|WebP|AVIF|EUR|CSV|PDF|XLSX/g, '')) && !SAME_AS_ENGLISH.has(v));
    expect(latin.map(([k]) => k)).toEqual([]);
  });

  it('the sidebar entries for residences are translated in every language', () => {
    const read = (lang: string, ns: string) => JSON.parse(readFileSync(join(ROOT, 'src/i18n/locales', lang, `${ns}.json`), 'utf8'));
    for (const lang of LANGS) {
      expect(read(lang, 'nav').developments, `${lang} nav.developments`).not.toBe('Residences');
      expect(read(lang, 'agencyDashboard').sidebar.residences, `${lang} agencyDashboard.sidebar.residences`).not.toBe('Residences');
    }
  });
});

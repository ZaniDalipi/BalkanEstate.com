import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { API_ERROR_TEXT, API_STATUS_TEXT, CONFLICT_TEXT } from './apiErrorText';
import { COUPON_REASON_TEXT } from '../components/dashboard/billing/useBillingText';

const ROOT = resolve(__dirname, '../../../..');
const LANGS = ['en', 'sq', 'bs', 'hr', 'me', 'sr', 'mk', 'bg', 'el', 'ro'];
type Tree = Record<string, unknown>;
const locale = (lang: string): Tree => JSON.parse(readFileSync(join(ROOT, 'src/i18n/locales', lang, 'developments.json'), 'utf8'));
const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();

describe('every server refusal has a text in all 10 languages', () => {
  for (const lang of LANGS) {
    it(lang, () => {
      const api = locale(lang).apiErrors as Tree;
      const sections: [Tree, Record<string, string>][] = [
        [api, API_ERROR_TEXT],
        [api.status as Tree, API_STATUS_TEXT],
        [api.conflict as Tree, CONFLICT_TEXT],
        [((locale(lang).billing as Tree).refusal as Tree).coupon as Tree, COUPON_REASON_TEXT],
      ];
      for (const [texts, english] of sections) {
        for (const [code, en] of Object.entries(english)) {
          const text = texts[code];
          expect(typeof text, `${lang} apiErrors ${code}`).toBe('string');
          expect(placeholders(text as string), `${lang} ${code} placeholders`).toEqual(placeholders(en));
        }
      }
    });
  }
});

/** The `code`s the residence backend sends, read from its source. */
function serverCodes(): Set<string> {
  const backend = join(ROOT, 'backend/src');
  const files = [
    ...readdirSync(join(backend, 'services/developments'), { recursive: true }).map((f) => join(backend, 'services/developments', String(f))),
    ...['controllers', 'middleware', 'routes'].flatMap((dir) =>
      readdirSync(join(backend, dir))
        .filter((f) => /^(development|residence|adminResidence|upload)/.test(f))
        .map((f) => join(backend, dir, f))
    ),
  ].filter((f) => f.endsWith('.ts'));
  const codes = new Set<string>();
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/code(?:: | = )'([A-Z][A-Z_]+)'/g)) codes.add(m[1]);
    // new UnitLinkError(<message>, 'CODE', …): the code is the second argument.
    for (const m of src.matchAll(/new UnitLink(?:Conflict)?Error\(\s*(?:'[^']*'|`[^`]*`)\s*,\s*'([A-Z][A-Z_]+)'/g)) codes.add(m[1]);
  }
  return codes;
}

/** Billing refusals have their own texts (useBillingText). */
const BILLING = ['PASS_REQUIRED', 'TRIAL_IN_PROGRESS', 'TRIAL_LIMIT', 'BUILDING_LIMIT', 'PAYMENT_NOT_CONFIGURED', 'COUPON_INVALID'];

describe('the client knows every code the server sends', () => {
  it('has an English text (and so a key) for each', () => {
    const codes = serverCodes();
    expect(codes.size).toBeGreaterThan(40);
    // The scan finds codes in every form the server uses: object literals, class fields, UnitLinkError arguments.
    for (const c of ['UNIT_NUMBER_TAKEN', 'STORAGE_NOT_CONFIGURED', 'TYPE_SOLD_WITH', 'IMPORT_DUPLICATE_ROW', 'FORBIDDEN']) expect(codes.has(c), c).toBe(true);
    const unknown = [...codes].filter((c) => !API_ERROR_TEXT[c] && !BILLING.includes(c));
    expect(unknown).toEqual([]);
  });
});

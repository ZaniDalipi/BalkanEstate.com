/**
 * Translations for the market landing pages rendered by Pages Functions,
 * read from the same locale files the app uses (src/i18n/locales), so a
 * crawler reads exactly the words a visitor sees. English fills any gap,
 * then the defaultValue the caller passes.
 */
import type { Translate, TranslateOptions } from '../src/features/market-pages/utils/marketPageText';

import enMarket from '../src/i18n/locales/en/marketPages.json';
import sqMarket from '../src/i18n/locales/sq/marketPages.json';
import srMarket from '../src/i18n/locales/sr/marketPages.json';
import bgMarket from '../src/i18n/locales/bg/marketPages.json';
import hrMarket from '../src/i18n/locales/hr/marketPages.json';
import bsMarket from '../src/i18n/locales/bs/marketPages.json';
import mkMarket from '../src/i18n/locales/mk/marketPages.json';
import meMarket from '../src/i18n/locales/me/marketPages.json';
import roMarket from '../src/i18n/locales/ro/marketPages.json';
import elMarket from '../src/i18n/locales/el/marketPages.json';
import enCommon from '../src/i18n/locales/en/common.json';
import sqCommon from '../src/i18n/locales/sq/common.json';
import srCommon from '../src/i18n/locales/sr/common.json';
import bgCommon from '../src/i18n/locales/bg/common.json';
import hrCommon from '../src/i18n/locales/hr/common.json';
import bsCommon from '../src/i18n/locales/bs/common.json';
import mkCommon from '../src/i18n/locales/mk/common.json';
import meCommon from '../src/i18n/locales/me/common.json';
import roCommon from '../src/i18n/locales/ro/common.json';
import elCommon from '../src/i18n/locales/el/common.json';

type Bundle = Record<string, unknown>;

/** The two sections of common.json these pages look up: country and property-type names. */
const pickCommon = (common: Bundle): Bundle => ({ countries: common.countries, propertyTypes: common.propertyTypes });

const BUNDLES: Record<string, { marketPages: Bundle; common: Bundle }> = {
  en: { marketPages: enMarket, common: pickCommon(enCommon) },
  sq: { marketPages: sqMarket, common: pickCommon(sqCommon) },
  sr: { marketPages: srMarket, common: pickCommon(srCommon) },
  bg: { marketPages: bgMarket, common: pickCommon(bgCommon) },
  hr: { marketPages: hrMarket, common: pickCommon(hrCommon) },
  bs: { marketPages: bsMarket, common: pickCommon(bsCommon) },
  mk: { marketPages: mkMarket, common: pickCommon(mkCommon) },
  me: { marketPages: meMarket, common: pickCommon(meCommon) },
  ro: { marketPages: roMarket, common: pickCommon(roCommon) },
  el: { marketPages: elMarket, common: pickCommon(elCommon) },
};

const lookup = (bundle: unknown, path: string): string | undefined => {
  const value = path.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Bundle)[part] : undefined),
    bundle,
  );
  return typeof value === 'string' ? value : undefined;
};

/** `{{name}}` placeholders, as i18next writes them. Values are inserted as text; escape when rendering. */
const interpolate = (text: string, options: TranslateOptions): string =>
  text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => {
    const value = options[name];
    return value === undefined ? match : String(value);
  });

/** A `t('ns:key', options)` for one language. */
export function marketTranslator(lang: string): Translate {
  const own = BUNDLES[lang] ?? BUNDLES.en;
  return (key, options = {}) => {
    const split = key.indexOf(':');
    const ns = split > 0 ? key.slice(0, split) : 'marketPages';
    const path = split > 0 ? key.slice(split + 1) : key;
    if (ns !== 'marketPages' && ns !== 'common') return interpolate(options.defaultValue ?? key, options);
    const text = lookup(own[ns], path) ?? lookup(BUNDLES.en[ns], path) ?? options.defaultValue ?? key;
    return interpolate(text, options);
  };
}

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * A missing translation key is shown to the user as its own path.
 *
 * `fallbackLng` is 'en', so a key a locale lacks falls back to English and
 * nothing is visibly wrong. A key missing from English too has nothing to
 * fall back to, and i18next renders the key itself — which is how
 * "map.drawHint.title" ended up printed on the map in a blue box.
 *
 * Two things stop it, and this checks both are in place:
 *   - the key exists in English, and
 *   - the call site passes an English fallback, which is the codebase's
 *     convention and covers the key being renamed later.
 *
 * A call that passes a fallback is safe whatever the bundles say, so only
 * calls without one are checked.
 */

const ROOT = path.resolve(__dirname, '../..');
const EN = path.join(ROOT, 'src/i18n/locales/en');

const bundles: Record<string, unknown> = {};
for (const file of fs.readdirSync(EN)) {
  bundles[file.replace('.json', '')] = JSON.parse(fs.readFileSync(path.join(EN, file), 'utf8'));
}

const lookup = (bundle: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    bundle,
  );

const sourceFiles = (dir: string, found: string[] = []): string[] => {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!/node_modules|locales|__tests__|\/tests$/.test(rel)) sourceFiles(rel, found);
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      found.push(rel);
    }
  }
  return found;
};

/**
 * `t('ns:key')` and `t('ns:key', { … })`.
 *
 * The options form matters as much as the bare one: `t('admin:x.y', { count })`
 * leaks the path just the same, and only a `defaultValue` inside those options
 * makes it safe.
 */
const T_CALL = /\bt\(\s*'([a-zA-Z0-9_]+):([a-zA-Z0-9_.]+)'\s*(\)|,\s*\{([^{}]*)\})/g;

interface Call {
  namespace: string;
  key: string;
  /** i18next resolves a `count` option against `key_one` / `key_other`. */
  plural: boolean;
}

const callsWithoutFallback = (source: string): Call[] =>
  [...source.matchAll(T_CALL)]
    .filter((match) => match[3] === ')' || !/\bdefaultValue\b/.test(match[4] ?? ''))
    .map((match) => ({
      namespace: match[1],
      key: match[2],
      plural: /\bcount\b/.test(match[4] ?? ''),
    }));

/**
 * A key resolves only if it lands on a string. Landing on an *object* — the
 * mistake in `t('agents:profilePage.contact')`, where `contact` is a group of
 * keys — renders the path just like a missing key does.
 */
const resolves = ({ namespace, key, plural }: Call): boolean => {
  if (!(namespace in bundles)) return false;
  if (typeof lookup(bundles[namespace], key) === 'string') return true;
  return plural && ['_other', '_one'].some((suffix) => typeof lookup(bundles[namespace], key + suffix) === 'string');
};

describe('no screen can show a raw translation key', () => {
  const files = [...sourceFiles('src'), ...sourceFiles('components')];

  it('finds source to check', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('resolves every key called without a fallback', () => {
    const leaks: string[] = [];

    for (const file of files) {
      for (const call of callsWithoutFallback(fs.readFileSync(path.join(ROOT, file), 'utf8'))) {
        if (!resolves(call)) leaks.push(`${file} → ${call.namespace}:${call.key}`);
      }
    }

    expect(leaks).toEqual([]);
  });

  it('has the draw hint the map shows, in every locale', () => {
    // The one this test was written for.
    for (const locale of ['en', 'sq', 'sr', 'hr', 'bs', 'me', 'mk', 'bg', 'el', 'ro']) {
      const search = JSON.parse(
        fs.readFileSync(path.join(ROOT, `src/i18n/locales/${locale}/search.json`), 'utf8'),
      );
      expect(search.map?.drawHint?.title, `${locale} title`).toBeTruthy();
      expect(search.map?.drawHint?.subtitle, `${locale} subtitle`).toBeTruthy();
      expect(search.map?.drawHint?.dismiss, `${locale} dismiss`).toBeTruthy();
    }
  });

  it('translates the keys these screens call into every locale, not just English', () => {
    // English alone only stops the key path from showing; the other nine
    // locales are what stop an English word from showing inside them.
    const locales = ['sq', 'sr', 'hr', 'bs', 'me', 'mk', 'bg', 'el', 'ro'];
    const missing: string[] = [];

    for (const locale of locales) {
      for (const [namespace, english] of Object.entries(bundles)) {
        const file = path.join(ROOT, `src/i18n/locales/${locale}/${namespace}.json`);
        if (!fs.existsSync(file)) continue;
        const translated = JSON.parse(fs.readFileSync(file, 'utf8'));

        for (const key of ADDED_KEYS[namespace] ?? []) {
          if (typeof lookup(english, key) !== 'string') missing.push(`en/${namespace} → ${key}`);
          if (typeof lookup(translated, key) !== 'string') missing.push(`${locale}/${namespace} → ${key}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});

/**
 * The keys added when the app's 121 raw-key leaks were cleared. Held here so
 * a locale cannot quietly lose one of them again.
 */
const ADDED_KEYS: Record<string, string[]> = {
  common: ['note'],
  footer: ['legal.refundPolicy'],
  auth: [
    'errors.loginFailed',
    'status.loggingIn',
    'status.loadingUser',
    'status.loggingOut',
    'status.creatingAccount',
    'status.sending',
    'status.verifying',
    'messages.welcomeUser',
    'labels.role',
    'buttons.resetPassword',
    'phoneCode.sentTo',
  ],
  agents: [
    'profilePage.header.verified',
    'profilePage.header.unsave',
    'profilePage.header.contact',
    'profilePage.listingsTab.noSearchResults',
    'profilePage.stats.avgPrice',
  ],
  admin: [
    'loading.loadingHeatmap',
    'propertyManager.propertyDetails',
    'propertyManager.specifications',
    'propertyManager.type',
    'propertyManager.bedrooms',
    'howItWorks.editContent',
    'howItWorks.addNewContent',
    'howItWorks.contentType',
    'howItWorks.key',
    'howItWorks.titleLabel',
    'howItWorks.description',
    'howItWorks.section',
    'howItWorks.category',
    'howItWorks.estimatedTime',
    'howItWorks.difficulty',
    'howItWorks.displayOrder',
    'howItWorks.video',
    'howItWorks.replaceVideo',
    'howItWorks.uploading',
    'howItWorks.addStep',
    'howItWorks.noStepsAdded',
    'howItWorks.addFaq',
    'howItWorks.noFaqsAdded',
    'howItWorks.addFeature',
    'howItWorks.noFeaturesAdded',
    'agencyManager.agencyDetails',
    'agencyManager.contactInformation',
    'agencyManager.email',
    'agencyManager.phone',
    'agencyManager.website',
    'agencyManager.location',
    'agencyManager.address',
    'agencyManager.city',
    'agencyManager.country',
    'agencyManager.owner',
    'agencyManager.role',
    'agencyManager.specialtiesAndCertifications',
    'agencyManager.specialties',
    'agencyManager.certifications',
    'agencyManager.featuredAgency',
    'agencyManager.featuredAgencyDesc',
    'agencyManager.businessHours',
    'agencyManager.agents',
    'agencyManager.noAgentsAssigned',
    'agencyManager.created',
    'agencyManager.lastUpdated',
    'agencyManager.editAgency',
    'agencyManager.agencyName',
    'agencyManager.description',
    'agencyManager.zipCode',
    'agencyManager.socialMediaLinks',
    'agencyManager.facebookUrl',
    'agencyManager.instagramUrl',
    'agencyManager.linkedinUrl',
    'agencyManager.twitterUrl',
    'agencyManager.yearsInBusiness',
    'agencyManager.willAppearInFeatured',
    'agencyManager.specialtiesCommaSeparated',
    'agencyManager.certificationsCommaSeparated',
    'agencyManager.editNote',
  ],
};

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
 *   - the call site passes an English fallback as the second argument, which
 *     is the codebase's convention and covers the key being renamed later.
 *
 * A call with a fallback is safe whatever the bundles say, so only bare
 * `t('ns:key')` calls are checked.
 */

const ROOT = path.resolve(__dirname, '../..');
const EN = path.join(ROOT, 'src/i18n/locales/en');

/**
 * Files with pre-existing bare calls to keys English does not have.
 *
 * Not a licence to add more — new entries here should be questioned rather
 * than appended. They are listed so the debt is visible and counted instead
 * of hiding behind a passing test: 120 leaks across these files, nearly all
 * in admin screens and one example component that ships to nobody.
 */
const KNOWN_UNTRANSLATED = new Set([
  'src/features/admin/components/AgencyManagerDetail.tsx',
  'src/features/admin/components/HowItWorksManagerForm.tsx',
  'src/features/admin/components/PropertyManagerDetail.tsx',
  'src/features/admin/components/InteractionHeatmap.tsx',
  'src/features/auth/components/ExampleAuthUsage.tsx',
  'src/features/agents/components/agent-profile/AgentListingsTab.tsx',
  'src/features/agents/components/agent-profile/AgentProfileHeader.tsx',
  'src/features/agents/components/agent-profile/AgentMarketInsights.tsx',
  'src/features/agents/components/agent-profile/AgentStats.tsx',
  'src/features/legal/components/LegalFooter.tsx',
  'src/features/rental/components/RentalPropertyCard.tsx',
  'src/shared/components/layout/Sidebar.tsx',
  'components/shared/Sidebar.tsx',
]);

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

/** `t('ns:key')` with no fallback — the only calls that can leak a path. */
const bareKeys = (source: string): [string, string][] =>
  [...source.matchAll(/\bt\(\s*'([a-zA-Z0-9_]+):([a-zA-Z0-9_.]+)'\s*\)/g)]
    .map((match) => [match[1], match[2]] as [string, string]);

describe('no screen can show a raw translation key', () => {
  const files = [...sourceFiles('src'), ...sourceFiles('components')];

  it('finds source to check', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('resolves every key called without a fallback', () => {
    const leaks: string[] = [];

    for (const file of files) {
      if (KNOWN_UNTRANSLATED.has(file)) continue;

      for (const [namespace, key] of bareKeys(fs.readFileSync(path.join(ROOT, file), 'utf8'))) {
        if (!(namespace in bundles) || lookup(bundles[namespace], key) === undefined) {
          leaks.push(`${file} → ${namespace}:${key}`);
        }
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

  it('keeps the known-untranslated list honest', () => {
    // A file that no longer leaks should leave the list, so it cannot grow
    // into a place where real gaps hide.
    const stillLeaking = [...KNOWN_UNTRANSLATED].filter((file) => {
      if (!fs.existsSync(path.join(ROOT, file))) return false;
      return bareKeys(fs.readFileSync(path.join(ROOT, file), 'utf8')).some(
        ([namespace, key]) => !(namespace in bundles) || lookup(bundles[namespace], key) === undefined,
      );
    });

    expect([...KNOWN_UNTRANSLATED].sort()).toEqual(stillLeaking.sort());
  });
});

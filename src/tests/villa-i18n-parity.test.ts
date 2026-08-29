import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * CLAUDE.md and ARCHITECTURE.md both state the rule: every new translation key
 * must be added to all 10 locale files simultaneously.
 *
 * Nothing enforced it, so an English-only key shipped silently — `t()` falls
 * back to its inline default, and the other nine languages quietly render
 * English. This scans the keys the villa search actually references and fails
 * the build if any of them is missing from any locale.
 */

const LOCALES = ['en', 'sq', 'bs', 'bg', 'hr', 'el', 'mk', 'me', 'ro', 'sr'] as const;

const SOURCES = [
    'src/features/villas/components/VillaAllFilters.tsx',
    'src/features/villas/components/VillaFilters.tsx',
    'src/features/villas/components/VillaSearchPage.tsx',
    'src/features/villas/components/LuxuryVillaCard.tsx',
    'src/shared/utils/propertyNaming.ts',
];

/** `t('ns:a.b', …)`, plus the `key:`/`labelKey:` fields of the chip tables. */
const KEY_PATTERNS = [
    /t\(\s*['"]([a-z]+):([A-Za-z0-9_.\-+]+)['"]/g,
    /\bkey:\s*['"]([a-z]+):([A-Za-z0-9_.\-+]+)['"]/g,
    /\blabelKey:\s*['"]([a-z]+):([A-Za-z0-9_.\-+]+)['"]/g,
];

const repoRoot = path.resolve(__dirname, '../..');

const collectKeys = (): Set<string> => {
    const keys = new Set<string>();
    for (const file of SOURCES) {
        const source = fs.readFileSync(path.join(repoRoot, file), 'utf8');
        for (const pattern of KEY_PATTERNS) {
            for (const match of source.matchAll(pattern)) {
                keys.add(`${match[1]}:${match[2]}`);
            }
        }
    }
    return keys;
};

const localeCache = new Map<string, Record<string, unknown>>();
const loadNamespace = (locale: string, namespace: string): Record<string, unknown> => {
    const id = `${locale}/${namespace}`;
    if (!localeCache.has(id)) {
        const file = path.join(repoRoot, 'src/i18n/locales', locale, `${namespace}.json`);
        localeCache.set(id, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {});
    }
    return localeCache.get(id)!;
};

const lookup = (tree: Record<string, unknown>, dotted: string): unknown => {
    let node: unknown = tree;
    for (const segment of dotted.split('.')) {
        if (typeof node !== 'object' || node === null || !(segment in node)) return undefined;
        node = (node as Record<string, unknown>)[segment];
    }
    return node;
};

describe('villa search translations', () => {
    const keys = [...collectKeys()].sort();

    it('references a non-trivial number of keys (the scanner still matches)', () => {
        // Guards the regexes themselves: if a refactor changed how keys are
        // written, this suite would otherwise pass by finding nothing at all.
        expect(keys.length).toBeGreaterThan(50);
    });

    it('resolves every referenced key in all 10 locales', () => {
        const gaps: string[] = [];
        for (const key of keys) {
            const [namespace, ...rest] = key.split(':');
            const dotted = rest.join(':');
            const missingIn = LOCALES.filter(locale => {
                const value = lookup(loadNamespace(locale, namespace), dotted);
                return typeof value !== 'string' || value.trim() === '';
            });
            if (missingIn.length > 0) gaps.push(`${key} → missing in ${missingIn.join(', ')}`);
        }
        expect(gaps).toEqual([]);
    });

    it('keeps interpolation placeholders identical across locales', () => {
        // "Show {{count}} villas" losing its {{count}} in one language renders
        // a button with no number in it.
        const placeholders = (value: string) =>
            [...value.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).sort().join(',');

        const mismatches: string[] = [];
        for (const key of keys) {
            const [namespace, ...rest] = key.split(':');
            const dotted = rest.join(':');
            const english = lookup(loadNamespace('en', namespace), dotted);
            if (typeof english !== 'string') continue;
            const expected = placeholders(english);
            for (const locale of LOCALES) {
                const value = lookup(loadNamespace(locale, namespace), dotted);
                if (typeof value !== 'string') continue;
                if (placeholders(value) !== expected) {
                    mismatches.push(`${key} (${locale}): expected {{${expected}}}, got "${value}"`);
                }
            }
        }
        expect(mismatches).toEqual([]);
    });
});

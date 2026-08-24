import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SEEDED_CITY_IMAGES } from '@/config/seededCityImages';

/**
 * The frontend needs the seeded-city table to offer a photo choice in the
 * admin, and it cannot import from the backend package. So the list is
 * duplicated — and this test is what stops the copy rotting: it parses the
 * canonical list itself and fails the moment the two disagree.
 *
 * A drift here is not loud. A destination pointed at a city that is no longer
 * seeded resolves to a Cloudinary 404, and the corridor quietly keeps showing
 * that card's gradient placeholder instead of a photo.
 *
 * The canonical list lives in `backend/src/data/balkanShowcaseCities.ts`, not
 * `seedCityImages.ts` itself — that script now just imports it, so it and
 * `services/cityShowcaseImportService.ts` (the city-gallery import candidates)
 * can't drift from each other either.
 */
describe('seeded city images', () => {
    const source = readFileSync(
        resolve(__dirname, '../../backend/src/data/balkanShowcaseCities.ts'),
        'utf8',
    );

    const block = (() => {
        const start = source.indexOf('const BALKAN_SHOWCASE_CITIES');
        expect(start, 'BALKAN_SHOWCASE_CITIES table not found in balkanShowcaseCities.ts').toBeGreaterThan(-1);
        const rest = source.slice(start);
        return rest.slice(0, rest.indexOf('\n];'));
    })();

    const fromSeeder = [...block.matchAll(/city:\s*'([^']+)',\s*country:\s*'([^']+)'/g)].map(
        m => `${m[1]}|${m[2]}`,
    );

    it('parses a non-trivial table from the seeder', () => {
        expect(fromSeeder.length).toBeGreaterThan(50);
    });

    it('matches the frontend copy exactly', () => {
        const fromConfig = SEEDED_CITY_IMAGES.map(c => `${c.city}|${c.country}`);
        // Sorted: the two are allowed to be written in a different order, but
        // must contain exactly the same city/country pairs.
        expect([...fromConfig].sort()).toEqual([...fromSeeder].sort());
    });

    it('has no duplicate entries', () => {
        const seen = SEEDED_CITY_IMAGES.map(c => `${c.city}|${c.country}`);
        expect(new Set(seen).size).toBe(seen.length);
    });
});
